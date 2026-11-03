/* ============================================================
   ARCHANDA AG STORE — transaction escrow state management
   Auth uses the real API; demo transactions remain local.
   ============================================================ */

'use strict';

// ---- API base (set via inline <script> before this file loads) ----
// On Replit, frontend and API share one domain via path-based routing, so
// this stays empty and requests use relative paths. On separate-domain hosts
// (e.g. Render), set VITE_API_BASE_URL at build time to the API's full URL.
var KE_API_BASE = (typeof window !== 'undefined' && typeof window.KE_API_BASE === 'string' && window.KE_API_BASE.indexOf('%') === -1)
  ? window.KE_API_BASE.replace(/\/$/, '')
  : '';

// API responses embed server-relative file URLs (e.g. "/v1/uploads/..."). On
// a single Replit domain that's fine as-is; across separate domains (Render)
// they need the API's origin prefixed. Absolute URLs pass through untouched.
function ke_absUrl(url){
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return KE_API_BASE + url;
}

// ---- Helpers ----
function ke_now(){ return new Date().toISOString(); }
function ke_uuid(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }
function ke_ref(){ return 'KE-' + new Date().getFullYear() + '-' + Math.floor(100000+Math.random()*900000); }

// ---- User store (demo only — real users come from API) ----
function ke_getUsers(){
  const raw = localStorage.getItem('ke_users');
  const users = raw ? JSON.parse(raw) : ke_initUsers();
  const activeUsers = users.filter(function(user){ return user.role !== 'logistics'; });
  if (activeUsers.length !== users.length) ke_saveUsers(activeUsers);
  return activeUsers;
}
function ke_saveUsers(users){ localStorage.setItem('ke_users', JSON.stringify(users)); }

function ke_initUsers(){
  const users = [
    { id:'u-buyer', name:'Emma Schneider', email:'amara@buyer.demo', phone:'+49 30 100 20001', password:'demo1234', role:'buyer', verified:true, trust:null, createdAt:'2025-06-01T09:00:00Z' },
    { id:'u-seller', name:'EuroTech Manufacturing GmbH', email:'tunde@seller.demo', phone:'+49 40 200 30002', password:'demo1234', role:'seller', verified:true, trust:88, createdAt:'2025-05-15T08:00:00Z' },
    { id:'u-support', name:'Sofia Rossi', email:'ngozi@kudiescrow.demo', phone:'+39 02 400 50004', password:'demo1234', role:'support', verified:true, trust:null, createdAt:'2025-03-10T10:00:00Z' },
    { id:'u-admin', name:'Archanda AG Admin', email:'admin@kudiescrow.demo', phone:'+49 89 500 60005', password:'demo1234', role:'admin', verified:true, trust:null, createdAt:'2025-01-01T00:00:00Z' },
    { id:'u-dev', name:'Lucas Müller', email:'chidi@developer.demo', phone:'+49 30 600 70006', password:'demo1234', role:'developer', verified:false, trust:null, createdAt:'2025-07-01T12:00:00Z' },
  ];
  ke_saveUsers(users);
  return users;
}

function ke_getUser(id){ return ke_getUsers().find(u => u.id === id) || null; }
function ke_findUserByEmail(email){ return ke_getUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null; }
function ke_createUser({ name, email, phone, password, role, verified }){
  const user = { id:'u-'+Date.now(), name, email, phone, password, role, verified: !!verified, trust:null, createdAt: ke_now() };
  const users = ke_getUsers();
  users.push(user);
  ke_saveUsers(users);
  return user;
}

