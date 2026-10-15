import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const money = value => `₹${value.toLocaleString('en-IN')}`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
gsap.registerPlugin(ScrollTrigger);

document.body.classList.add('is-loading');

const products = {
  field: { name: 'The Field Jacket', type: 'jacket', image: 'jacket', category: 'THE SIGNATURE / OUTERWEAR', price: 24900, description: 'An easy shape with a little attitude. A relaxed leather jacket with a structured collar, brushed metal zip, and carefully placed pockets. Throw it on. Go your own way.', care: 'Supple leather outer with a smooth lining. Wipe with a soft, dry cloth. Store on a broad hanger away from direct sunlight. Specialist leather cleaning recommended.', colors: [{ name: 'Tobacco', hex: '#6b3924' }, { name: 'Ink', hex: '#262725' }, { name: 'Stone', hex: '#b4a18a' }], sizes: ['XS', 'S', 'M', 'L', 'XL'] },
  knit: { name: 'The Essential Knit', type: 'knit', image: 'knit', category: 'THE EVERYDAY / KNITWEAR', price: 8900, description: 'The layer you reach for without thinking. Soft merino wool, a generous silhouette, and a clean crew neckline. A little warmth. A lot of possibility.', care: 'Fine merino wool. Hand wash cold with a gentle wool detergent. Reshape and dry flat. Fold rather than hang to preserve the shape.', colors: [{ name: 'Oat', hex: '#b4a18a' }, { name: 'Ink', hex: '#262725' }], sizes: ['XS', 'S', 'M', 'L', 'XL'] },
  trouser: { name: 'The Studio Trouser', type: 'trousers', image: 'trousers', category: 'THE FOUNDATION / TAILORING', price: 11900, description: 'A good foundation changes everything. Relaxed wool-blend trousers with a softly tailored waist, front pleats, and room through the leg. For days that do not stand still.', care: 'Soft wool blend. Dry clean when needed. Air between wears. Steam gently to relax creases and store on a trouser hanger.', colors: [{ name: 'Charcoal', hex: '#353633' }, { name: 'Stone', hex: '#b4a18a' }], sizes: ['28', '30', '32', '34', '36'] },
};


const garmentFacts = {
  field: { material: 'Supple leather', fit: 'Relaxed shoulder, cropped length', wear: 'Over the Essential Knit' },
  knit: { material: 'Fine merino wool', fit: 'Generous crewneck silhouette', wear: 'With the Studio Trouser' },
  trouser: { material: 'Soft wool blend', fit: 'Natural waist, relaxed straight leg', wear: 'With a knit or the Field Jacket' },
};

