// Default menu items with images (using open source images)
const defaultMenuItems = [
    { id: 1, name: 'idly', price: 30, image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop&auto=format' },
    { id: 2, name: 'dosa', price: 50, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop&auto=format' },
    { id: 3, name: 'pure', price: 40, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop&auto=format' },
    { id: 4, name: 'apam', price: 45, image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=300&fit=crop&auto=format' },
    { id: 5, name: 'uludhavada', price: 35, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop&auto=format' },
    { id: 6, name: 'parupuvada', price: 40, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop&auto=format' },
    { id: 7, name: 'Egg', price: 60, image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop&auto=format' }
];

// Initialize application
class RestaurantApp {
    constructor() {
        this.menu = this.loadMenu();
        this.cart = this.loadCart();
        this.orders = this.loadOrders();
        this.nextItemId = this.getNextId();
        this.init();
    }

    init() {
        this.setupNavigation();
        this.renderMenu();
        this.renderCart();
        this.setupEventListeners();
        this.setCurrentMonth();
        this.updateCartBadge();
        this.updateMenuBilling();
    }

    // LocalStorage Methods
    loadMenu() {
        const stored = localStorage.getItem('restaurantMenu');
        if (stored) {
            return JSON.parse(stored);
        }
        // Initialize with default items
        this.saveMenu(defaultMenuItems);
        return defaultMenuItems;
    }

    saveMenu(menu) {
        localStorage.setItem('restaurantMenu', JSON.stringify(menu));
    }

    loadCart() {
        const stored = localStorage.getItem('restaurantCart');
        return stored ? JSON.parse(stored) : [];
    }

    saveCart() {
        localStorage.setItem('restaurantCart', JSON.stringify(this.cart));
    }

    loadOrders() {
        const stored = localStorage.getItem('restaurantOrders');
        return stored ? JSON.parse(stored) : [];
    }

    saveOrders() {
        localStorage.setItem('restaurantOrders', JSON.stringify(this.orders));
    }

    getNextId() {
        const stored = localStorage.getItem('restaurantNextId');
        return stored ? parseInt(stored) : defaultMenuItems.length + 1;
    }

    saveNextId(id) {
        localStorage.setItem('restaurantNextId', id.toString());
    }

    // Navigation
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.showSection(section);
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    showSection(sectionName) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => section.classList.remove('active'));
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        if (sectionName === 'reports') {
            this.setCurrentMonth();
        }
    }

    // Menu Rendering
    renderMenu() {
        const menuGrid = document.getElementById('menu-grid');
        menuGrid.innerHTML = '';

        if (this.menu.length === 0) {
            menuGrid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #999;">No menu items available. Add items in Manage Menu section.</p>';
            return;
        }

        this.menu.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="menu-item-image" onerror="this.src='https://via.placeholder.com/400x300?text=${item.name}'">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-price">₹${item.price.toFixed(2)}</div>
                </div>
            `;
            menuItem.addEventListener('click', () => this.addToCart(item));
            menuGrid.appendChild(menuItem);
        });
    }

    // Helper function to format item names
    formatItemName(name) {
        if (name === 'Egg' || name === 'egg') {
            return 'Egg';
        }
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }

    // Cart Operations
    addToCart(item) {
        const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: 1
            });
        }
        
        this.saveCart();
        this.renderCart();
        this.updateMenuBilling();
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.saveCart();
        this.renderCart();
    }

    updateQuantity(itemId, change) {
        const item = this.cart.find(cartItem => cartItem.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeFromCart(itemId);
                return;
            }
            this.saveCart();
            this.renderCart();
        }
    }

    clearCart() {
        if (this.cart.length === 0) return;
        
        if (confirm('Are you sure you want to clear the cart?')) {
            this.cart = [];
            this.saveCart();
            this.renderCart();
        }
    }

    renderCart() {
        const cartItems = document.getElementById('cart-items');
        const subtotalEl = document.getElementById('subtotal');
        const totalEl = document.getElementById('total');

        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
            if (subtotalEl) subtotalEl.textContent = '₹0.00';
            if (totalEl) totalEl.textContent = '₹0.00';
            this.updateMenuBilling();
            this.updateCartBadge();
            return;
        }

        cartItems.innerHTML = '';
        let subtotal = 0;

        this.cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${this.formatItemName(item.name)}</div>
                    <div class="cart-item-price">₹${item.price.toFixed(2)} × ${item.quantity} = ₹${itemTotal.toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, -1)">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="app.updateQuantity(${item.id}, 1)">+</button>
                    </div>
                    <button class="remove-item" onclick="app.removeFromCart(${item.id})">Remove</button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });

        const total = subtotal;

        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
        this.updateMenuBilling();
        this.updateCartBadge();
    }

    updateMenuBilling() {
        const menuSubtotalEl = document.getElementById('menu-subtotal');
        const menuTotalEl = document.getElementById('menu-total');
        const menuCartItemsEl = document.getElementById('menu-cart-items');
        
        if (menuSubtotalEl && menuTotalEl) {
            const bill = this.calculateTotal();
            menuSubtotalEl.textContent = `₹${bill.subtotal.toFixed(2)}`;
            menuTotalEl.textContent = `₹${bill.total.toFixed(2)}`;
        }

        // Update cart items list in menu bill
        if (menuCartItemsEl) {
            if (this.cart.length === 0) {
                menuCartItemsEl.innerHTML = '<p class="empty-cart-text">No items in cart</p>';
            } else {
                menuCartItemsEl.innerHTML = this.cart.map(item => `
                    <div class="menu-bill-item">
                        <span class="menu-bill-item-name">${this.formatItemName(item.name)}</span>
                        <span class="menu-bill-item-qty">× ${item.quantity}</span>
                        <span class="menu-bill-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('');
            }
        }
    }

    updateCartBadge() {
        const cartBadge = document.getElementById('cart-badge');
        if (cartBadge) {
            const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            if (totalItems > 0) {
                cartBadge.textContent = totalItems;
                cartBadge.style.display = 'inline-block';
            } else {
                cartBadge.style.display = 'none';
            }
        }
    }

    // Billing Operations
    calculateTotal() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return {
            subtotal: subtotal,
            total: subtotal
        };
    }

    payNow() {
        if (this.cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        const bill = this.calculateTotal();
        const orderId = Date.now();
        const orderDate = new Date();
        
        // Save order
        const order = {
            id: orderId,
            date: orderDate.toISOString(),
            items: JSON.parse(JSON.stringify(this.cart)),
            subtotal: bill.subtotal,
            total: bill.total
        };
        
        this.orders.push(order);
        this.saveOrders();

        // Show QR Code image
        const qrImage = document.getElementById('qr-code-image');
        if (qrImage) {
            qrImage.style.display = 'block';
        }

        document.getElementById('qr-amount').textContent = bill.total.toFixed(2);
        document.getElementById('qr-order-id-display').textContent = orderId;
        document.getElementById('qr-order-info').textContent = `Date: ${orderDate.toLocaleString()}`;
        
        const modal = document.getElementById('qr-modal');
        modal.classList.add('active');

        // Clear cart after payment
        setTimeout(() => {
            this.cart = [];
            this.saveCart();
            this.renderCart();
            this.updateMenuBilling();
        }, 100);
    }

    printBill() {
        if (this.cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        const bill = this.calculateTotal();
        const orderDate = new Date().toLocaleString();
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Bill - Restaurant</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        h1 { color: #667eea; text-align: center; }
                        .bill-header { text-align: center; margin-bottom: 30px; }
                        .bill-items { margin: 20px 0; }
                        .bill-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                        .bill-total { margin-top: 20px; padding-top: 20px; border-top: 2px solid #667eea; }
                        .bill-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 1.1em; }
                        .total-row { font-size: 1.5em; font-weight: bold; color: #667eea; }
                    </style>
                </head>
                <body>
                    <div class="bill-header">
                        <h1>Restaurant Bill</h1>
                        <p>Date: ${orderDate}</p>
                    </div>
                    <div class="bill-items">
                        ${this.cart.map(item => `
                            <div class="bill-item">
                                <span>${item.name} (${item.quantity}x)</span>
                                <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="bill-total">
                        <div class="bill-row">Subtotal: ₹${bill.subtotal.toFixed(2)}</div>
                        <div class="bill-row total-row">Total: ₹${bill.total.toFixed(2)}</div>
                    </div>
                    <div style="text-align: center; margin-top: 40px; color: #999;">
                        <p>Thank you for your visit!</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    // Menu Management
    setupEventListeners() {
        // Form submission
        document.getElementById('menu-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMenuItem();
        });

        // Reset form
        document.getElementById('reset-form-btn').addEventListener('click', () => {
            this.resetForm();
        });

        // Pay Now
        document.getElementById('pay-now-btn').addEventListener('click', () => {
            this.payNow();
        });

        // Print Bill
        document.getElementById('print-bill-btn').addEventListener('click', () => {
            this.printBill();
        });

        // Clear Cart
        document.getElementById('clear-cart-btn').addEventListener('click', () => {
            this.clearCart();
        });

        // Generate Report
        document.getElementById('generate-report-btn').addEventListener('click', () => {
            this.generateReport();
        });

        // Export PDF
        document.getElementById('export-pdf-btn').addEventListener('click', () => {
            this.exportReportToPDF();
        });

        // Menu page buttons
        const menuPayBtn = document.getElementById('menu-pay-now-btn');
        if (menuPayBtn) {
            menuPayBtn.addEventListener('click', () => {
                this.payNow();
            });
        }

        const menuPrintBtn = document.getElementById('menu-print-bill-btn');
        if (menuPrintBtn) {
            menuPrintBtn.addEventListener('click', () => {
                this.printBill();
            });
        }

        const menuClearBtn = document.getElementById('menu-clear-cart-btn');
        if (menuClearBtn) {
            menuClearBtn.addEventListener('click', () => {
                this.clearCart();
            });
        }

        // Modal close
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('qr-modal').classList.remove('active');
        });

        document.getElementById('qr-modal').addEventListener('click', (e) => {
            if (e.target.id === 'qr-modal') {
                document.getElementById('qr-modal').classList.remove('active');
            }
        });
    }

    saveMenuItem() {
        const id = document.getElementById('item-id').value;
        const name = document.getElementById('item-name').value.trim();
        const price = parseFloat(document.getElementById('item-price').value);
        const image = document.getElementById('item-image').value.trim() || 
                     `https://via.placeholder.com/400x300?text=${name}`;

        if (!name || price < 0) {
            alert('Please fill all fields correctly!');
            return;
        }

        if (id) {
            // Edit existing item
            const index = this.menu.findIndex(item => item.id === parseInt(id));
            if (index !== -1) {
                this.menu[index] = { id: parseInt(id), name, price, image };
            }
        } else {
            // Add new item
            const newItem = {
                id: this.nextItemId++,
                name,
                price,
                image
            };
            this.menu.push(newItem);
            this.saveNextId(this.nextItemId);
        }

        this.saveMenu(this.menu);
        this.renderMenu();
        this.renderManageMenu();
        this.resetForm();
    }

    editMenuItem(itemId) {
        const item = this.menu.find(m => m.id === itemId);
        if (item) {
            document.getElementById('item-id').value = item.id;
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-price').value = item.price;
            document.getElementById('item-image').value = item.image;
            
            // Scroll to form
            document.getElementById('menu-form').scrollIntoView({ behavior: 'smooth' });
        }
    }

    deleteMenuItem(itemId) {
        if (confirm('Are you sure you want to delete this menu item?')) {
            this.menu = this.menu.filter(item => item.id !== itemId);
            this.saveMenu(this.menu);
            this.renderMenu();
            this.renderManageMenu();
        }
    }

    resetForm() {
        document.getElementById('menu-form').reset();
        document.getElementById('item-id').value = '';
    }

    renderManageMenu() {
        const menuList = document.getElementById('menu-items-list');
        menuList.innerHTML = '';

        if (this.menu.length === 0) {
            menuList.innerHTML = '<p style="text-align: center; color: #999;">No menu items. Add your first item above.</p>';
            return;
        }

        this.menu.forEach(item => {
            const manageItem = document.createElement('div');
            manageItem.className = 'manage-item';
            manageItem.innerHTML = `
                <div class="manage-item-info">
                    <div class="manage-item-name">${item.name}</div>
                    <div class="manage-item-price">₹${item.price.toFixed(2)}</div>
                </div>
                <div class="manage-item-actions">
                    <button class="btn-edit" onclick="app.editMenuItem(${item.id})">Edit</button>
                    <button class="btn-delete" onclick="app.deleteMenuItem(${item.id})">Delete</button>
                </div>
            `;
            menuList.appendChild(manageItem);
        });
    }

    // Reports
    setCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('report-month').value = `${year}-${month}`;
    }

    generateReport() {
        const monthInput = document.getElementById('report-month').value;
        if (!monthInput) {
            alert('Please select a month!');
            return;
        }

        const [year, month] = monthInput.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const monthOrders = this.orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= startDate && orderDate <= endDate;
        });

        this.displayReport(monthOrders, monthInput);
    }

    displayReport(orders, monthInput) {
        const reportContent = document.getElementById('report-content');
        const pdfBtn = document.getElementById('export-pdf-btn');
        
        if (orders.length === 0) {
            reportContent.innerHTML = `<p style="text-align: center; color: #999; padding: 40px;">No orders found for ${monthInput}</p>`;
            if (pdfBtn) pdfBtn.style.display = 'none';
            return;
        }

        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const totalItems = orders.reduce((sum, order) => 
            sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        const averageOrder = totalRevenue / totalOrders;

        // Item sales breakdown
        const itemSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!itemSales[item.name]) {
                    itemSales[item.name] = { quantity: 0, revenue: 0 };
                }
                itemSales[item.name].quantity += item.quantity;
                itemSales[item.name].revenue += item.price * item.quantity;
            });
        });

        const itemSalesArray = Object.entries(itemSales)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue);

        // Store report data for PDF export
        this.currentReportData = {
            monthInput,
            totalOrders,
            totalRevenue,
            totalItems,
            averageOrder,
            itemSalesArray
        };

        reportContent.innerHTML = `
            <div class="report-stats">
                <div class="stat-card">
                    <div class="stat-value">${totalOrders}</div>
                    <div class="stat-label">Total Orders</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₹${totalRevenue.toFixed(2)}</div>
                    <div class="stat-label">Total Revenue</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalItems}</div>
                    <div class="stat-label">Items Sold</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">₹${averageOrder.toFixed(2)}</div>
                    <div class="stat-label">Average Order</div>
                </div>
            </div>
            <h3 style="margin: 30px 0 15px 0; color: #667eea;">Item Sales Breakdown</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Quantity Sold</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemSalesArray.map(item => `
                        <tr>
                            <td style="text-transform: capitalize;">${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>₹${item.revenue.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        if (pdfBtn) pdfBtn.style.display = 'inline-block';
    }

    exportReportToPDF() {
        if (!this.currentReportData) {
            alert('Please generate a report first!');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const data = this.currentReportData;
        const monthName = new Date(data.monthInput + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });

        // Title
        doc.setFontSize(18);
        doc.setTextColor(102, 126, 234);
        doc.text('Monthly Sales Report', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Month: ${monthName}`, 105, 30, { align: 'center' });
        
        let yPos = 45;

        // Statistics
        doc.setFontSize(14);
        doc.text('Summary Statistics', 14, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.text(`Total Orders: ${data.totalOrders}`, 20, yPos);
        yPos += 7;
        doc.text(`Total Revenue: ₹${data.totalRevenue.toFixed(2)}`, 20, yPos);
        yPos += 7;
        doc.text(`Items Sold: ${data.totalItems}`, 20, yPos);
        yPos += 7;
        doc.text(`Average Order: ₹${data.averageOrder.toFixed(2)}`, 20, yPos);
        yPos += 15;

        // Item Sales Table
        doc.setFontSize(14);
        doc.text('Item Sales Breakdown', 14, yPos);
        yPos += 10;

        // Table headers
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Item Name', 20, yPos);
        doc.text('Quantity', 100, yPos);
        doc.text('Revenue', 150, yPos);
        yPos += 7;
        
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos - 3, 196, yPos - 3);

        // Table rows
        doc.setFont(undefined, 'normal');
        data.itemSalesArray.forEach(item => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(item.name.charAt(0).toUpperCase() + item.name.slice(1), 20, yPos);
            doc.text(item.quantity.toString(), 100, yPos);
            doc.text(`₹${item.revenue.toFixed(2)}`, 150, yPos);
            yPos += 7;
        });

        // Footer
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
            doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 290, { align: 'center' });
        }

        // Save PDF
        doc.save(`Sales_Report_${data.monthInput}.pdf`);
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new RestaurantApp();
    app.renderManageMenu();
});

