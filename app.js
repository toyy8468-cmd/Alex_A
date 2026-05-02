/* ============================================================
   Alex_A Shop — app.js  v4 (Clean)
   ============================================================ */

const ADMIN = { username:'Alex', password:'spxh_7aHaf_58Ak' };

const LS = {
  get:    k     => { try{ return JSON.parse(localStorage.getItem(k)); }catch{ return null; } },
  set:    (k,v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: k     => localStorage.removeItem(k),
};

let currentUser       = null;
let pendingBuyProduct = null;
let appliedCoupon     = null;

/* ── SEED ───────────────────────────────────────────────────── */
function seedData() {
  if (!LS.get('alexa_users'))     LS.set('alexa_users', []);
  if (!LS.get('alexa_topups'))    LS.set('alexa_topups', []);
  if (!LS.get('alexa_purchases')) LS.set('alexa_purchases', []);

  if (!LS.get('alexa_payment_settings')) {
    LS.set('alexa_payment_settings', {
      truewallet: { enabled:true, phone:'0954326060', name:'Alex_A Shop' },
    });
  }
  if (!LS.get('alexa_coupons')) {
    LS.set('alexa_coupons', [
      { code:'ALEX10', discount:10, type:'percent', active:true },
      { code:'FREE50', discount:50, type:'fixed',   active:true },
    ]);
  }
  if (!LS.get('alexa_categories')) {
    LS.set('alexa_categories', [
      { id:'cat1', name:'กล่องสุ่ม',       icon:'📦', img:'' },
      { id:'cat2', name:'ไอดีไก่ตัน',     icon:'🐔', img:'' },
      { id:'cat3', name:'ไอดีสัตว์เลี้ยง', icon:'🐾', img:'' },
      { id:'cat4', name:'Sailor Piece',    icon:'⚔️', img:'' },
    ]);
  }
  if (!LS.get('alexa_products')) {
    LS.set('alexa_products', [
      { id:'p1', name:'ไก่ตัน ไซบอก V4 T10 ดาบคู่', price:299, originalPrice:399, stock:0, sold:0, category:'cat2', img:'', desc:'ไก่ตันคุณภาพสูง การันตีเข้าได้', credentials:[] },
      { id:'p2', name:'กล่องสุ่ม Premium Pack',       price:89,  originalPrice:120, stock:0, sold:0, category:'cat1', img:'', desc:'กล่องสุ่มพรีเมียม', credentials:[] },
    ]);
  }
}

function getPS() {
  return LS.get('alexa_payment_settings') || { truewallet:{ enabled:true, phone:'0954326060', name:'Alex_A Shop' } };
}
function savePS(ps) { LS.set('alexa_payment_settings', ps); }

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  seedData();
  loadCurrentUser();
  renderStats();
  renderHomeCategoryCards();
  renderSidebarUser();
  updateNavBalance();
  showPage('home');

  document.getElementById('menuToggle').onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
  };
  document.getElementById('searchToggle').onclick = () => {
    const b = document.getElementById('searchBar');
    b.classList.toggle('visible');
    if (b.classList.contains('visible')) document.getElementById('searchInput').focus();
  };
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target===o) o.style.display='none'; });
  });
});

/* ── NAVIGATION ─────────────────────────────────────────────── */
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if (!el) return;
  el.classList.add('active');
  window.scrollTo({ top:0, behavior:'smooth' });
  if (page==='products') { renderCategoryGrid(); renderProductsGrid(); }
  if (page==='topup')    { initTopupPage(); }
  if (page==='profile')  { renderProfile(); }
  if (page==='admin')    { switchAdminTab('dashboard'); }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

/* ── SEARCH ─────────────────────────────────────────────────── */
function searchProducts() {
  const q  = document.getElementById('searchInput').value.trim().toLowerCase();
  const el = document.getElementById('searchResults');
  if (!q) { el.innerHTML=''; return; }
  const cats = LS.get('alexa_categories')||[];
  const prods= LS.get('alexa_products')||[];
  const f    = prods.filter(p=>p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q));
  if (!f.length) { el.innerHTML=`<div style="padding:1rem;color:var(--text-dim)">ไม่พบสินค้า</div>`; return; }
  el.innerHTML = f.slice(0,5).map(p=>{
    const cat = cats.find(c=>c.id===p.category);
    return `<div class="search-result-item" onclick="openProductDetail('${p.id}');document.getElementById('searchBar').classList.remove('visible')">
      <div style="font-size:1.8rem">${cat?cat.icon:'🎮'}</div>
      <div><div style="font-weight:600;font-size:.9rem">${p.name}</div>
      <div style="color:var(--red-accent);font-weight:700">${p.price.toLocaleString()} บาท</div></div>
    </div>`;
  }).join('');
}

