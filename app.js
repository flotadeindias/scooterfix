/* =========================================================
   SCOOTER FIX - app.js
   Interacciones robustas, accesibles y persistentes
   ========================================================= */
(() => {
  'use strict';

  const PRODUCTS = Object.freeze([
    { id: 'rueda-maciza-85', name: 'Rueda Maciza Antipinchazos 8.5" (Xiaomi/Smartgyro)', category: 'neumaticos', categoryLabel: 'Neumáticos', price: 25, icon: '🛞', desc: 'Rueda maciza reforzada, sin cámara. Compatible con la mayoría de modelos 8.5".' },
    { id: 'camara-10', name: 'Cámara de Aire Reforzada 10"', category: 'neumaticos', categoryLabel: 'Neumáticos', price: 15, icon: '⭕', desc: 'Cámara de repuesto de alta resistencia para ruedas de 10 pulgadas.' },
    { id: 'bateria-36v', name: 'Batería de Sustitución 36V 7.8Ah', category: 'electronica', categoryLabel: 'Electrónica', price: 120, icon: '🔋', desc: 'Batería de iones de litio con protección BMS integrada. Alta durabilidad.' },
    { id: 'pastillas-freno', name: 'Juego de Pastillas de Freno Cerámicas', category: 'frenos', categoryLabel: 'Frenos', price: 12, icon: '🛑', desc: 'Pastillas cerámicas de bajo desgaste, frenada silenciosa y progresiva.' },
    { id: 'controladora-350w', name: 'Controladora Multimarca 350W', category: 'electronica', categoryLabel: 'Electrónica', price: 45, icon: '⚙️', desc: 'Controladora universal compatible con motores de hasta 350W.' },
    { id: 'display-led', name: 'Pantalla Display LED con Acelerador', category: 'electronica', categoryLabel: 'Electrónica', price: 35, icon: '📟', desc: 'Display LED con indicador de batería y acelerador de pulgar incluido.' }
  ]);

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const formatPrice = value => priceFormatter.format(Number(value) || 0);
  const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  const FocusManager = {
    previous: null,
    open(container) {
      this.previous = document.activeElement;
      requestAnimationFrame(() => container?.focus());
    },
    close() {
      if (this.previous instanceof HTMLElement && document.contains(this.previous)) this.previous.focus();
      this.previous = null;
    },
    trap(event, container) {
      if (event.key !== 'Tab' || !container) return;
      const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
        .filter(element => !element.hidden && element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };

  function syncBodyLock() {
    const locked = $('#cartDrawer')?.classList.contains('is-open') || $('#authOverlay')?.classList.contains('is-active');
    document.body.classList.toggle('is-locked', Boolean(locked));
  }

  const Shop = {
    grid: null,
    init() {
      this.grid = $('#productsGrid');
      if (!this.grid) return;
      this.render(PRODUCTS);
      $('#shopFilters')?.addEventListener('click', event => this.filter(event));
      this.grid.addEventListener('click', event => this.add(event));
    },
    render(products) {
      this.grid.innerHTML = products.map(product => `
        <article class="product-card" data-category="${escapeHTML(product.category)}" data-id="${escapeHTML(product.id)}">
          <div class="product-media" aria-hidden="true">${escapeHTML(product.icon)}</div>
          <div class="product-body">
            <span class="product-cat">${escapeHTML(product.categoryLabel)}</span>
            <h3>${escapeHTML(product.name)}</h3>
            <p>${escapeHTML(product.desc)}</p>
            <div class="product-footer">
              <span class="product-price">${formatPrice(product.price)}</span>
              <button type="button" class="add-to-cart" data-id="${escapeHTML(product.id)}" aria-label="Añadir ${escapeHTML(product.name)} al carrito">
                <span aria-hidden="true">+</span> Añadir
              </button>
            </div>
          </div>
        </article>`).join('');
    },
    filter(event) {
      const chip = event.target.closest('.filter-chip');
      if (!chip) return;
      $$('.filter-chip', event.currentTarget).forEach(item => {
        const active = item === chip;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      $$('.product-card', this.grid).forEach(card => {
        card.hidden = chip.dataset.filter !== 'todos' && card.dataset.category !== chip.dataset.filter;
      });
    },
    add(event) {
      const button = event.target.closest('.add-to-cart');
      if (!button) return;
      const product = PRODUCTS.find(item => item.id === button.dataset.id);
      if (!product) return;
      Cart.add(product);
      button.classList.add('is-added');
      button.textContent = '✓ Añadido';
      window.setTimeout(() => { button.classList.remove('is-added'); button.innerHTML = '<span aria-hidden="true">+</span> Añadir'; }, 1000);
    }
  };

  const Cart = {
    key: 'scooterfix_cart_v2',
    items: [],
    init() {
      this.items = this.load();
      this.render();
      $('#cartItemsList')?.addEventListener('click', event => this.handleListClick(event));
      $('#clearCartBtn')?.addEventListener('click', () => this.clear());
      $('#checkoutBtn')?.addEventListener('click', () => this.checkout());
      $('#cartTrigger')?.addEventListener('click', () => this.open());
      $('#closeCart')?.addEventListener('click', () => this.close());
      $('#drawerOverlay')?.addEventListener('click', () => this.close());
    },
    load() {
      try {
        const parsed = JSON.parse(localStorage.getItem(this.key) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.reduce((valid, saved) => {
          const product = PRODUCTS.find(item => item.id === saved?.id);
          const quantity = Math.min(99, Math.max(1, Number.parseInt(saved?.qty, 10) || 1));
          if (product) valid.push({ id: product.id, qty: quantity });
          return valid;
        }, []);
      } catch (error) {
        console.warn('No se pudo recuperar el carrito.', error);
        return [];
      }
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.items)); }
      catch (error) { console.warn('No se pudo guardar el carrito.', error); showToast('El carrito funciona, pero no puede guardarse en este navegador.'); }
    },
    detail(item) {
      const product = PRODUCTS.find(productItem => productItem.id === item.id);
      return product ? { ...product, qty: item.qty } : null;
    },
    add(product) {
      const existing = this.items.find(item => item.id === product.id);
      if (existing) existing.qty = Math.min(99, existing.qty + 1);
      else this.items.push({ id: product.id, qty: 1 });
      this.commit();
      this.open();
      showToast(`${product.name.split('(')[0].trim()} añadido al carrito`);
    },
    update(id, delta) {
      const item = this.items.find(entry => entry.id === id);
      if (!item) return;
      item.qty = Math.min(99, item.qty + delta);
      if (item.qty <= 0) this.items = this.items.filter(entry => entry.id !== id);
      this.commit();
    },
    remove(id) { this.items = this.items.filter(item => item.id !== id); this.commit(); },
    clear() {
      if (!this.items.length) return;
      this.items = [];
      this.commit();
      showToast('Carrito vaciado');
    },
    commit() { this.save(); this.render(); },
    count() { return this.items.reduce((sum, item) => sum + item.qty, 0); },
    total() { return this.items.reduce((sum, item) => { const product = PRODUCTS.find(entry => entry.id === item.id); return sum + (product ? product.price * item.qty : 0); }, 0); },
    render() {
      const list = $('#cartItemsList');
      if (!list) return;
      const detailed = this.items.map(item => this.detail(item)).filter(Boolean);
      list.innerHTML = detailed.map(item => `
        <li class="cart-item" data-id="${escapeHTML(item.id)}">
          <div class="cart-item-media" aria-hidden="true">${escapeHTML(item.icon)}</div>
          <div class="cart-item-info">
            <h4>${escapeHTML(item.name)}</h4>
            <span class="cart-item-price">${formatPrice(item.price)} / ud.</span>
            <div class="cart-item-qty" aria-label="Cantidad">
              <button type="button" class="qty-btn" data-action="dec" aria-label="Restar una unidad">−</button>
              <span class="qty-value" aria-live="polite">${item.qty}</span>
              <button type="button" class="qty-btn" data-action="inc" aria-label="Sumar una unidad" ${item.qty >= 99 ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <div class="cart-item-actions">
            <span class="cart-item-total">${formatPrice(item.price * item.qty)}</span>
            <button type="button" class="remove-item" data-action="remove">Eliminar</button>
          </div>
        </li>`).join('');
      const count = this.count();
      const countElement = $('#cartCount');
      if (countElement) { countElement.textContent = String(count); countElement.hidden = count === 0; }
      const empty = $('#cartEmpty');
      if (empty) empty.hidden = detailed.length > 0;
      const total = formatPrice(this.total());
      if ($('#cartSubtotal')) $('#cartSubtotal').textContent = total;
      if ($('#cartTotal')) $('#cartTotal').textContent = total;
      if ($('#checkoutBtn')) $('#checkoutBtn').disabled = detailed.length === 0;
      if ($('#clearCartBtn')) $('#clearCartBtn').disabled = detailed.length === 0;
    },
    handleListClick(event) {
      const button = event.target.closest('button[data-action]');
      const item = event.target.closest('.cart-item');
      if (!button || !item) return;
      if (button.dataset.action === 'inc') this.update(item.dataset.id, 1);
      if (button.dataset.action === 'dec') this.update(item.dataset.id, -1);
      if (button.dataset.action === 'remove') this.remove(item.dataset.id);
    },
    open() {
      const drawer = $('#cartDrawer'); const overlay = $('#drawerOverlay');
      if (!drawer || !overlay) return;
      overlay.hidden = false;
      requestAnimationFrame(() => { drawer.classList.add('is-open'); overlay.classList.add('is-active'); });
      drawer.setAttribute('aria-hidden', 'false');
      syncBodyLock(); FocusManager.open(drawer);
    },
    close() {
      const drawer = $('#cartDrawer'); const overlay = $('#drawerOverlay');
      if (!drawer || !overlay || !drawer.classList.contains('is-open')) return;
      drawer.classList.remove('is-open'); overlay.classList.remove('is-active');
      drawer.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => { if (!overlay.classList.contains('is-active')) overlay.hidden = true; }, 320);
      syncBodyLock(); FocusManager.close();
    },
    checkout() {
      if (!this.items.length) { showToast('Tu carrito está vacío'); return; }
      const total = formatPrice(this.total());
      this.items = []; this.commit(); this.close();
      showToast(`Compra simulada completada. Total: ${total}`);
    }
  };

  const Calculator = {
    init() {
      this.options = $$('#calcOptions input[type="checkbox"]');
      if (!this.options.length) return;
      $('#calcOptions').addEventListener('change', () => this.update());
      $('#calcToCita')?.addEventListener('click', () => this.transfer());
      this.update();
    },
    update() {
      const selected = this.options.filter(option => option.checked);
      const list = $('#calcSummaryList');
      const total = selected.reduce((sum, option) => sum + (Number(option.dataset.price) || 0), 0);
      if (list) list.innerHTML = selected.length ? selected.map(option => `<li><span>${escapeHTML(option.dataset.label)}</span><span>${formatPrice(option.dataset.price)}</span></li>`).join('') : '<li class="calc-summary-empty">Aún no has marcado ninguna avería.</li>';
      if ($('#calcTotal')) $('#calcTotal').textContent = formatPrice(total);
    },
    transfer() {
      const selected = this.options.filter(option => option.checked);
      if (!selected.length) return;
      const description = selected.map(option => `- ${option.dataset.label}`).join('\n');
      const textarea = $('#citaDescripcion'); const service = $('#citaServicio');
      if (textarea) textarea.value = `Averías seleccionadas:\n${description}\n\nPresupuesto estimado: ${$('#calcTotal')?.textContent || formatPrice(0)}`;
      if (service) service.value = 'Otro / no lo sé';
    }
  };

  const AuthModal = {
    init() {
      $('#authTrigger')?.addEventListener('click', () => this.open());
      $('#closeAuth')?.addEventListener('click', () => this.close());
      $('#authOverlay')?.addEventListener('click', event => { if (event.target.id === 'authOverlay') this.close(); });
      $$('.auth-tab').forEach(tab => tab.addEventListener('click', () => this.switch(tab.dataset.tab)));
      this.bindForm('#loginForm', '#loginFeedback', 'Sesión iniciada correctamente (demostración).');
      this.bindForm('#registerForm', '#registerFeedback', 'Cuenta creada correctamente (demostración).');
    },
    open() {
      const overlay = $('#authOverlay'); const modal = $('.auth-modal', overlay);
      if (!overlay || !modal) return;
      overlay.hidden = false; overlay.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => overlay.classList.add('is-active'));
      syncBodyLock(); FocusManager.open(modal);
    },
    close() {
      const overlay = $('#authOverlay');
      if (!overlay || !overlay.classList.contains('is-active')) return;
      overlay.classList.remove('is-active'); overlay.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => { if (!overlay.classList.contains('is-active')) overlay.hidden = true; }, 280);
      $$('.auth-feedback').forEach(element => { element.textContent = ''; });
      syncBodyLock(); FocusManager.close();
    },
    switch(name) {
      $$('.auth-tab').forEach(tab => { const active = tab.dataset.tab === name; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; });
      $$('.auth-form').forEach(form => form.classList.toggle('is-active', form.dataset.panel === name));
    },
    bindForm(formSelector, feedbackSelector, successMessage) {
      $(formSelector)?.addEventListener('submit', event => {
        event.preventDefault();
        if (!event.currentTarget.reportValidity()) return;
        const feedback = $(feedbackSelector); const button = $('button[type="submit"]', event.currentTarget);
        if (feedback) feedback.textContent = 'Procesando…';
        if (button) button.disabled = true;
        window.setTimeout(() => { if (feedback) feedback.textContent = `✓ ${successMessage}`; if (button) button.disabled = false; event.currentTarget.reset(); window.setTimeout(() => this.close(), 900); }, 600);
      });
    }
  };

  const Appointment = {
    init() { $('#citaForm')?.addEventListener('submit', event => this.submit(event)); },
    submit(event) {
      event.preventDefault(); const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const feedback = $('#citaFeedback'); const button = $('button[type="submit"]', form); const name = $('#citaNombre')?.value.trim() || 'cliente';
      if (feedback) feedback.textContent = 'Enviando solicitud…';
      if (button) button.disabled = true;
      window.setTimeout(() => { if (feedback) feedback.textContent = `✓ Gracias, ${name}. Hemos recibido tu solicitud y te contactaremos para confirmar el horario.`; form.reset(); if (button) button.disabled = false; showToast('Cita previa solicitada correctamente'); }, 700);
    }
  };

  const Navigation = {
    init() {
      const toggle = $('#navToggle'); const nav = $('#mainNav');
      toggle?.addEventListener('click', () => { const open = nav.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', String(open)); });
      nav?.addEventListener('click', event => { if (event.target.closest('.nav-link')) this.close(nav, toggle); });
      document.addEventListener('click', event => { if (nav?.classList.contains('is-open') && !nav.contains(event.target) && !toggle?.contains(event.target)) this.close(nav, toggle); });
    },
    close(nav, toggle) { nav?.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false'); }
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { AuthModal.close(); Cart.close(); }
    const openContainer = $('#authOverlay.is-active .auth-modal') || $('#cartDrawer.is-open');
    FocusManager.trap(event, openContainer);
  });

  document.addEventListener('DOMContentLoaded', () => {
    Shop.init(); Cart.init(); Calculator.init(); AuthModal.init(); Appointment.init(); Navigation.init();
    if ($('#year')) $('#year').textContent = String(new Date().getFullYear());
  });
})();
