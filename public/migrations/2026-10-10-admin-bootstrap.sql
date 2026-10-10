-- ============================================================================
-- 2026-10-10 — Owner/admin bootstrap + privilege-escalation hardening
--
-- WHY THIS EXISTS
--   Until now the only way to obtain a `company_owner_admin` account was to
--   sign up with `role: 'company_owner_admin'` in the auth metadata, which
--   `handle_new_user()` copied verbatim into `public.profiles`. Nothing gated
--   that path, so the role was effectively self-assignable, and there was no
--   supported way to create the *first* owner either.
--
--   This migration closes both escalation holes and then provides a
--   one-shot, in-app way to claim the first owner account:
--
--     1. `public.profiles` self-access was a single `FOR ALL USING (id =
--        auth.uid())` policy with no `WITH CHECK`. RLS cannot restrict
--        columns, so a customer could UPDATE their own `role` to
--        `company_owner_admin`. Replaced with explicit per-command policies
--        plus a BEFORE UPDATE trigger that rejects role changes.
--     2. `handle_new_user()` trusted `raw_user_meta_data->>'role'`. Now every
--        account is created as `customer`; promotion only happens through an
--        existing owner (or the bootstrap below).
--     3. `claim_first_admin()` — a SECURITY DEFINER RPC that promotes the
--        calling user to owner, but only while the table holds zero owners.
--
-- HOW TO RUN
--   Paste this whole file into the Supabase SQL editor (Dashboard → SQL
--   Editor) and run it once. It is idempotent: every statement is guarded by
--   DROP ... IF EXISTS / CREATE OR REPLACE, so re-running is safe.
--
--   No service-role key is required or used. Everything here runs as the
--   SQL editor's `postgres` role, which owns these tables and therefore
--   bypasses RLS — the same authority the existing schema file already
--   assumes.
--
-- AFTER RUNNING
--   1. Open https://www.adibexprestige.com/admin/setup in a browser.
--   2. Register (or sign in) with the account that should own the company.
--   3. Click "Claim owner access".
--   4. You land on the admin dashboard. The page then refuses further
--      claims, so it is safe to leave reachable.
--
-- IDEMPOTENCY / ORDERING NOTE
--   `claim_first_admin()` sets the `adibex.role_guard_bypass` transaction-
--   local GUC so the role guard added below lets its own UPDATE through.
--   The GUC is transaction-local (set_config(..., is_local => true)) and
--   therefore never persists past the RPC call.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- PART 1 — Close the self-escalation hole on public.profiles
--
-- The original policy was:
--   CREATE POLICY "Users can view and update their own profile" ON public.profiles
--     FOR ALL USING (id = auth.uid());
-- `FOR ALL` with only a `USING` clause inherits that expression as its
-- implicit `WITH CHECK`, so a customer could write role='company_owner_admin'
-- onto their own row. Split it into explicit commands, each narrow enough to
-- be obvious.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;

-- Users can still read their own profile row.
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
CREATE POLICY "Users can select their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- A signed-in user may create their own row, but only as a customer. In
-- practice `handle_new_user()` has already inserted it (SECURITY DEFINER, so
-- RLS never sees that insert); this policy only covers the client-side
-- fallback upsert in src/context/AuthContext.tsx.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid() AND role = 'customer');

-- A signed-in user may update their own row. `role` is NOT protected here,
-- because RLS cannot compare NEW against OLD — that is the trigger's job in
-- the next block. Non-role fields (full_name, phone, address, ...) stay
-- self-service, which is what AuthContext.updateProfile() relies on.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Note there is deliberately no self-DELETE policy: users cannot remove their
-- own profile row (the auth.users foreign key cascades instead).


-- ---------------------------------------------------------------------------
-- PART 2 — Role guard trigger
--
-- RLS decides whether an UPDATE may happen, but it cannot see the old row, so
-- it cannot stop "allowed update that also changes role". A BEFORE UPDATE
-- trigger can.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('adibex.role_guard_bypass', true), '') <> 'on'
     AND public.get_auth_role() IS DISTINCT FROM 'company_owner_admin' THEN
    RAISE EXCEPTION 'Account role changes are restricted'
      USING ERRCODE = '42501',
            HINT = 'Only a company owner can change account roles.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- The trigger function is invoked by the table machinery, never by clients.
REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC;


-- ---------------------------------------------------------------------------
-- PART 3 — Stop trusting sign-up metadata
--
-- Every account is now created as a customer. Promotion to `agent` (staff) or
-- `company_owner_admin` happens only via an existing owner using the Staff tab
-- (db.ts updateUserRole), or via the one-shot bootstrap in Part 4.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
    NEW.email,
    'customer',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;


-- ---------------------------------------------------------------------------
-- PART 4 — One-shot owner claim
--
-- Promotes the *calling authenticated user* to company_owner_admin, but only
-- while no owner exists at all. A transaction-scoped advisory lock serialises
-- concurrent claims so two people racing on an empty database cannot both
-- succeed: the second caller blocks, then sees the owner the first created and
-- raises.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS void AS $$
DECLARE
  caller_id uuid := auth.uid();
  owner_count integer;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to claim owner access'
      USING HINT = 'Sign in with the account you registered, then try again.';
  END IF;

  -- Serialise every claim for the lifetime of this transaction. If two
  -- requests race, the second waits here until the first commits, then runs
  -- its own count check against the committed state.
  PERFORM pg_advisory_xact_lock(hashtextextended('adibex.owner_bootstrap', 0));

  SELECT count(*) INTO owner_count
  FROM public.profiles
  WHERE role = 'company_owner_admin';

  IF owner_count > 0 THEN
    RAISE EXCEPTION 'A company owner account already exists'
      USING HINT = 'Ask an existing owner to add you from the Staff tab.';
  END IF;

  -- Let Part 2's guard accept the role write this function is about to make.
  -- Transaction-local: reverted automatically at COMMIT/ROLLBACK.
  PERFORM set_config('adibex.role_guard_bypass', 'on', true);

  UPDATE public.profiles
  SET role = 'company_owner_admin',
      updated_at = NOW()
  WHERE id = caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No profile exists for this account'
      USING HINT = 'Sign out, register again, then retry.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_temp;

-- Only an authenticated user (i.e. a real signed-in account with a JWT) may
-- call this. `anon` and `PUBLIC` are explicitly excluded.
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;


-- ============================================================================
-- OPTIONAL TEARDOWN
--
-- If you ever need to hand ownership to a different account, demote the
-- current owner from the SQL editor (which is not subject to RLS) and let the
-- new owner re-claim, or simply promote the new account directly:
--
--   UPDATE public.profiles SET role = 'customer'
--    WHERE id = '<current-owner-uuid>';
--
--   UPDATE public.profiles SET role = 'company_owner_admin'
--    WHERE id = '<new-owner-uuid>';
--
-- To revert this migration entirely (NOT recommended — it re-opens the
-- escalation holes above), uncomment and run:
--
--   DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
--   DROP FUNCTION IF EXISTS public.prevent_role_escalation();
--   DROP FUNCTION IF EXISTS public.claim_first_admin();
--   DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
--   DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
--   DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
--   CREATE POLICY "Users can view and update their own profile" ON public.profiles
--     FOR ALL USING (id = auth.uid());
--   -- Then restore handle_new_user() from git history.
-- ============================================================================
