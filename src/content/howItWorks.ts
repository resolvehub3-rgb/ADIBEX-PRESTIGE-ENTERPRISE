/**
 * Visible copy for the "How it works" page.
 *
 * The React view and the JSON-LD builder (src/utils/seo.ts) both read from this
 * module, so the HowTo and FAQPage structured data always describes content that
 * is genuinely rendered on the page — never invented Q&A or steps.
 */

export interface HowItWorksStep {
  number: string;
  title: string;
  description: string;
}

export interface HowItWorksFaq {
  q: string;
  a: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    number: '01',
    title: 'Search & Compare Verified Properties',
    description:
      'Browse our live catalog of single rooms, apartments, executive houses, stores, corporate offices, and litigation-free lands across Greater Accra, Ashanti, and other Ghana regions. Filter by exact budget, category, and furnishing status.',
  },
  {
    number: '02',
    title: 'Schedule an Agent-Guided In-Person Tour',
    description:
      'Select your preferred date and time slot. A licensed Adibex Prestige property agent will meet you at the site to conduct a thorough walkthrough and answer questions about facilities, water, and neighborhood.',
  },
  {
    number: '03',
    title: 'Lock Your Unit with Real-Time Reservation',
    description:
      'When you find the right property, select your specific room or unit. Our system locks the unit in real-time with an active reservation window to prevent double-booking while you complete payment.',
  },
  {
    number: '04',
    title: 'Secure Online or Direct Bank Payment',
    description:
      'Pay with Ghana Mobile Money (MTN / Telecel), debit/credit card, or transfer directly to the official corporate bank account at GCB Bank. Upload your slip or MoMo transaction ID for instant verification.',
  },
  {
    number: '05',
    title: 'Official Receipt & Tenancy Handover',
    description:
      'Receive an authenticated digital receipt and tenancy agreement contract. Meet with our company management for physical key handover or site demarcation inspection for lands.',
  },
];

export const HOW_IT_WORKS_FAQS: HowItWorksFaq[] = [
  {
    q: 'Can I reserve and pay for a property if I live outside Ghana (Diaspora)?',
    a: 'Yes! International clients in the UK, USA, Canada, Europe, and worldwide can view 360° virtual tours, switch pricing to USD/GBP/EUR, reserve units online, and pay securely via card or direct international wire transfer.',
  },
  {
    q: 'Are all listed lands litigation-free and registered?',
    a: 'Yes. ADIBEX PRESTIGE ENTERPRISE performs comprehensive title search and cadastral site inspections with the Lands Commission before publishing any land listing.',
  },
  {
    q: 'How does the Double-Booking Guard work?',
    a: 'When you initiate a reservation on an available unit or room, our PostgreSQL database immediately locks the unit with an expiration countdown. No other customer can check out that specific unit during your reservation period.',
  },
  {
    q: 'What happens after I submit a manual bank deposit slip?',
    a: 'Our Company Owner/Admin accounting team reviews your deposit reference or screenshot in the management queue and approves it, immediately changing your reservation to CONFIRMED and issuing an official corporate receipt.',
  },
];
