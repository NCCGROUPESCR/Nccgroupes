/* ============================================================
   Archanda AG — transaction escrow UI helpers
   ============================================================ */

'use strict';

// ---- Auth guards ----
function ke_requireAuth(allowedRoles){
  const user = ke_currentUser();
  if (!user){ window.location.href = 'login.html'; return null; }
  if (allowedRoles && !allowedRoles.includes(user.role)){
    ke_toast('Access restricted for your account type.');
    const map = { buyer:'dashboard-buyer.html', seller:'dashboard-seller.html', support:'dashboard-support.html', admin:'dashboard-support.html', developer:'developer.html' };
    setTimeout(() => window.location.href = map[user.role] || 'index.html', 1200);
    return null;
  }
  return user;
}

// ---- App shell renderer ----
function ke_renderShell(user, activePage){
  const roleNavs = {
    buyer:[
      { label:'Dashboard', href:'dashboard-buyer.html', icon:'\u229e' },
      { label:'Transactions', href:'dashboard-buyer.html#transactions', icon:'\u2197' },
      { label:'Wallet', href:'dashboard-buyer.html#wallet', icon:'\u25ce' },
      { label:'New transaction', href:'new-transaction.html', icon:'+' },
      { label:'Directories', href:'directories.html', icon:'\u24d2' },
    ],
    seller:[
      { label:'Dashboard', href:'dashboard-seller.html', icon:'\u229e' },
      { label:'Incoming orders', href:'dashboard-seller.html#transactions', icon:'\u2199' },
      { label:'Wallet', href:'dashboard-seller.html#wallet', icon:'\u25ce' },
      { label:'Trust & reviews', href:'dashboard-seller.html#trust', icon:'\u2605' },
      { label:'Directories', href:'directories.html', icon:'\u24d2' },
    ],
    support:[
      { label:'Overview', href:'dashboard-support.html', icon:'\u229e' },
      { label:'Disputes', href:'dashboard-support.html#disputes', icon:'\u2691' },
      { label:'All transactions', href:'dashboard-support.html#transactions', icon:'\u2197' },
      { label:'Directories', href:'directories.html', icon:'\u24d2' },
    ],
    admin:[
      { label:'Overview', href:'dashboard-support.html', icon:'\u229e' },
      { label:'Disputes', href:'dashboard-support.html#disputes', icon:'\u2691' },
      { label:'Transactions', href:'dashboard-support.html#transactions', icon:'\u2197' },
      { label:'Users', href:'dashboard-support.html#users', icon:'\u25c9' },
      { label:'Settings', href:'dashboard-support.html#settings', icon:'\u2699' },
      { label:'Pricing', href:'dashboard-support.html#pricing', icon:'\u25b7' },
      { label:'Website CMS', href:'admin-cms.html', icon:'\u270e' },
      { label:'Directories', href:'admin-directories.html', icon:'\u24d2' },
      { label:'Docs CMS', href:'admin-cms.html', icon:'\u2318' },
    ],
    developer:[
      { label:'Dashboard', href:'developer.html', icon:'\u229e' },
      { label:'API keys', href:'developer.html#keys', icon:'\u2317' },
      { label:'Webhooks', href:'developer.html#webhooks', icon:'\u21bb' },
      { label:'Documentation', href:'developer.html#docs', icon:'\u270e' },
      { label:'Directories', href:'directories.html', icon:'\u24d2' },
    ],
  };

  const navs = roleNavs[user.role] || [];
  const initials = user.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();
  const roleName = { buyer:'Buyer', seller:'Seller', support:'Support', admin:'Administrator', developer:'Developer' }[user.role] || user.role;

  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar){
    sidebar.innerHTML =
      '<div class="sidebar-brand">' +
      '<img src="archanda-logo-light.svg" alt="Archanda AG Trading">' +
      '</div>' +
      '<nav class="sidebar-nav">' +
      navs.map(function(n){
        var active = activePage && n.href.split('#')[0] === activePage ? ' active' : '';
        return '<a href="' + n.href + '" class="sidebar-nav-item' + active + '">' + n.icon + '&nbsp;&nbsp;' + n.label + '</a>';
      }).join('') +
      '</nav>' +
      '<div style="flex:1;"></div>' +
      '<div class="sidebar-bottom">' +
      '<div class="user-chip">' +
      '<div class="user-chip-avatar">' + initials + '</div>' +
      '<div class="user-chip-info">' +
      '<div class="user-chip-name">' + user.name.split(' ')[0] + '</div>' +
      '<div class="user-chip-role">' + roleName + '</div>' +
      '</div></div>' +
      '<button onclick="ke_logout()" style="margin-top:0.75rem;width:100%;background:none;border:1px solid var(--line-on-dark);color:var(--muted-on-dark);border-radius:var(--radius);padding:0.4rem 0.7rem;font-size:0.8rem;cursor:pointer;">Log out</button>' +
      '</div>';
  }

  const chipEls = document.querySelectorAll('.user-chip:not(.sidebar-bottom .user-chip)');
  chipEls.forEach(function(el){
    el.innerHTML = '<div class="user-chip-avatar" style="background:var(--seal);color:var(--paper-white);">' + initials + '</div><div class="user-chip-info"><div class="user-chip-name">' + user.name.split(' ')[0] + '</div><div class="user-chip-role">' + roleName + '</div></div>';
  });

  // ---- Mobile sidebar drawer toggle ----
  var topbar = document.querySelector('.app-topbar');
  if (topbar && !topbar.querySelector('.app-sidebar-toggle')){
    var menuBtn = document.createElement('button');
    menuBtn.className = 'app-sidebar-toggle';
    menuBtn.setAttribute('aria-label', 'Open navigation menu');
    menuBtn.title = 'Menu';
    menuBtn.innerHTML = '&#9776;'; // ☰
    topbar.insertBefore(menuBtn, topbar.firstChild);
    var shell = document.querySelector('.app-shell');
    menuBtn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = shell && shell.classList.toggle('sidebar-open');
      menuBtn.innerHTML = open ? '&#10005;' : '&#9776;'; // ✕ / ☰
    });
    // Close when clicking the dimmed overlay (anything outside .app-sidebar)
    if (shell){
      shell.addEventListener('click', function(e){
        if (shell.classList.contains('sidebar-open') && !e.target.closest('.app-sidebar')){
          shell.classList.remove('sidebar-open');
          menuBtn.innerHTML = '&#9776;';
        }
      });
    }
  }
  document.dispatchEvent(new CustomEvent('ke:shell:rendered'));
}

