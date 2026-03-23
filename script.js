(() => {
  'use strict';

  const STORAGE_KEYS = {
    cart: 'golden-spoon-cart-v1',
    theme: 'golden-spoon-theme-v1',
    reservations: 'golden-spoon-reservations-v1',
    checkoutDraft: 'golden-spoon-checkout-draft-v1',
    submitLock: 'golden-spoon-submit-lock-v1',
    recentOrder: 'golden-spoon-recent-order-v1',
    orders: 'golden-spoon-orders-v1'
  };

  const SERVICE_RATE = 0.1;
  const TOAST_DURATION = 2800;
  const SUBMIT_LOCK_MS = 5000;
  const RECENT_ORDER_WINDOW_MS = 15000;

  const state = {
    menu: [],
    filteredMenu: [],
    cart: [],
    activeFilter: 'all',
    searchQuery: '',
    previewItem: null,
    previewQty: 1,
    reviewIndex: 0,
    isSubmittingOrder: false,
    shouldRestoreReview: false,
    orderHistory: [],
    activeReceipt: null
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

  const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
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
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
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

  const getCartTotals = () => {
    const subtotal = calculateSubtotal();
    const service = subtotal * SERVICE_RATE;

    return {
      subtotal,
      service,
      total: subtotal + service
    };
  };

  const getSelectedServiceType = () => {
    if (!dom.checkoutForm) {
      return '';
    }

    const selected = dom.checkoutForm.querySelector('input[name="service-type"]:checked');
    return selected instanceof HTMLInputElement ? selected.value : '';
  };

  const getCheckoutDraftData = () => ({
    customerName:
      dom.checkoutName instanceof HTMLInputElement ? dom.checkoutName.value.trim() : '',
    phone: dom.checkoutPhone instanceof HTMLInputElement ? dom.checkoutPhone.value.trim() : '',
    serviceType: getSelectedServiceType(),
    notes:
      dom.checkoutNotes instanceof HTMLTextAreaElement ? dom.checkoutNotes.value.trim() : ''
  });

  const setCheckoutDraftStatus = message => {
    if (!dom.checkoutDraftStatus) {
      return;
    }

    dom.checkoutDraftStatus.textContent = message;
  };

  const formatOrderDate = value => {
    const ts = typeof value === 'number' ? value : Date.parse(String(value));
    if (Number.isNaN(ts)) {
      return 'Unknown time';
    }

    return dateTimeFormatter.format(ts);
  };

  const clearExpiredOrderGuards = () => {
    const now = Date.now();
    const submitLock = storage.get(STORAGE_KEYS.submitLock, null);
    if (submitLock && Number(submitLock.expiresAt) <= now) {
      storage.remove(STORAGE_KEYS.submitLock);
    }

    const recentOrder = storage.get(STORAGE_KEYS.recentOrder, null);
    if (recentOrder && Number(recentOrder.expiresAt) <= now) {
      storage.remove(STORAGE_KEYS.recentOrder);
    }
  };

  const getActiveSubmitLock = () => {
    clearExpiredOrderGuards();
    const lock = storage.get(STORAGE_KEYS.submitLock, null);

    if (!lock || typeof lock !== 'object') {
      return null;
    }

    return Number(lock.expiresAt) > Date.now() ? lock : null;
  };

  const getRecentOrderGuard = () => {
    clearExpiredOrderGuards();
    const guard = storage.get(STORAGE_KEYS.recentOrder, null);

    if (!guard || typeof guard !== 'object') {
      return null;
    }

    return Number(guard.expiresAt) > Date.now() ? guard : null;
  };

  const setSubmitLock = fingerprint => {
    storage.set(STORAGE_KEYS.submitLock, {
      fingerprint,
      expiresAt: Date.now() + SUBMIT_LOCK_MS
    });
  };

  const clearSubmitLock = () => {
    storage.remove(STORAGE_KEYS.submitLock);
  };

  const rememberRecentOrder = fingerprint => {
    storage.set(STORAGE_KEYS.recentOrder, {
      fingerprint,
      expiresAt: Date.now() + RECENT_ORDER_WINDOW_MS
    });
  };

  const buildOrderFingerprint = (checkoutData, totals) =>
    JSON.stringify({
      customerName: checkoutData.customerName.toLowerCase(),
      phone: checkoutData.phone.replace(/\s+/g, ''),
      serviceType: checkoutData.serviceType,
      notes: checkoutData.notes.toLowerCase(),
      items: state.cart.map(item => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice.toFixed(2))
      })),
      total: Number(totals.total.toFixed(2))
    });

  const saveCheckoutDraft = () => {
    if (!dom.checkoutForm) {
      return;
    }

    const checkoutData = getCheckoutDraftData();
    const hasDetails = Object.values(checkoutData).some(value => Boolean(value));
    const reviewIsOpen = Boolean(dom.reviewModal && dom.reviewModal.classList.contains('open'));

    if (!hasDetails && !reviewIsOpen) {
      storage.remove(STORAGE_KEYS.checkoutDraft);
      setCheckoutDraftStatus('Checkout details save automatically on this device.');
      return;
    }

    storage.set(STORAGE_KEYS.checkoutDraft, {
      ...checkoutData,
      reviewIsOpen,
      updatedAt: Date.now()
    });

    setCheckoutDraftStatus('Checkout details saved on this device.');
  };

  const clearCheckoutDraft = () => {
    storage.remove(STORAGE_KEYS.checkoutDraft);
    setCheckoutDraftStatus('Checkout details save automatically on this device.');
  };

  const restoreCheckoutDraft = () => {
    if (!dom.checkoutForm) {
      return;
    }

    const saved = storage.get(STORAGE_KEYS.checkoutDraft, null);
    if (!saved || typeof saved !== 'object') {
      setCheckoutDraftStatus('Checkout details save automatically on this device.');
      return;
    }

    if (dom.checkoutName instanceof HTMLInputElement) {
      dom.checkoutName.value = String(saved.customerName || '');
    }

    if (dom.checkoutPhone instanceof HTMLInputElement) {
      dom.checkoutPhone.value = String(saved.phone || '');
    }

    if (dom.checkoutNotes instanceof HTMLTextAreaElement) {
      dom.checkoutNotes.value = String(saved.notes || '');
    }

    const savedService = String(saved.serviceType || '');
    if (savedService) {
      dom.checkoutForm
        .querySelectorAll('input[name="service-type"]')
        .forEach(radio => {
          if (radio instanceof HTMLInputElement) {
            radio.checked = radio.value === savedService;
          }
        });
    }

    state.shouldRestoreReview = Boolean(saved.reviewIsOpen);
    setCheckoutDraftStatus('Restored your unfinished checkout details on this device.');
  };

  const syncCartWithCurrentMenu = () => {
    if (!state.menu.length || !state.cart.length) {
      return false;
    }

    let changed = false;

    state.cart = state.cart.map(item => {
      const latest = state.menu.find(menuItem => menuItem.id === item.id);
      if (!latest) {
        return item;
      }

      const latestPrice = parsePrice(latest.price);
      const nextItem = {
        ...item,
        name: latest.name,
        price: latest.price,
        unitPrice: latestPrice,
        image: latest.image
      };

      if (
        nextItem.name !== item.name ||
        nextItem.price !== item.price ||
        nextItem.unitPrice !== item.unitPrice ||
        nextItem.image !== item.image
      ) {
        changed = true;
      }

      return nextItem;
    });

    if (changed) {
      saveCart();
    }

    return changed;
  };

  const getStoredOrders = () => {
    const saved = storage.get(STORAGE_KEYS.orders, []);
    if (!Array.isArray(saved)) {
      return [];
    }

    return saved.filter(order => order && typeof order === 'object');
  };

  const saveOrderHistory = orders => {
    state.orderHistory = orders;
    storage.set(STORAGE_KEYS.orders, orders);
  };

  const generateOrderNumber = timestamp => {
    const date = new Date(timestamp);
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const suffix = String(timestamp).slice(-4);

    return `GS-${y}${m}${d}-${suffix}`;
  };

  const toTitleCase = value =>
    String(value || '')
      .split('-')
      .map(part => (part ? part[0].toUpperCase() + part.slice(1) : ''))
      .join(' ');

  const buildOrderRecord = checkoutData => {
    const placedAt = Date.now();
    const totals = getCartTotals();

    return {
      orderNumber: generateOrderNumber(placedAt),
      placedAt,
      customerName: checkoutData.customerName,
      phone: checkoutData.phone,
      serviceType: checkoutData.serviceType,
      notes: checkoutData.notes,
      items: state.cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.unitPrice * item.quantity
      })),
      subtotal: totals.subtotal,
      service: totals.service,
      total: totals.total
    };
  };

  const persistOrder = order => {
    const nextOrders = [order, ...getStoredOrders()].slice(0, 6);
    saveOrderHistory(nextOrders);
  };

  const renderOrderHistory = () => {
    if (!dom.orderHistoryList) {
      return;
    }

    if (!state.orderHistory.length) {
      dom.orderHistoryList.innerHTML =
        '<div class="history-empty"><p>No demo orders yet. Confirm one to see it here.</p></div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    state.orderHistory.forEach(order => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-card';
      button.dataset.orderNumber = order.orderNumber;

      const copy = document.createElement('div');
      copy.className = 'history-card-copy';

      const title = document.createElement('strong');
      title.textContent = order.orderNumber;

      const meta = document.createElement('p');
      meta.className = 'history-card-meta';
      meta.textContent = `${toTitleCase(order.serviceType)} • ${formatOrderDate(order.placedAt)}`;

      const customer = document.createElement('p');
      customer.className = 'history-card-meta';
      customer.textContent = `${order.customerName} • ${formatMoney(order.total)}`;

      const action = document.createElement('span');
      action.className = 'history-card-action';
      action.textContent = 'View receipt';

      copy.append(title, meta, customer);
      button.append(copy, action);
      fragment.appendChild(button);
    });

    dom.orderHistoryList.replaceChildren(fragment);
  };

  const renderReceipt = order => {
    if (
      !order ||
      !dom.receiptOrderNumber ||
      !dom.receiptPlacedAt ||
      !dom.receiptServiceType ||
      !dom.receiptCustomerName ||
      !dom.receiptPhone ||
      !dom.receiptNotes ||
      !dom.receiptItems ||
      !dom.receiptSubtotal ||
      !dom.receiptService ||
      !dom.receiptTotal
    ) {
      return;
    }

    state.activeReceipt = order;

    dom.receiptOrderNumber.textContent = order.orderNumber;
    dom.receiptPlacedAt.textContent = formatOrderDate(order.placedAt);
    dom.receiptServiceType.textContent = toTitleCase(order.serviceType);
    dom.receiptCustomerName.textContent = order.customerName;
    dom.receiptPhone.textContent = order.phone;
    dom.receiptNotes.textContent = order.notes || 'No notes provided.';

    const fragment = document.createDocumentFragment();
    order.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'receipt-item-row';

      const copy = document.createElement('div');
      copy.className = 'receipt-item-copy';

      const name = document.createElement('strong');
      name.textContent = item.name;

      const meta = document.createElement('p');
      meta.className = 'receipt-item-meta';
      meta.textContent = `${item.quantity} x ${formatMoney(item.unitPrice)}`;

      const total = document.createElement('strong');
      total.textContent = formatMoney(item.lineTotal);

      copy.append(name, meta);
      row.append(copy, total);
      fragment.appendChild(row);
    });

    dom.receiptItems.replaceChildren(fragment);
    dom.receiptSubtotal.textContent = formatMoney(order.subtotal);
    dom.receiptService.textContent = formatMoney(order.service);
    dom.receiptTotal.textContent = formatMoney(order.total);
  };

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

  const getModal = type => {
    if (type === 'cart') {
      return dom.cartModal;
    }

    if (type === 'preview') {
      return dom.previewModal;
    }

    if (type === 'review') {
      return dom.reviewModal;
    }

    if (type === 'receipt') {
      return dom.receiptModal;
    }

    return null;
  };

  const openModal = type => {
    const modal = getModal(type);
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

    if (type === 'review' && dom.reviewConfirmBtn) {
      dom.reviewConfirmBtn.focus();
    }

    if (type === 'receipt' && dom.receiptDoneBtn) {
      dom.receiptDoneBtn.focus();
    }
  };

  const closeModal = (type, { restoreFocus = true } = {}) => {
    const modal = getModal(type);
    if (!modal) {
      return;
    }

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    setBodyScrollLock();

    if (type === 'cart' && dom.floatingCartBtn) {
      dom.floatingCartBtn.setAttribute('aria-expanded', 'false');
      if (restoreFocus) {
        dom.floatingCartBtn.focus();
      }
    }

    if (type === 'review' && restoreFocus && dom.floatingCartBtn) {
      dom.floatingCartBtn.focus();
    }

    if (type === 'receipt' && restoreFocus && dom.floatingCartBtn) {
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

  const syncCheckoutActions = () => {
    const hasItems = getCartCount() > 0;
    const isBusy = state.isSubmittingOrder;

    if (dom.checkoutBtn) {
      dom.checkoutBtn.disabled = !hasItems || isBusy;
      dom.checkoutBtn.setAttribute('aria-disabled', String(dom.checkoutBtn.disabled));
      dom.checkoutBtn.textContent = isBusy ? 'Placing Demo Order...' : 'Review Order';
    }

    if (dom.reviewConfirmBtn) {
      dom.reviewConfirmBtn.disabled = !hasItems || isBusy;
      dom.reviewConfirmBtn.setAttribute(
        'aria-disabled',
        String(dom.reviewConfirmBtn.disabled)
      );
      dom.reviewConfirmBtn.textContent = isBusy
        ? 'Placing Demo Order...'
        : 'Place Demo Order';
    }

    if (dom.reviewBackBtn) {
      dom.reviewBackBtn.disabled = isBusy;
      dom.reviewBackBtn.setAttribute('aria-disabled', String(dom.reviewBackBtn.disabled));
    }

    if (dom.checkoutForm) {
      dom.checkoutForm.querySelectorAll('input, textarea').forEach(field => {
        field.disabled = isBusy;
      });
    }
  };

  const renderReviewSummary = () => {
    if (
      !dom.reviewItems ||
      !dom.reviewItemCount ||
      !dom.reviewSubtotal ||
      !dom.reviewService ||
      !dom.reviewTotal
    ) {
      return;
    }

    const count = getCartCount();
    const { subtotal, service, total } = getCartTotals();

    dom.reviewItemCount.textContent =
      count === 1 ? '1 item in your demo order' : `${count} items in your demo order`;

    if (count === 0) {
      dom.reviewItems.innerHTML =
        '<div class="review-empty"><p>Your cart is empty. Add dishes before reviewing your order.</p></div>';
      dom.reviewSubtotal.textContent = formatMoney(0);
      dom.reviewService.textContent = formatMoney(0);
      dom.reviewTotal.textContent = formatMoney(0);
      syncCheckoutActions();
      return;
    }

    const fragment = document.createDocumentFragment();

    state.cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'review-item-row';

      const copy = document.createElement('div');
      copy.className = 'review-item-copy';

      const title = document.createElement('strong');
      title.textContent = item.name;

      const meta = document.createElement('p');
      meta.className = 'review-item-meta';
      meta.textContent = `${item.quantity} x ${formatMoney(item.unitPrice)}`;

      const lineTotal = document.createElement('strong');
      lineTotal.textContent = formatMoney(item.quantity * item.unitPrice);

      copy.append(title, meta);
      row.append(copy, lineTotal);
      fragment.appendChild(row);
    });

    dom.reviewItems.replaceChildren(fragment);
    dom.reviewSubtotal.textContent = formatMoney(subtotal);
    dom.reviewService.textContent = formatMoney(service);
    dom.reviewTotal.textContent = formatMoney(total);
    syncCheckoutActions();
  };

  const renderCart = () => {
    if (!dom.cartItems || !dom.cartCountBadge || !dom.cartSubtotal || !dom.cartService || !dom.cartTotal) {
      return;
    }

    const count = getCartCount();
    const { subtotal, service, total } = getCartTotals();

    dom.cartCountBadge.textContent = String(count);

    if (count === 0) {
      dom.cartItems.innerHTML =
        '<div class="cart-empty"><p>Your cart is empty. Add dishes to get started.</p></div>';
      dom.cartSubtotal.textContent = formatMoney(0);
      dom.cartService.textContent = formatMoney(0);
      dom.cartTotal.textContent = formatMoney(0);
      clearCheckoutDraft();
      renderReviewSummary();
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
    renderReviewSummary();
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

    const applyThemeState = isDark => {
      document.body.classList.toggle('dark', isDark);
      dom.themeToggle.setAttribute('aria-pressed', String(isDark));
      dom.themeToggle.setAttribute(
        'aria-label',
        isDark ? 'Switch to light theme' : 'Switch to dark theme'
      );
    };

    const saved = storage.get(STORAGE_KEYS.theme, null);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = saved === 'dark' || (saved === null && prefersDark);

    applyThemeState(shouldUseDark);

    window.requestAnimationFrame(() => {
      dom.themeToggle.classList.add('is-ready');
    });

    dom.themeToggle.addEventListener('click', () => {
      const nextDark = !document.body.classList.contains('dark');
      applyThemeState(nextDark);
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
      const response = await fetch('menu.json', { cache: 'no-store' });
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

      const cartWasUpdated = syncCartWithCurrentMenu();
      if (cartWasUpdated) {
        renderCart();
        toast('Cart totals refreshed from the latest menu.', 'success');
      }

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

  const validateChoiceGroup = (group, radios, rules = { required: true }) => {
    const error = group ? group.querySelector('.error-message') : null;
    const hasSelection = radios.some(radio => radio.checked);
    const message = rules.required && !hasSelection ? 'Please select a service type.' : '';

    if (group) {
      group.classList.toggle('invalid', Boolean(message));
      group.setAttribute('aria-invalid', String(Boolean(message)));
    }

    radios.forEach(radio => {
      radio.setAttribute('aria-invalid', String(Boolean(message)));
    });

    if (error) {
      error.textContent = message;
    }

    return !message;
  };

  const resetFormValidation = form => {
    if (!form) {
      return;
    }

    form.querySelectorAll('.invalid').forEach(field => field.classList.remove('invalid'));
    form
      .querySelectorAll('[aria-invalid="true"]')
      .forEach(field => field.setAttribute('aria-invalid', 'false'));
    form.querySelectorAll('.error-message').forEach(node => {
      node.textContent = '';
    });
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

    if (dom.checkoutForm) {
      const checkoutRules = {
        'checkout-name': { required: true, min: 2 },
        'checkout-phone': { required: true, phone: true }
      };

      const getServiceTypeInputs = () =>
        Array.from(dom.checkoutForm.querySelectorAll('input[name="service-type"]'));

      dom.checkoutForm.addEventListener('input', event => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) {
          return;
        }

        const key = field.name;
        if (!checkoutRules[key]) {
          saveCheckoutDraft();
          return;
        }

        validateField(field, checkoutRules[key]);
        saveCheckoutDraft();
      });

      dom.checkoutForm.addEventListener('change', event => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement)) {
          return;
        }

        if (field.name !== 'service-type') {
          return;
        }

        validateChoiceGroup(dom.checkoutServiceGroup, getServiceTypeInputs());
        saveCheckoutDraft();
      });

      dom.checkoutForm.addEventListener('submit', event => {
        event.preventDefault();

        if (state.isSubmittingOrder) {
          return;
        }

        if (!getCartCount()) {
          toast('Your cart is empty', 'error');
          renderReviewSummary();
          return;
        }

        const cartWasUpdated = syncCartWithCurrentMenu();
        if (cartWasUpdated) {
          renderCart();
          setCheckoutDraftStatus('Cart totals were refreshed from the latest menu.');
        }

        const fields = Array.from(dom.checkoutForm.querySelectorAll('input, textarea'));
        const serviceInputs = getServiceTypeInputs();
        const fieldValidity = fields.every(field => {
          const key = field.name;
          return checkoutRules[key] ? validateField(field, checkoutRules[key]) : true;
        });
        const serviceValidity = validateChoiceGroup(dom.checkoutServiceGroup, serviceInputs);

        if (!fieldValidity || !serviceValidity) {
          toast('Please complete the checkout details before placing the demo order.', 'error');
          return;
        }

        const checkoutData = getCheckoutDraftData();
        const totals = getCartTotals();
        const fingerprint = buildOrderFingerprint(checkoutData, totals);
        const activeLock = getActiveSubmitLock();

        if (activeLock) {
          toast(
            activeLock.fingerprint === fingerprint
              ? 'This demo order is already being processed.'
              : 'Please wait for the current order action to finish.',
            'error'
          );
          return;
        }

        const recentOrder = getRecentOrderGuard();
        if (recentOrder && recentOrder.fingerprint === fingerprint) {
          toast('This demo order was just placed. Update the cart or details before trying again.', 'error');
          return;
        }

        state.isSubmittingOrder = true;
        setSubmitLock(fingerprint);
        saveCheckoutDraft();
        syncCheckoutActions();

        const selectedService = serviceInputs.find(radio => radio.checked);
        const serviceLabel = selectedService ? selectedService.value : 'pickup';
        const orderRecord = buildOrderRecord(checkoutData);

        window.setTimeout(() => {
          state.isSubmittingOrder = false;
          clearSubmitLock();
          rememberRecentOrder(fingerprint);
          persistOrder(orderRecord);
          renderOrderHistory();
          renderReceipt(orderRecord);
          state.cart = [];
          saveCart();
          renderCart();
          dom.checkoutForm.reset();
          resetFormValidation(dom.checkoutForm);
          clearCheckoutDraft();
          closeModal('review', { restoreFocus: false });
          openModal('receipt');
          toast(
            `Demo order ${orderRecord.orderNumber} for ${serviceLabel} confirmed locally. No payment was charged.`,
            'success'
          );
        }, 700);
      });
    }
  };

  const initReviews = () => {
    if (!dom.reviewsSlider) {
      return;
    }

    const reviewCards = reviews
      .map(
        review => `
          <article class="review-item">
            <p class="review-quote">"${review.quote}"</p>
            <p class="author">- ${review.author}</p>
          </article>
        `
      )
      .join('');

    dom.reviewsSlider.innerHTML = `
      <div class="reviews-track">
        ${reviewCards}
        ${reviewCards}
      </div>
    `;

    dom.reviewsSlider.setAttribute('aria-live', 'off');

    const pauseMarquee = () => dom.reviewsSlider.classList.add('is-paused');
    const resumeMarquee = () => dom.reviewsSlider.classList.remove('is-paused');

    dom.reviewsSlider.addEventListener('mouseenter', pauseMarquee);
    dom.reviewsSlider.addEventListener('mouseleave', resumeMarquee);
    dom.reviewsSlider.addEventListener('focusin', pauseMarquee);
    dom.reviewsSlider.addEventListener('focusout', resumeMarquee);
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
      if (type === 'review' && state.isSubmittingOrder) {
        return;
      }

      if (type === 'cart' || type === 'preview' || type === 'review' || type === 'receipt') {
        closeModal(type);
        if (type === 'review') {
          saveCheckoutDraft();
        }
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') {
        return;
      }

      if (dom.reviewModal && dom.reviewModal.classList.contains('open')) {
        if (state.isSubmittingOrder) {
          return;
        }
        closeModal('review');
        saveCheckoutDraft();
      }

      if (dom.receiptModal && dom.receiptModal.classList.contains('open')) {
        closeModal('receipt');
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
        if (state.isSubmittingOrder) {
          return;
        }

        if (!getCartCount()) {
          toast('Your cart is empty', 'error');
          syncCheckoutActions();
          return;
        }

        const cartWasUpdated = syncCartWithCurrentMenu();
        if (cartWasUpdated) {
          renderCart();
          setCheckoutDraftStatus('Cart totals were refreshed from the latest menu.');
        }

        renderReviewSummary();
        closeModal('cart', { restoreFocus: false });
        openModal('review');
        saveCheckoutDraft();
      });
    }

    if (dom.reviewBackBtn) {
      dom.reviewBackBtn.addEventListener('click', () => {
        if (state.isSubmittingOrder) {
          return;
        }

        closeModal('review', { restoreFocus: false });
        saveCheckoutDraft();
        openModal('cart');
      });
    }

    if (dom.receiptDoneBtn) {
      dom.receiptDoneBtn.addEventListener('click', () => {
        closeModal('receipt');
      });
    }

    if (dom.orderHistoryList) {
      dom.orderHistoryList.addEventListener('click', event => {
        const card = event.target.closest('[data-order-number]');
        if (!card) {
          return;
        }

        const order = state.orderHistory.find(entry => entry.orderNumber === card.dataset.orderNumber);
        if (!order) {
          return;
        }

        renderReceipt(order);
        openModal('receipt');
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

    dom.reviewModal = select('#review-modal');
    dom.checkoutForm = select('#checkout-form');
    dom.checkoutName = select('#checkout-name');
    dom.checkoutPhone = select('#checkout-phone');
    dom.checkoutNotes = select('#checkout-notes');
    dom.checkoutServiceGroup = select('#checkout-service-group');
    dom.checkoutDraftStatus = select('#checkout-draft-status');
    dom.reviewItems = select('#review-items');
    dom.reviewItemCount = select('#review-item-count');
    dom.reviewSubtotal = select('#review-subtotal');
    dom.reviewService = select('#review-service');
    dom.reviewTotal = select('#review-total');
    dom.reviewBackBtn = select('#review-back-btn');
    dom.reviewConfirmBtn = select('#review-confirm-btn');
    dom.orderHistoryList = select('#order-history-list');

    dom.receiptModal = select('#receipt-modal');
    dom.receiptOrderNumber = select('#receipt-order-number');
    dom.receiptPlacedAt = select('#receipt-placed-at');
    dom.receiptServiceType = select('#receipt-service-type');
    dom.receiptCustomerName = select('#receipt-customer-name');
    dom.receiptPhone = select('#receipt-phone');
    dom.receiptNotes = select('#receipt-notes');
    dom.receiptItems = select('#receipt-items');
    dom.receiptSubtotal = select('#receipt-subtotal');
    dom.receiptService = select('#receipt-service');
    dom.receiptTotal = select('#receipt-total');
    dom.receiptDoneBtn = select('#receipt-done-btn');

    dom.toastContainer = select('#toast-container');

    dom.reservationForm = select('#reservation-form');
    dom.contactForm = select('#contact-form');

    dom.reviewsSlider = select('#reviews-slider');
  };

  const init = async () => {
    cacheDom();
    clearExpiredOrderGuards();
    restoreCheckoutDraft();
    state.orderHistory = getStoredOrders();
    renderOrderHistory();

    initTheme();
    initHeaderAndScrollUI();
    initNavigation();
    initSmoothAnchorScroll();
    initRevealOnScroll();

    initFiltersAndSearch();

    restoreCart();
    renderCart();
    syncCheckoutActions();

    initDelegatedEvents();
    initModalEvents();
    initForms();
    initReviews();

    await initMenu();

    if (state.shouldRestoreReview && getCartCount()) {
      renderReviewSummary();
      openModal('review');
      toast('Restored your unfinished checkout.', 'success');
    }

    document.documentElement.classList.add('app-ready');
  };

  document.addEventListener('DOMContentLoaded', init);
})();
