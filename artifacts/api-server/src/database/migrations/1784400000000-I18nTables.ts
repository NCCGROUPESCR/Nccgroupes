import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates i18n_languages, i18n_translations tables; seeds 32 languages + English translations. */
export class I18nTables1784400000000 implements MigrationInterface {
  name = 'I18nTables1784400000000';

  public async up(qr: QueryRunner): Promise<void> {
    // ── Tables ──────────────────────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "i18n_languages" (
        "code"        VARCHAR(10) NOT NULL,
        "name"        VARCHAR NOT NULL,
        "nativeName"  VARCHAR NOT NULL,
        "flagEmoji"   VARCHAR(10) NOT NULL,
        "isRTL"       BOOLEAN NOT NULL DEFAULT false,
        "isEnabled"   BOOLEAN NOT NULL DEFAULT true,
        "isDefault"   BOOLEAN NOT NULL DEFAULT false,
        "sortOrder"   INTEGER NOT NULL DEFAULT 100,
        "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_i18n_languages" PRIMARY KEY ("code")
      );
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "i18n_translations" (
        "id"            SERIAL NOT NULL,
        "languageCode"  VARCHAR(10) NOT NULL,
        "namespace"     VARCHAR(60) NOT NULL,
        "key"           VARCHAR(255) NOT NULL,
        "value"         TEXT,
        "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
        "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_i18n_translations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_i18n_translations_lang_ns_key" UNIQUE ("languageCode", "namespace", "key")
      );
      CREATE INDEX IF NOT EXISTS "IDX_i18n_trans_lang" ON "i18n_translations" ("languageCode");
      CREATE INDEX IF NOT EXISTS "IDX_i18n_trans_ns"   ON "i18n_translations" ("namespace");
    `);

    // ── Languages ───────────────────────────────────────────────────────────
    await qr.query(`
      INSERT INTO "i18n_languages"
        ("code","name","nativeName","flagEmoji","isRTL","isEnabled","isDefault","sortOrder")
      VALUES
        ('en',   'English',              'English',          '🇺🇸', false, true,  true,   1),
        ('de',   'German',               'Deutsch',          '🇩🇪', false, true,  false,  2),
        ('fr',   'French',               'Français',         '🇫🇷', false, true,  false,  3),
        ('es',   'Spanish',              'Español',          '🇪🇸', false, true,  false,  4),
        ('it',   'Italian',              'Italiano',         '🇮🇹', false, true,  false,  5),
        ('pt',   'Portuguese',           'Português',        '🇵🇹', false, true,  false,  6),
        ('nl',   'Dutch',                'Nederlands',       '🇳🇱', false, true,  false,  7),
        ('pl',   'Polish',               'Polski',           '🇵🇱', false, true,  false,  8),
        ('cs',   'Czech',                'Čeština',          '🇨🇿', false, true,  false,  9),
        ('sv',   'Swedish',              'Svenska',          '🇸🇪', false, true,  false, 10),
        ('no',   'Norwegian',            'Norsk',            '🇳🇴', false, true,  false, 11),
        ('da',   'Danish',               'Dansk',            '🇩🇰', false, true,  false, 12),
        ('fi',   'Finnish',              'Suomi',            '🇫🇮', false, true,  false, 13),
        ('ro',   'Romanian',             'Română',           '🇷🇴', false, true,  false, 14),
        ('hu',   'Hungarian',            'Magyar',           '🇭🇺', false, true,  false, 15),
        ('el',   'Greek',                'Ελληνικά',         '🇬🇷', false, true,  false, 16),
        ('ru',   'Russian',              'Русский',          '🇷🇺', false, true,  false, 17),
        ('uk',   'Ukrainian',            'Українська',       '🇺🇦', false, true,  false, 18),
        ('tr',   'Turkish',              'Türkçe',           '🇹🇷', false, true,  false, 19),
        ('ar',   'Arabic',               'العربية',          '🇸🇦', true,  true,  false, 20),
        ('he',   'Hebrew',               'עברית',            '🇮🇱', true,  true,  false, 21),
        ('hi',   'Hindi',                'हिन्दी',            '🇮🇳', false, true,  false, 22),
        ('zh',   'Chinese (Simplified)', '简体中文',           '🇨🇳', false, true,  false, 23),
        ('zh-TW','Chinese (Traditional)','繁體中文',           '🇹🇼', false, true,  false, 24),
        ('ja',   'Japanese',             '日本語',            '🇯🇵', false, true,  false, 25),
        ('ko',   'Korean',               '한국어',            '🇰🇷', false, true,  false, 26),
        ('th',   'Thai',                 'ไทย',              '🇹🇭', false, true,  false, 27),
        ('vi',   'Vietnamese',           'Tiếng Việt',       '🇻🇳', false, true,  false, 28),
        ('id',   'Indonesian',           'Bahasa Indonesia',  '🇮🇩', false, true,  false, 29),
        ('ms',   'Malay',                'Bahasa Melayu',    '🇲🇾', false, true,  false, 30),
        ('tl',   'Filipino',             'Filipino',         '🇵🇭', false, true,  false, 31),
        ('en-NG','English (Nigeria)',     'English (Nigeria)','🇳🇬', false, true,  false, 32)
      ON CONFLICT ("code") DO NOTHING;
    `);

    // ── English translations ─────────────────────────────────────────────────
    // Helper: insert a batch of translations for English
    const ins = async (ns: string, rows: [string, string][]) => {
      if (!rows.length) return;
      const values = rows
        .map(([k, v]) => `('en', '${ns}', '${k.replace(/'/g, "''")}', '${v.replace(/'/g, "''")}', false)`)
        .join(',\n');
      await qr.query(`
        INSERT INTO "i18n_translations" ("languageCode","namespace","key","value","isAIGenerated")
        VALUES ${values}
        ON CONFLICT ("languageCode","namespace","key") DO NOTHING;
      `);
    };

    // ── nav ──────────────────────────────────────────────────────────────────
    await ins('nav', [
      ['how_it_works',    'How it works'],
      ['platform',        'Platform'],
      ['tracking',        'Tracking'],
      ['developers',      'Developers'],
      ['pricing',         'Pricing'],
      ['about_us',        'About Us'],
      ['our_story',       'Our Story'],
      ['our_mission',     'Our Mission'],
      ['our_vision',      'Our Vision'],
      ['leadership',      'Leadership'],
      ['staff_team',      'Staff / Team'],
      ['blog',            'Blog'],
      ['documentation',   'Documentation'],
      ['contact_us',      'Contact Us'],
      ['log_in',          'Log in'],
      ['start_transaction','Start a transaction'],
      ['select_language', 'Language'],
      ['menu',            'Menu'],
    ]);

    // ── footer ───────────────────────────────────────────────────────────────
    await ins('footer', [
      ['tagline',               'Secure escrow and logistics infrastructure for local and international trade.'],
      ['platform',              'Platform'],
      ['escrow_services',       'Escrow services'],
      ['buyer_protection',      'Buyer protection'],
      ['seller_protection',     'Seller protection'],
      ['trade_assurance',       'Trade assurance'],
      ['shipment_tracking',     'Shipment tracking'],
      ['escrow_api',            'Escrow API'],
      ['industries',            'Industries'],
      ['escrow_ecommerce',      'Escrow for e-commerce'],
      ['escrow_importers',      'Escrow for importers'],
      ['escrow_exporters',      'Escrow for exporters'],
      ['escrow_freelancers',    'Escrow for freelancers'],
      ['escrow_real_estate',    'Escrow for real estate'],
      ['escrow_wholesale',      'Escrow for wholesale'],
      ['global_escrow',         'Global Escrow'],
      ['escrow_europe',         'Escrow for Europe'],
      ['cross_border_trade',    'Cross-border trade'],
      ['multi_currency',        'Multi-currency escrow'],
      ['resources',             'Resources'],
      ['what_is_escrow',        'What is escrow?'],
      ['fraud_prevention',      'Fraud prevention'],
      ['import_china_guide',    'Import from China guide'],
      ['developer_docs',        'Developer docs'],
      ['contact_support',       'Contact support'],
      ['legal',                 'Legal'],
      ['terms_conditions',      'Terms & Conditions'],
      ['privacy_policy',        'Privacy Policy'],
      ['copyright',             '© 2026 NCC Group Escrow. International escrow & logistics.'],
      ['terms',                 'Terms'],
      ['privacy',               'Privacy'],
      ['security',              'Security'],
    ]);

    // ── common ───────────────────────────────────────────────────────────────
    await ins('common', [
      ['loading',           'Loading…'],
      ['error',             'Something went wrong. Please try again.'],
      ['save',              'Save'],
      ['cancel',            'Cancel'],
      ['submit',            'Submit'],
      ['edit',              'Edit'],
      ['delete',            'Delete'],
      ['create',            'Create'],
      ['view',              'View →'],
      ['back',              'Back'],
      ['next',              'Next'],
      ['search',            'Search'],
      ['filter',            'Filter'],
      ['no_results',        'No results found'],
      ['required_field',    'This field is required'],
      ['success',           'Done!'],
      ['yes',               'Yes'],
      ['no',                'No'],
      ['close',             'Close'],
      ['confirm',           'Confirm'],
      ['currency',          'Currency'],
      ['amount',            'Amount'],
      ['date',              'Date'],
      ['status',            'Status'],
      ['actions',           'Actions'],
      ['name',              'Name'],
      ['email',             'Email'],
      ['phone',             'Phone'],
      ['country',           'Country'],
      ['language',          'Language'],
      ['settings',          'Settings'],
      ['profile',           'Profile'],
      ['logout',            'Log out'],
      ['dashboard',         'Dashboard'],
      ['notifications',     'Notifications'],
      ['wallet',            'Wallet'],
      ['transactions',      'Transactions'],
      ['shipments',         'Shipments'],
      ['upload',            'Upload'],
      ['download',          'Download'],
      ['copy',              'Copy'],
      ['copied',            'Copied!'],
      ['new',               'New'],
      ['all',               'All'],
      ['active',            'Active'],
      ['completed',         'Completed'],
      ['pending',           'Pending'],
      ['cancelled',         'Cancelled'],
      ['disputed',          'Disputed'],
      ['released',          'Released'],
      ['funded',            'Funded'],
      ['buyer',             'Buyer'],
      ['seller',            'Seller'],
      ['logistics',         'Logistics'],
      ['admin',             'Administrator'],
      ['support',           'Support'],
      ['developer',         'Developer'],
      ['reference',         'Reference'],
      ['description',       'Reference / Description'],
      ['created_at',        'Created'],
      ['updated_at',        'Updated'],
      ['view_all',          'View all'],
      ['see_more',          'See more'],
    ]);

    // ── auth ─────────────────────────────────────────────────────────────────
    await ins('auth', [
      ['login_title',       'Welcome back'],
      ['login_subtitle',    'Sign in to your NCC Group Escrow account'],
      ['email_label',       'Email address'],
      ['password_label',    'Password'],
      ['forgot_password',   'Forgot password?'],
      ['no_account',        'Don\'t have an account?'],
      ['sign_up',           'Sign up'],
      ['login_btn',         'Sign in'],
      ['signup_title',      'Create your account'],
      ['signup_subtitle',   'Join NCC Group Escrow and start trading securely'],
      ['full_name',         'Full name'],
      ['confirm_password',  'Confirm password'],
      ['have_account',      'Already have an account?'],
      ['sign_in',           'Sign in'],
      ['register_btn',      'Create account'],
      ['role_label',        'I am a…'],
      ['buyer_role',        'Buyer — I want to purchase goods'],
      ['seller_role',       'Seller — I want to sell goods'],
      ['logistics_role',    'Logistics — I provide shipping services'],
      ['developer_role',    'Developer — I\'m integrating the API'],
      ['forgot_title',      'Reset your password'],
      ['forgot_subtitle',   'Enter your email and we\'ll send a reset link'],
      ['forgot_btn',        'Send reset link'],
      ['reset_title',       'Set new password'],
      ['reset_subtitle',    'Choose a strong password for your account'],
      ['reset_btn',         'Set new password'],
      ['new_password',      'New password'],
      ['password_min',      'At least 8 characters'],
      ['agree_terms',       'I agree to the Terms & Conditions and Privacy Policy'],
      ['or',                'or'],
    ]);

    // ── landing ───────────────────────────────────────────────────────────────
    await ins('landing', [
      ['eyebrow',              'Escrow · Logistics · Trade assurance'],
      ['hero_h1_1',            'Secure payments.'],
      ['hero_h1_2',            'Trusted trade.'],
      ['hero_h1_3',            'Global delivery.'],
      ['hero_lead',            'NCC Group Escrow holds your payment until delivery is confirmed — with live shipment tracking, a private deal chat, and a support team that steps in the moment something\'s wrong.'],
      ['start_transaction',    'Start a transaction'],
      ['see_how_escrow',       'See how escrow works'],
      ['trust_held',           'Held in escrow to date'],
      ['trust_disputes',       'Disputes resolved fairly'],
      ['trust_countries',      'Countries served'],
      ['how_eyebrow',          'The escrow flow'],
      ['how_h2',               'Three steps stand between "agreed" and "paid."'],
      ['step1_num',            '01 — Fund'],
      ['step1_h3',             'Buyer funds escrow'],
      ['step1_p',              'Payment moves into a secured NCC Group Escrow account by bank transfer, card, mobile money, or crypto — never straight to the seller.'],
      ['step2_num',            '02 — Ship & talk'],
      ['step2_h3',             'Seller ships, everyone tracks'],
      ['step2_p',              'A private deal chat opens automatically. Logistics updates, documents, and shipment location post there in real time.'],
      ['step3_num',            '03 — Release'],
      ['step3_h3',             'Funds release on confirmation'],
      ['step3_p',              'Buyer confirms delivery and funds release instantly. If something\'s off, either side can open a dispute before release.'],
      ['features_eyebrow',     'One ecosystem'],
      ['features_h2',          'Everything a transaction needs, under one roof.'],
      ['feat_escrow_h3',       'Escrow engine'],
      ['feat_escrow_p',        'Full and partial refunds, multi-stage release, and a complete transaction timeline for every deal.'],
      ['feat_chat_h3',         'Buyer & seller chat'],
      ['feat_chat_p',          'Every transaction gets a private, encrypted chat — images, documents, voice notes, and system updates in one thread.'],
      ['feat_tracking_h3',     'Live shipment tracking'],
      ['feat_tracking_p',      'Air, sea, and road freight tracked on one map with customs checkpoints and an honest ETA — not a static status page.'],
      ['feat_dispute_h3',      'Dispute resolution'],
      ['feat_dispute_p',       'Open a dispute and funds freeze instantly. Support joins your existing chat — no new ticket, no lost context.'],
      ['feat_logistics_h3',    'Logistics network'],
      ['feat_logistics_p',     'Book platform logistics or bring your own provider. Pickup, warehousing, and proof of delivery, handled either way.'],
      ['feat_api_h3',          'Developer API'],
      ['feat_api_p',           'Escrow, payments, wallets, and tracking as REST endpoints and webhooks — bring NCC Group Escrow into your own marketplace.'],
      ['industries_eyebrow',   'Built for real trade'],
      ['industries_h2',        'From market stalls to shipping containers.'],
      ['industries_p',         'NCC Group Escrow secures transactions across import/export, wholesale, freelance work, and cross-border commerce.'],
      ['industry_ecommerce',   'E-commerce'],
      ['industry_importers',   'Importers & exporters'],
      ['industry_freelancers', 'Freelancers'],
      ['industry_wholesale',   'Wholesale'],
      ['industry_manufacturing','Manufacturing'],
      ['industry_real_estate', 'Real estate'],
      ['industry_marketplaces','Marketplaces'],
      ['industry_crypto',      'Crypto trade'],
      ['pricing_eyebrow',      'Transparent pricing'],
      ['pricing_h2_1',         'No hidden fees.'],
      ['pricing_h2_2',         'Pay only when you transact.'],
      ['pricing_p',            'Every plan includes secure escrow, multi-currency support, and dispute resolution. Choose the tier that fits your trade volume.'],
      ['pricing_loading',      'Loading plans…'],
      ['pricing_unavailable',  'Pricing unavailable — view full pricing page'],
      ['see_full_pricing',     'See full pricing & FAQ →'],
      ['cta_eyebrow',          'Ready when you are'],
      ['cta_h2',               'Your next deal deserves a paper trail, not a promise.'],
      ['cta_p',                'No card required to create an account. Fund your first escrow when you\'re ready.'],
      ['create_free_account',  'Create free account'],
      ['explore_api',          'Explore the API'],
      ['most_popular',         'Most popular'],
    ]);

    // ── dashboard ─────────────────────────────────────────────────────────────
    await ins('dashboard', [
      ['welcome_back',          'Welcome back'],
      ['new_transaction',       '+ New transaction'],
      ['new_shipment',          '+ New shipment'],
      ['view_all',              'View all'],
      ['active_transactions',   'Active transactions'],
      ['held_in_escrow',        'Held in escrow'],
      ['available_balance',     'Available balance'],
      ['in_escrow',             'In escrow'],
      ['no_transactions',       'No transactions here yet.'],
      ['no_shipments',          'No shipments yet.'],
      ['filter_all',            'All'],
      ['filter_active',         'Active'],
      ['filter_pending',        'Pending'],
      ['filter_completed',      'Completed'],
      ['filter_disputed',       'Disputed'],
      ['transaction_id',        'Transaction ID'],
      ['counterparty',          'Counterparty'],
      ['fund_escrow',           'Fund escrow'],
      ['release_funds',         'Release funds'],
      ['open_dispute',          'Open dispute'],
      ['track_shipment',        'Track shipment'],
      ['view_chat',             'View chat'],
      ['wallet_balance',        'Wallet balance'],
      ['withdraw',              'Withdraw'],
      ['deposit',               'Deposit'],
      ['total_volume',          'Total volume'],
      ['trust_score',           'Trust score'],
      ['reviews',               'Reviews'],
      ['earnings',              'Earnings'],
      ['this_month',            'This month'],
      ['total_earned',          'Total earned'],
      ['active_shipments',      'Active shipments'],
      ['delivered',             'Delivered'],
      ['in_transit',            'In transit'],
      ['disputes_open',         'Open disputes'],
      ['disputes_resolved',     'Resolved disputes'],
      ['total_users',           'Total users'],
      ['total_transactions',    'Total transactions'],
      ['total_volume_label',    'Total volume'],
    ]);

    // ── buyer ─────────────────────────────────────────────────────────────────
    await ins('buyer', [
      ['dashboard_title',  'Buyer Dashboard'],
      ['my_purchases',     'My purchases'],
      ['confirm_delivery', 'Confirm delivery'],
      ['delivery_confirmed','Delivery confirmed!'],
      ['waiting_shipment', 'Waiting for shipment'],
      ['in_transit',       'In transit'],
      ['delivery_received','I received my order in good condition'],
      ['issue_delivery',   'There is an issue with my delivery'],
    ]);

    // ── seller ────────────────────────────────────────────────────────────────
    await ins('seller', [
      ['dashboard_title',  'Seller Dashboard'],
      ['my_sales',         'My sales'],
      ['ship_order',       'Ship order'],
      ['add_tracking',     'Add tracking info'],
      ['funds_released',   'Funds released'],
      ['awaiting_buyer',   'Awaiting buyer confirmation'],
      ['trust_score',      'Trust score'],
      ['total_reviews',    'Total reviews'],
    ]);

    // ── logistics ─────────────────────────────────────────────────────────────
    await ins('logistics', [
      ['dashboard_title',  'Logistics Dashboard'],
      ['active_shipments', 'Active shipments'],
      ['add_update',       'Add tracking update'],
      ['mark_delivered',   'Mark as delivered'],
      ['pickup_scheduled', 'Pickup scheduled'],
      ['in_transit',       'In transit'],
      ['at_customs',       'At customs'],
      ['delivered',        'Delivered'],
      ['carrier',          'Carrier'],
      ['tracking_number',  'Tracking number'],
      ['origin',           'Origin'],
      ['destination',      'Destination'],
      ['estimated_delivery','Estimated delivery'],
      ['shipment_weight',  'Weight'],
      ['shipment_dims',    'Dimensions'],
    ]);

    // ── transactions ──────────────────────────────────────────────────────────
    await ins('transactions', [
      ['new_title',        'Start a new escrow transaction'],
      ['new_subtitle',     'Fill in the details below. Funds are held securely until both parties confirm.'],
      ['buyer_email',      'Buyer email address'],
      ['seller_email',     'Seller email address'],
      ['amount_label',     'Transaction amount'],
      ['currency_label',   'Currency'],
      ['description_label','Description / reference'],
      ['logistics_opt',    'Include logistics tracking (optional)'],
      ['submit_btn',       'Create transaction'],
      ['fund_btn',         'Fund escrow'],
      ['release_btn',      'Release funds'],
      ['dispute_btn',      'Open dispute'],
      ['cancel_btn',       'Cancel transaction'],
      ['status_pending',   'Pending funding'],
      ['status_funded',    'Escrow funded'],
      ['status_released',  'Funds released'],
      ['status_disputed',  'In dispute'],
      ['status_cancelled', 'Cancelled'],
      ['chat_placeholder', 'Type a message…'],
      ['send_btn',         'Send'],
      ['upload_doc',       'Upload document'],
      ['funding_proof',    'Upload proof of funding'],
      ['timeline',         'Transaction timeline'],
      ['participants',     'Participants'],
      ['shipment_info',    'Shipment information'],
      ['dispute_title',    'Dispute opened'],
      ['dispute_reason',   'Reason for dispute'],
      ['dispute_submit',   'Submit dispute'],
      ['amount_held',      'Amount held'],
      ['logistics_partner','Logistics partner'],
    ]);

    // ── tracking ──────────────────────────────────────────────────────────────
    await ins('tracking', [
      ['page_title',       'Track your shipment'],
      ['page_subtitle',    'Enter your tracking number or transaction reference to see live shipment status.'],
      ['input_label',      'Tracking number or transaction reference'],
      ['track_btn',        'Track'],
      ['status_pickup',    'Pickup scheduled'],
      ['status_in_transit','In transit'],
      ['status_customs',   'At customs'],
      ['status_delivered', 'Delivered'],
      ['estimated',        'Estimated delivery'],
      ['carrier',          'Carrier'],
      ['origin',           'Origin'],
      ['destination',      'Destination'],
      ['checkpoints',      'Checkpoints'],
      ['no_result',        'No shipment found for that reference.'],
      ['proof_delivery',   'Proof of delivery'],
    ]);

    // ── pricing ───────────────────────────────────────────────────────────────
    await ins('pricing', [
      ['page_title',       'Simple, transparent pricing'],
      ['page_subtitle',    'No hidden fees. Pay only when you transact. Every plan includes secure escrow, multi-currency support, and dispute resolution.'],
      ['most_popular',     'Most popular'],
      ['faq_title',        'Frequently asked questions'],
      ['faq_subtitle',     'Everything you need to know about NCC Group Escrow pricing.'],
      ['get_started',      'Get started'],
      ['contact_sales',    'Contact sales'],
      ['per_transaction',  'per transaction'],
      ['included',         'Included'],
    ]);

    // ── developer ─────────────────────────────────────────────────────────────
    await ins('developer', [
      ['page_title',       'Developer platform'],
      ['page_subtitle',    'Build escrow, payments, wallets, and shipment tracking into your own marketplace or app.'],
      ['api_docs',         'API documentation'],
      ['get_api_key',      'Get an API key'],
      ['webhooks',         'Webhooks'],
      ['sdks',             'SDKs & libraries'],
      ['rate_limits',      'Rate limits'],
      ['authentication',   'Authentication'],
      ['sandbox',          'Sandbox environment'],
      ['base_url',         'Base URL'],
    ]);

    // ── docs ──────────────────────────────────────────────────────────────────
    await ins('docs', [
      ['page_title',       'Documentation Center'],
      ['page_subtitle',    'Guides, references, and tutorials for using the NCC Group Escrow platform.'],
      ['search_docs',      'Search documentation…'],
      ['categories',       'Categories'],
      ['all_articles',     'All articles'],
      ['read_article',     'Read article'],
      ['updated',          'Updated'],
      ['related',          'Related articles'],
      ['back_to_docs',     'Back to documentation'],
      ['table_of_contents','Table of contents'],
      ['next_article',     'Next'],
      ['prev_article',     'Previous'],
    ]);

    // ── about ─────────────────────────────────────────────────────────────────
    await ins('about', [
      ['page_title',       'About NCC Group Escrow'],
      ['our_story',        'Our story'],
      ['our_mission',      'Our mission'],
      ['our_vision',       'Our vision'],
      ['leadership',       'Leadership'],
      ['team_title',       'Meet the team'],
      ['team_subtitle',    'The people building NCC Group Escrow.'],
      ['join_team',        'Join our team'],
      ['careers',          'Careers'],
      ['founded',          'Founded'],
      ['headquarters',     'Headquarters'],
      ['employees',        'Employees'],
    ]);

    // ── blog ──────────────────────────────────────────────────────────────────
    await ins('blog', [
      ['page_title',       'NCC Group Escrow Blog'],
      ['page_subtitle',    'News, insights, and updates from the NCC Group Escrow team.'],
      ['read_more',        'Read more →'],
      ['published',        'Published'],
      ['author',           'Author'],
      ['category',         'Category'],
      ['all_posts',        'All posts'],
      ['back_to_blog',     'Back to Blog'],
      ['share',            'Share'],
      ['related_posts',    'Related articles'],
    ]);

    // ── contact ───────────────────────────────────────────────────────────────
    await ins('contact', [
      ['page_title',       'Contact us'],
      ['page_subtitle',    'Our support team is here to help. Reach out and we\'ll get back to you within one business day.'],
      ['form_name',        'Your name'],
      ['form_email',       'Email address'],
      ['form_subject',     'Subject'],
      ['form_message',     'Message'],
      ['form_submit',      'Send message'],
      ['form_success',     'Thanks! We\'ll be in touch shortly.'],
      ['form_error',       'Sorry, something went wrong. Please try again.'],
      ['address_label',    'Address'],
      ['email_label',      'Email'],
      ['phone_label',      'Phone'],
      ['hours_label',      'Support hours'],
    ]);

    // ── legal ─────────────────────────────────────────────────────────────────
    await ins('legal', [
      ['page_title',       'Legal documents'],
      ['terms',            'Terms & Conditions'],
      ['privacy',          'Privacy Policy'],
      ['security',         'Security Policy'],
      ['cookies',          'Cookie Policy'],
      ['effective_date',   'Effective date'],
      ['last_updated',     'Last updated'],
      ['back_to_legal',    'Back'],
      ['revision',         'Revision'],
      ['view_revision',    'View revision'],
    ]);

    // ── faq ───────────────────────────────────────────────────────────────────
    await ins('faq', [
      ['page_title',       'Frequently asked questions'],
      ['page_subtitle',    'Everything you need to know about NCC Group Escrow.'],
      ['search_faq',       'Search questions…'],
      ['no_results',       'No matching questions found.'],
      ['contact_us',       'Still have questions? Contact us →'],
    ]);

    // ── errors ────────────────────────────────────────────────────────────────
    await ins('errors', [
      ['not_found',        'Page not found'],
      ['not_found_sub',    'The page you\'re looking for doesn\'t exist.'],
      ['unauthorized',     'Access restricted'],
      ['unauthorized_sub', 'You don\'t have permission to view this page.'],
      ['server_error',     'Server error'],
      ['server_error_sub', 'Something went wrong on our end. Please try again later.'],
      ['network_error',    'Network error'],
      ['network_error_sub','Please check your connection and try again.'],
      ['session_expired',  'Your session has expired. Please log in again.'],
      ['go_home',          'Go to homepage'],
      ['try_again',        'Try again'],
      ['contact_support',  'Contact support'],
    ]);

    // ── lang (modal & selector) ───────────────────────────────────────────────
    await ins('lang', [
      ['modal_title',      'Choose your preferred language'],
      ['modal_subtitle',   'NCC Group Escrow supports multiple languages. Select your preferred language. You can change it anytime from the language selector.'],
      ['search_placeholder','Search languages…'],
      ['confirm_btn',      'Confirm'],
      ['change_later',     'You can change this anytime in your settings'],
      ['current_language', 'Current language'],
      ['change_language',  'Change language'],
      ['auto_detected',    'Auto-detected from your browser'],
    ]);

    // ── notifications ────────────────────────────────────────────────────────
    await ins('notifications', [
      ['transaction_created',  'New escrow transaction created'],
      ['escrow_funded',        'Escrow has been funded'],
      ['funds_released',       'Funds have been released'],
      ['dispute_opened',       'A dispute has been opened'],
      ['dispute_resolved',     'Dispute resolved'],
      ['shipment_update',      'Shipment status updated'],
      ['shipment_delivered',   'Shipment delivered'],
      ['message_received',     'New message in your transaction chat'],
      ['kyc_approved',         'Your identity verification was approved'],
      ['kyc_rejected',         'Your identity verification needs attention'],
      ['payment_received',     'Payment received'],
      ['withdrawal_processed', 'Withdrawal processed'],
    ]);

    // ── admin ─────────────────────────────────────────────────────────────────
    await ins('admin', [
      ['dashboard_title',  'Admin Dashboard'],
      ['users_title',      'Users'],
      ['transactions_title','Transactions'],
      ['disputes_title',   'Disputes'],
      ['settings_title',   'Settings'],
      ['cms_title',        'Website CMS'],
      ['languages_title',  'Language Manager'],
      ['pricing_title',    'Pricing'],
      ['search_users',     'Search users…'],
      ['change_role',      'Change role'],
      ['verify_business',  'Verify business'],
      ['ban_user',         'Ban user'],
      ['unban_user',       'Unban user'],
      ['total_users',      'Total users'],
      ['total_transactions','Total transactions'],
      ['total_volume',     'Total volume'],
      ['languages_subtitle','Manage languages and translations for the entire platform.'],
      ['enable_language',  'Enable language'],
      ['disable_language', 'Disable language'],
      ['edit_translations','Edit translations'],
      ['auto_translate',   'Auto-translate'],
      ['set_default',      'Set as default'],
      ['import_translations','Import translations'],
      ['export_translations','Export translations'],
      ['translation_progress','Translation progress'],
      ['missing_translations','Missing translations'],
      ['save_translation', 'Save translation'],
      ['translation_key',  'Key'],
      ['translation_value','Translation'],
      ['namespace',        'Namespace'],
      ['ai_generated',     'AI generated'],
      ['human_edited',     'Human edited'],
      ['publish_language', 'Publish language'],
      ['unpublish_language','Unpublish language'],
      ['add_language',     'Add language'],
      ['delete_language',  'Delete language'],
      ['language_code',    'Language code (BCP-47)'],
      ['language_name',    'Language name (English)'],
      ['native_name',      'Native name'],
      ['flag_emoji',       'Flag emoji'],
      ['rtl_language',     'Right-to-left language'],
    ]);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "i18n_translations"`);
    await qr.query(`DROP TABLE IF EXISTS "i18n_languages"`);
  }
}