// ---- Session (JWT-based — works across all devices) ----
function ke_getAuth(){
  try { return JSON.parse(localStorage.getItem('ke_auth') || 'null'); } catch(e){ return null; }
}
function ke_currentUser(){
  const auth = ke_getAuth();
  return auth ? auth.user : null;
}
function ke_getToken(){
  const auth = ke_getAuth();
  return auth && auth.accessToken ? auth.accessToken : null;
}
function ke_login(userOrId, tokens){
  if (typeof userOrId === 'string'){
    // Legacy demo path — find user in local store
    const u = ke_getUser(userOrId);
    if (u) localStorage.setItem('ke_auth', JSON.stringify({ user: u, accessToken: null, refreshToken: null }));
    return;
  }
  const t = tokens || {};
  localStorage.setItem('ke_auth', JSON.stringify({ user: userOrId, accessToken: t.accessToken || null, refreshToken: t.refreshToken || null }));
}
function ke_logout(){
  const token = ke_getToken();
  if (token){
    fetch(KE_API_BASE + '/v1/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    }).catch(function(){});
  }
  localStorage.removeItem('ke_auth');
  window.location.href = 'login.html';
}

// ---- API helper (returns response.data, throws on error) ----
// Silently refreshes the access token on first 401 before giving up.
var _ke_refreshing = null;
function ke_refreshToken(){
  if (_ke_refreshing) return _ke_refreshing;
  var auth = ke_getAuth();
  var refreshToken = auth && auth.refreshToken;
  if (!refreshToken){ ke_logout(); return Promise.reject(new Error('Session expired. Please log in again.')); }
  _ke_refreshing = fetch(KE_API_BASE + '/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshToken })
  }).then(function(res){
    return res.json().then(function(json){
      if (!res.ok){ ke_logout(); throw new Error('Session expired. Please log in again.'); }
      var tokens = json.data || json;
      var user = auth.user;
      localStorage.setItem('ke_auth', JSON.stringify({ user: user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || refreshToken }));
      return tokens.accessToken;
    });
  }).catch(function(err){ ke_logout(); throw err; }).finally(function(){ _ke_refreshing = null; });
  return _ke_refreshing;
}

function ke_api(path, opts, _retry){
  var token = ke_getToken();
  var headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (opts && opts.headers){
    Object.keys(opts.headers).forEach(function(k){ headers[k] = opts.headers[k]; });
  }
  var fetchOpts = Object.assign({}, opts, { headers: headers });
  return fetch(KE_API_BASE + path, fetchOpts).then(function(res){
    if (res.status === 401 && !_retry && path !== '/v1/auth/login' && path !== '/v1/auth/refresh'){
      return ke_refreshToken().then(function(){
        return ke_api(path, opts, true);
      });
    }
    return res.json().then(function(json){
      if (!res.ok){
        var msg = (json && (json.message || (json.error && json.error.message))) || 'Request failed';
        throw new Error(msg);
      }
      return json.data;
    });
  });
}

// ---- Real API-backed transactions/users/wallet ----
function ke_mapApiTxn(t){
  return {
    id: t.id, ref: t.reference, title: t.title, category: t.category || '—',
    status: t.status, currency: t.currency, currencySymbol: t.currencySymbol || null,
    amount: Number(t.amount),
    buyerId: t.buyerId, sellerId: t.sellerId,
    escrow: {
      releaseConditions: t.releaseConditions || 'Funds release after the agreed conditions are confirmed.',
      fundedAt: t.escrowFundedAt || null, releasedAt: t.escrowReleasedAt || null,
      // Provider-agnostic global escrow fields
      provider: t.escrowProvider || t.escrowBankName || null,
      paymentInstructions: t.escrowPaymentInstructions || null,
      assignedAt: t.escrowAssignedAt || null,
      // Legacy bank transfer fields (kept for backward compat)
      bankName: t.escrowBankName || null,
      accountName: t.escrowAccountName || null,
      accountNumber: t.escrowAccountNumber || null,
      reference: t.escrowReference || null,
      proofUrl: t.fundingProofUrl || null,
      proofUploadedAt: t.fundingProofUploadedAt || null,
      rejectionReason: t.fundingProofRejectionReason || null
    },
    chat: [], dispute: null, createdAt: t.createdAt, _api: true
  };
}

function ke_apiTxnsForUser(){
  return ke_api('/v1/transactions').then(function(list){ return (list || []).map(ke_mapApiTxn); });
}

const _ke_publicProfileCache = {};
function ke_publicProfile(id){
  if (!id) return Promise.resolve(null);
  if (_ke_publicProfileCache[id]) return Promise.resolve(_ke_publicProfileCache[id]);
  return ke_api('/v1/users/' + id + '/public').then(function(u){ _ke_publicProfileCache[id] = u; return u; }).catch(function(){ return null; });
}

function ke_loadPartyNames(txns){
  const ids = new Set();
  txns.forEach(function(t){ [t.buyerId, t.sellerId].forEach(function(id){ if (id) ids.add(id); }); });
  return Promise.all(Array.from(ids).map(ke_publicProfile)).then(function(){ return txns; });
}

function ke_myWallet(){
  return ke_api('/v1/wallets/me').catch(function(){ return { availableBalance: 0, escrowBalance: 0, pendingBalance: 0 }; });
}

