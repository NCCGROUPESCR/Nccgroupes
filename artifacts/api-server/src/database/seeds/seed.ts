import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User, UserRole } from '../../modules/users/entities/user.entity';
import { Wallet } from '../../modules/wallets/entities/wallet.entity';
import { Transaction, TransactionStatus } from '../../modules/transactions/entities/transaction.entity';
import { ChatMessage, ChatMessageType } from '../../modules/chat/entities/chat-message.entity';
import { Dispute, DisputeStatus } from '../../modules/disputes/entities/dispute.entity';
import { Page, PageStatus } from '../../modules/content/entities/page.entity';
import { BlogPost, BlogPostStatus } from '../../modules/content/entities/blog-post.entity';
import { StaffMember } from '../../modules/content/entities/staff-member.entity';
import { ContactInfo } from '../../modules/content/entities/contact-info.entity';
import { ARCHANDA_DEFAULT_ABOUT_SECTIONS } from '../content/archanda-about-sections';
import { ARCHANDA_LEGAL_INFORMATION } from '../content/archanda-legal-information';
import { LegalDocument, LegalDocumentStatus } from '../../modules/content/entities/legal-document.entity';
import { LegalDocumentRevision } from '../../modules/content/entities/legal-document-revision.entity';

const DEMO_PASSWORD = 'demo1234';

