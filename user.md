# Customer Functional Steps for The Golden Spoon Platform

## Overview

This document explains the full functional steps a customer can perform on The Golden Spoon restaurant platform. It is written based on the current website features implemented in this project.

## Customer Goal

A customer uses this platform to:

- discover the restaurant
- browse the menu
- search and filter dishes
- preview food details
- add items to cart
- manage the cart
- place an order
- reserve a table
- contact the restaurant
- view reviews and location details

## Preconditions

Before the customer starts:

- the website is available in a browser
- menu data loads successfully from `menu.json`
- the customer has internet access if the site is hosted online

## Full Customer Flow

### 1. Open the Platform

1. The customer opens the restaurant website.
2. The home page loads with the hero section, navigation menu, menu section, reservation section, contact section, reviews, and cart button.
3. The customer sees key information such as restaurant branding, dining message, open hours, rating, and location highlight.

### 2. Navigate Through the Website

1. The customer uses the top navigation menu to move to:
   - Home
   - Menu
   - About
   - Offers
   - Reservations
   - Contact
2. On mobile devices, the customer opens the hamburger menu and selects a section.
3. The page scrolls smoothly to the selected section.
4. The customer can also use shortcut buttons like:
   - `Book a Table`
   - `View Menu`
   - `Reservation`
5. The customer can use the scroll-to-top button to quickly go back to the top of the page.

### 3. Change the Theme

1. The customer clicks the theme toggle button.
2. The platform switches between light mode and dark mode.
3. The selected theme is saved in local storage so it remains available on the next visit.

### 4. Explore the Menu

1. The customer goes to the `Signature Menu` section.
2. The platform initially loads menu items from `menu.json`.
3. While the data is loading, the customer sees loading placeholders.
4. After loading, the customer sees menu cards with:
   - image
   - dish name
   - price
   - short description
   - `Preview` button
   - `Add to Cart` button

### 5. Search for Dishes

1. The customer types a keyword in the `Search menu` field.
2. The platform filters the menu items using the entered text.
3. Search matches can come from:
   - dish name
   - description
   - category
4. If no items match, the platform shows an empty-state message.

### 6. Filter Menu by Category

1. The customer selects a category tab such as:
   - All
   - Breakfast
   - Lunch
   - Dinner
   - Drinks
2. The platform displays only items from the chosen category.
3. The active filter is highlighted.
4. Keyboard users can also switch filters with arrow keys, Home, and End.

### 7. Preview a Menu Item

1. The customer clicks the `Preview` button on a dish.
2. A preview modal opens.
3. The customer sees:
   - larger item image
   - item name
   - item description
   - item price
   - quantity control
   - `Add` button
4. The customer increases or decreases quantity.
5. Quantity stays within the allowed range of 1 to 20.
6. The customer closes the modal if they do not want to continue.

### 8. Add Item to Cart

1. The customer adds an item by either:
   - clicking `Add to Cart` on the menu card
   - clicking `Add` inside the preview modal
2. The platform adds the item to the cart.
3. If the item already exists in the cart, the platform increases its quantity instead of creating a duplicate line.
4. The cart badge updates to show the total item count.
5. A toast message confirms that the item was added successfully.
6. The cart data is saved in local storage.

### 9. Open and Review the Cart

1. The customer clicks the floating cart button.
2. The cart modal opens.
3. The customer sees:
   - all selected items
   - item title
   - unit price
   - quantity controls
   - remove button
   - subtotal
   - service charge at 10%
   - total amount
4. If the cart is empty, the platform shows an empty-cart message.

### 10. Update Cart Items

1. The customer increases quantity using the `+` button.
2. The customer decreases quantity using the `-` button.
3. If quantity goes to zero through decrease logic, the item is removed.
4. The customer can also click `Remove` to delete the item directly.
5. Every change updates:
   - cart contents
   - subtotal
   - service charge
   - total
6. Updated cart data is saved automatically.

### 11. Checkout and Place an Order

1. The customer clicks the `Checkout` button inside the cart.
2. If the cart is empty, the platform shows an error toast.
3. If the cart contains items:
   - the checkout button changes to `Processing...`
   - the platform simulates order processing
4. After processing:
   - the cart is cleared
   - the cart display resets
   - the cart modal closes
   - the customer sees `Order placed successfully`
5. The customer has now completed a food order flow on the platform.

### 12. Reserve a Table

1. The customer opens the `Reservations` section.
2. The customer reads reservation-related benefits such as priority seating and host support.
3. The customer fills in the reservation form:
   - name
   - email
   - phone
   - date and time
   - number of guests
4. The platform validates each field.
5. Validation rules include:
   - required fields must not be empty
   - name must have at least 2 characters
   - email must be in valid format
   - phone number must be valid
   - reservation date must be in the future
   - guests must be between 1 and 20
6. If any field is invalid, inline error messages appear and the reservation is not submitted.
7. If all fields are valid:
   - the reservation is saved in local storage
   - the form resets
   - the customer sees `Reservation submitted successfully`

### 13. Send a Contact Message

1. The customer opens the `Contact` section.
2. The customer can view the restaurant address and phone number.
3. The customer fills in the contact form:
   - name
   - email
   - message
4. The platform validates the form.
5. Validation rules include:
   - name is required and must have at least 2 characters
   - email must be valid
   - message is required and must have at least 10 characters
6. If the form is invalid, error messages are shown.
7. If the form is valid:
   - the form resets
   - the customer sees `Message sent. We will get back to you soon.`

### 14. View Reviews

1. The customer scrolls to the `Guest Stories` section.
2. The platform displays guest reviews in a moving review slider.
3. The customer reads testimonials from past guests.
4. When the customer hovers over or focuses on the review area, the motion pauses for easier reading.

### 15. View Restaurant Location

1. The customer goes to the contact area.
2. The customer sees the restaurant address.
3. The customer views the embedded Google Map for the restaurant location in Dire Dawa, Ethiopia.
4. This helps the customer plan a visit or reservation arrival.

## Functional System Responses Seen by the Customer

During customer use, the platform provides feedback through:

- smooth scrolling between sections
- loading skeletons while menu data is being fetched
- inline validation messages in forms
- toast success messages
- toast error messages
- updated cart badge count
- recalculated order totals
- empty-state messages when no items are found or cart is empty

## Data Stored for Customer Actions

The platform stores some customer-related actions in browser local storage:

- cart items
- theme preference
- submitted reservations

## Complete End-to-End Customer Scenario

1. Customer opens the website.
2. Customer views the home section and restaurant highlights.
3. Customer navigates to the menu.
4. Customer searches or filters dishes.
5. Customer previews a dish.
6. Customer adds one or more items to the cart.
7. Customer opens the cart and adjusts quantities.
8. Customer checks out and places the order.
9. Customer optionally books a table for another visit.
10. Customer optionally sends a contact message for questions or events.
11. Customer checks location and reviews before visiting the restaurant.

## Summary

The customer journey on this platform supports three main actions:

- ordering food through the menu and cart flow
- reserving a table through the reservation form
- contacting the restaurant through the contact form

This makes the platform useful for both online ordering and in-person dining engagement.