/* ── AUTH ───────────────────────────────────────────────────── */
function showAuthModal(tab) { document.getElementById('authModal').style.display='flex'; switchAuthTab(tab||'login'); }
function closeModal(id) { document.getElementById(id).style.display='none'; }

function switchAuthTab(tab) {
  document.getElementById('loginForm').style.display    = tab==='login'    ? 'block':'none';
  document.getElementById('registerForm').style.display = tab==='register' ? 'block':'none';
  document.getElementById('tabLogin').classList.toggle('active',    tab==='login');
  document.getElementById('tabRegister').classList.toggle('active', tab==='register');
  document.getElementById('loginError').textContent='';
  document.getElementById('registerError').textContent='';
}

function login() {
  const user=document.getElementById('loginUser').value.trim();
  const pass=document.getElementById('loginPass').value;
  const err =document.getElementById('loginError');
  if (!user||!pass) { err.textContent='⚠️ กรุณากรอกชื่อและรหัสผ่าน'; return; }
  if (user===ADMIN.username && pass===ADMIN.password) {
    currentUser={username:ADMIN.username,email:'admin@alexashop.com',balance:0,isAdmin:true};
    LS.set('alexa_session',currentUser); afterLogin(); return;
  }
  const users=LS.get('alexa_users')||[];
  const found=users.find(u=>u.username===user&&u.password===pass);
  if (!found) { err.textContent='❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'; return; }
  currentUser={username:found.username,email:found.email,balance:found.balance,isAdmin:false};
  LS.set('alexa_session',currentUser); afterLogin();
}

function register() {
  const name =document.getElementById('regName').value.trim();
  const pass =document.getElementById('regPass').value;
  const email=document.getElementById('regEmail').value.trim();
  const err  =document.getElementById('registerError');
  if (!name||!pass||!email) { err.textContent='⚠️ กรุณากรอกข้อมูลให้ครบ'; return; }
  if (name===ADMIN.username) { err.textContent='❌ ชื่อผู้ใช้นี้ไม่สามารถใช้ได้'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent='⚠️ รูปแบบอีเมลไม่ถูกต้อง'; return; }
  const users=LS.get('alexa_users')||[];
  if (users.find(u=>u.username===name))  { err.textContent='❌ ชื่อผู้ใช้นี้ถูกใช้แล้ว'; return; }
  if (users.find(u=>u.email===email))    { err.textContent='❌ อีเมลนี้ถูกใช้แล้ว'; return; }
  users.push({username:name,password:pass,email,balance:0,joinDate:new Date().toLocaleString('th-TH')});
  LS.set('alexa_users',users);
  currentUser={username:name,email,balance:0,isAdmin:false};
  LS.set('alexa_session',currentUser); afterLogin();
}

function afterLogin() {
  closeModal('authModal');
  renderSidebarUser(); updateNavBalance(); renderStats();
  showToast(`✅ ยินดีต้อนรับ ${currentUser.username}!`,'success');
  if (currentUser.isAdmin) showPage('admin');
}

function logout() {
  currentUser=null; LS.remove('alexa_session');
  renderSidebarUser(); updateNavBalance(); closeSidebar(); showPage('home');
  showToast('👋 ออกจากระบบแล้ว');
}

function loadCurrentUser() {
  const s=LS.get('alexa_session');
  if (!s) return;
  if (s.isAdmin) { currentUser=s; return; }
  const u=(LS.get('alexa_users')||[]).find(u=>u.username===s.username);
  if (u) currentUser={...s,balance:u.balance};
  else LS.remove('alexa_session');
}

function updateNavBalance() {
  const el=document.getElementById('navBalance');
  const chip=document.getElementById('balanceChip');
  if (currentUser&&currentUser.isAdmin) { el.textContent='Admin'; chip.onclick=()=>showPage('admin'); }
  else if (currentUser) { el.textContent=currentUser.balance.toLocaleString(); chip.onclick=()=>{showPage('profile');switchProfileTab('info');}; }
  else { el.textContent='0'; chip.onclick=()=>showAuthModal('login'); }
}

