/**
 * TEMPORARY DIAGNOSTIC — do not ship.
 *
 * /property/:slug returns FUNCTION_INVOCATION_FAILED in production while
 * api/sitemap.ts (same directory, same ../scripts/*.mjs import) works. This
 * loads each module the real handler uses, one at a time, and reports which
 * one fails. Literal specifiers so bundling matches the real handler exactly.
 */
export default async function handler(
  req: { method?: string; url?: string },
  res: { status(c: number): void; setHeader(k: string, v: string): void; end(chunk?: string): void }
): Promise<void> {
  const report: string[] = [];
  report.push(`node=${process.version}`);
  report.push(`vercel=${process.env.VERCEL || 'unset'}`);
  report.push(`produrl=${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'unset'}`);

  try {
    await import('../src/lib/headInject');
    report.push('headInject: OK');
  } catch (e) {
    report.push(`headInject: FAIL ${(e as Error)?.name}: ${(e as Error)?.message}`);
  }

  try {
    await import('../src/utils/seo');
    report.push('seo: OK');
  } catch (e) {
    report.push(`seo: FAIL ${(e as Error)?.name}: ${(e as Error)?.message}`);
  }

  try {
    await import('../src/types');
    report.push('types: OK');
  } catch (e) {
    report.push(`types: FAIL ${(e as Error)?.name}: ${(e as Error)?.message}`);
  }

  try {
    await import('../scripts/sitemap-core.mjs');
    report.push('sitemap-core: OK');
  } catch (e) {
    report.push(`sitemap-core: FAIL ${(e as Error)?.name}: ${(e as Error)?.message}`);
  }

  try {
    const mod = await import('../scripts/sitemap-core.mjs');
    const core = mod as { PUBLIC_PROPERTY_STATUSES?: unknown; DEFAULT_SITE_URL?: unknown };
    report.push(`sitemap-core exports: statuses=${JSON.stringify(core.PUBLIC_PROPERTY_STATUSES)} site=${core.DEFAULT_SITE_URL}`);
  } catch (e) {
    report.push(`sitemap-core exports: FAIL ${(e as Error)?.message}`);
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(report.join('\n'));
}