async function seed() {
  await dataSource.initialize();
  console.log('Connected. Seeding Archanda AG demo data...');

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const userRepo = dataSource.getRepository(User);

  // --- 4 buyers, 4 sellers, 4 support, 1 real admin ---
  const buyerSeed = [
    { name: 'Amara Chukwu', email: 'amara1@buyer.demo' },
    { name: 'Bola Adisa', email: 'bola2@buyer.demo' },
    { name: 'Chinedu Eze', email: 'chinedu3@buyer.demo' },
    { name: 'Deborah Musa', email: 'deborah4@buyer.demo' },
  ];
  const sellerSeed = [
    { name: 'Tunde Okafor — Okafor Textiles Ltd', email: 'tunde1@seller.demo', trustScore: 88, businessVerified: true },
    { name: 'Funmi Alade — Alade Electronics', email: 'funmi2@seller.demo', trustScore: 82, businessVerified: true },
    { name: 'Ibrahim Sule — Sahel Agro Exports', email: 'ibrahim3@seller.demo', trustScore: 90, businessVerified: true },
    { name: 'Grace Nwosu — Nwosu Furniture Works', email: 'grace4@seller.demo', trustScore: 76, businessVerified: false },
  ];
  const supportSeed = [
    { name: 'Ngozi Bello', email: 'ngozi1@kudiescrow.demo' },
    { name: 'Emeka Obiora', email: 'emeka2@kudiescrow.demo' },
    { name: 'Halima Yusuf', email: 'halima3@kudiescrow.demo' },
    { name: 'Segun Adewale', email: 'segun4@kudiescrow.demo' },
  ];
  const adminSeed = [{ name: 'Platform Admin', email: 'admin@kudiescrow.demo' }];

  // Demo transactions/wallets/chat/disputes reference specific buyer/seller/
  // support ids and are only meaningful the first time this runs.
  // Track whether the whole demo dataset already existed so we don't
  // duplicate that part on every boot, while still independently
  // backfilling any individual user (e.g. admin/support) that is missing —
  // this can happen if an earlier deploy seeded before those roles were
  // added to this script, since findOne-and-skip made that state permanent.
  const demoDataAlreadySeeded = !!(await userRepo.findOne({ where: { email: 'amara1@buyer.demo' } }));

  async function ensureUsers(
    seedList: { name: string; email: string; trustScore?: number; businessVerified?: boolean }[],
    role: UserRole,
  ): Promise<User[]> {
    const result: User[] = [];
    for (const s of seedList) {
      let user = await userRepo.findOne({ where: { email: s.email } });
      if (!user) {
        user = await userRepo.save(
          userRepo.create({
            name: s.name,
            email: s.email,
            passwordHash,
            role,
            trustScore: s.trustScore ?? 70,
            businessVerified: s.businessVerified,
          }),
        );
        console.log(`Backfilled missing demo account: ${s.email} (${role})`);
      }
      result.push(user);
    }
    return result;
  }

  const buyers = await ensureUsers(buyerSeed, UserRole.BUYER);
  const sellers = await ensureUsers(sellerSeed, UserRole.SELLER);
  const supportAgents = await ensureUsers(supportSeed, UserRole.SUPPORT);
  const [admin] = await ensureUsers(adminSeed, UserRole.ADMIN);

  if (demoDataAlreadySeeded) {
    console.log('Demo transactions already present — skipping (users backfilled above if any were missing).');
    await seedCms();
    await seedLegalDocuments();
    await dataSource.destroy();
    return;
  }

  const [buyer, buyer2] = buyers;
  const [seller, seller2] = sellers;
  const [support] = supportAgents;

  const walletRepo = dataSource.getRepository(Wallet);
  await walletRepo.save(
    [...buyers, ...sellers].map((u, i) =>
      walletRepo.create({
        userId: u.id,
        currency: 'NGN',
        availableBalance: i < buyers.length ? '2450000' : '1180000',
        escrowBalance: '0',
        pendingBalance: '0',
      }),
    ),
  );

  const txnRepo = dataSource.getRepository(Transaction);
  const chatRepo = dataSource.getRepository(ChatMessage);
  const disputeRepo = dataSource.getRepository(Dispute);

  // --- Transaction 1: escrow secured ---
  const t1 = await txnRepo.save(
    txnRepo.create({
      reference: 'KE-2026-483920',
      title: 'Industrial Sewing Machines (x12)',
      category: 'Manufacturing Equipment',
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: '4820000',
      currency: 'NGN',
      status: TransactionStatus.SECURED,
      releaseConditions: 'Funds release after the agreed conditions are confirmed.',
      escrowFundedAt: new Date('2026-06-18T09:20:00Z'),
    }),
  );
  await chatRepo.save([
    chatRepo.create({ transactionId: t1.id, senderId: null, type: ChatMessageType.SYSTEM, body: 'Transaction created. Escrow reference KE-2026-483920.' }),
    chatRepo.create({ transactionId: t1.id, senderId: buyer.id, type: ChatMessageType.TEXT, body: 'Funds are secured in escrow. Please confirm the agreed terms for this transaction.' }),
    chatRepo.create({ transactionId: t1.id, senderId: seller.id, type: ChatMessageType.TEXT, body: 'Confirmed — the items match the agreed specifications.' }),
  ]);

  // --- Transaction 2: in dispute ---
  const t2 = await txnRepo.save(
    txnRepo.create({
      reference: 'KE-2026-119004',
      title: 'Handmade Ankara Fabric Bundle (200 yards)',
      category: 'Textiles',
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: '610000',
      currency: 'NGN',
      status: TransactionStatus.DISPUTE,
      releaseConditions: 'Funds release after the agreed specifications are confirmed.',
      escrowFundedAt: new Date('2026-06-24T13:05:00Z'),
    }),
  );
  await chatRepo.save([
    chatRepo.create({ transactionId: t2.id, senderId: null, type: ChatMessageType.SYSTEM, body: 'Transaction created. Escrow reference KE-2026-119004.' }),
    chatRepo.create({ transactionId: t2.id, senderId: buyer.id, type: ChatMessageType.TEXT, body: 'The fabric colour and weight do not match the agreed specifications.' }),
    chatRepo.create({ transactionId: t2.id, senderId: seller.id, type: ChatMessageType.TEXT, body: 'That is the exact batch shown, dye lots can vary slightly but it is the same grade.' }),
    chatRepo.create({ transactionId: t2.id, senderId: buyer.id, type: ChatMessageType.TEXT, body: 'I would like support to review before funds are released.' }),
    chatRepo.create({ transactionId: t2.id, senderId: null, type: ChatMessageType.SYSTEM, body: 'Dispute opened by buyer. Escrow funds frozen. Support has joined this conversation.' }),
    chatRepo.create({ transactionId: t2.id, senderId: support.id, type: ChatMessageType.TEXT, body: 'Thanks both — I have frozen the release. Buyer, please upload photos of the fabric next to the original listing for comparison.' }),
  ]);
  await disputeRepo.save(
    disputeRepo.create({
      transactionId: t2.id,
      openedBy: buyer.id,
      reason: 'Item does not match listing description',
      status: DisputeStatus.INVESTIGATING,
      assignedAgentId: support.id,
    }),
  );

  // --- Transaction 3: pending funding ---
  const t3 = await txnRepo.save(
    txnRepo.create({
      reference: 'KE-2026-720117',
      title: 'Refurbished MacBook Pro 14" (x5 units)',
      category: 'Electronics',
      buyerId: buyer2.id,
      sellerId: seller2.id,
      amount: '3150000',
      currency: 'NGN',
      status: TransactionStatus.PENDING,
      releaseConditions: 'Funds release after the agreed conditions are confirmed, with a 24-hour review window.',
    }),
  );
  await chatRepo.save([
    chatRepo.create({ transactionId: t3.id, senderId: null, type: ChatMessageType.SYSTEM, body: 'Transaction created. Awaiting buyer to fund escrow.' }),
  ]);

  // --- Transaction 4: fully released ---
  const t4 = await txnRepo.save(
    txnRepo.create({
      reference: 'KE-2026-055881',
      title: 'Cocoa Beans — Bulk Export Lot (2 tonnes)',
      category: 'Agriculture Export',
      buyerId: buyer.id,
      sellerId: seller.id,
      amount: '9200000',
      currency: 'NGN',
      status: TransactionStatus.RELEASED,
      releaseConditions: 'Funds release after the agreed conditions are confirmed.',
      escrowFundedAt: new Date('2026-05-30T08:10:00Z'),
      escrowReleasedAt: new Date('2026-06-10T09:00:00Z'),
    }),
  );
  await chatRepo.save([
    chatRepo.create({ transactionId: t4.id, senderId: null, type: ChatMessageType.SYSTEM, body: 'Transaction created. Escrow reference KE-2026-055881.' }),
    chatRepo.create({ transactionId: t4.id, senderId: buyer.id, type: ChatMessageType.TEXT, body: 'The agreed conditions are confirmed, and the quality matches the sample. Releasing funds.' }),
    chatRepo.create({ transactionId: t4.id, senderId: null, type: ChatMessageType.SYSTEM, body: 'Escrow released to seller. Transaction complete.' }),
  ]);

  console.log('');
  console.log('=== Seed complete — demo accounts (all use password: ' + DEMO_PASSWORD + ') ===');
  console.log('');
  console.log('BUYERS:');
  buyers.forEach((u) => console.log(`  ${u.name.padEnd(28)} ${u.email}`));
  console.log('SELLERS:');
  sellers.forEach((u) => console.log(`  ${u.name.padEnd(28)} ${u.email}`));
  console.log('SUPPORT:');
  supportAgents.forEach((u) => console.log(`  ${u.name.padEnd(28)} ${u.email}`));
  console.log('ADMIN:');
  console.log(`  ${admin.name.padEnd(28)} ${admin.email}`);
  console.log('');
  console.log(`Password for every account above: ${DEMO_PASSWORD}`);
  console.log('');

  await seedCms();
  await seedLegalDocuments();

  await dataSource.destroy();
}

