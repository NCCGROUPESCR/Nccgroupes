import type { PageSection } from '../../modules/content/entities/page.entity';

export const ARCHANDA_BASE_ABOUT_SECTIONS: PageSection[] = [
  {
    id: 'our-story',
    order: 0,
    heading: 'Our Story',
    body: 'Archanda AG helps buyers and sellers transact with clear terms and protected escrow across West Africa and beyond.',
    imageUrl: null,
  },
  {
    id: 'our-mission',
    order: 1,
    heading: 'Our Mission',
    body: 'To hold every transaction to the same standard: payment only moves when the agreed conditions are confirmed.',
    imageUrl: null,
  },
  {
    id: 'our-vision',
    order: 2,
    heading: 'Our Vision',
    body: 'A connected marketplace where any two businesses, anywhere, can transact with confidence.',
    imageUrl: null,
  },
  {
    id: 'leadership',
    order: 3,
    heading: 'Leadership',
    body: 'Our leadership team brings decades of combined experience in fintech and international payments.',
    imageUrl: null,
  },
];

/** Company information supplied for the public Archanda AG About Us page. */
export const ARCHANDA_ABOUT_SECTIONS: PageSection[] = [
  {
    id: 'archanda-who-we-are',
    order: 4,
    heading: 'Who We Are',
    body: '<p>Archanda AG is a Swiss-registered corporation headquartered in Zurich, Switzerland. Established in 2022, the company operates with a broad corporate purpose focused on financial services and related commercial activities.</p><p>We aim to support structured commercial transactions and business relationships through professional processes, transparency, and responsible business practices.</p><p>Our approach is built around creating reliable commercial experiences for individuals, businesses, buyers, sellers, and international trading partners.</p>',
    imageUrl: null,
  },
  {
    id: 'archanda-our-purpose',
    order: 5,
    heading: 'Our Purpose',
    body: "<p>Archanda AG's corporate purpose includes the provision of financial services and the development of business activities directly or indirectly connected to this objective.</p><p>The company is also authorised under its corporate purpose to establish branches and subsidiaries, acquire interests in other companies, undertake financing for its own account or for third parties, and engage in other permitted commercial activities.</p>",
    imageUrl: null,
  },
  {
    id: 'archanda-our-approach',
    order: 6,
    heading: 'Our Approach',
    body: '<p>We believe successful trading depends on clarity, accountability, and confidence between participating parties.</p><p>Our business approach focuses on:</p><ul><li><strong>Transparency:</strong> Clear communication and understandable transaction processes.</li><li><strong>Professionalism:</strong> Responsible handling of business relationships and commercial activities.</li><li><strong>International Outlook:</strong> Supporting business opportunities and relationships across different markets.</li><li><strong>Accountability:</strong> Promoting clear responsibilities and documented transaction arrangements.</li><li><strong>Continuous Development:</strong> Improving our services and business operations as commercial needs evolve.</li></ul>',
    imageUrl: null,
  },
  {
    id: 'archanda-registered-information',
    order: 7,
    heading: 'Our Registered Information',
    body: '<ul><li><strong>Registered Name:</strong> Archanda AG</li><li><strong>Legal Form:</strong> Swiss Stock Corporation (Aktiengesellschaft)</li><li><strong>Registered Office:</strong> Zurich, Switzerland</li><li><strong>Registered Address:</strong> Aurorastrasse 56, 8032 Zurich, Switzerland</li><li><strong>Company Identification Number (UID):</strong> CHE-457.789.143</li><li><strong>Date of Articles of Association:</strong> 2 August 2022</li><li><strong>Share Capital:</strong> CHF 100,000</li><li><strong>Registration Status:</strong> Active</li></ul>',
    imageUrl: null,
  },
  {
    id: 'archanda-our-commitment',
    order: 8,
    heading: 'Our Commitment',
    body: '<p>Archanda AG is committed to conducting its business in accordance with its corporate purpose, applicable contractual obligations, and relevant laws and regulations.</p><p>We value long-term commercial relationships built on trust, clarity, and responsible business conduct.</p><p>Archanda AG — Zurich, Switzerland.</p>',
    imageUrl: null,
  },
];

export const ARCHANDA_DEFAULT_ABOUT_SECTIONS: PageSection[] = [
  ...ARCHANDA_BASE_ABOUT_SECTIONS,
  ...ARCHANDA_ABOUT_SECTIONS,
];