let lenis;
if (!reducedMotion) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, anchors: { offset: -74 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const focusReturns = new Map();
function lockPage(overlay) { if (overlay) focusReturns.set(overlay, document.activeElement); lenis?.stop(); document.body.style.overflow = 'hidden'; }
function updateBackgroundAccess() {
  const blocked = !$('.bag-drawer').hidden || !$('.menu-overlay').hidden;
  $$('main, .site-header, .site-footer').forEach(el => el.inert = blocked);
}
function unlockPage() {
  updateBackgroundAccess();
  if (document.querySelector('dialog[open]') || !$('.bag-drawer').hidden || !$('.menu-overlay').hidden) return;
  document.body.style.overflow = ''; lenis?.start();
}
function returnFocus(overlay) { const el = focusReturns.get(overlay); if (el?.isConnected && el.getClientRects().length) el.focus({ preventScroll: true }); focusReturns.delete(overlay); }
let toastTimer;
function toast(message) { const el = $('.toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 3600); }

// Photographic garments sit in a real CSS 3D scene, with responsive light and perspective.
const heroObject = $('.hero-object');
let heroColor = 'Tobacco';
let spatialScene;
const colorFilters = {
  Tobacco: 'none', Ink: 'saturate(0.12) brightness(0.35) contrast(1.12)',
  Stone: 'saturate(0.18) brightness(1.48) contrast(0.85)',
  Oat: 'none', Charcoal: 'none',
};
function garmentFilter(id, color) {
  if ((id === 'knit' && color === 'Oat') || (id === 'trouser' && color === 'Charcoal')) return 'none';
  if (id === 'knit' && color === 'Ink') return 'saturate(0.12) brightness(0.25)';
  if (id === 'trouser' && color === 'Stone') return 'saturate(0.15) brightness(2.2) contrast(0.8)';
  return colorFilters[color] || 'none';
}
function resetPerspective() { if (!heroObject) return; gsap.to(heroObject, { rotationY: -8, rotationX: 0, rotationZ: -4, x: 0, y: 0, duration: .8, ease: 'power3.out' }); }
resetPerspective();
if (heroObject && !reducedMotion) {
  const rotateX = gsap.quickTo(heroObject, 'rotationX', { duration: .8, ease: 'power3.out' });
  const rotateY = gsap.quickTo(heroObject, 'rotationY', { duration: .8, ease: 'power3.out' });
  const moveX = gsap.quickTo(heroObject, 'x', { duration: .8, ease: 'power3.out' });
  const moveY = gsap.quickTo(heroObject, 'y', { duration: .8, ease: 'power3.out' });
  $('.hero-stage').addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const rect = $('.hero-stage').getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    rotateX(-y * 12); rotateY(x * 22 - 8); moveX(x * 18); moveY(y * 12);
  });
  $('.hero-stage').addEventListener('pointerleave', resetPerspective);
}
$('.rotation-reset')?.addEventListener('click', () => { resetPerspective(); toast('A fresh perspective.'); });
$$('.hero-swatches .swatch').forEach(button => button.addEventListener('click', () => {
  $$('.hero-swatches .swatch').forEach(el => { el.classList.toggle('active', el === button); el.setAttribute('aria-pressed', String(el === button)); });
  heroColor = button.dataset.colorName;
  if ($('#hero-color-name')) $('#hero-color-name').textContent = heroColor.toUpperCase();
  spatialScene?.setColor(button.dataset.color);
  $('#hero-photo').style.filter = garmentFilter('field', heroColor);
  toast(`The Field Jacket in ${heroColor}.`);
}));

// The opening sequence waits for the centerpiece and fonts before its editorial reveal.
const loadState = { value: 0 };
const loaderProgress = gsap.to(loadState, { value: 88, duration: 1.65, ease: 'power2.out', onUpdate() {
  $('#load-percent').textContent = String(Math.floor(loadState.value)).padStart(2, '0');
  $('.loader-track span').style.width = `${loadState.value}%`;
} });
const heroImageReady = !$('#hero-photo') || $('#hero-photo').complete ? Promise.resolve() : new Promise(resolve => { $('#hero-photo').addEventListener('load', resolve, { once: true }); $('#hero-photo').addEventListener('error', resolve, { once: true }); });
await Promise.allSettled([Promise.race([Promise.all([document.fonts.ready, heroImageReady]), new Promise(resolve => setTimeout(resolve, 3500))]), new Promise(resolve => setTimeout(resolve, reducedMotion ? 50 : document.body.dataset.page ? 150 : 1200))]);
loaderProgress.kill();
gsap.to(loadState, { value: 100, duration: .3, onUpdate() { $('#load-percent').textContent = Math.floor(loadState.value); $('.loader-track span').style.width = `${loadState.value}%`; } });
const intro = gsap.timeline({ delay: .35, onComplete: () => { $('.loader').remove(); document.body.classList.remove('is-loading'); ScrollTrigger.refresh(); } });
intro.to('.loader-brand', { y: -35, opacity: 0, duration: reducedMotion ? .01 : .45, ease: 'power2.in' })
  .to('.loader', { yPercent: -100, duration: reducedMotion ? .01 : .8, ease: 'power3.inOut' }, '-=.1');
if (!reducedMotion) {
  if (heroObject) intro.from('.hero h1 span', { y: 80, opacity: 0, stagger: .08, duration: 1, ease: 'power3.out' }, '-=.25')
    .from('.hero-copy p, .hero-copy .button', { y: 25, opacity: 0, stagger: .12, duration: .7 }, '-=.7')
    .from('.hero-stage', { y: 65, opacity: 0, duration: 1.2, ease: 'power2.out' }, '-=1.2');
  $$('.reveal').forEach(el => gsap.from(el, { y: 40, opacity: 0, duration: .95, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
  if (heroObject) gsap.to('.hero-copy', { y: -55, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  if ($('.orbit')) gsap.to('.orbit', { rotation: 24, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  if ($('.campaign-image')) gsap.to('.campaign-image', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.campaign', start: 'top bottom', end: 'bottom top', scrub: true } });
  if ($('.material-story')) ScrollTrigger.create({ trigger: '.material-story', start: 'top top', end: 'bottom bottom', scrub: true, onUpdate(self) {
    const progress = self.progress;
    gsap.set('.story-object', { rotationY: -12 + progress * 24, rotationZ: -6 + progress * 12, scale: 1 + Math.sin(progress * Math.PI) * .23, yPercent: -progress * 8 });
    const chapter = Math.min(2, Math.floor(self.progress * 3));
    $$('.story-chapter').forEach((el, index) => { el.classList.toggle('active', index === chapter); el.setAttribute('aria-hidden', String(index !== chapter)); });
    $$('.chapter-progress span').forEach((el, index) => el.classList.toggle('active', index === chapter));
    $('.story-counter').textContent = `0${chapter + 1} / 03`;
  } });
}
function updateScroll() {
  $('.site-header').classList.toggle('is-scrolled', window.scrollY > 100);
  const max = document.documentElement.scrollHeight - innerHeight;
  $('.page-progress').style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
}
window.addEventListener('scroll', updateScroll, { passive: true }); updateScroll();
window.addEventListener('resize', () => ScrollTrigger.refresh());
$('.campaign-image img')?.addEventListener('load', () => ScrollTrigger.refresh());

$$('.collection-filters button').forEach(button => button.addEventListener('click', () => {
  $$('.collection-filters button').forEach(el => { el.classList.toggle('active', el === button); el.setAttribute('aria-pressed', String(el === button)); });
  $$('.product-card').forEach(card => {
    const visible = button.dataset.filter === 'all' || card.dataset.category === button.dataset.filter;
    card.hidden = !visible;
    if (visible) gsap.fromTo(card, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: reducedMotion ? 0 : .4, clearProps: 'transform' });
  });
  ScrollTrigger.refresh();
}));

const menu = $('.menu-overlay');
function openMenu() { lockPage(menu); menu.hidden = false; updateBackgroundAccess(); $('.menu-trigger').setAttribute('aria-expanded', 'true'); $('.close-menu').focus(); }
function closeMenu() { menu.hidden = true; $('.menu-trigger').setAttribute('aria-expanded', 'false'); unlockPage(); returnFocus(menu); }
$('.menu-trigger').addEventListener('click', openMenu); $('.close-menu').addEventListener('click', closeMenu);
$$('a', menu).forEach(link => link.addEventListener('click', () => { closeMenu(); }));

let cart = [];
try { const saved = JSON.parse(localStorage.getItem('aethel-bag') || '[]'); if (Array.isArray(saved)) cart = saved.filter(item => products[item.id] && products[item.id].sizes.includes(item.size) && products[item.id].colors.some(color => color.name === item.color) && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 20); } catch { /* Private browser storage can be unavailable. */ }
const bag = $('.bag-drawer');
function saveBag() { try { localStorage.setItem('aethel-bag', JSON.stringify(cart)); } catch { /* The current session remains fully usable. */ } }
function renderBag() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  $$('.bag-count').forEach(el => el.textContent = `(${count})`);
  $('.bag-summary').hidden = count === 0;
  if (!count) {
    $('.bag-content').innerHTML = '<div class="empty-bag"><h3>Room for something good.</h3><p>Your daily rotation starts here.<br>Find a piece that feels like you.</p><button class="button button-dark" id="shop-empty">Explore the collection</button></div>';
    $('#shop-empty').addEventListener('click', () => { closeBag(); if (!$('#collection')) { location.href = '/collection/'; return; } if (lenis) lenis.scrollTo('#collection', { offset: -74 }); else $('#collection').scrollIntoView(); });
  } else {
    $('.bag-content').innerHTML = cart.map((item, index) => `<article class="bag-item"><div class="bag-item-art"><img src="/images/${products[item.id].image}.webp" alt="${products[item.id].name}" style="filter:${garmentFilter(item.id, item.color)}"/></div><div><p class="bag-item-name">${products[item.id].name}</p><p class="bag-item-meta">${item.color} / Size ${item.size}</p><div class="bag-item-bottom"><div class="quantity-control"><button data-quantity="${index}" data-delta="-1" aria-label="Decrease quantity of ${products[item.id].name}">−</button><span>${item.qty}</span><button data-quantity="${index}" data-delta="1" aria-label="Increase quantity of ${products[item.id].name}" ${item.qty >= 20 ? 'disabled' : ''}>+</button></div><span class="bag-item-price">${money(products[item.id].price * item.qty)}</span></div><button class="remove-item" data-remove="${index}">Remove</button></div></article>`).join('');
    $$('[data-quantity]').forEach(el => el.addEventListener('click', () => { const index = Number(el.dataset.quantity); const delta = el.dataset.delta; cart[index].qty += Number(delta); if (cart[index].qty <= 0) cart.splice(index, 1); saveBag(); renderBag(); ($(`[data-quantity="${index}"][data-delta="${delta}"]`) || $('.close-bag')).focus(); }));
    $$('[data-remove]').forEach(el => el.addEventListener('click', () => { cart.splice(Number(el.dataset.remove), 1); saveBag(); renderBag(); $('.close-bag').focus(); }));
    $('#bag-total').textContent = money(cart.reduce((sum, item) => sum + products[item.id].price * item.qty, 0));
  }
  
}
function openBag() { renderBag(); lockPage(bag); bag.hidden = false; $('.drawer-backdrop').hidden = false; updateBackgroundAccess(); gsap.fromTo(bag, { xPercent: 100 }, { xPercent: 0, duration: reducedMotion ? 0 : .45, ease: 'power3.out' }); $('.close-bag').focus(); }
function closeBag() { bag.hidden = true; $('.drawer-backdrop').hidden = true; unlockPage(); returnFocus(bag); }
$('.bag-trigger').addEventListener('click', openBag); $('.close-bag').addEventListener('click', closeBag); $('.drawer-backdrop').addEventListener('click', closeBag); renderBag();

const productDialog = $('.product-dialog');
let detailScene, currentProduct = 'field', selectedColor, selectedSize;
let detailView = 'photo';
let renderRequest = 0;
function setDetailView(view) {
  if (view === 'photo') renderRequest++;
  detailView = view;
  $('#detail-photo').hidden = view === '3d'; $('#detail-canvas').hidden = view !== '3d';
  $('.detail-rotate-hint').hidden = view !== '3d';
  $$('[data-view]').forEach(button => { button.classList.toggle('active', button.dataset.view === view); button.setAttribute('aria-pressed', String(button.dataset.view === view)); });
  if (view === 'photo') detailScene?.setActive(false);
}
$$('[data-view]').forEach(button => button.addEventListener('click', async () => {
  if (button.dataset.view === 'photo') { setDetailView('photo'); return; }
  const requestedProduct = currentProduct;
  const request = ++renderRequest;
  button.textContent = 'Preparing 3D view';
  try {
    const { createFashionScene } = await import('./scene.js');
    if (!productDialog.open || currentProduct !== requestedProduct || request !== renderRequest) return;
    setDetailView('3d');
    if (!detailScene) detailScene = createFashionScene($('#detail-canvas'), { type: products[currentProduct].type, interactive: true, scale: .85 });
    detailScene.setActive(true); detailScene.setColor(selectedColor.hex);
  } catch {
    setDetailView('photo'); toast('The photograph is available. This browser could not open the 3D preview.');
  } finally {
    button.innerHTML = 'Explore in 3D '; 
  }
}));
function openProduct(id) {
  const product = products[id]; if (!product) return;
  currentProduct = id; selectedColor = product.colors[0]; selectedSize = null;
  setDetailView('photo'); $('#detail-photo').src = `/images/${product.image}.webp`; $('#detail-photo').alt = product.name; $('#detail-photo').style.filter = garmentFilter(id, selectedColor.name);
  $('#detail-category').textContent = product.category; $('#detail-name').textContent = product.name; $('#detail-price').textContent = money(product.price); $('#detail-description').textContent = product.description; $('#detail-care').textContent = product.care; $('#detail-color-name').textContent = selectedColor.name;
  $('#detail-swatches').innerHTML = product.colors.map((color, index) => `<button class="swatch ${index === 0 ? 'active' : ''}" style="--swatch:${color.hex}" data-detail-color="${index}" aria-label="${color.name}" aria-pressed="${index === 0}"></button>`).join('');
  $('.size-options').innerHTML = product.sizes.map(size => `<button data-size="${size}" aria-pressed="false">${size}</button>`).join('');
  $('#add-to-bag span').textContent = 'Choose a size';
  $$('details', productDialog).forEach(el => el.open = false);
  lockPage(productDialog); productDialog.showModal();
  $$('[data-detail-color]').forEach(button => button.addEventListener('click', () => {
    selectedColor = product.colors[Number(button.dataset.detailColor)]; $('#detail-color-name').textContent = selectedColor.name; detailScene?.setColor(selectedColor.hex); $('#detail-photo').style.filter = garmentFilter(id, selectedColor.name);
    $$('[data-detail-color]').forEach(el => { el.classList.toggle('active', el === button); el.setAttribute('aria-pressed', String(el === button)); });
  }));
  $$('[data-size]').forEach(button => button.addEventListener('click', () => {
    selectedSize = button.dataset.size; $$('[data-size]').forEach(el => { el.classList.toggle('selected', el === button); el.setAttribute('aria-pressed', String(el === button)); }); $('#add-to-bag span').textContent = 'Add to bag';
  }));
}
$$('[data-open-product]').forEach(button => button.addEventListener('click', () => openProduct(button.dataset.openProduct)));
$('.close-dialog').addEventListener('click', () => productDialog.close());
productDialog.addEventListener('close', () => { renderRequest++; detailScene?.dispose(); detailScene = null; unlockPage(); returnFocus(productDialog); });
productDialog.addEventListener('click', event => { if (event.target === productDialog) { const rect = productDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) productDialog.close(); } });
$('#add-to-bag').addEventListener('click', () => {
  if (!selectedSize) { toast('Choose your size to make it yours.'); $('.size-options button').focus(); return; }
  const existing = cart.find(item => item.id === currentProduct && item.size === selectedSize && item.color === selectedColor.name);
  if (existing?.qty >= 20) { toast('You have reached the maximum quantity for this piece.'); return; }
  if (existing) existing.qty += 1; else cart.push({ id: currentProduct, size: selectedSize, color: selectedColor.name, qty: 1 });
  saveBag(); renderBag(); productDialog.close(); openBag(); toast('A good addition to your daily rotation.');
});

const infoDialog = $('.info-dialog');
function showInfo(content) { $('.info-content').innerHTML = content; const heading = $('h2', infoDialog); if (heading) heading.id = 'info-title';  lockPage(infoDialog); infoDialog.showModal(); }
$('.close-info').addEventListener('click', () => infoDialog.close()); infoDialog.addEventListener('close', () => { unlockPage(); returnFocus(infoDialog); });
infoDialog.addEventListener('click', event => { if (event.target === infoDialog) { const rect = infoDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) infoDialog.close(); } });
const information = {
  care: '<span class="eyebrow">LOOK AFTER THE GOOD THINGS</span><h2>Made to stay.</h2><p>Air your pieces between wears. Wash less, with care. Keep leather away from prolonged heat and use specialist leather cleaning. Hand wash knitwear cold, then reshape and dry flat. Steam tailoring gently.</p><p>You will find specific care notes on every product page. Small habits make a lasting difference.</p>',
  shipping: '<span class="eyebrow">THE FINER DETAILS</span><h2>Easy does it.</h2><p>Our concept offers complimentary standard delivery within India, with a suggested delivery window of 3 to 7 business days. Returns are welcome within 30 days, with pieces unworn and in their original condition.</p><p>AETHEL is a demo menswear store. The checkout is an interactive demonstration. No products ship and no payment is collected.</p>',
  contact: '<span class="eyebrow">A CONVERSATION STARTER</span><h2>Say hello.</h2><p>AETHEL is an independent menswear concept exploring the relationship between clothing, character, and movement.</p><p>Have a look around the atelier, rotate a piece, or build your daily rotation. This demo has no live customer support service.</p>',
  privacy: '<span class="eyebrow">YOUR SPACE, RESPECTED</span><h2>A little clarity.</h2><p>This concept store saves your shopping bag and newsletter preference on your device. Your checkout details are used only to display a demo confirmation and are not sent to a server.</p><p>No payment information is requested. You can clear saved preferences through your browser settings. The site loads fonts from Google Fonts.</p>',
};
$$('[data-info]').forEach(button => button.addEventListener('click', () => showInfo(information[button.dataset.info])));
$('#size-guide-button').addEventListener('click', () => {
  const trouser = currentProduct === 'trouser';
  showInfo(`<span class="eyebrow">FIND YOUR FORM</span><h2>The right fit.</h2><p>${trouser ? 'The Studio Trouser sits naturally at the waist with a relaxed, straight leg. Choose your usual waist size.' : 'Our pieces have a relaxed silhouette. Choose your usual size for an easy fit, or size down for a closer shape.'}</p><table class="size-table"><thead><tr><th>Size</th><th>${trouser ? 'Waist (cm)' : 'Chest (cm)'}</th><th>${trouser ? 'Inseam (cm)' : 'Body length (cm)'}</th></tr></thead><tbody>${(trouser ? [['28',71,78],['30',76,79],['32',81,80],['34',86,81],['36',91,82]] : [['XS',98,62],['S',104,64],['M',110,66],['L',116,68],['XL',122,70]]).map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Illustrative garment measurements for this concept collection.</p>`);
});
$('#open-editorial')?.addEventListener('click', () => {
  showInfo('<span class="eyebrow">FIELD NOTES / LOOK 001</span><h2>In the open.</h2><p>A slower morning. A long way home. A sunlit wall that asks for nothing. Our first collection is an invitation to find a little space in the everyday.</p><img src="/images/campaign.webp" alt="The first AETHEL editorial, shot against sunlit stone"/><p>The Field Jacket over a simple layer, with the Studio Trouser in Stone. A balance of structure and ease, ready to go wherever the day takes you.</p><button class="button button-dark" id="shop-story">Explore the Field Jacket</button>');
  $('#shop-story').addEventListener('click', () => { infoDialog.close(); openProduct('field'); });
});
$('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault(); const input = $('#newsletter-email'); if (!input.checkValidity()) { input.reportValidity(); return; }
  try { localStorage.setItem('aethel-newsletter-interest', 'true'); } catch { /* Confirmation still works without storage. */ }
  $('#newsletter-form').classList.add('is-subscribed'); $('#newsletter-note').textContent = 'You are on the list in this demo. Your preference is saved on this device.'; input.value = ''; input.placeholder = 'A little good news, noted.'; toast('Your interest is saved. Welcome to the atelier.');
});
$('#checkout-button').addEventListener('click', () => {
  closeBag();
  showInfo(`<span class="eyebrow">YOUR DAILY ROTATION</span><h2>Make it yours.</h2><p>${cart.reduce((sum, item) => sum + item.qty, 0)} pieces / ${money(cart.reduce((sum, item) => sum + products[item.id].price * item.qty, 0))}. Complimentary delivery.</p><form class="checkout-form" id="checkout-form"><label>Your name<input name="name" required autocomplete="name" placeholder="Full name" maxlength="100"/></label><label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com" maxlength="200"/></label><label>Delivery address<textarea name="address" required autocomplete="street-address" placeholder="Street address, city, postal code" rows="2" maxlength="500"></textarea></label><button class="button button-dark" type="submit">Place demo order</button><span class="demo-note">No payment. No delivery. Just the experience.</span></form>`);
  $('#checkout-form').addEventListener('submit', event => {
    event.preventDefault(); const reference = `AE${Date.now().toString().slice(-6)}`;
    cart = []; saveBag(); renderBag();
    $('.info-content').innerHTML = `<div class="order-success"><span class="eyebrow">DEMO ORDER ${reference}</span><h2 id="info-title">Good things<br>look good on you.</h2><p>Your demo order is complete. No payment has been taken and no products will be shipped. Your checkout details have not been saved.</p><button class="button button-dark" id="finish-order">Back to the atelier</button></div>`;
     $('#finish-order').addEventListener('click', () => infoDialog.close()); $('.close-info').focus();
  });
});

// Native dialogs handle their own focus; the menu and bag get an explicit focus loop.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (!bag.hidden) closeBag(); if (!menu.hidden) closeMenu(); }
  if (event.key !== 'Tab' || document.querySelector('dialog[open]')) return;
  const overlay = !bag.hidden ? bag : !menu.hidden ? menu : null; if (!overlay) return;
  const focusable = $$('a[href], button:not([disabled]), input', overlay).filter(el => !el.hidden && el.offsetParent !== null);
  const first = focusable[0], last = focusable.at(-1);
  if (!overlay.contains(document.activeElement)) { event.preventDefault(); first?.focus(); return; }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
window.addEventListener('pagehide', () => { detailScene?.dispose(); });


// The same spatial installation powers the home hero and the dedicated atelier.
const spatialCanvas = $('#spatial-hero') || $('#atelier-canvas');
if (spatialCanvas) {
  const compact = spatialCanvas.id === 'spatial-hero';
  const readyObserver = new MutationObserver(() => {
    if (spatialCanvas.dataset.ready === 'true') spatialCanvas.parentElement.classList.add('spatial-ready');
    if (spatialCanvas.dataset.fallback === 'true') spatialCanvas.parentElement.classList.remove('spatial-ready');
  });
  readyObserver.observe(spatialCanvas, { attributes: true, attributeFilter: ['data-ready', 'data-fallback'] });
  import('./showroom.js').then(({ createShowroom }) => {
    spatialScene = createShowroom(spatialCanvas, { compact, onSelect(index) {
      const ids = ['field', 'knit', 'trouser']; const product = products[ids[index]];
      $$('[data-look]').forEach(button => { const active = Number(button.dataset.look) === index; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
      if ($('#spatial-name')) $('#spatial-name').textContent = product.name;
      if ($('#spatial-price')) $('#spatial-price').textContent = money(product.price);
      if ($('#spatial-description')) $('#spatial-description').textContent = product.description;
      if ($('#spatial-facts')) { const facts = garmentFacts[ids[index]]; $('#spatial-facts').innerHTML = `<div><dt>Material</dt><dd>${facts.material}</dd></div><div><dt>Fit</dt><dd>${facts.fit}</dd></div><div><dt>Wear it with</dt><dd>${facts.wear}</dd></div>`; }
      if ($('#spatial-shop')) $('#spatial-shop').dataset.openProduct = ids[index];
    } });
    const visibility = new IntersectionObserver(entries => spatialScene?.setActive(entries[0].isIntersecting), {rootMargin:'100px'});
    visibility.observe(spatialCanvas);
    $$('[data-look]').forEach(button => button.addEventListener('click', () => spatialScene.select(Number(button.dataset.look))));
    $('#spatial-reset')?.addEventListener('click', () => spatialScene.reset());
    $('.rotation-reset')?.addEventListener('click', () => spatialScene.reset());
    window.addEventListener('pagehide', () => { spatialScene?.dispose(); readyObserver.disconnect(); visibility.disconnect(); });
  }).catch(() => { spatialCanvas.parentElement.classList.remove('spatial-ready'); });
}
$$('.desktop-nav a, .menu-overlay nav a').forEach(link => { if (link.getAttribute('href') === location.pathname) link.setAttribute('aria-current', 'page'); });
