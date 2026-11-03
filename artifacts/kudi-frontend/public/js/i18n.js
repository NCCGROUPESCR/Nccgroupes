/* ============================================================
   Archanda AG internationalization client
   - Detects language from localStorage / URL param / browser
   - Fetches all translations from /v1/i18n/{lang}/all
   - Applies via data-i18n attributes AND selector maps (nav/footer)
   - Injects language selector into nav / app-topbar
   - Handles RTL (Arabic, Hebrew)
   - Persists choice to localStorage, cookie, and user profile
   ============================================================ */
(function () {
  'use strict';

  var SUPPORTED = [
    'en','de','fr','es','it','pt','nl','pl','cs','sv','no','da','fi',
    'ro','hu','el','ru','uk','tr','ar','he','hi','zh','zh-TW','ja',
    'ko','th','vi','id','ms','tl','en-NG'
  ];
  var DEFAULT_LANG = 'en';
  var CACHE_PREFIX  = 'ke_i18n_v5_'; // v5: expire cached copy after escrow-only copy updates
  var CACHE_TTL_MS  = 30 * 60 * 1000; // 30 min

  var _lang         = DEFAULT_LANG;
  var _translations = {};
  var _languages    = [];
  var _isRTL        = false;

  // ── Language detection ────────────────────────────────────────────────────
  function detectLang() {
    // 1. URL ?lang= param
    try {
      var qp = new URLSearchParams(window.location.search).get('lang');
      if (qp && SUPPORTED.includes(qp)) { localStorage.setItem('ke_lang', qp); return qp; }
    } catch (e) {}
    // 2. localStorage
    var saved = localStorage.getItem('ke_lang');
    if (saved && SUPPORTED.includes(saved)) return saved;
    // 3. Cookie
    try {
      var c = document.cookie.split(';').map(function (s) { return s.trim(); })
        .find(function (s) { return s.startsWith('ke_lang='); });
      if (c) { var cv = c.split('=')[1]; if (SUPPORTED.includes(cv)) return cv; }
    } catch (e) {}
    // 4. Browser language (exact then base)
    var bl = (navigator.language || navigator.userLanguage || '').trim();
    if (bl && SUPPORTED.includes(bl)) return bl;
    var base = bl.split('-')[0];
    if (base && SUPPORTED.includes(base)) return base;
    return DEFAULT_LANG;
  }

  // ── Translation helper ────────────────────────────────────────────────────
  function tr(dotKey) {
    if (!dotKey) return '';
    var dot = dotKey.indexOf('.');
    if (dot < 1) return dotKey;
    var ns  = dotKey.slice(0, dot);
    var key = dotKey.slice(dot + 1);
    var nsData = _translations[ns];
    if (nsData && nsData[key] !== undefined && nsData[key] !== null) return nsData[key];
    return ''; // preserve the page's static English copy when a translation is absent
  }

  // ── LocalStorage cache ────────────────────────────────────────────────────
  function loadCache(lang) {
    try {
      var raw = localStorage.getItem(CACHE_PREFIX + lang);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (Date.now() - p.ts > CACHE_TTL_MS) { localStorage.removeItem(CACHE_PREFIX + lang); return null; }
      return p.data;
    } catch (e) { return null; }
  }

  function saveCache(lang, data) {
    try { localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
  }

  // ── Safe API base (mirrors store.js guard: ignore un-substituted template) ─
  function apiBase() {
    var v = window.KE_API_BASE;
    return (typeof v === 'string' && v.indexOf('%') === -1) ? v.replace(/\/$/, '') : '';
  }

  // ── Fetch from API ────────────────────────────────────────────────────────
  function fetchTranslations(lang) {
    var cached = loadCache(lang);
    if (cached) return Promise.resolve(cached);
    return fetch(apiBase() + '/v1/i18n/' + encodeURIComponent(lang) + '/all')
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) {
        // Unwrap API envelope: { success: true, data: {...} } → {...}
        var data = (d && d.data !== undefined) ? d.data : d;
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          saveCache(lang, data);
        }
        return data;
      })
      .catch(function () { return {}; });
  }

  function fetchLanguages() {
    return fetch(apiBase() + '/v1/i18n/languages')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) {
        // Unwrap API envelope: { success: true, data: [...] } → [...]
        return (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
      })
      .catch(function () { return []; });
  }

  // ── Apply translations ────────────────────────────────────────────────────
  function applyTranslations() {
    // [data-i18n="ns.key"] → textContent
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = tr(el.getAttribute('data-i18n'));
      if (v && v !== el.getAttribute('data-i18n')) el.textContent = v;
    });
    // [data-i18n-html="ns.key"] → innerHTML (safe for known keys)
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = tr(el.getAttribute('data-i18n-html'));
      if (v) el.innerHTML = v;
    });
    // [data-i18n-placeholder]
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var v = tr(el.getAttribute('data-i18n-placeholder'));
      if (v) el.placeholder = v;
    });
    // [data-i18n-title]
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var v = tr(el.getAttribute('data-i18n-title'));
      if (v) el.title = v;
    });
    // [data-i18n-aria]
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = tr(el.getAttribute('data-i18n-aria'));
      if (v) el.setAttribute('aria-label', v);
    });
    applyNavTranslations();
    applyFooterTranslations();
    applyPageTitle();
  }

  function applyNavTranslations() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;
    function set(sel, key) {
      var el = nav.querySelector(sel);
      var v = tr(key);
      if (el && v) el.textContent = v;
    }
    set('a[href="#how"]',                                'nav.how_it_works');
    set('a[href="#features"]',                           'nav.platform');
    set('a[href="developer.html"]',                      'nav.developers');
    set('a[href="#pricing"]',                            'nav.pricing');
    set('.nav-dropdown-trigger[href="about-us.html"]',   'nav.about_us');
    set('a[href="about-us.html#our-story"]',             'nav.our_story');
    set('a[href="about-us.html#our-mission"]',           'nav.our_mission');
    set('a[href="about-us.html#our-vision"]',            'nav.our_vision');
    set('a[href="about-us.html#leadership"]',            'nav.leadership');
    set('a[href="team.html"]',                           'nav.staff_team');
    set('a[href="blog.html"]',                           'nav.blog');
    set('a[href="documentation.html"]',                  'nav.documentation');
    set('a[href="contact-us.html"]',                     'nav.contact_us');
    set('a.btn-ghost[href="login.html"]',                'nav.log_in');
    set('a.btn-seal[href="signup.html"]',                'nav.start_transaction');
    // Update language toggle label
    var lbl = nav.querySelector('.lang-toggle-label');
    if (lbl) lbl.textContent = _lang.toUpperCase().slice(0, 5);
  }

  function applyFooterTranslations() {
    var footer = document.querySelector('.site-footer');
    if (!footer) return;
    function set(sel, key) {
      var el = footer.querySelector(sel);
      var v = tr(key);
      if (el && v) el.textContent = v;
    }
    // Footer column headings
    var h4s = footer.querySelectorAll('h4');
    var colKeys = ['footer.platform', 'footer.industries', 'footer.global_escrow', 'footer.resources', 'footer.legal'];
    h4s.forEach(function (h, i) {
      var v = tr(colKeys[i]);
      if (v) h.textContent = i === 2 ? v.replace(/\bescrow\b/gi, 'Trading') : v;
    });
    // Copyright
    var bot = footer.querySelector('.footer-bottom span:first-child');
    var v = tr('footer.copyright');
    if (bot && v) bot.textContent = v;
    // Bottom links
    set('.footer-bottom a[href="legal.html?slug=terms-conditions"]', 'footer.terms');
    set('.footer-bottom a[href="legal.html?slug=privacy-policy"]',   'footer.privacy');
    set('.footer-bottom a[href="legal.html?slug=information-security-policy"]', 'footer.security');
  }

  function applyPageTitle() {
    // Pages can define window.KE_I18N_TITLE_KEY e.g. "landing.page_title"
    if (window.KE_I18N_TITLE_KEY) {
      var v = tr(window.KE_I18N_TITLE_KEY);
      if (v && v !== window.KE_I18N_TITLE_KEY) document.title = v + ' — Archanda AG';
    }
  }

  // ── RTL support ───────────────────────────────────────────────────────────
  function applyRTL(isRTL) {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('data-dir', isRTL ? 'rtl' : 'ltr');
    // Load RTL stylesheet on demand
    if (isRTL && !document.getElementById('ke-rtl-css')) {
      var link = document.createElement('link');
      link.id   = 'ke-rtl-css';
      link.rel  = 'stylesheet';
      link.href = 'css/rtl.css';
      document.head.appendChild(link);
    }
  }

  // ── Language selector injection ───────────────────────────────────────────
  function makeSelectorHTML(containerId) {
    return '<div class="lang-selector" style="position:relative;display:inline-block;">' +
      '<button class="btn btn-ghost btn-sm lang-toggle" style="display:flex;align-items:center;gap:0.35rem;font-size:0.8rem;padding:0.3rem 0.55rem;" title="' + tr('nav.select_language') + '">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3c-2.4 4-3 7-3 9s.6 5 3 9m0-18c2.4 4 3 7 3 9s-.6 5-3 9"/></svg>' +
        '<span class="lang-toggle-label">' + _lang.toUpperCase().slice(0, 5) + '</span>' +
      '</button>' +
      '<div id="' + containerId + '" class="lang-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:var(--paper-white,#fff);border:1.5px solid var(--line,#e0e0e0);border-radius:var(--radius,8px);padding:0.4rem;min-width:210px;max-height:300px;overflow-y:auto;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.12);"></div>' +
    '</div>';
  }

  function populateLangDropdown(dropdown) {
    if (!_languages.length) {
      dropdown.innerHTML = '<div style="padding:0.5rem;font-size:0.85rem;color:var(--muted,#666);">Loading…</div>';
      fetchLanguages().then(function (list) { _languages = list; populateLangDropdown(dropdown); });
      return;
    }
    dropdown.innerHTML = _languages.map(function (l) {
      var active = l.code === _lang;
      return '<button onclick="ke_i18n.setLanguage(\'' + l.code + '\')" style="display:flex;align-items:center;gap:0.6rem;width:100%;padding:0.45rem 0.6rem;border:none;background:' +
        (active ? 'var(--paper-alt,#f5f5f0)' : 'transparent') +
        ';border-radius:6px;cursor:pointer;font-size:0.85rem;text-align:left;' +
        (active ? 'font-weight:600;' : '') + '">' +
        '<span style="font-size:1.1rem;">' + l.flagEmoji + '</span>' +
        '<div><div style="line-height:1.2;">' + l.nativeName + '</div><div style="color:var(--muted,#888);font-size:0.75rem;">' + l.name + '</div></div>' +
        '</button>';
    }).join('');
  }

  function bindDropdown(container, dropdownId) {
    var toggle   = container.querySelector('.lang-toggle');
    var dropdown = container.querySelector('.lang-dropdown');
    if (!toggle || !dropdown) return;
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = dropdown.style.display !== 'none';
      dropdown.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) populateLangDropdown(dropdown);
    });
  }

  function injectLangSelector() {
    // Public site nav
    var navActions = document.querySelector('.site-nav .nav-actions');
    if (navActions && !navActions.querySelector('.lang-selector')) {
      var wrapper = document.createElement('div');
      wrapper.innerHTML = makeSelectorHTML('lang-dd-nav');
      var sel = wrapper.firstChild;
      navActions.insertBefore(sel, navActions.firstChild);
      bindDropdown(sel);
      document.addEventListener('click', function () {
        var dd = document.getElementById('lang-dd-nav');
        if (dd) dd.style.display = 'none';
      });
    }

    // App topbar (dashboard pages — injected after ke_renderShell runs)
    function tryTopbar() {
      var topbar = document.querySelector('.app-topbar');
      if (topbar && !topbar.querySelector('.lang-selector')) {
        var wrapper = document.createElement('div');
        wrapper.innerHTML = makeSelectorHTML('lang-dd-topbar');
        var sel = wrapper.firstChild;
        sel.style.marginLeft = '0.5rem';
        topbar.appendChild(sel);
        bindDropdown(sel);
        document.addEventListener('click', function () {
          var dd = document.getElementById('lang-dd-topbar');
          if (dd) dd.style.display = 'none';
        });
      }
    }
    tryTopbar();
    // ke_renderShell may run after i18n — retry
    document.addEventListener('ke:shell:rendered', tryTopbar);
    setTimeout(tryTopbar, 500);
    setTimeout(tryTopbar, 1500);
  }

  // ── hreflang injection ────────────────────────────────────────────────────
  function injectHreflang(languages) {
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (el) { el.remove(); });
    var canonical = window.location.pathname;
    languages.forEach(function (l) {
      var link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = l.code;
      link.href = canonical + '?lang=' + l.code;
      document.head.appendChild(link);
    });
    var xd = document.createElement('link');
    xd.rel = 'alternate'; xd.hreflang = 'x-default'; xd.href = canonical;
    document.head.appendChild(xd);
  }

  // ── Persist language to user profile ─────────────────────────────────────
  function persistToProfile(code) {
    try {
      var token = localStorage.getItem('ke_access_token');
      if (!token) return;
      fetch(apiBase() + '/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ locale: code })
      }).catch(function () {});
    } catch (e) {}
  }

  // ── Public setLanguage ────────────────────────────────────────────────────
  function setLanguage(code) {
    if (!SUPPORTED.includes(code)) code = DEFAULT_LANG;
    localStorage.setItem('ke_lang', code);
    localStorage.setItem('ke_lang_chosen', '1');
    localStorage.removeItem(CACHE_PREFIX + code); // force fresh fetch
    var exp = new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString();
    document.cookie = 'ke_lang=' + code + ';path=/;expires=' + exp + ';SameSite=Lax';
    persistToProfile(code);
    window.location.reload();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    _lang = detectLang();
    document.documentElement.lang = _lang;

    Promise.all([fetchTranslations(_lang), fetchLanguages()])
      .then(function (results) {
        _translations = results[0];
        _languages    = results[1];

        var langObj = _languages.find(function (l) { return l.code === _lang; });
        _isRTL = langObj ? !!langObj.isRTL : false;
        applyRTL(_isRTL);

        applyTranslations();
        injectLangSelector();
        injectHreflang(_languages);

        document.dispatchEvent(new CustomEvent('ke:i18n:ready', { detail: { lang: _lang } }));
      })
      .catch(function () {
        // Silently fail — English text remains visible
        injectLangSelector();
      });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.ke_i18n = {
    t:              tr,
    setLanguage:    setLanguage,
    getCurrentLang: function () { return _lang; },
    isRTL:          function () { return _isRTL; },
    refresh:        applyTranslations
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