// ---- Mobile nav ----
function ke_initMobileNav(){
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const navActions = nav && nav.querySelector('.nav-actions');
  if (!nav || !toggle || !links || !navActions) return;
  links.id = links.id || 'site-nav-links';
  toggle.setAttribute('aria-controls', links.id);
  toggle.setAttribute('aria-expanded', 'false');

  const accountActions = navActions.querySelectorAll('a[href="login.html"], a[href="signup.html"]');
  if (accountActions.length && !nav.querySelector('.mobile-nav-auth')) {
    const authBar = document.createElement('div');
    authBar.className = 'mobile-nav-auth';
    authBar.setAttribute('aria-label', 'Account actions');
    accountActions.forEach(function(action){
      const mobileAction = action.cloneNode(true);
      const isLogin = action.getAttribute('href') === 'login.html';
      mobileAction.className = isLogin ? 'btn btn-ghost btn-sm' : 'btn btn-seal btn-sm';
      mobileAction.removeAttribute('id');
      mobileAction.textContent = isLogin ? 'Sign in' : 'Create account';
      mobileAction.setAttribute('data-testid', isLogin ? 'mobile-sign-in' : 'mobile-create-account');
      authBar.appendChild(mobileAction);
    });
    nav.appendChild(authBar);
  }

  toggle.addEventListener('click', function(){
    const open = links.style.display === 'flex';
    if (open) {
      links.style.cssText = '';
      links.querySelectorAll('.nav-dropdown-menu').forEach(function(menu){ menu.style.display = ''; });
    } else {
      links.style.cssText = 'display:flex;flex-direction:column;position:absolute;top:' + nav.offsetHeight + 'px;left:0;right:0;background:var(--paper);border-bottom:1.5px solid var(--line);padding:1rem 2rem;z-index:201;gap:1rem;';
      // Always show dropdown menus inline when nav is open on mobile
      links.querySelectorAll('.nav-dropdown-menu').forEach(function(menu){ menu.style.display = 'block'; });
    }
    toggle.setAttribute('aria-expanded', String(!open));
  });
  // Dropdown toggle on mobile (tap trigger)
  links.querySelectorAll('.nav-dropdown-trigger').forEach(function(trigger){
    trigger.addEventListener('click', function(e){
      if (window.innerWidth > 860) return; // desktop uses CSS hover
      e.preventDefault();
      const dropdown = trigger.closest('.nav-dropdown');
      if (dropdown) dropdown.classList.toggle('open');
    });
  });
}

