document.addEventListener('DOMContentLoaded', () => {
    const loader = document.querySelector('.loader');
    window.addEventListener('load', () => {
        if (loader) {
            loader.style.display = 'none';
        }
    });

    const hamburger = document.querySelector('.hamburger');
    const navUl = document.querySelector('nav ul');

    if (hamburger && navUl) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navUl.classList.toggle('active');
        });
    }

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

    const menuItemsContainer = document.querySelector('.menu-items');
    const menuFilters = document.querySelector('.menu-filters');
    const cart = [];
    let cartIcon = null;
    let cartModal = null;
    let cartCount = null;
    let cartItemsContainer = null;
    let cartTotal = null;

    const parsePrice = price => {
        const numeric = Number.parseFloat(String(price).replace(/[^0-9.]/g, ''));
        return Number.isFinite(numeric) ? numeric : 0;
    };

    const formatCurrency = value => `$${value.toFixed(2)}`;

    const showMenuMessage = (message, className = 'menu-message') => {
        if (!menuItemsContainer) {
            return;
        }

        menuItemsContainer.innerHTML = `<p class="${className}">${message}</p>`;
    };

    const displayMenuItems = items => {
        if (!menuItemsContainer) {
            return;
        }

        menuItemsContainer.innerHTML = items.map(item => `
            <div class="menu-item" data-category="${item.category}" data-id="${item.id}">
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p class="price">${item.price}</p>
                <p>${item.description}</p>
                <button class="add-to-cart-btn">Add to Cart</button>
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

    const initializeCart = menuData => {
        cartIcon = document.createElement('div');
        cartIcon.className = 'cart-icon';
        cartIcon.innerHTML = '🛒 <span class="cart-count">0</span>';
        document.body.appendChild(cartIcon);

        cartModal = document.createElement('div');
        cartModal.className = 'cart-modal hidden';
        cartModal.innerHTML = `
            <div class="cart-modal-content">
                <span class="close-cart">&times;</span>
                <h2>Your Cart</h2>
                <div class="cart-items"></div>
                <p>Total: <span class="cart-total">$0</span></p>
                <button class="checkout-btn btn">Checkout</button>
            </div>
        `;
        document.body.appendChild(cartModal);

        cartCount = document.querySelector('.cart-count');
        cartItemsContainer = document.querySelector('.cart-items');
        cartTotal = document.querySelector('.cart-total');

        if (!menuItemsContainer) {
            return;
        }

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

        const closeCartButton = cartModal.querySelector('.close-cart');
        const checkoutButton = cartModal.querySelector('.checkout-btn');

        cartIcon.addEventListener('click', () => {
            cartModal.classList.toggle('hidden');
        });

        if (closeCartButton) {
            closeCartButton.addEventListener('click', () => {
                cartModal.classList.add('hidden');
            });
        }

        if (checkoutButton) {
            checkoutButton.addEventListener('click', () => {
                alert('This is a fake checkout. No payment will be processed.');
                cart.length = 0;
                updateCart();
                cartModal.classList.add('hidden');
            });
        }

        document.addEventListener('click', e => {
            if (!cartModal || !cartIcon) {
                return;
            }

            const clickedInsideCart = cartModal.contains(e.target);
            const clickedCartIcon = cartIcon.contains(e.target);

            if (!clickedInsideCart && !clickedCartIcon) {
                cartModal.classList.add('hidden');
            }
        });
    };

    if (menuItemsContainer && menuFilters) {
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
                initializeCart(menuData);

                menuFilters.addEventListener('click', e => {
                    if (e.target.tagName !== 'BUTTON') {
                        return;
                    }

                    const filter = e.target.dataset.filter;
                    const activeButton = menuFilters.querySelector('.active');
                    if (activeButton) {
                        activeButton.classList.remove('active');
                    }
                    e.target.classList.add('active');

                    if (filter === 'all') {
                        displayMenuItems(menuData);
                        return;
                    }

                    const filteredItems = menuData.filter(item => item.category === filter);
                    displayMenuItems(filteredItems);
                });
            })
            .catch(error => {
                console.error('Failed to load menu:', error);
                showMenuMessage('Menu is temporarily unavailable. Please try again later.', 'menu-error');
            });
    }

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

    const reservationForm = document.getElementById('reservation-form');
    const reservationSuccess = document.getElementById('reservation-success');

    if (reservationForm && reservationSuccess) {
        reservationForm.addEventListener('submit', e => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const date = document.getElementById('date').value;
            const guests = document.getElementById('guests').value;

            if (name && email && phone && date && guests) {
                const reservation = { name, email, phone, date, guests };
                const reservations = storage.get('reservations', []);
                reservations.push(reservation);

                if (!storage.set('reservations', reservations)) {
                    alert('Reservation could not be saved. Please try again.');
                    return;
                }

                reservationForm.reset();
                reservationSuccess.classList.remove('hidden');
                setTimeout(() => {
                    reservationSuccess.classList.add('hidden');
                }, 3000);
            } else {
                alert('Please fill in all fields.');
            }
        });
    }

    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', e => {
            e.preventDefault();

            const contactName = document.getElementById('contact-name').value;
            const contactEmail = document.getElementById('contact-email').value;
            const message = document.getElementById('message').value;

            if (contactName && contactEmail && message) {
                alert('Thank you for your message!');
                contactForm.reset();
            } else {
                alert('Please fill in all fields.');
            }
        });
    }

    const reviews = [
        { text: 'The food was absolutely amazing! I highly recommend the steak frites.', author: 'John Doe' },
        { text: 'A wonderful dining experience. The staff was friendly and the atmosphere was lovely.', author: 'Jane Smith' },
        { text: 'I had the best spaghetti carbonara of my life here. Will definitely be back!', author: 'Peter Jones' },
        { text: 'The desserts are to die for! You have to try the chocolate lava cake.', author: 'Emily White' },
        { text: 'Great cocktails and a cool vibe. The Old Fashioned was perfect.', author: 'Michael Brown' }
    ];

    const reviewsSlider = document.querySelector('.reviews-slider');
    let currentReview = 0;

    const displayReview = () => {
        if (!reviewsSlider || reviews.length === 0) {
            return;
        }

        reviewsSlider.innerHTML = `
            <div class="review active">
                <p>"${reviews[currentReview].text}"</p>
                <p class="author">- ${reviews[currentReview].author}</p>
            </div>
        `;
    };

    if (reviewsSlider) {
        displayReview();

        setInterval(() => {
            currentReview = (currentReview + 1) % reviews.length;
            displayReview();
        }, 5000);
    }

    const scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.innerHTML = '&uarr;';
    scrollToTopBtn.id = 'scroll-to-top';
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

    const themeSwitcher = document.createElement('div');
    themeSwitcher.className = 'theme-switcher';
    themeSwitcher.innerHTML = '🌙';
    document.body.appendChild(themeSwitcher);

    themeSwitcher.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            themeSwitcher.innerHTML = '☀️';
        } else {
            themeSwitcher.innerHTML = '🌙';
        }
    });
});
