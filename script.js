document.addEventListener('DOMContentLoaded', () => {
    const loader = document.querySelector('.loader');
    window.addEventListener('load', () => {
        if (loader) {
            loader.style.display = 'none';
        }
    });

    const storage = {
        get(key, fallbackValue) {
            try {
                const rawValue = localStorage.getItem(key);
                return rawValue ? JSON.parse(rawValue) : fallbackValue;
            } catch (error) {
                console.error(`Failed to read localStorage key "${key}"`, error);
                return fallbackValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error(`Failed to write localStorage key "${key}"`, error);
                return false;
            }
        }
    };

    const parsePrice = price => {
        const numeric = Number.parseFloat(String(price).replace(/[^0-9.]/g, ''));
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const formatCurrency = value => `$${value.toFixed(2)}`;

    const initNavigation = () => {
        const hamburger = document.querySelector('.hamburger');
        const navUl = document.querySelector('nav ul');

        if (!hamburger || !navUl) {
            return;
        }

        const closeMenu = () => {
            hamburger.classList.remove('active');
            navUl.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        };

        const openMenu = () => {
            hamburger.classList.add('active');
            navUl.classList.add('active');
            hamburger.setAttribute('aria-expanded', 'true');
        };

        hamburger.addEventListener('click', () => {
            if (navUl.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        navUl.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeMenu();
            }
        });
    };

    const initSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetSelector = this.getAttribute('href');
                const targetElement = document.querySelector(targetSelector);

                if (!targetElement) {
                    return;
                }

                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            });
        });
    };

    const initMenuAndCart = () => {
        const menuItemsContainer = document.querySelector('.menu-items');
        const menuFilters = document.querySelector('.menu-filters');

        if (!menuItemsContainer || !menuFilters) {
            return;
        }

        const cart = [];
        let cartModal = null;
        let cartToggleButton = null;
        let cartItemsContainer = null;
        let cartTotal = null;
        let cartCount = null;
        let closeCartButton = null;
        let lastFocusedElement = null;

        const showMenuMessage = (message, className = 'menu-message') => {
            menuItemsContainer.innerHTML = `<p class="${className}">${message}</p>`;
        };

        const displayMenuItems = items => {
            menuItemsContainer.innerHTML = items.map(item => `
                <div class="menu-item" data-category="${item.category}" data-id="${item.id}">
                    <img src="${item.image}" alt="${item.name}">
                    <h3>${item.name}</h3>
                    <p class="price">${item.price}</p>
                    <p>${item.description}</p>
                    <button type="button" class="add-to-cart-btn">Add to Cart</button>
                </div>
            `).join('');
        };

        const updateCart = () => {
            if (!cartCount || !cartItemsContainer || !cartTotal) {
                return;
            }

            cartCount.textContent = cart.reduce((acc, item) => acc + item.quantity, 0);

            if (cart.length === 0) {
                cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
                cartTotal.textContent = '$0';
                return;
            }

            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <span>${item.name} (x${item.quantity})</span>
                    <span>${formatCurrency(parsePrice(item.price) * item.quantity)}</span>
                </div>
            `).join('');

            const total = cart.reduce((acc, item) => acc + parsePrice(item.price) * item.quantity, 0);
            cartTotal.textContent = formatCurrency(total);
        };

        const closeCart = () => {
            if (!cartModal || !cartToggleButton) {
                return;
            }

            cartModal.classList.add('hidden');
            cartToggleButton.setAttribute('aria-expanded', 'false');

            if (lastFocusedElement instanceof HTMLElement) {
                lastFocusedElement.focus();
            }
        };

        const openCart = () => {
            if (!cartModal || !cartToggleButton) {
                return;
            }

            lastFocusedElement = document.activeElement;
            cartModal.classList.remove('hidden');
            cartToggleButton.setAttribute('aria-expanded', 'true');

            if (closeCartButton) {
                closeCartButton.focus();
            }
        };

        const initializeCart = menuData => {
            cartToggleButton = document.createElement('button');
            cartToggleButton.type = 'button';
            cartToggleButton.className = 'cart-icon';
            cartToggleButton.setAttribute('aria-label', 'Open shopping cart');
            cartToggleButton.setAttribute('aria-haspopup', 'dialog');
            cartToggleButton.setAttribute('aria-expanded', 'false');
            cartToggleButton.innerHTML = '🛒 <span class="cart-count">0</span>';
            document.body.appendChild(cartToggleButton);

            cartModal = document.createElement('div');
            cartModal.className = 'cart-modal hidden';
            cartModal.setAttribute('role', 'dialog');
            cartModal.setAttribute('aria-label', 'Shopping cart');
            cartModal.innerHTML = `
                <div class="cart-modal-content">
                    <button type="button" class="close-cart" aria-label="Close cart">&times;</button>
                    <h2>Your Cart</h2>
                    <div class="cart-items"></div>
                    <p>Total: <span class="cart-total">$0</span></p>
                    <button type="button" class="checkout-btn btn">Checkout</button>
                </div>
            `;
            document.body.appendChild(cartModal);

            cartCount = cartToggleButton.querySelector('.cart-count');
            cartItemsContainer = cartModal.querySelector('.cart-items');
            cartTotal = cartModal.querySelector('.cart-total');
            closeCartButton = cartModal.querySelector('.close-cart');
            const checkoutButton = cartModal.querySelector('.checkout-btn');

            menuItemsContainer.addEventListener('click', e => {
                if (!e.target.classList.contains('add-to-cart-btn')) {
                    return;
                }

                const menuItem = e.target.closest('.menu-item');
                if (!menuItem) {
                    return;
                }

                const id = Number.parseInt(menuItem.dataset.id, 10);
                if (Number.isNaN(id)) {
                    return;
                }

                const item = menuData.find(menuItemData => menuItemData.id === id);
                if (!item) {
                    return;
                }

                const existingItem = cart.find(cartItem => cartItem.id === id);
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cart.push({ ...item, quantity: 1 });
                }

                updateCart();
            });

            cartToggleButton.addEventListener('click', () => {
                if (cartModal.classList.contains('hidden')) {
                    openCart();
                } else {
                    closeCart();
                }
            });

            if (closeCartButton) {
                closeCartButton.addEventListener('click', closeCart);
            }

            if (checkoutButton) {
                checkoutButton.addEventListener('click', () => {
                    alert('This is a fake checkout. No payment will be processed.');
                    cart.length = 0;
                    updateCart();
                    closeCart();
                });
            }

            document.addEventListener('click', e => {
                if (!cartModal || !cartToggleButton || cartModal.classList.contains('hidden')) {
                    return;
                }

                const clickedInsideCart = cartModal.contains(e.target);
                const clickedCartIcon = cartToggleButton.contains(e.target);

                if (!clickedInsideCart && !clickedCartIcon) {
                    closeCart();
                }
            });

            document.addEventListener('keydown', e => {
                if (e.key === 'Escape' && cartModal && !cartModal.classList.contains('hidden')) {
                    closeCart();
                }
            });
        };

        const filterButtons = Array.from(menuFilters.querySelectorAll('[role="tab"]'));

        const setActiveFilter = activeButton => {
            filterButtons.forEach(button => {
                const isActive = button === activeButton;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-selected', String(isActive));
                button.tabIndex = isActive ? 0 : -1;
            });
        };

        const activateFilter = (button, menuData) => {
            setActiveFilter(button);
            const filter = button.dataset.filter;
            const filteredItems = filter === 'all'
                ? menuData
                : menuData.filter(item => item.category === filter);
            displayMenuItems(filteredItems);
        };

        const setupFilterInteractions = menuData => {
            if (filterButtons.length === 0) {
                return;
            }

            const activeButton = menuFilters.querySelector('.active') || filterButtons[0];
            setActiveFilter(activeButton);

            menuFilters.addEventListener('click', e => {
                const targetButton = e.target.closest('[role="tab"]');
                if (!targetButton) {
                    return;
                }

                activateFilter(targetButton, menuData);
            });

            filterButtons.forEach((button, index) => {
                button.addEventListener('keydown', e => {
                    const keyToOffset = {
                        ArrowRight: 1,
                        ArrowDown: 1,
                        ArrowLeft: -1,
                        ArrowUp: -1
                    };

                    if (Object.prototype.hasOwnProperty.call(keyToOffset, e.key)) {
                        e.preventDefault();
                        const nextIndex = (index + keyToOffset[e.key] + filterButtons.length) % filterButtons.length;
                        const nextButton = filterButtons[nextIndex];
                        nextButton.focus();
                        activateFilter(nextButton, menuData);
                        return;
                    }

                    if (e.key === 'Home') {
                        e.preventDefault();
                        filterButtons[0].focus();
                        activateFilter(filterButtons[0], menuData);
                    }

                    if (e.key === 'End') {
                        e.preventDefault();
                        const lastButton = filterButtons[filterButtons.length - 1];
                        lastButton.focus();
                        activateFilter(lastButton, menuData);
                    }
                });
            });
        };

        showMenuMessage('Loading menu...');

        fetch('menu.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Menu request failed with status ${response.status}`);
                }
                return response.json();
            })
            .then(menuData => {
                if (!Array.isArray(menuData)) {
                    throw new Error('Invalid menu payload');
                }

                if (menuData.length === 0) {
                    showMenuMessage('Menu is currently empty.', 'menu-error');
                    return;
                }

                displayMenuItems(menuData);
                setupFilterInteractions(menuData);
                initializeCart(menuData);
            })
            .catch(error => {
                console.error('Failed to load menu:', error);
                showMenuMessage('Menu is temporarily unavailable. Please try again later.', 'menu-error');
            });
    };

    const showFieldError = (field, message) => {
        const group = field.closest('.form-group');
        const errorMessage = group ? group.querySelector('.error-message') : null;

        field.classList.add('invalid');
        field.setAttribute('aria-invalid', 'true');

        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('visible');
        }
    };

    const clearFieldError = field => {
        const group = field.closest('.form-group');
        const errorMessage = group ? group.querySelector('.error-message') : null;

        field.classList.remove('invalid');
        field.removeAttribute('aria-invalid');

        if (errorMessage) {
            errorMessage.textContent = '';
            errorMessage.classList.remove('visible');
        }
    };

    const validateReservationForm = form => {
        const name = form.querySelector('#name');
        const email = form.querySelector('#email');
        const phone = form.querySelector('#phone');
        const date = form.querySelector('#date');
        const guests = form.querySelector('#guests');
        const fields = [name, email, phone, date, guests];
        let isValid = true;

        fields.forEach(field => clearFieldError(field));

        if (!name.value.trim() || name.value.trim().length < 2) {
            showFieldError(name, 'Please enter your full name.');
            isValid = false;
        }

        if (!email.validity.valid) {
            showFieldError(email, 'Please enter a valid email address.');
            isValid = false;
        }

        const digitsOnlyPhone = phone.value.replace(/\D/g, '');
        if (digitsOnlyPhone.length < 7 || digitsOnlyPhone.length > 15) {
            showFieldError(phone, 'Please enter a valid phone number.');
            isValid = false;
        }

        const selectedDate = Date.parse(date.value);
        if (!date.value || Number.isNaN(selectedDate) || selectedDate < Date.now()) {
            showFieldError(date, 'Please select a future date and time.');
            isValid = false;
        }

        const guestsCount = Number.parseInt(guests.value, 10);
        if (Number.isNaN(guestsCount) || guestsCount < 1 || guestsCount > 20) {
            showFieldError(guests, 'Number of guests must be between 1 and 20.');
            isValid = false;
        }

        return isValid;
    };

    const validateContactForm = form => {
        const name = form.querySelector('#contact-name');
        const email = form.querySelector('#contact-email');
        const message = form.querySelector('#message');
        const fields = [name, email, message];
        let isValid = true;

        fields.forEach(field => clearFieldError(field));

        if (!name.value.trim() || name.value.trim().length < 2) {
            showFieldError(name, 'Please enter your full name.');
            isValid = false;
        }

        if (!email.validity.valid) {
            showFieldError(email, 'Please enter a valid email address.');
            isValid = false;
        }

        if (!message.value.trim() || message.value.trim().length < 10) {
            showFieldError(message, 'Message must be at least 10 characters.');
            isValid = false;
        }

        return isValid;
    };

    const initForms = () => {
        const reservationForm = document.getElementById('reservation-form');
        const reservationSuccess = document.getElementById('reservation-success');
        const contactForm = document.getElementById('contact-form');
        const contactSuccess = document.getElementById('contact-success');

        if (reservationForm && reservationSuccess) {
            reservationForm.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', () => {
                    clearFieldError(input);
                });
            });

            reservationForm.addEventListener('submit', e => {
                e.preventDefault();

                if (!validateReservationForm(reservationForm)) {
                    return;
                }

                const reservation = {
                    name: reservationForm.querySelector('#name').value.trim(),
                    email: reservationForm.querySelector('#email').value.trim(),
                    phone: reservationForm.querySelector('#phone').value.trim(),
                    date: reservationForm.querySelector('#date').value,
                    guests: reservationForm.querySelector('#guests').value
                };
                const reservations = storage.get('reservations', []);
                reservations.push(reservation);

                if (!storage.set('reservations', reservations)) {
                    reservationSuccess.querySelector('p').textContent = 'Reservation could not be saved. Please try again.';
                    reservationSuccess.classList.remove('hidden');
                    return;
                }

                reservationForm.reset();
                reservationSuccess.querySelector('p').textContent = 'Your reservation has been successfully submitted!';
                reservationSuccess.classList.remove('hidden');
                setTimeout(() => {
                    reservationSuccess.classList.add('hidden');
                }, 3000);
            });
        }

        if (contactForm && contactSuccess) {
            contactForm.querySelectorAll('input, textarea').forEach(field => {
                field.addEventListener('input', () => {
                    clearFieldError(field);
                });
            });

            contactForm.addEventListener('submit', e => {
                e.preventDefault();

                if (!validateContactForm(contactForm)) {
                    return;
                }

                contactForm.reset();
                contactSuccess.classList.remove('hidden');
                setTimeout(() => {
                    contactSuccess.classList.add('hidden');
                }, 3000);
            });
        }
    };

    const initReviews = () => {
        const reviews = [
            { text: 'The food was absolutely amazing! I highly recommend the steak frites.', author: 'John Doe' },
            { text: 'A wonderful dining experience. The staff was friendly and the atmosphere was lovely.', author: 'Jane Smith' },
            { text: 'I had the best spaghetti carbonara of my life here. Will definitely be back!', author: 'Peter Jones' },
            { text: 'The desserts are to die for! You have to try the chocolate lava cake.', author: 'Emily White' },
            { text: 'Great cocktails and a cool vibe. The Old Fashioned was perfect.', author: 'Michael Brown' }
        ];
        const reviewsSlider = document.querySelector('.reviews-slider');
        let currentReview = 0;

        if (!reviewsSlider) {
            return;
        }

        const displayReview = () => {
            reviewsSlider.innerHTML = `
                <div class="review active">
                    <p>"${reviews[currentReview].text}"</p>
                    <p class="author">- ${reviews[currentReview].author}</p>
                </div>
            `;
        };

        displayReview();

        setInterval(() => {
            currentReview = (currentReview + 1) % reviews.length;
            displayReview();
        }, 5000);
    };

    const initScrollToTop = () => {
        const scrollToTopBtn = document.createElement('button');
        scrollToTopBtn.type = 'button';
        scrollToTopBtn.innerHTML = '&uarr;';
        scrollToTopBtn.id = 'scroll-to-top';
        scrollToTopBtn.setAttribute('aria-label', 'Scroll to top');
        document.body.appendChild(scrollToTopBtn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.style.display = 'block';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    };

    const initThemeSwitcher = () => {
        const themeSwitcher = document.createElement('button');
        themeSwitcher.type = 'button';
        themeSwitcher.className = 'theme-switcher';
        themeSwitcher.innerHTML = '🌙';
        themeSwitcher.setAttribute('aria-label', 'Switch theme');
        themeSwitcher.setAttribute('aria-pressed', 'false');
        document.body.appendChild(themeSwitcher);

        themeSwitcher.addEventListener('click', () => {
            const isDarkMode = document.body.classList.toggle('dark-mode');
            themeSwitcher.innerHTML = isDarkMode ? '☀️' : '🌙';
            themeSwitcher.setAttribute('aria-pressed', String(isDarkMode));
        });
    };

    initNavigation();
    initSmoothScroll();
    initMenuAndCart();
    initForms();
    initReviews();
    initScrollToTop();
    initThemeSwitcher();
});