function ke_connectRealtime(onEvent){
  if (typeof io === 'undefined') return null;
  const socket = io(KE_API_BASE + '/realtime', {
    path: '/realtime/socket.io',
    transports: ['websocket', 'polling'],
    auth: { token: ke_getToken() }
  });
  socket.on('transaction.created', function(txn){ onEvent && onEvent('transaction.created', txn); });
  socket.on('transaction.status_changed', function(evt){ onEvent && onEvent('transaction.status_changed', evt); });
  socket.on('transaction.funding_proof_submitted', function(evt){ onEvent && onEvent('transaction.funding_proof_submitted', evt); });
  return socket;
}

// ---- Transaction store (demo data — localStorage) ----
function ke_getTxns(){
  const raw = localStorage.getItem('ke_txns');
  if (raw) {
    const txns = JSON.parse(raw);
    txns.forEach(function(txn){
      delete txn.logisticsId;
      delete txn.shipment;
      if (txn.status === 'transit') txn.status = 'secured';
      if (txn.status === 'delivered') txn.status = 'confirmed';
    });
    localStorage.setItem('ke_txns', JSON.stringify(txns));
    return txns;
  }
  return ke_initTxns();
}
function ke_saveTxns(txns){ localStorage.setItem('ke_txns', JSON.stringify(txns)); }
function ke_saveTxn(txn){
  const txns = ke_getTxns();
  const idx = txns.findIndex(t => t.id === txn.id);
  if (idx !== -1) txns[idx] = txn; else txns.push(txn);
  ke_saveTxns(txns);
}
function ke_getTxn(id){ return ke_getTxns().find(t => t.id === id) || null; }
function ke_getTxnByRef(ref){ return ke_getTxns().find(t => t.ref === ref) || null; }

function ke_txnsForUser(user){
  const all = ke_getTxns();
  if (!user) return all;
  switch(user.role){
    case 'buyer': return all.filter(t => t.buyerId === user.id);
    case 'seller': return all.filter(t => t.sellerId === user.id);
    case 'support': case 'admin': return all;
    default: return all;
  }
}