// ---- Toast notifications ----
var _toastRail = null;
function ke_toast(msg, duration){
  if (!_toastRail){
    _toastRail = document.createElement('div');
    _toastRail.className = 'toast-rail';
    document.body.appendChild(_toastRail);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  _toastRail.appendChild(el);
  setTimeout(function(){ el.remove(); }, duration || 4000);
}

// ---- Formatting ----
function ke_money(amount, currency){
  var sym = ({ NGN:'\u20a6', USD:'$', GBP:'\u00a3', EUR:'\u20ac', GHS:'\u20b5' })[currency||'USD'] || '$';
  return sym + Number(amount||0).toLocaleString('en-US');
}

function ke_date(iso){
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function ke_datetime(iso){
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function ke_relTime(iso){
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24);
  if (d > 1) return d + 'd ago';
  if (d === 1) return 'yesterday';
  if (h >= 1) return h + 'h ago';
  if (m >= 1) return m + 'm ago';
  return 'just now';
}

// ---- HTML escape ----
function ke_esc(s){
  const d = document.createElement('div');
  d.textContent = String(s == null ? '' : s);
  return d.innerHTML;
}

// ---- Status helpers ----
function ke_stampClass(status){
  const map = { pending:'stamp-pending', funding_submitted:'stamp-pending', secured:'stamp-secured', confirmed:'stamp-confirmed', dispute:'stamp-dispute', released:'stamp-released', refunded:'stamp-refunded' };
  return map[status] || 'stamp-pending';
}
function ke_statusLabel(status){
  const map = { pending:'Pending funding', funding_submitted:'Proof of payment under review', secured:'Trading secured', confirmed:'Buyer confirmed', dispute:'In dispute', released:'Funds released', refunded:'Refunded' };
  return map[status] || status;
}

// Apply the shared Archanda AG wordmark and icon assets.
(function ke_applyArchandaWordmarks(){
  document.querySelectorAll('link[rel~="icon"]').forEach(function(link){
    link.href = 'favicon.svg';
    link.type = 'image/svg+xml';
  });
  document.querySelectorAll('link[rel="apple-touch-icon"]').forEach(function(link){
    link.href = 'apple-touch-icon.png';
    link.type = 'image/png';
  });
  document.querySelectorAll('.brand:not(.sidebar-brand)').forEach(function(brand){
    if (brand.classList.contains('ncc-logo-applied')) return;
    var onDark = !!brand.closest('.site-footer, .auth-side, .admin-sidebar');
    var logo = document.createElement('img');
    logo.className = 'ncc-wordmark';
    logo.src = onDark ? 'archanda-logo-light.svg' : 'archanda-logo.svg';
    logo.alt = 'Archanda AG Trading';
    brand.replaceChildren(logo);
    brand.classList.add('ncc-logo-applied');
  });
})();