/** Seeds default CMS content (pages, contact info, staff, one blog post) —
 * idempotent, safe to run on every boot alongside the demo dataset above. */
async function seedCms() {
  const pageRepo = dataSource.getRepository(Page);
  const blogRepo = dataSource.getRepository(BlogPost);
  const staffRepo = dataSource.getRepository(StaffMember);
  const contactRepo = dataSource.getRepository(ContactInfo);

  const defaultPages: { slug: string; title: string; subtitle: string; sections: Page['sections'] }[] = [
    {
      slug: 'about-us',
      title: 'About Archanda AG',
      subtitle: 'Building trust into every cross-border transaction.',
      sections: ARCHANDA_DEFAULT_ABOUT_SECTIONS,
    },
    {
      slug: 'faq',
      title: 'Frequently Asked Questions',
      subtitle: 'Answers to common questions about escrow and payments.',
      sections: [
        { id: 'what-is-escrow', order: 0, heading: 'What is escrow?', body: 'Escrow means Archanda AG holds the buyer\u2019s payment securely until the agreed transaction conditions are confirmed.', imageUrl: null },
        { id: 'how-long', order: 1, heading: 'How long does a payout take?', body: 'Funds are released after the buyer confirms the agreed conditions.', imageUrl: null },
      ],
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      subtitle: 'How we collect, use, and protect your information.',
      sections: [
        { id: 'overview', order: 0, heading: 'Overview', body: 'This placeholder privacy policy will be replaced with Archanda AG\u2019s finalized legal text.', imageUrl: null },
      ],
    },
    {
      slug: 'terms-conditions',
      title: 'Terms & Conditions',
      subtitle: 'The terms that govern your use of Archanda AG.',
      sections: [
        { id: 'overview', order: 0, heading: 'Overview', body: 'This placeholder terms document will be replaced with Archanda AG\u2019s finalized legal text.', imageUrl: null },
      ],
    },
  ];

  for (const p of defaultPages) {
    const existing = await pageRepo.findOne({ where: { slug: p.slug } });
    if (!existing) {
      await pageRepo.save(pageRepo.create({ ...p, status: PageStatus.PUBLISHED, publishedAt: new Date() }));
      console.log(`Seeded CMS page: ${p.slug}`);
    }
  }

  const existingContactInfo = await contactRepo.findOne({ where: {} });
  if (!existingContactInfo) {
    await contactRepo.save(
      contactRepo.create({
        companyName: 'Archanda AG',
        addresses: [],
        emails: [],
        phones: [],
        whatsapp: null,
        businessHours: null,
        mapsEmbedUrl: null,
        socialLinks: {},
      }),
    );
    console.log('Seeded default contact info.');
  }

  const staffSeed = [
    { fullName: 'Ngozi Adeyemi', position: 'Chief Executive Officer', department: 'Leadership', biography: 'Ngozi leads Archanda AG\u2019s strategy and operations across all markets.', displayOrder: 0 },
    { fullName: 'Tunde Bakare', position: 'Head of Trust & Safety', department: 'Operations', biography: 'Tunde oversees dispute resolution and platform risk.', displayOrder: 1 },
  ];
  for (const s of staffSeed) {
    const existing = await staffRepo.findOne({ where: { fullName: s.fullName } });
    if (!existing) {
      await staffRepo.save(staffRepo.create(s));
      console.log(`Seeded staff member: ${s.fullName}`);
    }
  }

  const existingPost = await blogRepo.findOne({ where: { slug: 'welcome-to-goldkuste' } });
  if (!existingPost) {
    await blogRepo.save(
      blogRepo.create({
        title: 'Welcome to Archanda AG',
        slug: 'welcome-to-goldkuste',
        summary: 'Introducing Archanda AG for secure cross-border escrow transactions.',
        content: '<p>Archanda AG holds payment securely through escrow until the agreed transaction conditions are confirmed, with private deal chat and dispute resolution.</p>',
        authorName: 'Archanda AG Team',
        status: BlogPostStatus.PUBLISHED,
        publishDate: new Date(),
        categories: ['Announcements'],
        tags: ['escrow', 'launch'],
        seoTitle: 'Welcome to Archanda AG',
        seoDescription: 'Introducing Archanda AG for secure cross-border escrow transactions.',
      }),
    );
    console.log('Seeded welcome blog post.');
  }
}