function ke_initTxns(){
  const txns = [
    {
      id:'t-001', ref:'KE-2026-483920',
      title:'Industrial Machinery (x12)',
      category:'Manufacturing Equipment',
      status:'secured', currency:'EUR', amount:48200,
      buyerId:'u-buyer', sellerId:'u-seller',
      escrow:{ releaseConditions:'Funds release after the agreed conditions are confirmed, with a 48-hour review window.', fundedAt:'2026-07-06T10:30:00Z', releasedAt:null },
      chat:[
        { id:'m1', type:'system', text:'Trading transaction created · KE-2026-483920 · Open', time:'2026-07-06T10:00:00Z' },
        { id:'m2', senderId:'u-seller', type:'text', text:'Hi Emma, the machines are tested and meet the agreed specifications. Please confirm you\'re ready to proceed.', time:'2026-07-06T10:05:00Z' },
        { id:'m3', senderId:'u-buyer', type:'text', text:'Confirmed — I\'ve funded the trading transaction. Please proceed under the agreed terms.', time:'2026-07-06T10:35:00Z' },
        { id:'m4', type:'system', text:'Trading transaction funded · €48,200 secured', time:'2026-07-06T10:35:00Z' },
      ],
      dispute: null,
      createdAt:'2026-07-06T10:00:00Z'
    },
    {
      id:'t-002', ref:'KE-2026-391047',
      title:'Premium Linen Fabric Rolls — 200m',
      category:'Textiles',
      status:'dispute', currency:'EUR', amount:12500,
      buyerId:'u-buyer', sellerId:'u-seller',
      escrow:{ releaseConditions:'Release after the agreed specifications are confirmed, with a quality review within 24 hours.', fundedAt:'2026-07-04T09:00:00Z', releasedAt:null },
      chat:[
        { id:'m1', type:'system', text:'Transaction created · KE-2026-391047', time:'2026-07-04T09:00:00Z' },
        { id:'m2', senderId:'u-buyer', type:'text', text:'Fabrics received. Some rolls look like a different batch — not what was described in the listing.', time:'2026-07-07T11:00:00Z' },
        { id:'m3', senderId:'u-seller', type:'text', text:'The fabrics supplied match the listing photos. Can you share pictures?', time:'2026-07-07T11:20:00Z' },
        { id:'m4', type:'system', text:'Dispute opened · Trading funds frozen · Support has joined this chat', time:'2026-07-07T11:35:00Z' },
        { id:'m5', senderId:'u-support', type:'text', text:'Good afternoon, I\'m Sofia from Archanda AG support. I\'m reviewing both parties\' evidence and will provide a resolution within 24 hours.', time:'2026-07-07T12:00:00Z' },
      ],
      dispute:{ status:'under_review', reason:'Item does not match listing description', openedBy:'u-buyer', openedAt:'2026-07-07T11:35:00Z', assignedAgent:'u-support', notes:[], resolvedAt:null },
      createdAt:'2026-07-04T09:00:00Z'
    },
    {
      id:'t-003', ref:'KE-2026-290183',
      title:'Industrial Grade Fertiliser — 50 MT',
      category:'Agriculture Export',
      status:'released', currency:'EUR', amount:89000,
      buyerId:'u-buyer', sellerId:'u-seller',
      escrow:{ releaseConditions:'Funds release after the weight certificate is reviewed and approved.', fundedAt:'2026-06-20T14:00:00Z', releasedAt:'2026-07-01T09:00:00Z' },
      chat:[
        { id:'m1', type:'system', text:'Transaction created · KE-2026-290183', time:'2026-06-20T14:00:00Z' },
        { id:'m2', type:'system', text:'Trading transaction funded · €89,000 secured', time:'2026-06-20T14:30:00Z' },
        { id:'m3', type:'system', text:'Agreed conditions confirmed.', time:'2026-06-30T10:00:00Z' },
        { id:'m4', senderId:'u-buyer', type:'text', text:'Weight certificate attached and received. All 50 metric tons confirmed. Please release funds.', time:'2026-07-01T08:55:00Z' },
        { id:'m5', type:'system', text:'Trading transaction released · €89,000 transferred to seller', time:'2026-07-01T09:00:00Z' },
      ],
      dispute: null,
      createdAt:'2026-06-20T14:00:00Z'
    },
    {
      id:'t-004', ref:'KE-2026-512834',
      title:'Consumer Electronics — Mixed Batch (Phones, Tablets)',
      category:'Electronics',
      status:'secured', currency:'EUR', amount:34400,
      buyerId:'u-buyer', sellerId:'u-seller',
      escrow:{ releaseConditions:'Release after buyer confirmation, with a 72-hour review window.', fundedAt:'2026-07-07T08:00:00Z', releasedAt:null },
      chat:[
        { id:'m1', type:'system', text:'Transaction created · KE-2026-512834', time:'2026-07-07T07:30:00Z' },
        { id:'m2', type:'system', text:'Trading transaction funded · €34,400 secured', time:'2026-07-07T08:00:00Z' },
        { id:'m3', senderId:'u-seller', type:'text', text:'The items are complete and ready for buyer review.', time:'2026-07-07T08:45:00Z' },
      ],
      dispute: null,
      createdAt:'2026-07-07T07:30:00Z'
    },
    {
      id:'t-005', ref:'KE-2026-601922',
      title:'Custom Woodwork — Office Furniture (12 pieces)',
      category:'Manufacturing Equipment',
      status:'pending', currency:'EUR', amount:6750,
      buyerId:'u-buyer', sellerId:'u-seller',
      escrow:{ releaseConditions:'Funds release after the buyer confirms the agreed conditions.', fundedAt:null, releasedAt:null },
      chat:[
        { id:'m1', type:'system', text:'Transaction created · KE-2026-601922 · Awaiting buyer funding', time:'2026-07-08T08:00:00Z' },
        { id:'m2', senderId:'u-seller', type:'text', text:'Terms agreed. Ready to begin production as soon as the trading transaction is funded.', time:'2026-07-08T08:10:00Z' },
      ],
      dispute: null,
      createdAt:'2026-07-08T08:00:00Z'
    },
  ];
  ke_saveTxns(txns);
  return txns;
}

function ke_createTxn({ title, category, amount, currency, buyerId, sellerId, releaseConditions }){
  const txn = {
    id:'t-'+Date.now(), ref: ke_ref(),
    title, category, amount, currency: currency||'USD',
    status:'pending',
    buyerId, sellerId,
    escrow:{ releaseConditions, fundedAt:null, releasedAt:null },
    chat:[{ id:'m'+Date.now(), type:'system', text:'Trading transaction created · ' + ke_ref() + ' · Open — awaiting buyer funding', time: ke_now() }],
    dispute: null, createdAt: ke_now()
  };
  txn.chat[0].text = 'Trading transaction created · ' + txn.ref + ' · Open — awaiting buyer funding';
  ke_saveTxn(txn); return txn;
}

