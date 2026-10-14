"use strict";

// UPI ID unnudaiya correct ID-ah irukkanum.
const UPI_ID = "paytm.s18nhhi@pty";
const PAYEE_NAME = "SPI Hotel";
const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

const defaultMenuItems = [
  {id:1,name:"இட்லி",price:10,image:"https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=700&h=450&fit=crop"},
  {id:2,name:"பூரி",price:15,image:"https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=700&h=450&fit=crop"},
  {id:3,name:"ஆப்பம்",price:20,image:"https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=700&h=450&fit=crop"},
  {id:4,name:"வடை",price:10,image:"https://images.unsplash.com/photo-1601050690597-df0568f70950?w=700&h=450&fit=crop"},
  {id:5,name:"தோசை",price:30,image:"https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=700&h=450&fit=crop"},
  {id:6,name:"முட்டை",price:12,image:"https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=700&h=450&fit=crop"}
];

class RestaurantApp {
  constructor() {
    this.menu = this.loadJSON("restaurantMenu", defaultMenuItems);
    this.cart = this.loadJSON("restaurantCart", []);
    this.orders = this.loadJSON("restaurantOrders", []);
    this.nextItemId =
      Math.max(0, ...this.menu.map(item => Number(item.id) || 0)) + 1;
    this.toastTimer = null;
    this.lastReport = [];
    this.init();
  }

  loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn("Could not read saved data:", key, error);
      return fallback;
    }
  }

  saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("Could not save data:", key, error);
    }
  }

  init() {
    this.setupNavigation();
    this.setupEvents();
    this.renderMenu();
    this.renderCart();
    this.renderManageMenu();
    this.setCurrentMonth();

    document.getElementById("qr-upi-id").textContent = UPI_ID;
  }

  setupNavigation() {
    document.querySelectorAll(".nav-btn").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".nav-btn")
          .forEach(btn => btn.classList.remove("active"));

        document.querySelectorAll(".section")
          .forEach(section => section.classList.remove("active"));

        button.classList.add("active");

        document
          .getElementById(`${button.dataset.section}-section`)
          .classList.add("active");
      });
    });
  }

  setupEvents() {
    document.getElementById("menu-form").addEventListener("submit", e => {
      e.preventDefault();
      this.saveMenuItem();
    });

    document.getElementById("reset-form-btn")
      .addEventListener("click", () => this.resetForm());

    document.getElementById("menu-pay-now-btn")
      .addEventListener("click", () => this.payNow());

    document.getElementById("menu-print-bill-btn")
      .addEventListener("click", () => this.printBill());

    document.getElementById("menu-clear-cart-btn")
      .addEventListener("click", () => this.clearCart());

    document.getElementById("generate-report-btn")
      .addEventListener("click", () => this.generateReport());

    document.getElementById("export-pdf-btn")
      .addEventListener("click", () => this.exportReportToPDF());

    document.getElementById("close-qr-modal")
      .addEventListener("click", () => this.closePaymentModal());

    document.getElementById("close-payment-btn")
      .addEventListener("click", () => this.closePaymentModal());

    document.getElementById("qr-modal").addEventListener("click", e => {
      if (e.target.id === "qr-modal") {
        this.closePaymentModal();
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.closePaymentModal();
      }
    });
  }

  // Render food menu cards.
  renderMenu() {
    const grid = document.getElementById("menu-grid");
    grid.replaceChildren();

    this.menu.forEach(item => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "menu-item";

      card.setAttribute(
        "aria-label",
        `${item.name}, ₹${Number(item.price).toFixed(2)}. கூடையில் சேர்க்க`
      );

      const image = document.createElement("img");
      image.className = "menu-item-image";
      image.src = item.image || "https://placehold.co/700x450?text=Food";
      image.alt = item.name;
      image.loading = "lazy";

      image.onerror = () => {
        image.onerror = null;
        image.src = "https://placehold.co/700x450?text=Food";
      };

      const info = document.createElement("div");
      info.className = "menu-item-info";

      const name = document.createElement("div");
      name.className = "menu-item-name";
      name.textContent = item.name;

      const price = document.createElement("div");
      price.className = "menu-item-price";
      price.textContent = `₹${Number(item.price).toFixed(2)}`;

      info.append(name, price);
      card.append(image, info);

      card.addEventListener("click", () => this.addToCart(item));
      grid.appendChild(card);
    });
  }

  // Add one item to the cart.
  addToCart(item) {
    const existing = this.cart.find(
      x => Number(x.id) === Number(item.id)
    );

    if (existing) {
      existing.quantity = Number(existing.quantity) + 1;
    } else {
      this.cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        quantity: 1
      });
    }

    this.refreshCart();
    this.showToast(`${item.name} கூடையில் சேர்க்கப்பட்டது`);
  }

  // Remove one entire item from the cart.
  removeFromCart(id) {
    this.cart = this.cart.filter(
      item => Number(item.id) !== Number(id)
    );

    this.refreshCart();
    this.showToast("பொருள் நீக்கப்பட்டது");
  }

  // Plus and minus buttons.
  updateQuantity(id, delta) {
    const item = this.cart.find(
      x => Number(x.id) === Number(id)
    );

    if (!item) return;

    const next = Number(item.quantity) + delta;

    if (next < 1) {
      this.removeFromCart(id);
      return;
    }

    if (next > 999) {
      this.showToast("அதிகபட்ச அளவு 999");
      return;
    }

    item.quantity = next;
    this.refreshCart();
  }

  // Allow typing a quantity directly, such as 10 or 25.
  setQuantity(id, value) {
    const quantity = Number(value);

    const item = this.cart.find(
      x => Number(x.id) === Number(id)
    );

    if (!item) return;

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 999
    ) {
      this.showToast("அளவு 1 முதல் 999 வரை இருக்க வேண்டும்");
      this.renderCart();
      return;
    }

    item.quantity = quantity;
    this.refreshCart();
  }

  clearCart() {
    if (!this.cart.length) {
      this.showToast("கூடை ஏற்கனவே காலியாக உள்ளது");
      return;
    }

    if (confirm("கூடையில் உள்ள எல்லா பொருட்களையும் நீக்கவா?")) {
      this.cart = [];
      this.refreshCart();
      this.showToast("கூடை காலி செய்யப்பட்டது");
    }
  }

  refreshCart() {
    this.saveJSON("restaurantCart", this.cart);
    this.renderCart();
  }

  calculateTotal() {
    const subtotal = this.cart.reduce(
      (sum, item) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    return {
      subtotal,
      total: subtotal
    };
  }

  // Render cart, editable quantities and the total.
  renderCart() {
    const container = document.getElementById("menu-cart-items");
    container.replaceChildren();

    if (!this.cart.length) {
      const empty = document.createElement("p");
      empty.className = "empty-cart-text";
      empty.textContent = "கூடையில் பொருட்கள் இல்லை";
      container.appendChild(empty);
    } else {
      this.cart.forEach(item => {
        const row = document.createElement("div");
        row.className = "menu-bill-item";

        const name = document.createElement("span");
        name.className = "menu-bill-item-name";
        name.textContent = item.name;

        const controls = document.createElement("div");
        controls.className = "menu-bill-controls";

        const minus = document.createElement("button");
        minus.type = "button";
        minus.className = "qty-btn";
        minus.textContent = "−";
        minus.setAttribute("aria-label", `${item.name} அளவைக் குறை`);
        minus.addEventListener("click", () =>
          this.updateQuantity(item.id, -1)
        );

        const input = document.createElement("input");
        input.type = "number";
        input.className = "qty-input";
        input.min = "1";
        input.max = "999";
        input.step = "1";
        input.value = item.quantity;
        input.setAttribute("aria-label", `${item.name} அளவு`);

        input.addEventListener("change", () =>
          this.setQuantity(item.id, input.value)
        );

        input.addEventListener("keydown", e => {
          if (e.key === "Enter") {
            e.preventDefault();
            input.blur();
          }
        });

        const plus = document.createElement("button");
        plus.type = "button";
        plus.className = "qty-btn";
        plus.textContent = "+";
        plus.setAttribute("aria-label", `${item.name} அளவைக் கூட்டு`);
        plus.addEventListener("click", () =>
          this.updateQuantity(item.id, 1)
        );

        controls.append(minus, input, plus);

        const subtotal = document.createElement("span");
        subtotal.className = "menu-bill-item-subtotal";
        subtotal.textContent =
          `₹${Number(item.price).toFixed(2)} × ${item.quantity} = ` +
          `₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}`;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "× பொருளை நீக்கு";
        remove.addEventListener("click", () =>
          this.removeFromCart(item.id)
        );

        row.append(name, controls, subtotal, remove);
        container.appendChild(row);
      });
    }

    const total = this.calculateTotal();

    document.getElementById("menu-subtotal").textContent =
      `₹${total.subtotal.toFixed(2)}`;

    document.getElementById("menu-total").textContent =
      `₹${total.total.toFixed(2)}`;

    const count = this.cart.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );

    const badge = document.getElementById("cart-badge");
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  // Generate the QR for the current bill amount.
  payNow() {
    if (!this.cart.length) {
      this.showToast("முதலில் உணவுப் பொருட்களை கூடையில் சேர்க்கவும்");
      return;
    }

    if (!UPI_ID || !UPI_ID.includes("@")) {
      this.showToast("script.js-ல் சரியான UPI ID அமைக்கவும்");
      return;
    }

    const bill = this.calculateTotal();
    const orderId = `SPI-${Date.now()}`;

    const upiLink =
      `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
      `&pn=${encodeURIComponent(PAYEE_NAME)}` +
      `&am=${bill.total.toFixed(2)}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent("SPI Hotel Order " + orderId)}`;

    const modal = document.getElementById("qr-modal");
    const image = document.getElementById("qr-code-image");
    const loading = document.getElementById("qr-loading");
    const error = document.getElementById("qr-error");

    // Reset the previous QR state before loading a new one.
    image.hidden = true;
    image.removeAttribute("src");

    error.hidden = true;
    loading.hidden = false;
    loading.textContent = "QR குறியீடு உருவாக்கப்படுகிறது…";

    image.onload = () => {
      loading.hidden = true;
      error.hidden = true;
      image.hidden = false;
    };

    image.onerror = () => {
      loading.hidden = true;
      image.hidden = true;
      error.hidden = false;
    };

    // The QR encodes the UPI payment link and the bill amount.
    const qrUrl = new URL(QR_API);
    qrUrl.searchParams.set("size", "300x300");
    qrUrl.searchParams.set("margin", "10");
    qrUrl.searchParams.set("format", "png");
    qrUrl.searchParams.set("data", upiLink);

    image.src = qrUrl.toString();

    document.getElementById("qr-amount").textContent =
      bill.total.toFixed(2);

    document.getElementById("qr-upi-id").textContent = UPI_ID;

    document.getElementById("qr-order-info").textContent =
      `Order: ${orderId} • ${new Date().toLocaleString()}`;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
  }

  closePaymentModal() {
    const modal = document.getElementById("qr-modal");

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    // Keep cart items until payment has actually been verified.
  }

  printBill() {
    if (!this.cart.length) {
      this.showToast("பில் அச்சிட கூடையில் பொருட்கள் இல்லை");
      return;
    }

    const bill = this.calculateTotal();
    const popup = window.open("", "_blank", "width=700,height=800");

    if (!popup) {
      this.showToast("Print window block செய்யப்பட்டுள்ளது. Pop-ups அனுமதிக்கவும்.");
      return;
    }

    const rows = this.cart.map(item =>
      `<tr>
        <td>${this.escapeHTML(item.name)}</td>
        <td>${item.quantity}</td>
        <td>₹${Number(item.price).toFixed(2)}</td>
        <td>₹${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
      </tr>`
    ).join("");

    popup.document.write(`
      <!DOCTYPE html>
      <html lang="ta">
      <head>
        <meta charset="UTF-8">
        <title>SPI Hotel Bill</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; }
          h1 { text-align: center; color: #667eea; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
          .total { text-align: right; font-size: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>SPI ஹோட்டல் பில்</h1>
        <p>தேதி: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr><th>பொருள்</th><th>அளவு</th><th>விலை</th><th>தொகை</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="total">மொத்தம்: ₹${bill.total.toFixed(2)}</p>
        <p>நன்றி! மீண்டும் வருக.</p>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `);

    popup.document.close();
  }

  saveMenuItem() {
    const idValue = document.getElementById("item-id").value;
    const name = document.getElementById("item-name").value.trim();
    const price = Number(document.getElementById("item-price").value);

    const image =
      document.getElementById("item-image").value.trim() ||
      "https://placehold.co/700x450?text=Food";

    if (!name || !Number.isFinite(price) || price <= 0) {
      this.showToast("சரியான பெயர் மற்றும் விலையை உள்ளிடவும்");
      return;
    }

    if (idValue) {
      const id = Number(idValue);

      const item = this.menu.find(x => Number(x.id) === id);

      if (item) {
        Object.assign(item, {name, price, image});
      }

      const cartItem = this.cart.find(x => Number(x.id) === id);

      if (cartItem) {
        Object.assign(cartItem, {name, price});
      }
    } else {
      this.menu.push({
        id: this.nextItemId++,
        name,
        price,
        image
      });
    }

    this.saveJSON("restaurantMenu", this.menu);
    this.refreshCart();
    this.renderMenu();
    this.renderManageMenu();
    this.resetForm();

    this.showToast("மெனு சேமிக்கப்பட்டது");
  }

  editMenuItem(id) {
    const item = this.menu.find(
      x => Number(x.id) === Number(id)
    );

    if (!item) return;

    document.getElementById("item-id").value = item.id;
    document.getElementById("item-name").value = item.name;
    document.getElementById("item-price").value = item.price;
    document.getElementById("item-image").value = item.image || "";

    document.getElementById("menu-form").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  deleteMenuItem(id) {
    if (!confirm("இந்த மெனு பொருளை நீக்கவா?")) return;

    this.menu = this.menu.filter(
      x => Number(x.id) !== Number(id)
    );

    this.cart = this.cart.filter(
      x => Number(x.id) !== Number(id)
    );

    this.saveJSON("restaurantMenu", this.menu);
    this.refreshCart();
    this.renderMenu();
    this.renderManageMenu();

    this.showToast("மெனு பொருள் நீக்கப்பட்டது");
  }

  resetForm() {
    document.getElementById("menu-form").reset();
    document.getElementById("item-id").value = "";
  }

  renderManageMenu() {
    const list = document.getElementById("menu-items-list");
    list.replaceChildren();

    if (!this.menu.length) {
      list.textContent = "மெனு பொருட்கள் இல்லை.";
      return;
    }

    this.menu.forEach(item => {
      const row = document.createElement("div");
      row.className = "manage-item";

      const info = document.createElement("div");

      const name = document.createElement("div");
      name.className = "manage-item-name";
      name.textContent = item.name;

      const price = document.createElement("div");
      price.className = "manage-item-price";
      price.textContent = `₹${Number(item.price).toFixed(2)}`;

      info.append(name, price);

      const actions = document.createElement("div");
      actions.className = "manage-item-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn-edit";
      edit.textContent = "திருத்து";
      edit.addEventListener("click", () =>
        this.editMenuItem(item.id)
      );

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-delete";
      del.textContent = "நீக்கு";
      del.addEventListener("click", () =>
        this.deleteMenuItem(item.id)
      );

      actions.append(edit, del);
      row.append(info, actions);
      list.appendChild(row);
    });
  }

  setCurrentMonth() {
    const now = new Date();

    document.getElementById("report-month").value =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  generateReport() {
    const month = document.getElementById("report-month").value;

    if (!month) {
      this.showToast("மாதத்தைத் தேர்வு செய்யவும்");
      return;
    }

    // Only orders independently marked PAID are included.
    const paidOrders = this.orders.filter(order =>
      order.date &&
      order.date.slice(0, 7) === month &&
      order.status === "PAID"
    );

    const content = document.getElementById("report-content");

    if (!paidOrders.length) {
      content.textContent =
        "இந்த மாதத்தில் verified paid orders இல்லை. QR காட்டப்பட்ட orders தானாக paid என்று கருதப்படாது.";

      document.getElementById("export-pdf-btn").hidden = true;
      this.lastReport = [];
      return;
    }

    const total = paidOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const table = document.createElement("table");
    table.className = "report-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Order ID</th>
          <th>தேதி</th>
          <th>பொருட்கள்</th>
          <th>தொகை</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");

    paidOrders.forEach(order => {
      const tr = document.createElement("tr");

      const values = [
        order.id,
        new Date(order.date).toLocaleString(),
        order.items.map(item => `${item.name} × ${item.quantity}`).join(", "),
        `₹${Number(order.total).toFixed(2)}`
      ];

      values.forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    content.replaceChildren();

    const summary = document.createElement("p");
    summary.textContent =
      `மொத்த விற்பனை: ₹${total.toFixed(2)} | ஆர்டர்கள்: ${paidOrders.length}`;

    content.append(summary, table);

    this.lastReport = paidOrders;
    document.getElementById("export-pdf-btn").hidden = false;
  }

  exportReportToPDF() {
    if (!this.lastReport.length) {
      this.showToast("முதலில் report உருவாக்கவும்");
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      this.showToast("PDF library load ஆகவில்லை. Internet connection சரிபார்க்கவும்.");
      return;
    }

    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF();

    pdf.setFont("helvetica", "bold");
    pdf.text("SPI Hotel - Monthly Sales Report", 14, 18);

    pdf.setFont("helvetica", "normal");

    let y = 30;

    this.lastReport.forEach((order, index) => {
      const line =
        `${index + 1}. ${order.id} | ` +
        `${new Date(order.date).toLocaleDateString()} | ` +
        `Rs. ${Number(order.total).toFixed(2)}`;

      if (y > 275) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(line, 14, y);
      y += 9;
    });

    pdf.save("spi-hotel-monthly-report.pdf");
  }

  escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(this.toastTimer);

    this.toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new RestaurantApp();
});