function renderSidebarUser() {
  const el=document.getElementById('sidebarUserSection');
  if (!currentUser) {
    el.innerHTML=`<div style="padding:0 1rem 1rem">
      <button class="btn-primary full-width" onclick="showAuthModal('login');closeSidebar()">🔐 เข้าสู่ระบบ</button>
      <button class="btn-secondary full-width" style="margin-top:.5rem" onclick="showAuthModal('register');closeSidebar()">📝 สมัครสมาชิก</button>
    </div>`; return;
  }
  if (currentUser.isAdmin) {
    el.innerHTML=`<div class="sidebar-user-card">
      <div class="sidebar-user-name">🔐 ${currentUser.username}</div>
      <div style="color:var(--red-accent);font-size:.8rem">Administrator</div>
    </div>
    <div class="sidebar-user-links">
      <a href="#" onclick="showPage('admin');closeSidebar()">📊 Admin Panel</a>
      <a href="#" onclick="logout()">↩️ ออกจากระบบ</a>
    </div>`; return;
  }
  el.innerHTML=`<div class="sidebar-user-card">
    <div class="sidebar-user-name">${currentUser.username}</div>
    <div class="sidebar-user-balance">🪙 ${currentUser.balance.toLocaleString()} บาท</div>
  </div>
  <div class="sidebar-user-links">
    <a href="#" onclick="showPage('profile');switchProfileTab('info');closeSidebar()">👤 โปรไฟล์</a>
    <a href="#" onclick="showPage('profile');switchProfileTab('settings');closeSidebar()">⚙️ การตั้งค่า</a>
    <a href="#" onclick="showPage('profile');switchProfileTab('topup-history');closeSidebar()">💰 ประวัติเติมเงิน</a>
    <a href="#" onclick="showPage('profile');switchProfileTab('purchase-history');closeSidebar()">🛒 ประวัติการซื้อ</a>
    <a href="#" onclick="showPage('profile');switchProfileTab('coupon');closeSidebar()">🎟️ ระบบคูปอง</a>
    <a href="#" onclick="logout()">↩️ ออกจากระบบ</a>
  </div>`;
}

/* ── STATS ──────────────────────────────────────────────────── */
function renderStats() {
  const users   = LS.get('alexa_users')||[];
  const prods   = LS.get('alexa_products')||[];
  const sold    = prods.reduce((a,p)=>a+(p.sold||0),0);
  anim('statUsers',users.length); anim('statProducts',prods.length); anim('statSold',sold);
}
function anim(id,target) {
  const el=document.getElementById(id); if(!el) return;
  let cur=0; const step=Math.max(1,Math.ceil(target/40));
  const t=setInterval(()=>{ cur=Math.min(cur+step,target); el.textContent=cur.toLocaleString(); if(cur>=target) clearInterval(t); },30);
}

/* ── HOME ───────────────────────────────────────────────────── */
function renderHomeCategoryCards() {
  const cats =LS.get('alexa_categories')||[];
  const prods=LS.get('alexa_products')||[];
  const el=document.getElementById('homeCategoryCards'); if(!el) return;
  el.innerHTML=cats.map(cat=>{
    const count=prods.filter(p=>p.category===cat.id).length;
    return `<div class="category-card" onclick="filterByCategory('${cat.id}')">
      ${cat.img?`<img class="category-card-img" src="${cat.img}" alt="${cat.name}">`:`<div class="category-card-img-placeholder">${cat.icon}</div>`}
      <div class="category-card-info">
        <div class="category-card-name">${cat.icon} ${cat.name}</div>
        <div class="category-card-count">มีสินค้าทั้งหมด ${count} ชิ้น</div>
        <button class="btn-primary" style="padding:.5rem 1.25rem;font-size:.9rem">สินค้าทั้งหมด</button>
      </div>
    </div>`;
  }).join('');
}

/* ── PRODUCTS ───────────────────────────────────────────────── */
function renderCategoryGrid() {
  const cats =LS.get('alexa_categories')||[];
  const prods=LS.get('alexa_products')||[];
  const el=document.getElementById('categoryGrid'); if(!el) return;
  el.innerHTML=cats.map(cat=>{
    const count=prods.filter(p=>p.category===cat.id).length;
    return `<div class="category-grid-item" onclick="filterByCategory('${cat.id}')">
      ${cat.img?`<img src="${cat.img}" alt="${cat.name}">`:`<div style="width:100%;height:100px;background:linear-gradient(135deg,var(--red-dark),#3d0000);display:flex;align-items:center;justify-content:center;font-size:2.5rem">${cat.icon}</div>`}
      <div class="category-grid-item-name">${cat.name} <span style="color:var(--text-dim);font-size:.75rem">(${count})</span></div>
    </div>`;
  }).join('');
}

