// Shared HTML mockups of the Throve app screens, used by the store screenshots and the promo video.
// Call configureAssets() first so image/font URLs resolve for the host (file:// or a static server).
let urls = {
  img: (name) => name,
  asset: (rel) => rel,
  font: (pkg, file) => `${pkg}/${file}`,
};
export function configureAssets(next) {
  urls = { ...urls, ...next };
}
const img = (name) => urls.img(name);
const asset = (rel) => urls.asset(rel);
const font = (pkg, file) => urls.font(pkg, file);

export function fontFaceCss() {
  return `
@font-face{font-family:Playfair;font-weight:600;src:url('${font('playfair-display', '600SemiBold/PlayfairDisplay_600SemiBold.ttf')}')}
@font-face{font-family:Playfair;font-weight:700;src:url('${font('playfair-display', '700Bold/PlayfairDisplay_700Bold.ttf')}')}
@font-face{font-family:Inter;font-weight:400;src:url('${font('inter', '400Regular/Inter_400Regular.ttf')}')}
@font-face{font-family:Inter;font-weight:500;src:url('${font('inter', '500Medium/Inter_500Medium.ttf')}')}
@font-face{font-family:Inter;font-weight:600;src:url('${font('inter', '600SemiBold/Inter_600SemiBold.ttf')}')}
@font-face{font-family:Inter;font-weight:700;src:url('${font('inter', '700Bold/Inter_700Bold.ttf')}')}`;
}

export const C = {
  ivory: '#FFF7F0', ivoryEl: '#FFFCF8', sand: '#F3EDE6', espresso: '#2B211F', body: '#5C4B45', muted: '#7A6A64',
  muted2: '#8C7A73', plum: '#5A1F45', blush: '#D88AA1', gold: '#B68235', border: '#E2D7CC', divider: '#EDE3D9',
  success: '#4F6B4C', successBg: '#F4F7F2', liveRed: '#C0392B', liveDark: '#1B1113',
};

