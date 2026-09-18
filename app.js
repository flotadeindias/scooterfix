/* =========================================================
   SCOOTER FIX — app.js
   Módulos: Productos, Carrito, Calculadora, Drawer/Modal, Formularios
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     0. DATOS DE PRODUCTOS
     ========================================================= */
  const PRODUCTS = [
    {
      id: 'rueda-maciza-85',
      name: 'Rueda Maciza Antipinchazos 8.5" (Xiaomi/Smartgyro)',
      category: 'neumaticos',
      categoryLabel: 'Neumáticos',
      price: 25,
      icon: '🛞',
      desc: 'Rueda maciza reforzada, sin cámara. Compatible con la mayoría de modelos 8.5".'
    },
    {
      id: 'camara-10',
      name: 'Cámara de Aire Reforzada 10"',
      category: 'neumaticos',
      categoryLabel: 'Neumáticos',
      price: 15,
      icon: '⭕',
      desc: 'Cámara de repuesto de alta resistencia para ruedas de 10 pulgadas.'
    },
    {
      id: 'bateria-36v',
      name: 'Batería de Sustitución 36V 7.8Ah',
      category: 'electronica',
      categoryLabel: 'Electrónica',
      price: 120,
      icon: '🔋',
      desc: 'Batería de iones de litio con protección BMS integrada. Alta durabilidad.'
    },
    {
      id: 'pastillas-freno',
      name: 'Juego de Pastillas de Freno Cerámicas',
      category: 'frenos',
      categoryLabel: 'Frenos',
      price: 12,
      icon: '🛑',
      desc: 'Pastillas cerámicas de bajo desgaste, frenada silenciosa y progresiva.'
    },
    {
      id: 'controladora-350w',
      name: 'Controladora Multimarca 350W',
      category: 'electronica',
      categoryLabel: 'Electrónica',
      price: 45,
      icon: '⚙️',
      desc: 'Controladora universal compatible con motores de hasta 350W.'
    },
    {
      id: 'display-led',
      name: 'Pantalla Display LED con Acelerador',
      category: 'electronica',
      categoryLabel: 'Electrónica',
      price: 35,
      icon: '📟',
      desc: 'Display LED con indicador de batería y acelerador de pulgar incluido.'
    }
  ];

  /* =========================================================
     1. UTILIDADES
     ========================================================= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const formatPrice = (value) =>
    value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  let toastTimer = null;
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }

  /* =========================================================
     2. MÓDULO: TIENDA (render + filtros)
     ========================================================= */
  const Shop = {
    grid: null,

    init() {
      this.grid = $('#productsGrid');
      if (!this.grid) return;
      this.render(PRODUCTS);
      this.bindFilters();
    },

    render(products) {
      this.grid.innerHTML = products.map((p) => `
        <article class="product-card" data-category="${p.category}" data-id="${p.id}">
          <div class="product-media" aria-hidden="true">${p.icon}</div>
          <div class="product-body">
            <span class="product-cat">${p.categoryLabel}</span>
            <h3>${p.name}</h3>
            <p>${p.desc}</p>
            <div class="product-footer">
              <span class="product-price">${formatPrice(p.price)}</span>
              <button class="add-to-cart" data-id="${p.id}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Añadir
              </button>
            </div>
          </div>
        </article>
      `).join('');

      $$('.add-to-cart', this.grid).forEach((btn) => {
        btn.addEventListener('click', () => {
          const product = PRODUCTS.find((p) => p.id === btn.dataset.id);
          if (!product) return;
          Cart.addItem(product);

          btn.classList.add('is-added');
          const original = btn.innerHTML;
          btn.innerHTML = '✓ Añadido';
          setTimeout(() => {
            btn.classList.remove('is-added');
            btn.innerHTML = original;
          }, 1100);
        });
      });
    },

    bindFilters() {
      const chips = $$('.filter-chip');
      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          chips.forEach((c) => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
          chip.classList.add('is-active');
          chip.setAttribute('aria-selected', 'true');

          const filter = chip.dataset.filter;
          $$('.product-card', this.grid).forEach((card) => {
            const match = filter === 'todos' || card.dataset.category === filter;
            card.hidden = !match;
          });
        });
      });
    }
  };

  /* =========================================================
     3. MÓDULO: CARRITO (estado + localStorage + UI)
     ========================================================= */
  const Cart = {
    STORAGE_KEY: 'scooterfix_cart',
    items: [],

    init() {
      this.load();
      this.render();
      this.bindEvents();
    },

    load() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        this.items = raw ? JSON.parse(raw) : [];
      } catch (e) {
        this.items = [];
      }
    },

    save() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
      } catch (e) { /* almacenamiento no disponible: se continúa sin persistencia */ }
    },

    addItem(product) {
      const existing = this.items.find((i) => i.id === product.id);
      if (existing) {
        existing.qty += 1;
      } else {
        this.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          icon: product.icon,
          qty: 1
        });
      }
      this.save();
      this.render();
      this.openDrawer();
      showToast(`${product.name.split('(')[0].trim()} añadido al carrito`);
    },

    updateQty(id, delta) {
      const item = this.items.find((i) => i.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) {
        this.items = this.items.filter((i) => i.id !== id);
      }
      this.save();
      this.render();
    },

    removeItem(id) {
      this.items = this.items.filter((i) => i.id !== id);
      this.save();
      this.render();
    },

    clear() {
      this.items = [];
      this.save();
      this.render();
    },

    getSubtotal() {
      return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    },

    getCount() {
      return this.items.reduce((sum, i) => sum + i.qty, 0);
    },

    render() {
      const countEl = $('#cartCount');
      const emptyEl = $('#cartEmpty');
      const listEl = $('#cartItemsList');
      const subtotalEl = $('#cartSubtotal');
      const totalEl = $('#cartTotal');

      const count = this.getCount();
      if (countEl) {
        countEl.textContent = count;
        countEl.classList.add('is-bump');
        setTimeout(() => countEl.classList.remove('is-bump'), 350);
      }

      if (!listEl) return;

      if (this.items.length === 0) {
        emptyEl.hidden = false;
        listEl.innerHTML = '';
      } else {
        emptyEl.hidden = true;
        listEl.innerHTML = this.items.map((item) => `
          <li class="cart-item" data-id="${item.id}">
            <div class="cart-item-media" aria-hidden="true">${item.icon}</div>
            <div class="cart-item-info">
              <h4>${item.name}</h4>
              <span class="cart-item-price">${formatPrice(item.price)} / ud.</span>
              <div class="cart-item-qty">
                <button class="qty-btn" data-action="dec" aria-label="Disminuir cantidad">−</button>
                <span class="qty-value">${item.qty}</span>
                <button class="qty-btn" data-action="inc" aria-label="Aumentar cantidad">+</button>
              </div>
            </div>
            <div class="cart-item-actions">
              <span class="cart-item-total">${formatPrice(item.price * item.qty)}</span>
              <button class="remove-item" data-action="remove">Eliminar</button>
            </div>
          </li>
        `).join('');
      }

      const subtotal = this.getSubtotal();
      if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
      if (totalEl) totalEl.textContent = formatPrice(subtotal);
    },

    bindEvents() {
      const listEl = $('#cartItemsList');
      if (listEl) {
        listEl.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;
          const li = e.target.closest('.cart-item');
          const id = li.dataset.id;
          const action = btn.dataset.action;

          if (action === 'inc') this.updateQty(id, 1);
          if (action === 'dec') this.updateQty(id, -1);
          if (action === 'remove') this.removeItem(id);
        });
      }

      const clearBtn = $('#clearCartBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (this.items.length === 0) return;
          this.clear();
          showToast('Carrito vaciado');
        });
      }

      const checkoutBtn = $('#checkoutBtn');
      if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
          if (this.items.length === 0) {
            showToast('Tu carrito está vacío');
            return;
          }
          const total = formatPrice(this.getSubtotal());
          this.clear();
          this.closeDrawer();
          showToast(`¡Compra simulada con éxito! Total: ${total}`);
        });
      }
    },

    openDrawer() {
      $('#cartDrawer').classList.add('is-open');
      $('#cartDrawer').setAttribute('aria-hidden', 'false');
      $('#drawerOverlay').classList.add('is-active');
      document.body.style.overflow = 'hidden';
    },

    closeDrawer() {
      $('#cartDrawer').classList.remove('is-open');
      $('#cartDrawer').setAttribute('aria-hidden', 'true');
      $('#drawerOverlay').classList.remove('is-active');
      document.body.style.overflow = '';
    }
  };

  /* =========================================================
     4. MÓDULO: DRAWER TRIGGERS
     ========================================================= */
  const DrawerUI = {
    init() {
      $('#cartTrigger')?.addEventListener('click', () => Cart.openDrawer());
      $('#closeCart')?.addEventListener('click', () => Cart.closeDrawer());
      $('#drawerOverlay')?.addEventListener('click', () => {
        Cart.closeDrawer();
        AuthModal.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          Cart.closeDrawer();
          AuthModal.close();
        }
      });
    }
  };

  /* =========================================================
     5. MÓDULO: CALCULADORA DE PRESUPUESTO
     ========================================================= */
  const Calculator = {
    init() {
      this.checkboxes = $$('#calcOptions input[type="checkbox"]');
      if (!this.checkboxes.length) return;
      this.checkboxes.forEach((cb) => cb.addEventListener('change', () => this.update()));
      this.update();
    },

    update() {
      const selected = this.checkboxes.filter((cb) => cb.checked);
      const listEl = $('#calcSummaryList');
      const totalEl = $('#calcTotal');

      if (selected.length === 0) {
        listEl.innerHTML = '<li class="calc-summary-empty">Aún no has marcado ninguna avería.</li>';
        totalEl.textContent = '0 €';
        return;
      }

      let total = 0;
      listEl.innerHTML = selected.map((cb) => {
        const price = parseFloat(cb.dataset.price);
        total += price;
        return `<li><span>${cb.dataset.label}</span><span>${price} €</span></li>`;
      }).join('');

      totalEl.textContent = total + ' €';
    }
  };

  /* =========================================================
     6. MÓDULO: MODAL AUTH (Login / Registro)
     ========================================================= */
  const AuthModal = {
    init() {
      $('#authTrigger')?.addEventListener('click', () => this.open());
      $('#closeAuth')?.addEventListener('click', () => this.close());
      $('#authOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'authOverlay') this.close();
      });

      $$('.auth-tab').forEach((tab) => {
        tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
      });

      $('#loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedback = $('#loginFeedback');
        feedback.textContent = 'Iniciando sesión…';
        setTimeout(() => {
          feedback.textContent = '✓ Sesión iniciada correctamente (simulado).';
          setTimeout(() => this.close(), 1200);
        }, 700);
      });

      $('#registerForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedback = $('#registerFeedback');
        feedback.textContent = 'Creando cuenta…';
        setTimeout(() => {
          feedback.textContent = '✓ Cuenta creada correctamente (simulado).';
          setTimeout(() => this.close(), 1200);
        }, 700);
      });
    },

    open() {
      $('#authOverlay').classList.add('is-active');
      document.body.style.overflow = 'hidden';
    },

    close() {
      $('#authOverlay')?.classList.remove('is-active');
      document.body.style.overflow = Cart.items && $('#cartDrawer').classList.contains('is-open') ? 'hidden' : '';
      $('#loginFeedback').textContent = '';
      $('#registerFeedback').textContent = '';
    },

    switchTab(tabName) {
      $$('.auth-tab').forEach((t) => {
        const active = t.dataset.tab === tabName;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      $$('.auth-form').forEach((f) => {
        f.classList.toggle('is-active', f.dataset.panel === tabName);
      });
    }
  };

  /* =========================================================
     7. MÓDULO: FORMULARIO CITA PREVIA
     ========================================================= */
  const CitaForm = {
    init() {
      const form = $('#citaForm');
      if (!form) return;
      form.addEventListener('submit', (e) => this.handleSubmit(e));

      // Pre-selección de servicio al llegar desde la calculadora
      $('#calcToCita')?.addEventListener('click', () => {
        const selected = $$('#calcOptions input:checked');
        if (selected.length > 0) {
          const desc = selected.map((cb) => `- ${cb.dataset.label}`).join('\n');
          const total = $('#calcTotal').textContent;
          $('#citaDescripcion').value = `Averías detectadas en la calculadora:\n${desc}\n\nPresupuesto estimado: ${total}`;
          $('#citaServicio').value = 'Otro / no lo sé';
        }
      });
    },

    handleSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const feedback = $('#citaFeedback');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const nombre = $('#citaNombre').value.trim();
      feedback.style.color = 'var(--accent-green)';
      feedback.textContent = 'Enviando solicitud…';

      setTimeout(() => {
        feedback.textContent = `✓ Gracias, ${nombre}. Hemos recibido tu solicitud de cita. Te contactaremos por teléfono o WhatsApp para confirmar horario.`;
        form.reset();
        showToast('Cita previa solicitada correctamente');
      }, 700);
    }
  };

  /* =========================================================
     8. MÓDULO: NAVEGACIÓN (menú móvil + scroll header)
     ========================================================= */
  const Nav = {
    init() {
      const toggle = $('#navToggle');
      const nav = $('#mainNav');

      toggle?.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });

      $$('.nav-link').forEach((link) => {
        link.addEventListener('click', () => {
          nav.classList.remove('is-open');
          toggle?.setAttribute('aria-expanded', 'false');
        });
      });

      document.addEventListener('click', (e) => {
        if (!nav.classList.contains('is-open')) return;
        if (!nav.contains(e.target) && !toggle.contains(e.target)) {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  };

  /* =========================================================
     9. INICIALIZACIÓN GLOBAL
     ========================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    Shop.init();
    Cart.init();
    DrawerUI.init();
    Calculator.init();
    AuthModal.init();
    CitaForm.init();
    Nav.init();

    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });
})();