let activeCategory=null;
function filterByCategory(catId) { activeCategory=catId; showPage('products'); renderProductsGrid(); }

function renderProductsGrid() {
  const el=document.getElementById('productsGrid'); if(!el) return;
  const prods=LS.get('alexa_products')||[];
  const cats =LS.get('alexa_categories')||[];
  const f=activeCategory?prods.filter(p=>p.category===activeCategory):prods;
  if (!f.length) { el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📦</div><p>ไม่มีสินค้าในหมวดนี้</p></div>`; return; }
  el.innerHTML=f.map(p=>{
    const cat=cats.find(c=>c.id===p.category);
    const disc=p.originalPrice>p.price?Math.round((1-p.price/p.originalPrice)*100):0;
    return `<div class="product-card" onclick="openProductDetail('${p.id}')">
      ${disc?`<div class="product-badge">-${disc}%</div>`:''}
      ${p.img?`<img src="${p.img}" alt="${p.name}">`:`<div class="product-img-placeholder">${cat?cat.icon:'🎮'}</div>`}
      <div class="product-card-body">
        <div class="product-card-name">${p.name}</div>
        <div class="product-card-price">${p.price.toLocaleString()} บาท</div>
        ${p.originalPrice>p.price?`<div class="product-card-original">${p.originalPrice.toLocaleString()} บาท</div>`:''}
        <div class="product-card-stock">คงเหลือ: ${p.stock} ชิ้น</div>
      </div>
    </div>`;
  }).join('');
}

function openProductDetail(pid) {
  const prods=LS.get('alexa_products')||[];
  const cats =LS.get('alexa_categories')||[];
  const p=prods.find(x=>x.id===pid); if(!p) return;
  const cat=cats.find(c=>c.id===p.category);
  const disc=p.originalPrice>p.price?Math.round((1-p.price/p.originalPrice)*100):0;
  document.getElementById('detailBreadcrumb').textContent=`🏠 หน้าแรก › สินค้า › ${p.name}`;
  document.getElementById('productDetailContent').innerHTML=`
    ${p.img?`<img class="product-detail-img" src="${p.img}" alt="${p.name}">`:`<div class="product-detail-img-placeholder">${cat?cat.icon:'🎮'}</div>`}
    <div class="product-detail-name">${p.name}</div>
    <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem">
      <div class="product-detail-price">${p.price.toLocaleString()} บาท</div>
      ${p.originalPrice>p.price?`<div style="color:var(--text-dim);text-decoration:line-through">${p.originalPrice.toLocaleString()} บาท</div>`:''}
      ${disc?`<span class="discount-badge">-${disc}%</span>`:''}
    </div>
    <div class="product-detail-stock">📦 คงเหลือ: ${p.stock} ชิ้น | ขายแล้ว: ${p.sold} ชิ้น</div>
    <div class="product-detail-desc">${p.desc}</div>
    <button class="btn-primary full-width" style="margin-top:.75rem" onclick="initBuy('${p.id}')">🛒 ซื้อสินค้า</button>
    <button class="btn-secondary full-width" style="margin-top:.5rem" onclick="showPage('products')">← กลับ</button>`;
  showPage('product-detail');
}

/* ── BUY FLOW ───────────────────────────────────────────────── */
function initBuy(pid) {
  if (!currentUser) { showAuthModal('login'); return; }
  if (currentUser.isAdmin) { showToast('⚠️ แอดมินไม่สามารถซื้อสินค้าได้','error'); return; }
  const prods=LS.get('alexa_products')||[];
  const p=prods.find(x=>x.id===pid); if(!p) return;
  if (p.stock<=0) { showToast('❌ สินค้าหมดแล้ว','error'); return; }
  pendingBuyProduct=p; appliedCoupon=null;
  document.getElementById('buyModalContent').innerHTML=`
    <div style="background:var(--dark-card2);border-radius:10px;padding:1rem;margin-bottom:1rem">
      <div style="font-weight:700;margin-bottom:.5rem">${p.name}</div>
      <div style="color:var(--red-accent);font-weight:800;font-size:1.2rem" id="buyFinalPrice">${p.price.toLocaleString()} บาท</div>
      <div style="color:var(--text-dim);font-size:.85rem">ยอดเงินของคุณ: ${currentUser.balance.toLocaleString()} บาท</div>
    </div>
    <div style="margin-bottom:1rem">
      <label style="display:block;margin-bottom:.4rem;font-size:.9rem;color:var(--text-dim);font-weight:600">🎟️ คูปองส่วนลด</label>
      <div style="display:flex;gap:.5rem">
        <input type="text" id="buyCouponInput" placeholder="กรอกรหัสคูปอง" class="form-input" style="flex:1">
        <button class="btn-gold" onclick="applyCouponOnBuy()">ใช้</button>
      </div>
      <div id="buyCouponMsg" style="font-size:.85rem;margin-top:.4rem"></div>
    </div>`;
  document.getElementById('buyModal').style.display='flex';
}

function applyCouponOnBuy() {
  const code=(document.getElementById('buyCouponInput').value||'').trim().toUpperCase();
  const c=(LS.get('alexa_coupons')||[]).find(x=>x.code===code&&x.active);
  const msgEl=document.getElementById('buyCouponMsg');
  const priceEl=document.getElementById('buyFinalPrice');
  if (!c) { msgEl.innerHTML=`<span style="color:#f87171">❌ คูปองไม่ถูกต้อง</span>`; appliedCoupon=null; priceEl.textContent=`${pendingBuyProduct.price.toLocaleString()} บาท`; return; }
  appliedCoupon=c;
  priceEl.textContent=`${calcFinalPrice(pendingBuyProduct.price,c).toLocaleString()} บาท`;
  msgEl.innerHTML=`<span style="color:var(--green-ok)">✅ ใช้คูปอง ${c.code} สำเร็จ</span>`;
}

function calcFinalPrice(price,coupon) {
  if (!coupon) return price;
  return coupon.type==='percent' ? Math.max(0,Math.round(price*(1-coupon.discount/100))) : Math.max(0,price-coupon.discount);
}

function confirmBuy() {
  if (!pendingBuyProduct||!currentUser) return;
  const p=pendingBuyProduct;
  const finalPrice=calcFinalPrice(p.price,appliedCoupon);
  if (currentUser.balance<finalPrice) { showToast('❌ ยอดเงินไม่เพียงพอ','error'); closeModal('buyModal'); showPage('topup'); return; }

  const prods=LS.get('alexa_products')||[];
  const pi=prods.findIndex(x=>x.id===p.id);
  let cred=null;
  if (pi!==-1) {
    const arr=prods[pi].credentials||[];
    if (arr.length>0) { cred=arr.shift(); prods[pi].credentials=arr; }
    prods[pi].stock=Math.max(0,prods[pi].stock-1);
    prods[pi].sold=(prods[pi].sold||0)+1;
  }
  LS.set('alexa_products',prods);

  currentUser.balance-=finalPrice; LS.set('alexa_session',currentUser);
  const users=LS.get('alexa_users')||[];
  const ui=users.findIndex(u=>u.username===currentUser.username);
  if (ui!==-1) { users[ui].balance=currentUser.balance; LS.set('alexa_users',users); }

  const purch=LS.get('alexa_purchases')||[];
  purch.unshift({ id:'pur_'+Date.now(), username:currentUser.username, productId:p.id, productName:p.name, price:finalPrice, coupon:appliedCoupon?appliedCoupon.code:null, date:new Date().toLocaleString('th-TH'), status:'success', credential:cred });
  LS.set('alexa_purchases',purch);

  updateNavBalance(); renderStats(); closeModal('buyModal');
  const msg=cred ? '✅ ซื้อสำเร็จ! ดูรหัสได้ในประวัติการซื้อ' : `✅ ซื้อสำเร็จ! ${finalPrice.toLocaleString()} บาท`;
  showToast(msg,'success');
  pendingBuyProduct=null; appliedCoupon=null;
}

/* ── TOPUP ──────────────────────────────────────────────────── */
function initTopupPage() {
  const ps=getPS();
  const card=document.getElementById('topupCardTW');
  const form=document.getElementById('topupFormTW');
  if (card) card.style.display=ps.truewallet.enabled?'':'none';
  if (form) form.style.display='none';
  const st=document.getElementById('truewalletStatus');
  if (st) { st.className='topup-status'; st.textContent=''; }
  const inp=document.
