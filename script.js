(() => {
  'use strict';

  const STORAGE_KEYS = {
    cart: 'golden-spoon-cart-v1',
    theme: 'golden-spoon-theme-v1',
    reservations: 'golden-spoon-reservations-v1'
  };

  const SERVICE_RATE = 0.1;
  const TOAST_DURATION = 2800;

  const state = {
    menu: [],
    filteredMenu: [],
    cart: [],
    activeFilter: 'all',
    searchQuery: '',
    previewItem: null,
    previewQty: 1,
    reviewIndex: 0
  };

  const reviews = [
    {
      quote: 'The tasting menu felt like a journey. Every dish landed perfectly.',
      author: 'Ariana M.'
    },
    {
      quote: 'Beautiful space, fast service, and flavors that actually surprise you.',
      author: 'Daniel K.'
    },
    {
      quote: 'One of the few places where design and food quality are both outstanding.',
      author: 'Selena R.'
    },
    {
      quote: 'The cocktails were balanced, and the team was warm from start to finish.',
      author: 'Mark T.'
    }
  ];

  const dom = {};

  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });

  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (_error) {
        return false;
      }
    }
  };

  const select = selector => document.querySelector(selector);

  const parsePrice = value => {
    const num = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return Number.isFinite(num) ? num : 0;
  };

  const formatMoney = value => currency.format(value);

  const getCartCount = () => state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const calculateSubtotal = () =>
    state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const saveCart = () => {
    storage.set(STORAGE_KEYS.cart, state.cart);
  };

  const restoreCart = () => {
    const saved = storage.get(STORAGE_KEYS.cart, []);
    if (!Array.isArray(saved)) {
      state.cart = [];
      return;
    }

    state.cart = saved
      .filter(item => item && Number.isFinite(Number(item.id)) && Number(item.quantity) > 0)
      .map(item => ({
        id: Number(item.id),
        name: String(item.name || 'Item'),
        price: String(item.price || '$0'),
        unitPrice: Number(item.unitPrice) || parsePrice(item.price),
        image: String(item.image || ''),
        quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1)
      }));
  };

  const setBodyScrollLock = () => {
    const hasOpenModal = document.querySelector('.modal.open');
    document.body.classList.toggle('no-scroll', Boolean(hasOpenModal));
  };

  const openModal = type => {
    const modal = type === 'cart' ? dom.cartModal : dom.previewModal;
    if (!modal) {
      return;
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setBodyScrollLock();

    if (type === 'cart' && dom.floatingCartBtn) {
      dom.floatingCartBtn.setAttribute('aria-expanded', 'true');
    }

    if (type === 'preview' && dom.previewAddBtn) {
      dom.previewAddBtn.focus();
    }
  };

  const closeModal = type => {
    const modal = type === 'cart' ? dom.cartModal : dom.previewModal;
    if (!modal) {
      return;
    }

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    setBodyScrollLock();

    if (type === 'cart' && dom.floatingCartBtn) {
      dom.floatingCartBtn.setAttribute('aria-expanded', 'false');
      dom.floatingCartBtn.focus();
    }
  };

  const toast = (message, type = 'success') => {
    if (!dom.toastContainer) {
      return;
    }

    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;

    dom.toastContainer.appendChild(item);

    window.setTimeout(() => {
      item.classList.add('hide');
      window.setTimeout(() => item.remove(), 260);
    }, TOAST_DURATION);
  };

  const bumpCartButton = () => {
    if (!dom.floatingCartBtn) {
      return;
    }

    dom.floatingCartBtn.classList.remove('bump');
    void dom.floatingCartBtn.offsetWidth;
    dom.floatingCartBtn.classList.add('bump');
  };

  const renderCart = () => {
    if (!dom.cartItems || !dom.cartCountBadge || !dom.cartSubtotal || !dom.cartService || !dom.cartTotal) {
      return;
    }

    const count = getCartCount();
    const subtotal = calculateSubtotal();
    const service = subtotal * SERVICE_RATE;
    const total = subtotal + service;

    dom.cartCountBadge.textContent = String(count);

    if (count === 0) {
      dom.cartItems.innerHTML =
        '<div class="cart-empty"><p>Your cart is empty. Add dishes to get started.</p></div>';
      dom.cartSubtotal.textContent = formatMoney(0);
      dom.cartService.textContent = formatMoney(0);
      dom.cartTotal.textContent = formatMoney(0);
      return;
    }

    const fragment = document.createDocumentFragment();

    state.cart.forEach(item => {
      const card = document.createElement('article');
      card.className = 'cart-item';
      card.dataset.id = String(item.id);

      const left = document.createElement('div');
      left.className = 'cart-item-main';

      const title = document.createElement('p');
      title.className = 'cart-item-title';
      title.textContent = item.name;

      const price = document.createElement('p');
      price.className = 'cart-item-price';
      price.textContent = `${formatMoney(item.unitPrice)} each`;

      left.append(title, price);

      const actions = document.createElement('div');
      actions.className = 'cart-item-actions';

      const decBtn = document.createElement('button');
      decBtn.type = 'button';
      decBtn.className = 'qty-btn';
      decBtn.dataset.action = 'dec';
      decBtn.setAttribute('aria-label', `Decrease quantity for ${item.name}`);
      decBtn.textContent = '−';

      const qty = document.createElement('span');
      qty.className = 'qty-count';
      qty.textContent = String(item.quantity);

      const incBtn = document.createElement('button');
      incBtn.type = 'button';
      incBtn.className = 'qty-btn';
      incBtn.dataset.action = 'inc';
      incBtn.setAttribute('aria-label', `Increase quantity for ${item.name}`);
      incBtn.textContent = '+';

      const lineTotal = document.createElement('strong');
      lineTotal.textContent = formatMoney(item.unitPrice * item.quantity);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.action = 'remove';
      removeBtn.textContent = 'Remove';

      actions.append(decBtn, qty, incBtn, lineTotal, removeBtn);
      card.append(left, actions);
      fragment.appendChild(card);
    });

    dom.cartItems.replaceChildren(fragment);
    dom.cartSubtotal.textContent = formatMoney(subtotal);
    dom.cartService.textContent = formatMoney(service);
    dom.cartTotal.textContent = formatMoney(total);
  };

  const upsertCartItem = (menuItem, quantity = 1) => {
    const parsedQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
    const existing = state.cart.find(item => item.id === menuItem.id);

    if (existing) {
      existing.quantity += parsedQuantity;
    } else {
      state.cart.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        unitPrice: parsePrice(menuItem.price),
        image: menuItem.image,
        quantity: parsedQuantity
      });
    }

    saveCart();
    renderCart();
    bumpCartButton();
  };

  const removeCartItem = id => {
    const index = state.cart.findIndex(item => item.id === id);
    if (index === -1) {
      return;
    }

    state.cart.splice(index, 1);
    saveCart();
    renderCart();
  };

  const updateCartQuantity = (id, change) => {
    const item = state.cart.find(entry => entry.id === id);
    if (!item) {
      return;
    }

    const nextQty = item.quantity + change;
    if (nextQty <= 0) {
      removeCartItem(id);
      return;
    }

    item.quantity = nextQty;
    saveCart();
    renderCart();
  };

  const setActiveFilterButton = filterValue => {
    if (!dom.menuFilters) {
      return;
    }

    dom.menuFilters.querySelectorAll('button[data-filter]').forEach(btn => {
      const isActive = btn.dataset.filter === filterValue;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
    });
  };

  const renderMenuEmptyState = message => {
    if (!dom.menuItems) {
      return;
    }

    dom.menuItems.innerHTML = `<div class="menu-empty"><p>${message}</p></div>`;
  };

  const renderSkeletonMenu = (count = 6) => {
    if (!dom.menuItems) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const card = document.createElement('div');
      card.className = 'skeleton-card';
      card.innerHTML = `
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      `;
      fragment.appendChild(card);
    }

    dom.menuItems.replaceChildren(fragment);
  };

  const createMenuCard = item => {
    const card = document.createElement('article');
    card.className = 'menu-card';
    card.dataset.id = String(item.id);

    card.innerHTML = `
      <div class="menu-card-media">
        <img
          src="${item.image}"
          alt="${item.name}"
          width="900"
          height="700"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="menu-card-content">
        <div class="menu-title-row">
          <h3>${item.name}</h3>
          <span class="menu-price">${item.price}</span>
        </div>
        <p class="menu-desc">${item.description}</p>
        <div class="menu-actions">
          <button type="button" class="btn btn-secondary" data-action="preview">Preview</button>
          <button type="button" class="btn btn-primary add-btn" data-action="add">Add to Cart</button>
        </div>
      </div>
    `;

    return card;
  };

  const applyFiltersAndRenderMenu = () => {
    const normalizedQuery = state.searchQuery.trim().toLowerCase();

    state.filteredMenu = state.menu.filter(item => {
      const byCategory = state.activeFilter === 'all' || item.category === state.activeFilter;
      if (!byCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery)
      );
    });

    if (!dom.menuItems) {
      return;
    }

    if (state.filteredMenu.length === 0) {
      renderMenuEmptyState('No dishes matched your search. Try another keyword or category.');
      return;
    }

    const fragment = document.createDocumentFragment();
    state.filteredMenu.forEach(item => fragment.appendChild(createMenuCard(item)));
    dom.menuItems.replaceChildren(fragment);
  };

  const openPreview = item => {
    if (!dom.previewTitle || !dom.previewImage || !dom.previewDescription || !dom.previewPrice || !dom.previewQtyLabel) {
      return;
    }

    state.previewItem = item;
    state.previewQty = 1;

    dom.previewTitle.textContent = item.name;
    dom.previewImage.src = item.image;
    dom.previewImage.alt = item.name;
    dom.previewDescription.textContent = item.description;
    dom.previewPrice.textContent = item.price;
    dom.previewQtyLabel.textContent = '1';

    openModal('preview');
  };

  const updatePreviewQty = nextValue => {
    state.previewQty = Math.max(1, Math.min(20, nextValue));
    if (dom.previewQtyLabel) {
      dom.previewQtyLabel.textContent = String(state.previewQty);
    }
  };

  const handleMenuClick = event => {
    const button = event.target.closest('button[data-action]');
    if (!button || !dom.menuItems) {
      return;
    }

    const card = button.closest('.menu-card');
    if (!card) {
      return;
    }

    const itemId = Number(card.dataset.id);
    const item = state.menu.find(entry => entry.id === itemId);
    if (!item) {
      return;
    }

    const action = button.dataset.action;

    if (action === 'preview') {
      openPreview(item);
      return;
    }

    if (action === 'add') {
      upsertCartItem(item, 1);
      button.classList.add('added');
      button.textContent = 'Added';
      toast(`${item.name} added to cart`, 'success');

      window.setTimeout(() => {
        button.classList.remove('added');
        button.textContent = 'Add to Cart';
      }, 700);
    }
  };

  const handleCartClick = event => {
    const target = event.target.closest('button[data-action]');
    if (!target || !dom.cartItems) {
      return;
    }

    const cartItemEl = target.closest('.cart-item');
    if (!cartItemEl) {
      return;
    }

    const itemId = Number(cartItemEl.dataset.id);
    const action = target.dataset.action;

    if (action === 'inc') {
      updateCartQuantity(itemId, 1);
      return;
    }

    if (action === 'dec') {
      updateCartQuantity(itemId, -1);
      return;
    }

    if (action === 'remove') {
      cartItemEl.classList.add('removing');
      window.setTimeout(() => removeCartItem(itemId), 180);
    }
  };

  const initTheme = () => {
    if (!dom.themeToggle) {
      return;
    }

    const saved = storage.get(STORAGE_KEYS.theme, null);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = saved === 'dark' || (saved === null && prefersDark);

    document.body.classList.toggle('dark', shouldUseDark);
    dom.themeToggle.setAttribute('aria-pressed', String(shouldUseDark));
    dom.themeToggle.textContent = shouldUseDark ? '☀️' : '🌙';

    dom.themeToggle.addEventListener('click', () => {
      const nextDark = !document.body.classList.contains('dark');
      document.body.classList.toggle('dark', nextDark);
      dom.themeToggle.setAttribute('aria-pressed', String(nextDark));
      dom.themeToggle.textContent = nextDark ? '☀️' : '🌙';
      storage.set(STORAGE_KEYS.theme, nextDark ? 'dark' : 'light');
    });
  };

  const initHeaderAndScrollUI = () => {
    if (!dom.siteHeader || !dom.scrollProgress || !dom.scrollTopBtn) {
      return;
    }

    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = height > 0 ? y / height : 0;

      dom.siteHeader.classList.toggle('scrolled', y > 12);
      dom.scrollProgress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
      dom.scrollTopBtn.classList.toggle('visible', y > 420);

      ticking = false;
    };

    update();

    window.addEventListener(
      'scroll',
      () => {
        if (ticking) {
          return;
        }
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    window.addEventListener('resize', update);

    dom.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const initNavigation = () => {
    if (!dom.navToggle || !dom.navMenu) {
      return;
    }

    const closeMenu = () => {
      dom.navMenu.classList.remove('open');
      dom.navToggle.classList.remove('active');
      dom.navToggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      dom.navMenu.classList.add('open');
      dom.navToggle.classList.add('active');
      dom.navToggle.setAttribute('aria-expanded', 'true');
    };

    dom.navToggle.addEventListener('click', () => {
      if (dom.navMenu.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    dom.navMenu.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) {
        return;
      }
      closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 760) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  };

  const initSmoothAnchorScroll = () => {
    const headerOffset = () => (dom.siteHeader ? dom.siteHeader.offsetHeight : 0);

    document.addEventListener('click', event => {
      const anchor = event.target.closest('a[href^="#"]');
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || href === '#') {
        return;
      }

      const target = select(href);
      if (!target) {
        return;
      }

      event.preventDefault();

      const y =
        target.getBoundingClientRect().top + window.pageYOffset - headerOffset() - 10;

      window.scrollTo({
        top: Math.max(0, y),
        behavior: 'smooth'
      });
    });
  };

  const initRevealOnScroll = () => {
    const blocks = document.querySelectorAll('.reveal-on-scroll');
    if (!blocks.length) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      blocks.forEach(el => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px'
      }
    );

    blocks.forEach(el => observer.observe(el));
  };

  const initFiltersAndSearch = () => {
    if (!dom.menuFilters || !dom.menuSearch) {
      return;
    }

    dom.menuFilters.addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) {
        return;
      }

      state.activeFilter = button.dataset.filter || 'all';
      setActiveFilterButton(state.activeFilter);
      applyFiltersAndRenderMenu();
    });

    dom.menuFilters.addEventListener('keydown', event => {
      const buttons = Array.from(dom.menuFilters.querySelectorAll('button[data-filter]'));
      if (!buttons.length) {
        return;
      }

      const currentIndex = buttons.findIndex(btn => btn === document.activeElement);
      if (currentIndex === -1) {
        return;
      }

      const direction = {
        ArrowRight: 1,
        ArrowDown: 1,
        ArrowLeft: -1,
        ArrowUp: -1
      }[event.key];

      if (!direction) {
        if (event.key === 'Home') {
          event.preventDefault();
          buttons[0].focus();
        }
        if (event.key === 'End') {
          event.preventDefault();
          buttons[buttons.length - 1].focus();
        }
        return;
      }

      event.preventDefault();
      const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
      const nextButton = buttons[nextIndex];
      nextButton.focus();
      nextButton.click();
    });

    let searchTimer = 0;
    dom.menuSearch.addEventListener('input', event => {
      const value = event.target.value || '';
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        state.searchQuery = value;
        applyFiltersAndRenderMenu();
      }, 90);
    });
  };

  const initMenu = async () => {
    renderSkeletonMenu(6);

    try {
      const response = await fetch('menu.json', { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`Menu fetch failed with status ${response.status}`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error('Menu payload is not an array');
      }

      state.menu = payload.map(item => ({
        id: Number(item.id),
        name: String(item.name || 'Untitled dish'),
        category: String(item.category || 'all').toLowerCase(),
        price: String(item.price || '$0'),
        description: String(item.description || 'No description available yet.'),
        image: String(item.image || '')
      }));

      setActiveFilterButton(state.activeFilter);
      applyFiltersAndRenderMenu();
    } catch (error) {
      console.error(error);
      renderMenuEmptyState('Unable to load menu right now. Please refresh and try again.');
      toast('Menu could not be loaded', 'error');
    }
  };

  const validateField = (field, rules) => {
    const value = field.value.trim();
    const group = field.closest('.form-group');
    const error = group ? group.querySelector('.error-message') : null;

    let message = '';

    if (rules.required && !value) {
      message = 'This field is required.';
    }

    if (!message && rules.min && value.length < rules.min) {
      message = `Must be at least ${rules.min} characters.`;
    }

    if (!message && rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        message = 'Please enter a valid email address.';
      }
    }

    if (!message && rules.phone) {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        message = 'Please enter a valid phone number.';
      }
    }

    if (!message && rules.futureDate) {
      const ts = Date.parse(value);
      if (!value || Number.isNaN(ts) || ts < Date.now()) {
        message = 'Please select a future date and time.';
      }
    }

    if (!message && rules.minNum !== undefined) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < rules.minNum || numeric > rules.maxNum) {
        message = `Please enter a number between ${rules.minNum} and ${rules.maxNum}.`;
      }
    }

    field.classList.toggle('invalid', Boolean(message));
    field.setAttribute('aria-invalid', String(Boolean(message)));

    if (error) {
      error.textContent = message;
    }

    return !message;
  };

  const initForms = () => {
    if (dom.reservationForm) {
      const reservationRules = {
        name: { required: true, min: 2 },
        email: { required: true, email: true },
        phone: { required: true, phone: true },
        date: { required: true, futureDate: true },
        guests: { required: true, minNum: 1, maxNum: 20 }
      };

      dom.reservationForm.addEventListener('input', event => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement)) {
          return;
        }
        const key = field.name;
        if (!reservationRules[key]) {
          return;
        }
        validateField(field, reservationRules[key]);
      });

      dom.reservationForm.addEventListener('submit', event => {
        event.preventDefault();

        const fields = Array.from(dom.reservationForm.querySelectorAll('input'));
        const isValid = fields.every(field => {
          const key = field.name;
          return reservationRules[key] ? validateField(field, reservationRules[key]) : true;
        });

        if (!isValid) {
          toast('Please fix the highlighted reservation fields', 'error');
          return;
        }

        const nameInput = dom.reservationForm.querySelector('#name');
        const emailInput = dom.reservationForm.querySelector('#email');
        const phoneInput = dom.reservationForm.querySelector('#phone');
        const dateInput = dom.reservationForm.querySelector('#date');
        const guestsInput = dom.reservationForm.querySelector('#guests');

        const reservation = {
          name: nameInput ? nameInput.value.trim() : '',
          email: emailInput ? emailInput.value.trim() : '',
          phone: phoneInput ? phoneInput.value.trim() : '',
          date: dateInput ? dateInput.value : '',
          guests: guestsInput ? guestsInput.value : ''
        };

        const allReservations = storage.get(STORAGE_KEYS.reservations, []);
        allReservations.push(reservation);
        storage.set(STORAGE_KEYS.reservations, allReservations);

        dom.reservationForm.reset();
        toast('Reservation submitted successfully', 'success');
      });
    }

    if (dom.contactForm) {
      const contactRules = {
        'contact-name': { required: true, min: 2 },
        'contact-email': { required: true, email: true },
        message: { required: true, min: 10 }
      };

      dom.contactForm.addEventListener('input', event => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
          return;
        }

        const key = field.name;
        if (!contactRules[key]) {
          return;
        }

        validateField(field, contactRules[key]);
      });

      dom.contactForm.addEventListener('submit', event => {
        event.preventDefault();

        const fields = Array.from(dom.contactForm.querySelectorAll('input, textarea'));
        const isValid = fields.every(field => {
          const key = field.name;
          return contactRules[key] ? validateField(field, contactRules[key]) : true;
        });

        if (!isValid) {
          toast('Please complete all contact fields correctly', 'error');
          return;
        }

        dom.contactForm.reset();
        toast('Message sent. We will get back to you soon.', 'success');
      });
    }
  };

  const renderReview = () => {
    if (!dom.reviewsSlider) {
      return;
    }

    const current = reviews[state.reviewIndex];
    dom.reviewsSlider.innerHTML = `
      <p>"${current.quote}"</p>
      <p class="author">- ${current.author}</p>
    `;
    dom.reviewsSlider.classList.remove('is-swapping');
    void dom.reviewsSlider.offsetWidth;
    dom.reviewsSlider.classList.add('is-swapping');
  };

  const initReviews = () => {
    if (!dom.reviewsSlider) {
      return;
    }

    renderReview();

    window.setInterval(() => {
      state.reviewIndex = (state.reviewIndex + 1) % reviews.length;
      renderReview();
    }, 5200);
  };

  const initModalEvents = () => {
    if (dom.floatingCartBtn) {
      dom.floatingCartBtn.addEventListener('click', () => openModal('cart'));
    }

    document.addEventListener('click', event => {
      const closeTarget = event.target.closest('[data-close-modal]');
      if (!closeTarget) {
        return;
      }

      const type = closeTarget.dataset.closeModal;
      if (type === 'cart' || type === 'preview') {
        closeModal(type);
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') {
        return;
      }

      if (dom.previewModal && dom.previewModal.classList.contains('open')) {
        closeModal('preview');
      }

      if (dom.cartModal && dom.cartModal.classList.contains('open')) {
        closeModal('cart');
      }
    });

    if (dom.previewQtyInc && dom.previewQtyDec) {
      dom.previewQtyInc.addEventListener('click', () => updatePreviewQty(state.previewQty + 1));
      dom.previewQtyDec.addEventListener('click', () => updatePreviewQty(state.previewQty - 1));
    }

    if (dom.previewAddBtn) {
      dom.previewAddBtn.addEventListener('click', () => {
        if (!state.previewItem) {
          return;
        }

        upsertCartItem(state.previewItem, state.previewQty);
        toast(`${state.previewItem.name} added (${state.previewQty})`, 'success');
        closeModal('preview');
      });
    }

    if (dom.checkoutBtn) {
      dom.checkoutBtn.addEventListener('click', () => {
        const itemsCount = getCartCount();

        if (!itemsCount) {
          toast('Your cart is empty', 'error');
          return;
        }

        dom.checkoutBtn.disabled = true;
        dom.checkoutBtn.textContent = 'Processing...';

        window.setTimeout(() => {
          state.cart = [];
          saveCart();
          renderCart();
          closeModal('cart');
          toast('Order placed successfully', 'success');

          dom.checkoutBtn.disabled = false;
          dom.checkoutBtn.textContent = 'Checkout';
        }, 700);
      });
    }
  };

  const initDelegatedEvents = () => {
    if (dom.menuItems) {
      dom.menuItems.addEventListener('click', handleMenuClick);
    }

    if (dom.cartItems) {
      dom.cartItems.addEventListener('click', handleCartClick);
    }
  };

  const cacheDom = () => {
    dom.siteHeader = select('#site-header');
    dom.navToggle = select('#nav-toggle');
    dom.navMenu = select('#nav-menu');
    dom.themeToggle = select('#theme-toggle');

    dom.scrollProgress = select('.scroll-progress');
    dom.scrollTopBtn = select('#scroll-to-top');

    dom.menuItems = select('#menu-items');
    dom.menuFilters = select('.menu-filters');
    dom.menuSearch = select('#menu-search');

    dom.floatingCartBtn = select('#floating-cart-btn');
    dom.cartCountBadge = select('#cart-count-badge');
    dom.cartModal = select('#cart-modal');
    dom.cartItems = select('#cart-items');
    dom.cartSubtotal = select('#cart-subtotal');
    dom.cartService = select('#cart-service');
    dom.cartTotal = select('#cart-total');
    dom.checkoutBtn = select('#checkout-btn');

    dom.previewModal = select('#preview-modal');
    dom.previewTitle = select('#preview-title');
    dom.previewImage = select('#preview-image');
    dom.previewDescription = select('#preview-description');
    dom.previewPrice = select('#preview-price');
    dom.previewQtyLabel = select('#preview-qty');
    dom.previewQtyInc = select('#preview-qty-inc');
    dom.previewQtyDec = select('#preview-qty-dec');
    dom.previewAddBtn = select('#preview-add-btn');

    dom.toastContainer = select('#toast-container');

    dom.reservationForm = select('#reservation-form');
    dom.contactForm = select('#contact-form');

    dom.reviewsSlider = select('#reviews-slider');
  };

  const init = async () => {
    cacheDom();

    initTheme();
    initHeaderAndScrollUI();
    initNavigation();
    initSmoothAnchorScroll();
    initRevealOnScroll();

    initFiltersAndSearch();

    restoreCart();
    renderCart();

    initDelegatedEvents();
    initModalEvents();
    initForms();
    initReviews();

    await initMenu();

    document.documentElement.classList.add('app-ready');
  };

  document.addEventListener('DOMContentLoaded', init);
})();
