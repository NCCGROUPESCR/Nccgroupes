/* =============================================================
   Archanda AG transaction chat translator
   – Integrates with the project's global ke_i18n system for
     language selection, language list, and language persistence.
   – Uses MyMemory free translation API for user-generated chat
     message content (ke_i18n handles static UI strings only).
   – Language preference is fully shared with the rest of the app:
     reads ke_i18n.getCurrentLang(), changes via ke_i18n.setLanguage().
   ============================================================= */
(function () {
  'use strict';

  /* ── State ────────────────────────────────────────────────────── */
  var _enabled   = false;
  try { _enabled = JSON.parse(localStorage.getItem('ke_chat_translate') || 'false'); } catch (e) {}
  var _languages = [];   // populated from /v1/i18n/languages (same endpoint as ke_i18n)
  var _cache     = {};   // key: "text||lang" → translated string
  var _inFlight  = {};   // key: "text||lang" → Promise (dedup)
  var _ddOpen    = false;

  /* ── Helpers ──────────────────────────────────────────────────── */
  function apiBase() {
    var v = window.KE_API_BASE;
    return (typeof v === 'string' && v.indexOf('%') === -1) ? v.replace(/\/$/, '') : '';
  }

  /** Read the current global language — same logic as ke_i18n. */
  function currentLang() {
    if (window.ke_i18n && typeof window.ke_i18n.getCurrentLang === 'function') {
      return window.ke_i18n.getCurrentLang();
    }
    return localStorage.getItem('ke_lang') || 'en';
  }

  /**
   * Normalise ke_i18n language codes to codes MyMemory understands.
   * ke_i18n uses 'zh' (Simplified), 'zh-TW' (Traditional), 'en-NG'.
   */
  function normCode(code) {
    if (code === 'zh')   return 'zh-CN';
    if (code === 'en-NG') return 'en';
    return code;
  }

  function makeAbortSignal(ms) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(ms);
    }
    var ctrl = new AbortController();
    setTimeout(function () { ctrl.abort(); }, ms);
    return ctrl.signal;
  }

  /** Translate a single string via MyMemory (free, no key needed). */
  function translateText(text, targetLang) {
    if (!text || !text.trim()) return Promise.resolve(text);
    var norm = normCode(targetLang);
    // Don't translate if target is English (or a variant)
    if (!norm || norm === 'en' || norm.startsWith('en-')) return Promise.resolve(text);

    var key = text + '||' + norm;
    if (_cache[key] !== undefined)  return Promise.resolve(_cache[key]);
    if (_inFlight[key])             return _inFlight[key];

    var url = 'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text.slice(0, 500)) +
      '&langpair=en|' + encodeURIComponent(norm);

    var p = fetch(url, { signal: makeAbortSignal(8000) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var t = (d && d.responseData && d.responseData.translatedText) || text;
        // MyMemory sometimes returns HTML entities — decode them
        var tmp = document.createElement('textarea');
        tmp.innerHTML = t;
        t = tmp.value;
        _cache[key] = t;
        delete _inFlight[key];
        return t;
      })
      .catch(function () { delete _inFlight[key]; return text; });

    _inFlight[key] = p;
    return p;
  }

  /* ── Language list — reuse the same endpoint as ke_i18n ─────── */
  function fetchLanguages() {
    if (_languages.length) return Promise.resolve(_languages);
    return fetch(apiBase() + '/v1/i18n/languages')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) {
        // Unwrap API envelope: { success: true, data: [...] } → [...]
        var list = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        _languages = list;
        return list;
      })
      .catch(function () { return []; });
  }

  /* ── Translate bubbles after renderChat ─────────────────────── */
  /**
   * Called by renderChat() after the chat body is built.
   * Finds every .msg-bubble[data-original], translates async, patches DOM.
   */
  function translateBubbles(container) {
    if (!_enabled) return;
    var lang = currentLang();
    var norm = normCode(lang);
    if (!norm || norm === 'en' || norm.startsWith('en-')) return;

    var bubbles = container.querySelectorAll('.msg-bubble[data-original]');
    bubbles.forEach(function (bubble) {
      var original = bubble.getAttribute('data-original');
      if (!original) return;
      // Skip if already translated to this language
      if (bubble.getAttribute('data-translated-lang') === lang) return;

      translateText(original, lang).then(function (translated) {
        if (translated === original) return;
        bubble.setAttribute('data-translated-lang', lang);

        // Show translated text, preserve original below it
        var transEl = bubble.querySelector('.ke-chat-translated');
        if (!transEl) {
          transEl = document.createElement('div');
          transEl.className = 'ke-chat-translated';
          transEl.style.cssText = [
            'margin-top:0.35rem',
            'padding-top:0.35rem',
            'border-top:1px solid rgba(0,0,0,0.08)',
            'font-size:0.88em',
            'line-height:1.45'
          ].join(';');
          bubble.appendChild(transEl);
        }

        var origEl = bubble.querySelector('.ke-chat-original');
        if (!origEl) {
          origEl = document.createElement('div');
          origEl.className = 'ke-chat-original';
          origEl.style.cssText = [
            'font-size:0.78em',
            'opacity:0.55',
            'margin-top:0.25rem',
            'font-style:italic'
          ].join(';');
          bubble.appendChild(origEl);
          origEl.textContent = original;
        }

        transEl.textContent = translated;
      });
    });
  }

  /* ── Persist & update enabled state ─────────────────────────── */
  function setEnabled(v) {
    _enabled = !!v;
    try { localStorage.setItem('ke_chat_translate', JSON.stringify(_enabled)); } catch (e) {}
    updateBtnState();
    // Re-render chat so translateBubbles() runs (or clears) on current messages
    if (typeof window.renderChat === 'function') window.renderChat();
  }

  function updateBtnState() {
    var btn = document.getElementById('chat-translate-btn');
    if (!btn) return;
    var lang = currentLang();
    var active = _enabled && normCode(lang) !== 'en' && !normCode(lang).startsWith('en-');
    btn.style.color = active ? 'var(--seal, #2d6a4f)' : '';
    btn.title = active ? 'Translating to ' + lang.toUpperCase() + ' (click to manage)' : 'Translate chat messages';

    // Dot indicator
    var dot = btn.querySelector('.chat-translate-dot');
    if (active && !dot) {
      dot = document.createElement('span');
      dot.className = 'chat-translate-dot';
      dot.style.cssText = [
        'position:absolute', 'top:1px', 'right:1px',
        'width:6px', 'height:6px',
        'background:var(--seal, #2d6a4f)',
        'border-radius:50%',
        'display:block'
      ].join(';');
      btn.style.position = 'relative';
      btn.appendChild(dot);
    } else if (!active && dot) {
      dot.remove();
    }
  }

  /* ── Dropdown ────────────────────────────────────────────────── */
  function openDropdown() {
    var dd = document.getElementById('chat-translate-dd');
    if (!dd) return;
    dd.hidden = false;
    _ddOpen = true;
    renderDropdown(dd);
    fetchLanguages().then(function () { renderDropdown(dd); });
  }

  function closeDropdown() {
    var dd = document.getElementById('chat-translate-dd');
    if (dd) dd.hidden = true;
    _ddOpen = false;
  }

  function renderDropdown(dd) {
    var lang = currentLang();

    var headerHtml =
      '<div style="padding:0.55rem 0.7rem 0.45rem;border-bottom:1px solid var(--line,#e5e5e5);display:flex;align-items:center;justify-content:space-between;">' +
        '<span style="font-size:0.78rem;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:var(--muted,#888);">Translate chat</span>' +
        '<button id="chat-translate-toggle" style="border:none;padding:0.2rem 0.55rem;border-radius:20px;font-size:0.75rem;font-weight:600;cursor:pointer;background:' +
          (_enabled ? 'var(--seal,#2d6a4f)' : 'var(--paper-alt,#f5f5f0)') + ';color:' +
          (_enabled ? '#fff' : 'var(--muted,#888)') + ';">' +
          (_enabled ? 'ON' : 'OFF') +
        '</button>' +
      '</div>';

    var noteHtml =
      '<div style="padding:0.35rem 0.7rem;font-size:0.75rem;color:var(--muted,#888);border-bottom:1px solid var(--line,#e5e5e5);">' +
        'Select a language — this updates your global language setting.' +
      '</div>';

    var listHtml = '';
    if (_languages.length) {
      listHtml = '<div style="max-height:240px;overflow-y:auto;padding:0.3rem;">' +
        _languages.map(function (l) {
          var active = l.code === lang;
          return '<button onclick="ke_chatTranslator._pickLang(\'' + l.code + '\')" ' +
            'style="display:flex;align-items:center;gap:0.55rem;width:100%;padding:0.4rem 0.55rem;' +
            'border:none;border-radius:5px;cursor:pointer;font-size:0.82rem;text-align:left;' +
            'background:' + (active ? 'var(--paper-alt,#f5f5f0)' : 'transparent') + ';' +
            (active ? 'font-weight:600;' : '') + '">' +
            '<span style="font-size:1rem;line-height:1;">' + l.flagEmoji + '</span>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="line-height:1.25;">' + l.nativeName + '</div>' +
              '<div style="color:var(--muted,#888);font-size:0.72rem;">' + l.name + '</div>' +
            '</div>' +
            (active ? '<span style="color:var(--seal,#2d6a4f);font-size:0.8rem;">✓</span>' : '') +
          '</button>';
        }).join('') +
      '</div>';
    } else {
      listHtml = '<div style="padding:0.7rem;text-align:center;font-size:0.82rem;color:var(--muted,#888);">Loading languages…</div>';
    }

    dd.innerHTML = headerHtml + noteHtml + listHtml;

    document.getElementById('chat-translate-toggle').addEventListener('click', function (e) {
      e.stopPropagation();
      setEnabled(!_enabled);
      renderDropdown(dd);
    });
  }

  /** Called when user picks a language from the chat dropdown. */
  function pickLang(code) {
    var current = currentLang();
    closeDropdown();
    if (code !== current) {
      // Change global language — this reloads the page (same as topbar picker)
      // Enable translation before reload so it activates after the page comes back
      try { localStorage.setItem('ke_chat_translate', 'true'); } catch (e) {}
      if (window.ke_i18n && typeof window.ke_i18n.setLanguage === 'function') {
        window.ke_i18n.setLanguage(code);
      }
    } else {
      // Same language — just toggle translation on for the chat
      setEnabled(true);
    }
  }

  /* ── Inject translate button into chat header ────────────────── */
  function injectButton() {
    var header = document.querySelector('.chat-header');
    if (!header || document.getElementById('chat-translate-btn')) return;

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;';
    wrapper.innerHTML =
      '<button id="chat-translate-btn" class="icon-btn" title="Translate chat messages" ' +
        'style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;">' +
        /* Globe icon — same SVG as the i18n.js language selector */
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="12" r="9"/>' +
          '<path d="M3.6 9h16.8M3.6 15h16.8M12 3c-2.4 4-3 7-3 9s.6 5 3 9m0-18c2.4 4 3 7 3 9s-.6 5-3 9"/>' +
        '</svg>' +
      '</button>' +
      '<div id="chat-translate-dd" hidden ' +
        'style="position:absolute;right:0;top:calc(100% + 8px);min-width:215px;' +
        'background:var(--paper-white,#fff);border:1.5px solid var(--line,#e0e0e0);' +
        'border-radius:var(--radius,8px);z-index:9999;box-shadow:0 8px 28px rgba(0,0,0,0.13);">' +
      '</div>';

    // Insert before the "Live" tag so the header reads: [title] [🌐] [Live]
    var liveTag = header.querySelector('.tag');
    if (liveTag) {
      var rightGroup = document.createElement('div');
      rightGroup.style.cssText = 'display:flex;align-items:center;gap:0.4rem;';
      header.appendChild(rightGroup);
      rightGroup.appendChild(wrapper);
      rightGroup.appendChild(liveTag);
    } else {
      header.appendChild(wrapper);
    }

    document.getElementById('chat-translate-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      if (_ddOpen) { closeDropdown(); } else { openDropdown(); }
    });

    // Close dropdown on outside click
    document.addEventListener('click', function () {
      if (_ddOpen) closeDropdown();
    });

    // When the global language changes, refresh chat and button state
    document.addEventListener('ke:i18n:ready', function () {
      updateBtnState();
      if (_enabled && typeof window.renderChat === 'function') window.renderChat();
    });

    updateBtnState();
  }

  /* ── Auto-init ───────────────────────────────────────────────── */
  function tryInit() {
    injectButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
  // Also try after ke_renderShell (same retry pattern as i18n.js)
  document.addEventListener('ke:shell:rendered', tryInit);
  setTimeout(tryInit, 300);

  /* ── Public API ──────────────────────────────────────────────── */
  window.ke_chatTranslator = {
    /** True when auto-translate is enabled */
    get enabled() { return _enabled; },
    /** Called by renderChat() after the chat body HTML is set */
    translateBubbles: translateBubbles,
    /** Explicit init (idempotent) */
    init: tryInit,
    /** Internal: called from inline onclick in dropdown */
    _pickLang: pickLang
  };

}());