export const ICON_PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
};
export const icon = (name, size = 20, color = 'currentColor', fill = 'none', sw = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;

export const ngn = (n) => `₦${n.toLocaleString('en-NG')}`;

export const LISTINGS = [
  { img: 'womens-midi-dress.jpg', title: 'Red floral midi dress', price: 15500, meta: 'M · Like new' },
  { img: 'mens-jacket.jpg', title: 'Rust bomber jacket', price: 28000, meta: 'L · Good' },
  { img: 'brown-shoulder-bag.jpg', title: 'Orange top-handle bag', price: 22000, meta: 'One size · Excellent' },
  { img: 'white-trainers.jpg', title: 'Red running trainers', price: 18500, meta: 'UK 9 · Like new' },
  { img: 'womens-top.jpg', title: 'Blush wool coat', price: 26000, meta: 'S · Excellent' },
  { img: 'gold-necklace.jpg', title: 'Pastel chunky sneakers', price: 17500, meta: 'UK 6 · Like new' },
  { img: 'black-heels.jpg', title: 'Blue floral heels', price: 14000, meta: 'UK 5 · Excellent' },
  { img: 'mens-shirt.jpg', title: 'Chambray button-up shirt', price: 8500, meta: 'M · Like new' },
  { img: 'fashion-scarf.jpg', title: 'Leopard ankle boots', price: 16500, meta: 'UK 6 · Good' },
  { img: 'womens-denim-jacket.jpg', title: 'Distressed denim shorts', price: 9000, meta: 'W28 · Good' },
  { img: 'black-handbag.jpg', title: 'Quilted black shoulder bag', price: 45000, meta: 'One size · Excellent' },
  { img: 'watch.jpg', title: 'Minimal leather watch', price: 32000, meta: 'One size · Good' },
];

export const cols = (k) => (k === 'phone' ? 2 : k === 't7' ? 3 : 4);

export function statusBar(dark = false) {
  const c = dark ? '#fff' : C.espresso;
  return `<div class="status" style="color:${c}"><span>9:41</span><span class="status-r">
    <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="${c}"/><rect x="4.5" y="5" width="3" height="6" rx="1" fill="${c}"/><rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="${c}"/><rect x="13.5" y="0" width="3" height="11" rx="1" fill="${c}"/></svg>
    <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="${c}" opacity=".5"/><rect x="2" y="2" width="16" height="8" rx="2" fill="${c}"/><rect x="23" y="4" width="1.6" height="4" rx=".8" fill="${c}" opacity=".5"/></svg>
  </span></div>`;
}

export function productCard(l, opts = {}) {
  return `<div class="card">
    <div class="card-img" style="background-image:url('${img(l.img)}')">
      <span class="card-heart">${icon('heart', 15, opts.liked ? C.plum : C.espresso, opts.liked ? C.plum : 'none')}</span>
    </div>
    <div class="card-title">${l.title}</div>
    <div class="card-price">${ngn(l.price)}</div>
    <div class="card-meta">${l.meta}</div>
  </div>`;
}

export function tabBar(active) {
  const tabs = [['Home', 'home'], ['Live', 'live'], ['Sell', 'sell'], ['Inbox', 'inbox'], ['Profile', 'profile']];
  const glyph = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    live: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>',
    sell: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    inbox: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  };
  return `<div class="tabbar">${tabs
    .map(([label, key]) => {
      const on = key === active;
      const col = on ? C.plum : C.muted2;
      return `<div class="tab" style="color:${col}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="${on ? 2.1 : 1.7}" stroke-linecap="round" stroke-linejoin="round">${glyph[key]}</svg><span>${label}</span></div>`;
    })
    .join('')}</div>`;
}

// ---------- Screens ----------

export function homeScreen(k) {
  const n = cols(k) * (k === 'phone' ? 2 : 2);
  const depts = [
    ['Women', 'womens-midi-dress.jpg'], ['Men', 'beauty-perfume.jpg'], ['Kids', 'kids-dress.jpg'],
  ];
  const lives = [
    { img: 'live-fashion-edit.jpg', host: 'host-ife.jpg', name: 'Ife’s Friday fashion edit', who: '@ife.closet', v: '1.2k' },
    { img: 'live-bag-sale.jpg', host: 'host-dami.jpg', name: 'Designer bag sale', who: '@dami.finds', v: '846' },
    { img: 'live-beauty-drop.jpg', host: 'seller-amaka.jpg', name: 'Beauty drop: fragrances', who: '@amaka.beauty', v: '512' },
  ];
  return `${statusBar()}
  <div class="pad">
    <div class="home-head">
      <div class="brand"><img src="${asset('assets/images/throve-mark.png')}"/><span>Throve</span></div>
      <div class="icon-btn">${icon('bell', 20, C.espresso)}<i class="dot"></i></div>
    </div>
    <div class="greet">Good evening, Kemi</div>
    <div class="searchbar">${icon('search', 18, C.muted2)}<span>Search items, brands or sellers</span></div>
    <div class="sec-head"><h3>Shop by department</h3><a>See all</a></div>
    <div class="depts">
      ${depts.map(([l, i]) => `<div class="dept"><div class="dept-c" style="background-image:url('${img(i)}')"></div><span>${l}</span></div>`).join('')}
      <div class="dept"><div class="dept-c dept-all">${icon('chevron', 22, C.plum)}</div><span>Browse</span></div>
    </div>
    <div class="sec-head"><h3><i class="live-dot"></i>Live now</h3><a>See all</a></div>
  </div>
  <div class="hscroll">
    ${lives.slice(0, k === 'phone' ? 3 : 3).map((l) => `<div class="live-card" style="background-image:linear-gradient(180deg,rgba(0,0,0,.05) 40%,rgba(27,17,19,.85)),url('${img(l.img)}')">
        <div class="live-top"><span class="pill-red">LIVE</span><span class="pill-dark">${icon('eye', 12, '#fff')} ${l.v}</span></div>
        <div class="live-bottom"><img src="${img(l.host)}"/><div><b>${l.name}</b><span>${l.who}</span></div></div>
      </div>`).join('')}
  </div>
  <div class="pad">
    <div class="sec-head"><h3>New listings</h3><a>See all</a></div>
    <div class="grid" style="--cols:${cols(k)}">${LISTINGS.slice(0, n).map((l, i) => productCard(l, { liked: i === 1 })).join('')}</div>
  </div>
  ${tabBar('home')}`;
}

export function liveTabScreen(k) {
  const upcoming = [
    { img: 'live-thrift-picks.jpg', title: 'Thrift picks under ₦10k', who: 'Zainab', when: 'Today · 7:00 PM' },
    { img: 'live-beauty-drop.jpg', title: 'Skincare & fragrance drop', who: 'Amaka', when: 'Tomorrow · 6:30 PM' },
    { img: 'live-bag-sale.jpg', title: 'Weekend bag sale', who: 'Dami', when: 'Sat · 4:00 PM' },
    { img: 'live-fashion-edit.jpg', title: 'Menswear essentials', who: 'Tobi', when: 'Sun · 5:00 PM' },
  ];
  return `${statusBar()}
  <div class="pad">
    <div class="live-head"><div><h1 class="title">Live</h1><p class="subtitle">Shop in real time with Throve sellers</p></div>
      <div class="btn-sm">${icon('plus', 16, '#fff', 'none', 2.2)} Create live</div></div>
    <div class="badge-row"><span class="pill-red">LIVE NOW</span><span class="muted-sm">3 sellers streaming</span></div>
    <div class="feat" style="background-image:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(27,17,19,.9)),url('${img('live-fashion-edit.jpg')}')">
      <div class="live-top"><span class="pill-red">LIVE</span><span class="pill-dark">${icon('eye', 12, '#fff')} 1.2k watching</span></div>
      <div class="feat-bottom">
        <div class="feat-host"><img src="${img('host-ife.jpg')}"/><div><b>Ife’s Friday fashion edit</b><span>@ife.closet · Women · Dresses</span></div></div>
        <div class="watch">Watch</div>
      </div>
    </div>
    <div class="sec-head"><h3>Upcoming lives</h3><a>See all</a></div>
    <div class="${k === 'phone' ? 'up-list' : 'up-grid'}">
      ${upcoming.map((u) => `<div class="up-row"><div class="up-img" style="background-image:url('${img(u.img)}')"></div>
        <div class="up-body"><b>${u.title}</b><span>${icon('calendar', 13, C.muted2)} ${u.when}</span><span class="up-who">with ${u.who}</span></div>
        <div class="remind">Remind me</div></div>`).join('')}
    </div>
  </div>
  ${tabBar('live')}`;
}

export function liveRoomScreen(k) {
  const chats = [
    ['buyer-maya.jpg', 'maya', 'That coat is gorgeous 😍'],
    ['buyer-femi.jpg', 'femi.o', 'Size on the jacket?'],
    ['buyer-chioma.jpg', 'chioma', 'Claimed the bag!! 🎉'],
    ['buyer-kemi.jpg', 'kemi', 'Show the back please'],
  ];
  return `<div class="room" style="background-image:linear-gradient(180deg,rgba(27,17,19,.55),rgba(27,17,19,0) 22%,rgba(27,17,19,0) 45%,rgba(27,17,19,.92) 88%),url('${img('live-thrift-picks.jpg')}')">
    ${statusBar(true)}
    <div class="room-top">
      <div class="host-pill"><img src="${img('seller-zainab.jpg')}"/><div><b>Zainab</b><span>Weekend thrift picks</span></div><div class="follow">Follow</div></div>
      <div class="room-stats"><span class="pill-red">LIVE</span><span class="pill-dark">${icon('eye', 12, '#fff')} 2.4k</span></div>
    </div>
    <div class="room-bottom">
      <div class="chat">${chats.map(([a, n, m]) => `<div class="msg"><img src="${img(a)}"/><div><b>${n}</b><span>${m}</span></div></div>`).join('')}</div>
      <div class="pinned">
        <div class="pinned-img" style="background-image:url('${img('womens-top.jpg')}')"></div>
        <div class="pinned-body"><span class="pinned-tag">${icon('tag', 12, C.plum)} Showing now</span><b>Blush wool coat</b><span class="pinned-meta">Size S · Excellent</span><span class="pinned-price">${ngn(18500)}</span></div>
        <div class="claim">Claim</div>
      </div>
      <div class="comment"><span>Say something…</span><div class="hearts">${icon('heart', 22, '#fff', C.blush, 0)}</div></div>
    </div>
  </div>`;
}

export function productScreen(k) {
  const wide = k === 't10';
  const details = `
    <div class="pd-body">
      <div class="pd-brand">WOMEN · DRESSES</div>
      <h1 class="pd-title">Red floral midi dress</h1>
      <div class="pd-price">${ngn(15500)}</div>
      <div class="pd-fee">${icon('shield', 14, C.success)} ${ngn(775)} Buyer Protection fee included at checkout</div>
      <div class="chips"><span>Size M</span><span>Like new</span><span>Belt included</span></div>
      <div class="pd-actions"><div class="btn-primary">Buy now</div><div class="btn-outline">Make offer</div></div>
      <div class="pd-sec"><h4>Description</h4><p>Flowy red floral midi with cap sleeves and a matching woven belt. Worn twice, no marks or pulls. Fits true to size.</p></div>
      <div class="pd-sec"><h4>Shipping</h4><p>${icon('truck', 15, C.body)} Delivery in 2–4 days · Lagos, Nigeria</p></div>
      <div class="seller-row"><img src="${img('seller-ada.jpg')}"/><div><b>Ada Thrifts</b><span>${icon('star', 12, C.gold, C.gold, 0)} 4.9 · 128 reviews</span></div><div class="btn-ghost">View profile</div></div>
    </div>`;
  const gallery = `<div class="pd-img${wide ? ' pd-img-wide' : ''}" style="background-image:url('${img('womens-midi-dress.jpg')}')">
      <div class="pd-nav"><span class="round">${icon('back', 20, C.espresso)}</span><span class="pd-nav-r"><span class="round">${icon('share', 18, C.espresso)}</span><span class="round">${icon('heart', 18, C.plum, C.plum)}</span></span></div>
      <div class="dots"><i class="on"></i><i></i><i></i><i></i></div>
    </div>`;
  if (wide) return `${statusBar()}<div class="pd-split">${gallery}${details}</div>`;
  return `<div class="pd-overlay-status">${statusBar()}</div>${gallery}${details}`;
}

export function offerScreen(k) {
  return `${statusBar()}
  <div class="thread-head"><span>${icon('back', 22, C.espresso)}</span><img src="${img('seller-tobi.jpg')}"/><div><b>Tobi Adeyemi</b><span>Usually replies in 10 min</span></div><span class="spacer"></span>${icon('more', 22, C.espresso)}</div>
  <div class="thread-item"><div class="ti-img" style="background-image:url('${img('mens-jacket.jpg')}')"></div><div><b>Rust bomber jacket</b><span>Size L · Good · <s>${ngn(28000)}</s></span></div><div class="btn-sm">Buy for ${ngn(24000)}</div></div>
  <div class="thread">
    <div class="day">Today</div>
    <div class="bubble them">Hi! Is the bomber jacket still available?</div>
    <div class="bubble me">Yes it is 🙌 It’s in great condition, only worn a few times.</div>
    <div class="offer-card">
      <div class="offer-top">${icon('tag', 16, C.plum)} <span>Offer sent</span></div>
      <div class="offer-amt">${ngn(22000)}</div>
      <div class="offer-sub">Original price ${ngn(28000)}</div>
    </div>
    <div class="offer-card counter">
      <div class="offer-top">${icon('tag', 16, C.gold)} <span>Counter-offer from Tobi</span></div>
      <div class="offer-amt">${ngn(24000)}</div>
      <div class="offer-btns"><div class="btn-primary sm">Accept</div><div class="btn-outline sm">Decline</div></div>
    </div>
    <div class="bubble them">Best I can do is ₦24k, and I’ll ship tomorrow morning 📦</div>
  </div>
  <div class="composer"><div class="composer-in">Message Tobi…</div><div class="send">${icon('send', 18, '#fff')}</div></div>`;
}

export function checkoutScreen(k) {
  return `${statusBar()}
  <div class="screen-head"><span>${icon('back', 22, C.espresso)}</span><b>Checkout</b><span class="spacer-22"></span></div>
  <div class="pad">
    <div class="steps"><span class="on">Delivery</span><i></i><span class="on">Payment</span><i></i><span>Confirm</span></div>
    <div class="co-item"><div class="ti-img lg" style="background-image:url('${img('brown-shoulder-bag.jpg')}')"></div><div><b>Orange top-handle bag</b><span>One size · Excellent</span><span>Sold by @ada.thrifts</span></div><div class="co-price">${ngn(22000)}</div></div>
    <div class="box"><div class="box-h">${icon('pin', 16, C.plum)} Deliver to</div><b>Kemi Balogun</b><span>12 Admiralty Way, Lekki Phase 1, Lagos</span><a>Change</a></div>
    <div class="box"><div class="box-h">${icon('truck', 16, C.plum)} Delivery</div>
      <div class="radio on"><i></i><div><b>Standard</b><span>2–4 business days</span></div><em>${ngn(2500)}</em></div>
      <div class="radio"><i></i><div><b>Express</b><span>Next day in Lagos</span></div><em>${ngn(4500)}</em></div>
    </div>
    <div class="box sum">
      <div><span>Item</span><span>${ngn(22000)}</span></div>
      <div><span>Buyer Protection ${icon('shield', 13, C.success)}</span><span>${ngn(1100)}</span></div>
      <div><span>Delivery</span><span>${ngn(2500)}</span></div>
      <div class="tot"><span>Total</span><span>${ngn(25600)}</span></div>
    </div>
    <div class="protect">${icon('shield', 20, C.success)}<div><b>You’re covered by Buyer Protection</b><span>Get a full refund if your item doesn’t arrive or isn’t as described.</span></div></div>
    <div class="btn-primary big">${icon('lock', 17, '#fff')} Pay ${ngn(25600)}</div>
  </div>`;
}

export function sellScreen(k) {
  return `${statusBar()}
  <div class="screen-head"><span>${icon('back', 22, C.espresso)}</span><b>New listing</b><span class="save">Save draft</span></div>
  <div class="pad">
    <div class="lbl">Photos <em>2 of 8</em></div>
    <div class="photos" style="--pcols:${k === 'phone' ? 4 : k === 't7' ? 5 : 6}">
      <div class="ph ph-cover" style="background-image:url('${img('womens-denim-jacket.jpg')}')"><span>Cover</span></div>
      <div class="ph" style="background-image:url('${img('womens-skirt.jpg')}')"></div>
      <div class="ph add">${icon('camera', 22, C.plum)}<span>Add</span></div>
      <div class="ph add">${icon('camera', 22, C.plum)}<span>Add</span></div>
    </div>
    <div class="field"><label>Title</label><div class="input">Distressed denim shorts</div></div>
    <div class="field"><label>Description</label><div class="input ta">Light-wash high-rise denim shorts with a frayed hem. Worn a handful of times, no stains or tears.</div></div>
    <div class="row2">
      <div class="field"><label>Department</label><div class="input sel">Women ${icon('chevron', 16, C.muted2)}</div></div>
      <div class="field"><label>Category</label><div class="input sel">Clothing ${icon('chevron', 16, C.muted2)}</div></div>
    </div>
    <div class="field"><label>Condition</label><div class="chips pick"><span>New with tags</span><span>Like new</span><span class="on">Good</span><span>Fair</span></div></div>
    <div class="row2">
      <div class="field"><label>Size</label><div class="input sel">W28 ${icon('chevron', 16, C.muted2)}</div></div>
      <div class="field"><label>Price</label><div class="input price">₦ 9,000</div></div>
    </div>
    <div class="earn">${icon('check', 16, C.success, 'none', 2.4)} You’ll earn <b>${ngn(8100)}</b> after fees</div>
    <div class="btn-primary big">Publish listing</div>
  </div>`;
}

export function sellerScreen(k) {
  const n = cols(k) * 2;
  return `<div class="cover" style="background-image:linear-gradient(180deg,rgba(27,17,19,.35),rgba(27,17,19,0) 50%),url('${img('live-fashion-edit.jpg')}')">${statusBar(true)}
    <div class="pd-nav"><span class="round">${icon('back', 20, C.espresso)}</span><span class="round">${icon('share', 18, C.espresso)}</span></div></div>
  <div class="pad prof">
    <img class="avatar" src="${img('seller-ada.jpg')}"/>
    <h1 class="pd-title">Ada Thrifts</h1>
    <div class="handle">@ada.thrifts · Lagos</div>
    <div class="rating">${icon('star', 15, C.gold, C.gold, 0)}${icon('star', 15, C.gold, C.gold, 0)}${icon('star', 15, C.gold, C.gold, 0)}${icon('star', 15, C.gold, C.gold, 0)}${icon('star', 15, C.gold, C.gold, 0)} <b>4.9</b> <span>(128 reviews)</span></div>
    <p class="bio">Curated vintage & pre-loved womenswear. New drops every Friday on Throve Live ✨</p>
    <div class="stats"><div><b>86</b><span>Listings</span></div><div><b>2.3k</b><span>Followers</span></div><div><b>412</b><span>Sold</span></div></div>
    <div class="pd-actions"><div class="btn-primary">Follow</div><div class="btn-outline">Message</div></div>
    <div class="tabs"><span class="on">Listings</span><span>Reviews</span><span>Lives</span></div>
    <div class="grid" style="--cols:${cols(k)}">${[0, 6, 2, 4, 8, 10, 5, 9].slice(0, n).map((i) => productCard(LISTINGS[i])).join('')}</div>
  </div>`;
}

export const SCREENS = [
  { id: '01-home', bg: 'ivory', headline: 'Curated secondhand fashion', sub: 'Discover pre-loved pieces from trusted sellers across Nigeria.', render: homeScreen },
  { id: '02-live', bg: 'plum', headline: 'Shop live drops', sub: 'Tune in as sellers showcase fresh finds in real time.', render: liveTabScreen },
  { id: '03-live-room', bg: 'ivory', headline: 'Claim it live', sub: 'Chat with hosts and grab pieces the moment they’re shown.', render: liveRoomScreen, dark: true },
  { id: '04-product', bg: 'plum', headline: 'Every detail, up close', sub: 'Real photos, honest condition notes and clear sizing.', render: productScreen },
  { id: '05-offers', bg: 'ivory', headline: 'Make an offer', sub: 'Chat with sellers and agree on a price that works for you.', render: offerScreen },
  { id: '06-checkout', bg: 'plum', headline: 'Checkout with confidence', sub: 'Buyer Protection on every order, from payment to delivery.', render: checkoutScreen },
  { id: '07-sell', bg: 'ivory', headline: 'Sell in minutes', sub: 'Snap, price and list your wardrobe for thousands of shoppers.', render: sellScreen },
  { id: '08-seller', bg: 'plum', headline: 'Follow sellers you love', sub: 'Be first to see their newest drops and live shows.', render: sellerScreen },
];

export function appCss(d) {
  const t = d.kind !== 'phone';
  const P = t ? 28 : 20;
  return `
