/* ============================================================
   Archanda AG language selection modal
   Shown on first visit; respects ke_i18n translations.
   ============================================================ */
(function () {
  'use strict';

  window.ke_showLangModal = function () {
    if (document.getElementById('ke-lang-modal')) return;

    var base = (typeof window.KE_API_BASE === 'string' && window.KE_API_BASE.indexOf('%') === -1)
      ? window.KE_API_BASE.replace(/\/$/, '') : '';
    fetch(base + '/v1/i18n/languages')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (d) {
        // Unwrap API envelope: { success: true, data: [...] } → [...]
        var languages = (d && Array.isArray(d.data)) ? d.data : (Array.isArray(d) ? d : []);
        if (!languages || !languages.length) return;
        buildModal(languages);
      })
      .catch(function () {});
  };

  function buildModal(languages) {
    var currentLang = window.ke_i18n ? window.ke_i18n.getCurrentLang() : 'en';
    var selectedLang = currentLang;

    function t(key) { return window.ke_i18n ? window.ke_i18n.t(key) : key; }

    var overlay = document.createElement('div');
    overlay.id = 'ke-lang-modal';
    overlay.style.cssText = [
      'position:fixed;inset:0;background:rgba(10,10,10,0.55);backdrop-filter:blur(4px);',
      'z-index:99998;display:flex;align-items:center;justify-content:center;padding:1rem;',
      'animation:ke_fadeIn 0.2s ease;'
    ].join('');

    overlay.innerHTML =
      '<style>' +
        '@keyframes ke_fadeIn{from{opacity:0}to{opacity:1}}' +
        '@keyframes ke_slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}' +
        '#ke-lang-modal .ke-modal-box{animation:ke_slideUp 0.25s ease;}' +
        '#ke-lang-modal .ke-lang-btn{transition:border-color 0.12s,background 0.12s;}' +
        '#ke-lang-modal .ke-lang-btn:hover{background:var(--paper-alt,#f5f5f0)!important;}' +
        '#ke-lang-modal .ke-lang-btn.active{background:var(--paper-alt,#f5f5f0)!important;border-color:var(--seal,#1a1a1a)!important;font-weight:600;}' +
      '</style>' +
      '<div class="ke-modal-box" style="' +
        'background:var(--paper-white,#fff);border-radius:16px;max-width:680px;width:100%;' +
        'max-height:88vh;display:flex;flex-direction:column;' +
        'box-shadow:0 32px 80px rgba(0,0,0,0.22);overflow:hidden;' +
      '">' +
        // Header
        '<div style="padding:1.75rem 1.75rem 1rem;border-bottom:1px solid var(--line,#e5e5e5);">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
            '<div>' +
              '<h2 style="font-family:var(--font-display,serif);font-size:1.35rem;margin:0 0 0.4rem;font-weight:600;" id="ke-modal-title">' + t('lang.modal_title') + '</h2>' +
              '<p style="color:var(--muted,#666);font-size:0.875rem;margin:0;max-width:48ch;" id="ke-modal-subtitle">' + t('lang.modal_subtitle') + '</p>' +
            '</div>' +
            '<button id="ke-modal-close" style="background:none;border:none;cursor:pointer;padding:0.25rem;color:var(--muted,#999);font-size:1.2rem;line-height:1;margin-left:1rem;margin-top:-0.1rem;" aria-label="Close">✕</button>' +
          '</div>' +
          '<div style="position:relative;margin-top:1rem;">' +
            '<svg style="position:absolute;left:0.7rem;top:50%;transform:translateY(-50%);color:var(--muted,#999);" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
            '<input id="ke-lang-search" type="text" placeholder="' + t('lang.search_placeholder') + '" style="width:100%;padding:0.55rem 0.75rem 0.55rem 2.25rem;border:1.5px solid var(--line,#e0e0e0);border-radius:8px;font-size:0.875rem;outline:none;box-sizing:border-box;font-family:inherit;" />' +
          '</div>' +
        '</div>' +
        // Language grid
        '<div id="ke-lang-grid" style="' +
          'padding:1rem 1.25rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));' +
          'gap:0.45rem;overflow-y:auto;flex:1;' +
        '"></div>' +
        // Footer
        '<div style="' +
          'padding:1rem 1.75rem;border-top:1px solid var(--line,#e5e5e5);' +
          'display:flex;justify-content:space-between;align-items:center;gap:1rem;' +
        '">' +
          '<span style="font-size:0.78rem;color:var(--muted,#888);">' + t('lang.change_later') + '</span>' +
          '<button id="ke-lang-confirm" class="btn btn-seal" style="min-width:110px;padding:0.55rem 1.25rem;">' + t('lang.confirm_btn') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var grid    = document.getElementById('ke-lang-grid');
    var search  = document.getElementById('ke-lang-search');
    var confirm = document.getElementById('ke-lang-confirm');
    var close   = document.getElementById('ke-modal-close');

    function renderGrid(filter) {
      var filtered = filter
        ? languages.filter(function (l) {
            var q = filter.toLowerCase();
            return (
              l.name.toLowerCase().includes(q) ||
              l.nativeName.toLowerCase().includes(q) ||
              l.code.toLowerCase().includes(q)
            );
          })
        : languages;

      if (!filtered.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;padding:1.5rem;text-align:center;color:var(--muted,#888);font-size:0.875rem;">No languages found</div>';
        return;
      }

      grid.innerHTML = filtered
        .map(function (l) {
          var active = l.code === selectedLang;
          return (
            '<button class="ke-lang-btn' + (active ? ' active' : '') + '" data-code="' + l.code + '" ' +
            'style="display:flex;align-items:center;gap:0.65rem;padding:0.6rem 0.75rem;' +
            'border:1.5px solid ' + (active ? 'var(--seal,#1a1a1a)' : 'var(--line,#e0e0e0)') + ';' +
            'border-radius:8px;cursor:pointer;background:' + (active ? 'var(--paper-alt,#f5f5f0)' : 'transparent') + ';' +
            'font-size:0.85rem;text-align:left;width:100%;font-family:inherit;">' +
            '<span style="font-size:1.25rem;line-height:1;flex-shrink:0;">' + l.flagEmoji + '</span>' +
            '<div style="min-width:0;">' +
              '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + l.nativeName + '</div>' +
              '<div style="color:var(--muted,#888);font-size:0.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + l.name + '</div>' +
            '</div></button>'
          );
        })
        .join('');

      grid.querySelectorAll('.ke-lang-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectedLang = btn.getAttribute('data-code');
          grid.querySelectorAll('.ke-lang-btn').forEach(function (b) {
            b.classList.remove('active');
            b.style.borderColor = 'var(--line,#e0e0e0)';
            b.style.background  = 'transparent';
          });
          btn.classList.add('active');
          btn.style.borderColor = 'var(--seal,#1a1a1a)';
          btn.style.background  = 'var(--paper-alt,#f5f5f0)';
        });
      });
    }

    renderGrid('');

    search.addEventListener('input', function () { renderGrid(search.value.trim()); });

    function dismiss() {
      localStorage.setItem('ke_lang_chosen', '1');
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.18s';
      setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 200);
    }

    confirm.addEventListener('click', function () {
      dismiss();
      if (window.ke_i18n && selectedLang) {
        window.ke_i18n.setLanguage(selectedLang);
      }
    });

    close.addEventListener('click', dismiss);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismiss();
    });

    search.focus();
  }
})();