/** Seeds all 20 legal & compliance documents — idempotent (skips any that already exist by slug). */
async function seedLegalDocuments() {
  const legalRepo = dataSource.getRepository(LegalDocument);
  const revisionRepo = dataSource.getRepository(LegalDocumentRevision);

  const placeholder = (name: string) =>
    `<p>This is the placeholder content for the <strong>${name}</strong>. Please edit and publish the final legal text from the Admin CMS.</p>`;

  const docs: {
    slug: string;
    title: string;
    seoDescription: string;
    tags: string[];
    seoTitle?: string;
    body?: string;
    status?: LegalDocumentStatus;
  }[] = [
    {
      slug: ARCHANDA_LEGAL_INFORMATION.slug,
      title: ARCHANDA_LEGAL_INFORMATION.title,
      seoTitle: ARCHANDA_LEGAL_INFORMATION.seoTitle,
      seoDescription: ARCHANDA_LEGAL_INFORMATION.seoDescription,
      tags: [...ARCHANDA_LEGAL_INFORMATION.tags],
      body: ARCHANDA_LEGAL_INFORMATION.body,
      status: LegalDocumentStatus.PUBLISHED,
    },
    { slug: 'terms-conditions',               title: 'Terms & Conditions',               seoDescription: 'The terms that govern your use of Archanda AG.',                         tags: ['legal', 'terms'] },
    { slug: 'privacy-policy',                 title: 'Privacy Policy',                   seoDescription: 'How Archanda AG collects, uses, and protects your personal data.',       tags: ['legal', 'privacy'] },
    { slug: 'cookie-policy',                  title: 'Cookie Policy',                    seoDescription: 'How Archanda AG uses cookies and similar technologies.',                tags: ['legal', 'cookies'] },
    { slug: 'aml-policy',                     title: 'Anti-Money Laundering (AML) Policy', seoDescription: 'Archanda AG\'s commitment to preventing money laundering.',             tags: ['legal', 'compliance', 'aml'] },
    { slug: 'kyc-policy',                     title: 'Know Your Customer (KYC) Policy',  seoDescription: 'Archanda AG\'s customer identification and verification procedures.',      tags: ['legal', 'compliance', 'kyc'] },
    { slug: 'ctf-policy',                     title: 'Counter-Terrorist Financing (CTF) Policy', seoDescription: 'Archanda AG\'s measures against terrorist financing.',           tags: ['legal', 'compliance', 'ctf'] },
    { slug: 'sanctions-compliance-policy',    title: 'Sanctions Compliance Policy',      seoDescription: 'Archanda AG\'s compliance with international sanctions regimes.',        tags: ['legal', 'compliance', 'sanctions'] },
    { slug: 'buyer-protection-policy',        title: 'Buyer Protection Policy',          seoDescription: 'How Archanda AG protects buyers in escrow transactions.',               tags: ['legal', 'buyer'] },
    { slug: 'seller-protection-policy',       title: 'Seller Protection Policy',         seoDescription: 'How Archanda AG protects sellers in escrow transactions.',              tags: ['legal', 'seller'] },
    { slug: 'escrow-service-agreement',       title: 'Escrow Service Agreement',         seoDescription: 'The agreement governing Archanda AG\'s escrow services.',               tags: ['legal', 'escrow'] },
    { slug: 'escrow-release-policy',          title: 'Escrow Release Policy',            seoDescription: 'How and when Archanda AG releases funds from escrow.',                  tags: ['legal', 'escrow'] },
    { slug: 'refund-cancellation-policy',     title: 'Refund & Cancellation Policy',     seoDescription: 'Archanda AG\'s rules for refunds and transaction cancellations.',       tags: ['legal', 'refund'] },
    { slug: 'complaint-dispute-resolution',   title: 'Complaint & Dispute Resolution Policy', seoDescription: 'How Archanda AG handles complaints and resolves disputes.',       tags: ['legal', 'dispute'] },
    { slug: 'data-protection-policy',         title: 'Data Protection Policy',           seoDescription: 'Archanda AG\'s obligations under applicable data protection laws.',     tags: ['legal', 'data', 'privacy'] },
    { slug: 'data-retention-policy',          title: 'Data Retention Policy',            seoDescription: 'How long Archanda AG retains your data and why.',                       tags: ['legal', 'data'] },
    { slug: 'information-security-policy',    title: 'Information Security Policy',      seoDescription: 'Archanda AG\'s approach to protecting platform and user data.',         tags: ['legal', 'security'] },
    { slug: 'fraud-prevention-policy',        title: 'Fraud Prevention Policy',          seoDescription: 'How Archanda AG detects and prevents fraud on the platform.',          tags: ['legal', 'fraud', 'security'] },
    { slug: 'risk-management-policy',         title: 'Risk Management Policy',           seoDescription: 'Archanda AG\'s framework for identifying and managing risk.',          tags: ['legal', 'risk'] },
    { slug: 'disclaimer',                     title: 'Disclaimer',                       seoDescription: 'Important disclaimers regarding the use of Archanda AG\'s platform.',   tags: ['legal', 'disclaimer'] },
    { slug: 'acceptable-use-policy',          title: 'Acceptable Use Policy',            seoDescription: 'Rules for acceptable behaviour on the Archanda AG platform.',          tags: ['legal', 'aup'] },
  ];

  for (const d of docs) {
    const existing = await legalRepo.findOne({ where: { slug: d.slug } });
    if (!existing) {
      const doc = await legalRepo.save(
        legalRepo.create({
          title: d.title,
          slug: d.slug,
          body: d.body ?? placeholder(d.title),
          seoTitle: d.seoTitle ?? d.title + ' — Archanda AG',
          seoDescription: d.seoDescription,
          tags: d.tags,
          author: 'Archanda AG Legal Team',
          versionNumber: '1.0',
          status: d.status ?? LegalDocumentStatus.DRAFT,
          publishedAt: d.status === LegalDocumentStatus.PUBLISHED ? new Date() : null,
        }),
      );
      await revisionRepo.save(
        revisionRepo.create({
          documentId: doc.id,
          title: doc.title,
          body: doc.body,
          versionNumber: doc.versionNumber,
          editor: 'System',
          note: 'Initial seed',
        }),
      );
      console.log(`Seeded legal document: ${d.slug}`);
    }
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