// ---- Escrow actions ----
function ke_fundEscrow(txnId){
  const txns = ke_getTxns();
  const t = txns.find(t => t.id === txnId); if (!t) return;
  t.status = 'secured'; t.escrow.fundedAt = ke_now();
  t.chat.push({ id:'m'+Date.now(), type:'system', text:'Trading transaction funded · ' + ke_moneyRaw(t.amount, t.currency) + ' secured — seller may now proceed.', time: ke_now() });
  ke_saveTxns(txns);
}

function ke_releaseEscrow(txnId, releasedBy){
  const txns = ke_getTxns();
  const t = txns.find(t => t.id === txnId); if (!t) return;
  t.status = 'released'; t.escrow.releasedAt = ke_now();
  if (t.dispute){ t.dispute.resolvedAt = ke_now(); t.dispute.status = 'resolved'; }
  t.chat.push({ id:'m'+Date.now(), type:'system', text:'Trading transaction released · ' + ke_moneyRaw(t.amount, t.currency) + ' transferred to seller.', time: ke_now() });
  ke_saveTxns(txns);
}

function ke_refundBuyer(txnId){
  const txns = ke_getTxns();
  const t = txns.find(t => t.id === txnId); if (!t) return;
  t.status = 'refunded'; t.escrow.releasedAt = ke_now();
  if (t.dispute){ t.dispute.resolvedAt = ke_now(); t.dispute.status = 'resolved'; }
  t.chat.push({ id:'m'+Date.now(), type:'system', text:'Trading transaction refunded · ' + ke_moneyRaw(t.amount, t.currency) + ' returned to buyer.', time: ke_now() });
  ke_saveTxns(txns);
}

function ke_partialSettlement(txnId, buyerPct){
  const txns = ke_getTxns();
  const t = txns.find(t => t.id === txnId); if (!t) return;
  const sellerPct = 100 - buyerPct;
  t.status = 'released'; t.escrow.releasedAt = ke_now();
  if (t.dispute){ t.dispute.resolvedAt = ke_now(); t.dispute.status = 'resolved'; }
  t.chat.push({ id:'m'+Date.now(), type:'system', text:`Trading transaction settled: ${sellerPct}% to seller, ${buyerPct}% refunded to buyer.`, time: ke_now() });
  ke_saveTxns(txns);
}

function ke_openDispute(txnId, openedBy, reason){
  const txns = ke_getTxns();
  const t = txns.find(t => t.id === txnId); if (!t) return;
  t.status = 'dispute';
  t.dispute = { status:'under_review', reason, openedBy, openedAt: ke_now(), assignedAgent: 'u-support', notes:[], resolvedAt:null };
  t.chat.push({ id:'m'+Date.now(), type:'system', text:'Dispute opened · Trading funds frozen · Support has joined this chat', time: ke_now() });
  ke_saveTxns(txns);
}

function ke_closeDispute(txnId, resolution){
  const txns = ke_getTxns();
  const t = txns.find(t => t.id === txnId); if (!t || !t.dispute) return;
  t.dispute.status = 'resolved'; t.dispute.resolvedAt = ke_now();
  t.chat.push({ id:'m'+Date.now(), type:'system', text:'Dispute resolved · ' + resolution, time: ke_now() });
  ke_saveTxns(txns);
}

function ke_addMessage(txnId, senderId, text, type){
  const txns = ke_getTxns();
  const t = txns.find(t => t.id === txnId); if (!t) return;
  t.chat.push({ id:'m'+Date.now(), senderId, type: type||'text', text, time: ke_now() });
  ke_saveTxns(txns);
}

function ke_confirmConditions(txnId){
  const txns = ke_getTxns();
  const txn = txns.find(function(item){ return item.id === txnId; });
  if (!txn) return;
  txn.status = 'confirmed';
  txn.chat.push({
    id: 'm' + Date.now(),
    type: 'system',
    text: 'Buyer confirmed the agreed conditions.',
    time: ke_now()
  });
  ke_saveTxns(txns);
}

// ---- Formatting helpers (used across pages) ----
function ke_moneyRaw(amount, currency){
  var sym = ({ NGN:'₦', USD:'$', GBP:'£', EUR:'€', GHS:'₵' })[currency||'USD'] || '$';
  return sym + Number(amount).toLocaleString('en-US');
}
