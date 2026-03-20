document.addEventListener('DOMContentLoaded', () => {

    const loader = document.querySelector('.loader');
    window.addEventListener('load', () => {
        loader.style.display = 'none';
    });

    // Mobile Navigation
    const hamburger = document.querySelector('.hamburger');
    const navUl = document.querySelector('nav ul');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navUl.classList.toggle('active');
    });

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Menu Data


    fetch('menu.json')
        .then(response => response.json())
        .then(menuData => {
            const menuItemsContainer = document.querySelector('.menu-items');
            const menuFilters = document.querySelector('.menu-filters');

            const displayMenuItems = (items) => {
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

            displayMenuItems(menuData);

            menuFilters.addEventListener('click', e => {
                if (e.target.tagName === 'BUTTON') {
                    const filter = e.target.dataset.filter;
                    document.querySelector('.menu-filters .active').classList.remove('active');
                    e.target.classList.add('active');

                    if (filter === 'all') {
                        displayMenuItems(menuData);
                    } else {
                        const filteredItems = menuData.filter(item => item.category === filter);
                        displayMenuItems(filteredItems);
                    }
                }
            });

            const cart = [];
            const cartIcon = document.createElement('div');
            cartIcon.className = 'cart-icon';
            cartIcon.innerHTML = `🛒 <span class="cart-count">0</span>`;
            document.body.appendChild(cartIcon);

            const cartModal = document.createElement('div');
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

            const cartCount = document.querySelector('.cart-count');
            const cartItemsContainer = document.querySelector('.cart-items');
            const cartTotal = document.querySelector('.cart-total');

            menuItemsContainer.addEventListener('click', e => {
                if (e.target.classList.contains('add-to-cart-btn')) {
                    const menuItem = e.target.closest('.menu-item');
                    const id = parseInt(menuItem.dataset.id);
                    const item = menuData.find(item => item.id === id);

                    const existingItem = cart.find(cartItem => cartItem.id === id);
                    if (existingItem) {
                        existingItem.quantity++;
                    } else {
                        cart.push({ ...item, quantity: 1 });
                    }

                    updateCart();
                }
            });

            const updateCart = () => {
                cartCount.textContent = cart.reduce((acc, item) => acc + item.quantity, 0);

                if (cart.length === 0) {
                    cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
                    cartTotal.textContent = '$0';
                    return;
                }

                cartItemsContainer.innerHTML = cart.map(item => `
                    <div class="cart-item">
                        <span>${item.name} (x${item.quantity})</span>
                        <span>${(parseFloat(item.price.slice(1)) * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('');

                const total = cart.reduce((acc, item) => acc + parseFloat(item.price.slice(1)) * item.quantity, 0);
                cartTotal.textContent = `$${total.toFixed(2)}`;
            };

            cartIcon.addEventListener('click', () => {
                cartModal.classList.toggle('hidden');
            });

            document.querySelector('.close-cart').addEventListener('click', () => {
                cartModal.classList.add('hidden');
            });

            document.querySelector('.checkout-btn').addEventListener('click', () => {
                alert('This is a fake checkout. No payment will be processed.');
                cart.length = 0;
                updateCart();
                cartModal.classList.add('hidden');
            });
        });

    // Reservation Form
    const reservationForm = document.getElementById('reservation-form');
    const reservationSuccess = document.getElementById('reservation-success');

    reservationForm.addEventListener('submit', e => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const date = document.getElementById('date').value;
        const guests = document.getElementById('guests').value;

        if (name && email && phone && date && guests) {
            const reservation = { name, email, phone, date, guests };
            let reservations = localStorage.getItem('reservations') ? JSON.parse(localStorage.getItem('reservations')) : [];
            reservations.push(reservation);
            localStorage.setItem('reservations', JSON.stringify(reservations));

            reservationForm.reset();
            reservationSuccess.classList.remove('hidden');
            setTimeout(() => {
                reservationSuccess.classList.add('hidden');
            }, 3000);
        } else {
            alert('Please fill in all fields.');
        }
    });

    // Contact Form
    const contactForm = document.getElementById('contact-form');

    contactForm.addEventListener('submit', e => {
        e.preventDefault();

        const contactName = document.getElementById('contact-name').value;
        const contactEmail = document.getElementById('contact-email').value;
        const message = document.getElementById('message').value;

        if (contactName && contactEmail && message) {
            // Here you would typically send the form data to a server
            alert('Thank you for your message!');
            contactForm.reset();
        } else {
            alert('Please fill in all fields.');
        }
    });

    // Reviews Slider
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
        if (reviews.length > 0) {
            reviewsSlider.innerHTML = `
                <div class="review active">
                    <p>"${reviews[currentReview].text}"</p>
                    <p class="author">- ${reviews[currentReview].author}</p>
                </div>
            `;
        }
    };

    displayReview();

    setInterval(() => {
        currentReview = (currentReview + 1) % reviews.length;
        displayReview();
    }, 5000);

    // Scroll to Top Button
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

    // Theme Switcher
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
