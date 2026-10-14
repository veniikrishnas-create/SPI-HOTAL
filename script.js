
"use strict";

// UPI payment details
const UPI_ID = "paytm.s18nhhi@pty";
const PAYEE_NAME = "SPI Hotel";
const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

// Default menu items
const defaultMenuItems = [
    {
        id: 1,
        name: "இட்லி",
        price: 10,
        image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400"
    },
    {
        id: 2,
        name: "பூரி",
        price: 30,
        image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400"
    },
    {
        id: 3,
        name: "ஆப்பம்",
        price: 25,
        image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400"
    },
    {
        id: 4,
        name: "வடை",
        price: 10,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400"
    },
    {
        id: 5,
        name: "தோசை",
        price: 40,
        image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400"
    },
    {
        id: 6,
        name: "முட்டை தோசை",
        price: 60,
        image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400"
    }
];

class RestaurantApp {
    constructor() {
        this.menu = this.loadJSON("restaurantMenu", defaultMenuItems);
        this.cart = this.loadJSON("restaurantCart", []);

        // Restore the default menu if saved menu is missing or empty
        if (!Array.isArray(this.menu) || this.menu.length === 0) {
            this.menu = [...defaultMenuItems];
            this.saveJSON("restaurantMenu", this.menu);
        }

        if (!Array.isArray(this.cart)) {
            this.cart = [];
        }
    }

    loadJSON(key, fallback) {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch (error) {
            console.error("Unable to load:", key, error);
            return fallback;
        }
    }

    saveJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    init() {
        this.setupNavigation();
        this.setupEvents();
        this.renderMenu();
        this.renderCart();
        this.renderManageMenu();

        const upiElement = document.getElementById("qr-upi-id");
        if (upiElement) {
            upiElement.textContent = UPI_ID;
        }
    }

    setupNavigation() {
        document.querySelectorAll("[data-section]").forEach(button => {
            button.addEventListener("click", () => {
                const sectionId = button.dataset.section;

                document.querySelectorAll("main section").forEach(section => {
                    section.classList.add("hidden");
                });

                const target = document.getElementById(sectionId);
                if (target) {
                    target.classList.remove("hidden");
                }
            });
        });
    }