.status{height:${t ? 36 : 50}px;display:flex;align-items:center;justify-content:space-between;padding:${t ? '0 26px' : '6px 30px 0 34px'};font-weight:600;font-size:${t ? 14 : 16}px;position:relative;z-index:3}
.status-r{display:flex;gap:6px;align-items:center}
.pad{padding:0 ${P}px}
.home-head{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.brand{display:flex;align-items:center;gap:9px}.brand img{width:32px;height:32px;border-radius:8px}
.brand span{font-family:Playfair;font-weight:700;font-size:25px;color:${C.plum}}
.icon-btn{position:relative;width:42px;height:42px;border-radius:21px;border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;background:${C.ivoryEl}}
.icon-btn .dot{position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:4px;background:${C.plum};border:1.5px solid ${C.ivoryEl}}
.greet{font-family:Playfair;font-weight:600;font-size:${t ? 28 : 24}px;margin:10px 0 12px}
.searchbar{display:flex;align-items:center;gap:10px;height:48px;border-radius:24px;border:1px solid ${C.border};background:${C.ivoryEl};padding:0 18px;color:${C.muted2};font-size:15px}
.sec-head{display:flex;justify-content:space-between;align-items:center;margin:20px 0 12px}
.sec-head h3{font-family:Playfair;font-weight:600;font-size:${t ? 22 : 20}px;display:flex;align-items:center;gap:8px}
.sec-head a{font-size:14px;font-weight:600;color:${C.plum}}
.live-dot{width:9px;height:9px;border-radius:5px;background:${C.liveRed};display:inline-block;box-shadow:0 0 0 4px rgba(192,57,43,.15)}
.depts{display:flex;gap:${t ? 30 : 18}px}
.dept{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;font-weight:500;color:${C.body}}
.dept-c{width:${t ? 84 : 70}px;height:${t ? 84 : 70}px;border-radius:50%;background-size:cover;background-position:center 20%;border:2px solid ${C.ivoryEl};box-shadow:0 0 0 1px ${C.border}}
.dept-all{display:flex;align-items:center;justify-content:center;background:${C.sand}}
.hscroll{display:flex;gap:14px;padding:0 ${P}px;overflow:hidden}
.live-card{flex:0 0 ${t ? 240 : 200}px;height:${t ? 250 : 190}px;border-radius:18px;background-size:cover;background-position:center;position:relative;padding:12px;color:#fff;display:flex;flex-direction:column;justify-content:space-between}
.live-top{display:flex;gap:6px;align-items:center}
.pill-red{background:${C.liveRed};color:#fff;font-weight:700;font-size:11px;letter-spacing:.06em;padding:4px 8px;border-radius:6px}
.pill-dark{background:rgba(27,17,19,.55);color:#fff;font-weight:600;font-size:11px;padding:4px 8px;border-radius:6px;display:inline-flex;gap:4px;align-items:center}
.live-bottom{display:flex;gap:9px;align-items:center}
.live-bottom img{width:34px;height:34px;border-radius:17px;border:2px solid #fff;object-fit:cover}
.live-bottom b{display:block;font-size:14px;line-height:1.25}.live-bottom span{font-size:12px;opacity:.85}
.grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:${t ? 18 : 14}px}
.card-img{aspect-ratio:4/5;border-radius:14px;background-size:cover;background-position:center;position:relative;background-color:${C.sand}}
.card-heart{position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:15px;background:rgba(255,252,248,.92);display:flex;align-items:center;justify-content:center}
.card-title{font-size:14px;font-weight:500;margin-top:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-price{font-weight:700;font-size:15px;margin-top:2px}
.card-meta{font-size:12.5px;color:${C.muted};margin-top:1px}
.tabbar{position:absolute;left:0;right:0;bottom:${d.hidden}px;height:${t ? 64 : 64}px;background:${C.ivoryEl};border-top:1px solid ${C.divider};display:flex;justify-content:space-around;padding-top:10px}
.tab{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:600}
.title{font-family:Playfair;font-weight:600;font-size:${t ? 36 : 32}px}
.subtitle{color:${C.body};font-size:14.5px;margin-top:4px}
.live-head{display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px}
.btn-sm{display:inline-flex;align-items:center;gap:6px;background:${C.plum};color:#fff;font-weight:600;font-size:13.5px;padding:10px 14px;border-radius:22px;white-space:nowrap}
.badge-row{display:flex;gap:10px;align-items:center;margin:20px 0 12px}
.muted-sm{font-size:13px;color:${C.muted}}
.feat{height:${t ? 420 : 330}px;border-radius:22px;background-size:cover;background-position:center;padding:16px;display:flex;flex-direction:column;justify-content:space-between;color:#fff}
.feat-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.feat-host{display:flex;gap:10px;align-items:center}
.feat-host img{width:44px;height:44px;border-radius:22px;border:2px solid #fff;object-fit:cover}
.feat-host b{display:block;font-size:${t ? 19 : 17}px;font-family:Playfair;font-weight:600}.feat-host span{font-size:12.5px;opacity:.85}
.watch{background:#fff;color:${C.plum};font-weight:700;font-size:14px;padding:10px 18px;border-radius:22px}
.up-list{display:flex;flex-direction:column;gap:12px}
.up-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.up-row{display:flex;gap:12px;align-items:center;background:${C.ivoryEl};border:1px solid ${C.divider};border-radius:16px;padding:10px}
.up-img{width:70px;height:70px;border-radius:12px;background-size:cover;background-position:center;flex:none}
.up-body{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
.up-body b{font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.up-body span{font-size:12.5px;color:${C.muted};display:flex;align-items:center;gap:4px}
.remind{border:1px solid ${C.plum};color:${C.plum};font-weight:600;font-size:12px;padding:7px 10px;border-radius:18px;white-space:nowrap}
.room{position:absolute;inset:0;background-size:cover;background-position:center;color:#fff}
.room-top{padding:6px ${P}px;display:flex;justify-content:space-between;align-items:center}
.host-pill{display:flex;align-items:center;gap:8px;background:rgba(27,17,19,.5);border-radius:28px;padding:5px 6px 5px 5px}
.host-pill img{width:36px;height:36px;border-radius:18px;object-fit:cover}
.host-pill b{display:block;font-size:14px}.host-pill span{font-size:11.5px;opacity:.85;white-space:nowrap}
.follow{background:${C.plum};font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:16px;margin-left:4px}
.room-stats{display:flex;gap:6px}
.room-bottom{position:absolute;left:0;right:0;bottom:${d.hidden + (t ? 18 : 14)}px;padding:0 ${P}px}
.chat{display:flex;flex-direction:column;gap:10px;margin-bottom:14px;max-width:${t ? 380 : 290}px}
.msg{display:flex;gap:8px;align-items:flex-start}
.msg img{width:30px;height:30px;border-radius:15px;object-fit:cover}
.msg b{display:block;font-size:12.5px;opacity:.8}.msg span{font-size:14px}
.pinned{display:flex;gap:12px;align-items:center;background:${C.ivoryEl};color:${C.espresso};border-radius:18px;padding:10px;box-shadow:0 10px 30px rgba(0,0,0,.3);max-width:${t ? 480 : 999}px}
.pinned-img{width:72px;height:84px;border-radius:12px;background-size:cover;background-position:center;flex:none}
.pinned-body{flex:1;display:flex;flex-direction:column;gap:2px}
.pinned-tag{font-size:11px;font-weight:700;color:${C.plum};text-transform:uppercase;letter-spacing:.06em;display:flex;gap:4px;align-items:center}
.pinned-body b{font-size:16px}.pinned-meta{font-size:12.5px;color:${C.muted}}.pinned-price{font-weight:700;font-size:16px}
.claim{background:${C.plum};color:#fff;font-weight:700;padding:14px 20px;border-radius:14px;font-size:15px}
.comment{display:flex;align-items:center;gap:10px;margin-top:12px}
.comment span{flex:1;height:44px;border-radius:22px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;padding:0 16px;font-size:14px;color:rgba(255,255,255,.75)}
.hearts{width:44px;height:44px;border-radius:22px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center}
.pd-overlay-status{position:absolute;top:0;left:0;right:0;z-index:4}
.pd-img{height:${t ? 560 : 470}px;background-size:cover;background-position:center 25%;position:relative}
.pd-img-wide{height:auto;border-radius:22px;margin:8px 0 0 ${P}px}
.pd-split{display:grid;grid-template-columns:1.05fr 1fr;height:calc(100% - 36px)}
.pd-split .pd-body{padding-top:14px;overflow:hidden}
.pd-nav{position:absolute;top:${t ? 14 : 56}px;left:14px;right:14px;display:flex;justify-content:space-between;z-index:3}
.pd-img-wide .pd-nav{top:14px}
.pd-nav-r{display:flex;gap:8px}
.round{width:40px;height:40px;border-radius:20px;background:rgba(255,252,248,.94);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.dots{position:absolute;bottom:14px;left:0;right:0;display:flex;gap:6px;justify-content:center}
.dots i{width:7px;height:7px;border-radius:4px;background:rgba(255,255,255,.6)}.dots i.on{width:20px;background:#fff}
.pd-body{padding:18px ${P}px}
.pd-brand{font-size:12px;font-weight:700;letter-spacing:.14em;color:${C.muted2}}
.pd-title{font-family:Playfair;font-weight:600;font-size:${t ? 30 : 26}px;margin-top:4px;line-height:1.15}
.pd-price{font-size:${t ? 26 : 24}px;font-weight:700;margin-top:8px}
.pd-fee{display:flex;gap:6px;align-items:center;font-size:13px;color:${C.success};margin-top:6px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.chips span{border:1px solid ${C.border};background:${C.ivoryEl};border-radius:18px;padding:7px 13px;font-size:13px;font-weight:500;color:${C.body}}
.chips.pick span.on{background:${C.plum};border-color:${C.plum};color:#fff}
.pd-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.btn-primary{background:${C.plum};color:#fff;font-weight:700;font-size:15.5px;height:52px;border-radius:26px;display:flex;align-items:center;justify-content:center;gap:8px}
.btn-outline{border:1.5px solid ${C.plum};color:${C.plum};font-weight:700;font-size:15.5px;height:52px;border-radius:26px;display:flex;align-items:center;justify-content:center}
.btn-primary.sm,.btn-outline.sm{height:40px;font-size:14px;border-radius:20px}
.btn-primary.big{height:56px;border-radius:28px;font-size:16.5px;margin-top:18px}
.btn-ghost{font-size:13px;font-weight:600;color:${C.plum};border:1px solid ${C.border};padding:8px 12px;border-radius:18px}
.pd-sec{border-top:1px solid ${C.divider};margin-top:18px;padding-top:14px}
.pd-sec h4{font-size:14px;font-weight:700;margin-bottom:6px}
.pd-sec p{font-size:14px;line-height:1.5;color:${C.body};display:flex;gap:6px;align-items:center}
.seller-row{display:flex;gap:12px;align-items:center;border-top:1px solid ${C.divider};margin-top:16px;padding-top:14px}
.seller-row img{width:46px;height:46px;border-radius:23px;object-fit:cover}
.seller-row div:nth-child(2){flex:1}.seller-row b{display:block;font-size:15px}.seller-row span{font-size:12.5px;color:${C.muted};display:flex;gap:4px;align-items:center}
.thread-head{display:flex;align-items:center;gap:10px;padding:6px ${P - 6}px 12px;border-bottom:1px solid ${C.divider}}
.thread-head img{width:42px;height:42px;border-radius:21px;object-fit:cover}
.thread-head b{display:block;font-size:16px}.thread-head div span{font-size:12px;color:${C.success}}
.spacer{flex:1}.spacer-22{width:22px}
.thread-item{display:flex;align-items:center;gap:12px;margin:12px ${P}px;background:${C.ivoryEl};border:1px solid ${C.divider};border-radius:16px;padding:10px}
.thread-item>div:nth-child(2){flex:1;min-width:0}
.thread-item b{display:block;font-size:14px}.thread-item span{font-size:12.5px;color:${C.muted}}
.ti-img{width:52px;height:60px;border-radius:10px;background-size:cover;background-position:center;flex:none}
.ti-img.lg{width:74px;height:88px}
.thread{padding:4px ${P}px;display:flex;flex-direction:column;gap:10px}
.day{align-self:center;font-size:12px;color:${C.muted2};font-weight:600;margin:4px 0}
.bubble{max-width:${t ? 60 : 78}%;padding:11px 14px;border-radius:18px;font-size:14.5px;line-height:1.4}
.bubble.them{background:${C.ivoryEl};border:1px solid ${C.divider};border-bottom-left-radius:6px;align-self:flex-start}
.bubble.me{background:${C.plum};color:#fff;border-bottom-right-radius:6px;align-self:flex-end}
.offer-card{align-self:flex-end;width:${t ? 300 : 240}px;background:#fff;border:1.5px solid ${C.plum};border-radius:18px;padding:14px}
.offer-card.counter{align-self:flex-start;border-color:${C.gold};background:#FFFBF4}
.offer-top{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:${C.body}}
.offer-amt{font-family:Playfair;font-weight:700;font-size:28px;margin-top:4px}
.offer-sub{font-size:12.5px;color:${C.muted}}
.offer-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.composer{position:absolute;left:0;right:0;bottom:${d.hidden}px;display:flex;gap:10px;padding:12px ${P}px 12px;background:${C.ivory};border-top:1px solid ${C.divider}}
.composer-in{flex:1;height:46px;border-radius:23px;border:1px solid ${C.border};background:${C.ivoryEl};display:flex;align-items:center;padding:0 16px;color:${C.muted2};font-size:14.5px}
.send{width:46px;height:46px;border-radius:23px;background:${C.plum};display:flex;align-items:center;justify-content:center}
.screen-head{display:flex;align-items:center;justify-content:space-between;padding:6px ${P - 6}px 10px}
.screen-head b{font-size:17px;font-weight:700}
.save{font-size:14px;font-weight:600;color:${C.plum}}
.steps{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:${C.muted3 ?? C.muted2};margin:4px 0 14px}
.steps span{color:${C.muted2}}.steps span.on{color:${C.plum}}
.steps i{flex:1;height:2px;background:${C.border};border-radius:1px}
.co-item{display:flex;gap:12px;align-items:center;background:${C.ivoryEl};border:1px solid ${C.divider};border-radius:16px;padding:10px}
.co-item>div:nth-child(2){flex:1;display:flex;flex-direction:column;gap:2px}
.co-item b{font-size:15px}.co-item span{font-size:12.5px;color:${C.muted}}
.co-price{font-weight:700;font-size:15px}
.box{position:relative;background:${C.ivoryEl};border:1px solid ${C.divider};border-radius:16px;padding:14px;margin-top:12px;display:flex;flex-direction:column;gap:3px}
.box-h{display:flex;gap:6px;align-items:center;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted2};margin-bottom:4px}
.box>b{font-size:15px}.box>span{font-size:13.5px;color:${C.body}}
.box a{position:absolute;top:14px;right:14px;font-size:13.5px;font-weight:600;color:${C.plum}}
.radio{display:flex;align-items:center;gap:12px;padding:8px 0}
.radio i{width:20px;height:20px;border-radius:10px;border:2px solid ${C.border};flex:none}
.radio.on i{border:6px solid ${C.plum}}
.radio div{flex:1}.radio b{display:block;font-size:14.5px}.radio span{font-size:12.5px;color:${C.muted}}
.radio em{font-style:normal;font-weight:600;font-size:14px}
.box.sum>div{display:flex;justify-content:space-between;font-size:14px;color:${C.body};padding:3px 0}
.box.sum>div span:first-child{display:flex;gap:5px;align-items:center}
.box.sum .tot{border-top:1px solid ${C.divider};margin-top:6px;padding-top:10px;color:${C.espresso};font-weight:700;font-size:16px}
.protect{display:flex;gap:10px;background:${C.successBg};border:1px solid #B9CDB4;border-radius:16px;padding:12px 14px;margin-top:12px}
.protect b{display:block;font-size:14px;color:#3F5A3C}.protect span{font-size:12.5px;color:${C.body};line-height:1.4}
.lbl{font-size:14px;font-weight:700;margin:4px 0 10px;display:flex;justify-content:space-between}
.lbl em{font-style:normal;font-weight:500;color:${C.muted}}
.photos{display:grid;grid-template-columns:repeat(var(--pcols),minmax(0,1fr));gap:10px}
.ph{aspect-ratio:1;border-radius:14px;background-size:cover;background-position:center;position:relative}
.ph-cover span{position:absolute;left:6px;bottom:6px;background:rgba(27,17,19,.7);color:#fff;font-size:10.5px;font-weight:700;padding:3px 7px;border-radius:6px}
.ph.add{border:1.5px dashed ${C.accent300 ?? '#C9A9BD'};background:#FBF4F7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:12px;font-weight:600;color:${C.plum}}
.field{margin-top:14px}
.field label{display:block;font-size:12.5px;font-weight:600;color:${C.muted};margin-bottom:6px}
.input{height:48px;border-radius:14px;border:1px solid ${C.border};background:${C.ivoryEl};display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:15px}
.input.ta{height:auto;padding:12px 14px;line-height:1.45;color:${C.body};font-size:14px}
.input.price{font-weight:700}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.earn{display:flex;gap:6px;align-items:center;font-size:13.5px;color:${C.body};margin-top:14px}
.cover{height:${t ? 200 : 170}px;background-size:cover;background-position:center 30%;position:relative}
.cover .pd-nav{top:${t ? 44 : 56}px}
.prof{position:relative;text-align:center}
.avatar{width:${t ? 108 : 96}px;height:${t ? 108 : 96}px;border-radius:50%;object-fit:cover;border:4px solid ${C.ivory};margin-top:-${t ? 54 : 48}px;box-shadow:0 6px 18px rgba(43,33,31,.15)}
.prof .pd-title{margin-top:8px}
.handle{font-size:13.5px;color:${C.muted};margin-top:2px}
.rating{display:flex;gap:2px;justify-content:center;align-items:center;margin-top:8px;font-size:14px}
.rating b{margin-left:4px}.rating span{color:${C.muted};margin-left:2px}
.bio{font-size:14px;color:${C.body};line-height:1.5;margin:10px auto 0;max-width:360px}
.stats{display:flex;justify-content:center;gap:${t ? 60 : 40}px;margin-top:16px}
.stats b{display:block;font-size:19px;font-weight:700}.stats span{font-size:12.5px;color:${C.muted}}
.prof .pd-actions{max-width:${t ? 420 : 999}px;margin-left:auto;margin-right:auto}
.tabs{display:flex;justify-content:center;gap:28px;border-bottom:1px solid ${C.divider};margin:20px 0 14px}
.tabs span{font-size:14.5px;font-weight:600;color:${C.muted2};padding-bottom:10px}
.tabs span.on{color:${C.plum};border-bottom:2.5px solid ${C.plum}}
.prof .grid{text-align:left}
`;
}