    setupEvents() {
        const menuGrid = document.getElementById("menu-grid");

        if (menuGrid) {
            menuGrid.addEventListener("click", event => {
                const button = event.target.closest("[data-add-to-cart]");
                if (!button) return;

                const id = Number(button.dataset.addToCart);
                this.addToCart(id);
            });
        }

        const checkoutButton = document.getElementById("checkout-btn");
        if (checkoutButton) {
            checkoutButton.addEventListener("click", () => {
                this.openPaymentQR();
            });
        }

        const closeQR = document.getElementById("close-qr");
        if (closeQR) {
            closeQR.addEventListener("click", () => {
                this.closePaymentQR();
            });
        }

        const searchInput = document.getElementById("menu-search");
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                this.renderMenu(searchInput.value);
            });
        }

        const addMenuForm = document.getElementById("add-menu-form");
        if (addMenuForm) {
            addMenuForm.addEventListener("submit", event => {
                event.preventDefault();

                const nameInput = document.getElementById("new-item-name");
                const priceInput = document.getElementById("new-item-price");
                const imageInput = document.getElementById("new-item-image");

                if (!nameInput || !priceInput) return;

                const name = nameInput.value.trim();
                const price = Number(priceInput.value);
                const image = imageInput && imageInput.value.trim()
                    ? imageInput.value.trim()
                    : "";

                if (!name || !Number.isFinite(price) || price <= 0) {
                    alert("சரியான உணவு பெயர் மற்றும் விலையை உள்ளிடவும்.");
                    return;
                }

                const newItem = {
                    id: Date.now(),
                    name,
                    price,
                    image
                };

                this.menu.push(newItem);
                this.saveJSON("restaurantMenu", this.menu);

                addMenuForm.reset();
                this.renderMenu();
                this.renderManageMenu();

                alert("உணவு வெற்றிகரமாக சேர்க்கப்பட்டது!");
            });
        }

        const manageMenu = document.getElementById("manage-menu-list");
        if (manageMenu) {
            manageMenu.addEventListener("click", event => {
                const button = event.target.closest("[data-delete-item]");
                if (!button) return;

                const id = Number(button.dataset.deleteItem);

                if (!confirm("இந்த உணவை நீக்க வேண்டுமா?")) return;

                this.menu = this.menu.filter(item => Number(item.id) !== id);
                this.saveJSON("restaurantMenu", this.menu);

                this.renderMenu();
                this.renderManageMenu();
            });
        }

        const clearCartButton = document.getElementById("clear-cart");
        if (clearCartButton) {
            clearCartButton.addEventListener("click", () => {
                this.cart = [];
                this.saveJSON("restaurantCart", this.cart);
                this.renderCart();
            });
        }
    }

    renderMenu(searchText = "") {
        const menuGrid = document.getElementById("menu-grid");
        if (!menuGrid) {
            console.error('HTML-ல் id="menu-grid" கிடைக்கவில்லை.');
            return;
        }

        const search = searchText.trim().toLowerCase();

        const filteredItems = this.menu.filter(item =>
            item &&
            String(item.name || "").toLowerCase().includes(search)
        );

        if (filteredItems.length === 0) {
            menuGrid.innerHTML = `
                <p class="empty-message">
                    உணவுகள் எதுவும் கிடைக்கவில்லை.
                </p>`;
            return;
        }

        menuGrid.innerHTML = filteredItems.map(item => {
            const image = item.image || "";

            return `
                <article class="menu-card">
                    <img
                        src="${this.escapeHTML(image)}"
                        alt="${this.escapeHTML(item.name)}"
                        onerror="this.style.display='none'"
                    >

                    <div class="menu-card-content">
                        <h3>${this.escapeHTML(item.name)}</h3>
                        <p class="menu-price">₹${Number(item.price) || 0}</p>

                        <button
                            type="button"
                            data-add-to-cart="${Number(item.id)}"
                        >
                            Add to Cart
                        </button>
                    </div>
                </article>
            `;
        }).join("");
    }

    addToCart(id) {
        const item = this.menu.find(menuItem => Number(menuItem.id) === id);

        if (!item) return;

        const existing = this.cart.find(cartItem => Number(cartItem.id) === id);

        if (existing) {
            existing.quantity += 1;
        } else {
            this.cart.push({
                id: item.id,
                name: item.name,
                price: Number(item.price) || 0,
                quantity: 1
            });
        }

        this.saveJSON("restaurantCart", this.cart);
        this.renderCart();
    }

    renderCart() {
        const cartContainer = document.getElementById("cart-items");
        const totalElement = document.getElementById("cart-total");

        if (!cartContainer) return;

        if (this.cart.length === 0) {
            cartContainer.innerHTML = "<p>கூடையில் உணவுகள் இல்லை.</p>";
        } else {
            cartContainer.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <span>
                        ${this.escapeHTML(item.name)}
                        × ${Number(item.quantity) || 1}
                    </span>
                    <span>
                        ₹${(Number(item.price) || 0) * (Number(item.quantity) || 1)}
                    </span>
                </div>
            `).join("");
        }

        const total = this.cart.reduce((sum, item) => {
            return sum +
                (Number(item.price) || 0) *
                (Number(item.quantity) || 1);
        }, 0);

        if (totalElement) {
            totalElement.textContent = `₹${total}`;
        }
    }

    renderManageMenu() {
        const container = document.getElementById("manage-menu-list");
        if (!container) return;

        container.innerHTML = this.menu.map(item => `
            <div class="manage-menu-item">
                <span>
                    ${this.escapeHTML(item.name)}
                    - ₹${Number(item.price) || 0}
                </span>

                <button
                    type="button"
                    data-delete-item="${Number(item.id)}"
                >
                    Delete
                </button>
            </div>
        `).join("");
    }

    openPaymentQR() {
        if (this.cart.length === 0) {
            alert("முதலில் உணவுகளை கூடையில் சேர்க்கவும்.");
            return;
        }

        const total = this.cart.reduce((sum, item) => {
            return sum +
                (Number(item.price) || 0) *
                (Number(item.quantity) || 1);
        }, 0);

        const paymentURL =
            `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
            `&pn=${encodeURIComponent(PAYEE_NAME)}` +
            `&am=${total.toFixed(2)}&cu=INR`;

        const qrImage = document.getElementById("qr-image");
        const qrAmount = document.getElementById("qr-amount");
        const qrModal = document.getElementById("qr-modal");

        if (!qrImage || !qrModal) {
            alert("QR payment section HTML-ல் கிடைக்கவில்லை.");
            return;
        }

        qrImage.src =
            `${QR_API}?size=250x250&data=${encodeURIComponent(paymentURL)}`;

        if (qrAmount) {
            qrAmount.textContent = `₹${total.toFixed(2)}`;
        }

        qrModal.classList.remove("hidden");
    }

    closePaymentQR() {
        const qrModal = document.getElementById("qr-modal");
        if (qrModal) {
            qrModal.classList.add("hidden");
        }
    }

    escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const app = new RestaurantApp();
    app.init();
});
