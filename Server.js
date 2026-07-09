const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// ==========================================
// 1. BACKEND DATABASE & REST API
// ==========================================

let medicines = [
  { id: 1, name: "Paracetamol 500mg", category: "Pain Relief", price: 5.99, stock: 100 },
  { id: 2, name: "Amoxicillin 250mg", category: "Antibiotic", price: 12.50, stock: 50 },
  { id: 3, name: "Vitamin C 1000mg", category: "Supplements", price: 8.99, stock: 75 },
  { id: 4, name: "Cough Syrup 100ml", category: "Cold & Flu", price: 6.49, stock: 30 }
];

// GET: Fetch catalog
app.get('/api/medicines', (req, res) => {
  res.json(medicines);
});

// POST: Process Order with Customer Details, Contact, and UPI Payment Info
app.post('/api/orders', (req, res) => {
  const { cart, customer, payment } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  if (!customer || !customer.fullName || !customer.phone || !customer.address || !customer.city || !customer.zip) {
    return res.status(400).json({ success: false, message: "Please complete all address and contact fields." });
  }

  let orderedItems = [];
  let totalAmount = 0;

  cart.forEach(item => {
    const med = medicines.find(m => m.id === item.id);
    if (med && med.stock >= item.quantity) {
      med.stock -= item.quantity;
      const itemTotal = med.price * item.quantity;
      totalAmount += itemTotal;

      orderedItems.push({
        id: med.id,
        name: med.name,
        price: med.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }
  });

  const receiptData = {
    orderId: 'MED-' + Math.floor(100000 + Math.random() * 900000),
    date: new Date().toLocaleString(),
    customer: customer,
    paymentMethod: payment.method,
    upiId: payment.upiId || 'N/A',
    items: orderedItems,
    subtotal: totalAmount,
    tax: totalAmount * 0.05, // 5% tax
    grandTotal: totalAmount * 1.05
  };

  res.json({
    success: true,
    message: "Order placed successfully!",
    receipt: receiptData
  });
});

// ==========================================
// 2. FRONTEND (STOREFRONT + CHECKOUT + OUTPUT RECEIPT)
// ==========================================

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MediCare Online Pharmacy</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        body { margin: 0; padding: 0; background-color: #f4f7f6; }
        
        header {
          background-color: #00796b;
          color: white;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .container { max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }
        
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 20px;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card h3 { margin: 0 0 10px 0; color: #004d40; }
        .card p { margin: 5px 0; color: #555; }
        .price { font-size: 1.2rem; font-weight: bold; color: #2e7d32; margin: 10px 0; }

        button {
          background-color: #00796b;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        button:hover { background-color: #004d40; }
        
        .checkout-btn { background-color: #e65100; padding: 8px 16px; }
        .checkout-btn:hover { background-color: #bf360c; }

        /* Checkout Modal / Form Styling */
        #checkout-section {
          display: none;
          background: white;
          padding: 25px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          margin-top: 20px;
        }

        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .form-row { display: flex; gap: 15px; }
        .form-row .form-group { flex: 1; }

        .upi-box {
          background: #e0f2f1;
          border: 1px solid #00796b;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
        }

        /* Output Receipt Page Styles */
        #output-page {
          display: none;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .receipt-header {
          text-align: center;
          border-bottom: 2px dashed #ccc;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .receipt-header h2 { color: #2e7d32; margin: 0; }

        .receipt-details {
          display: flex;
          justify-content: space-between;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }

        .receipt-table th, .receipt-table td {
          border-bottom: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }

        .receipt-summary {
          text-align: right;
          margin-top: 20px;
        }

        .actions {
          margin-top: 30px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        @media print {
          header, .actions { display: none; }
          #output-page { box-shadow: none; border: none; }
        }
      </style>
    </head>
    <body>

      <header>
        <h1>MediCare Store</h1>
        <div id="cart-nav">
          <span>Cart: <strong id="cart-count">0</strong> items</span>
          <button class="checkout-btn" onclick="openCheckout()">Proceed to Checkout</button>
        </div>
      </header>

      <div class="container">
        <div id="shop-page">
          <h2>Available Medicines</h2>
          <div id="medicine-grid" class="grid">
            <p>Loading catalog...</p>
          </div>
        </div>

        <div id="checkout-section">
          <h2>Checkout Details</h2>
          <form id="order-form" onsubmit="handleOrderSubmit(event)">
            <h3>1. Delivery & Contact Details</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="cust-name" required placeholder="John Doe">
              </div>
              <div class="form-group">
                <label>Contact Number</label>
                <input type="tel" id="cust-phone" required value="7569929446" placeholder="7569929446">
              </div>
            </div>

            <div class="form-group">
              <label>Street Address</label>
              <input type="text" id="cust-address" required placeholder="123 Main St, Apt 4B">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>City</label>
                <input type="text" id="cust-city" required placeholder="New York">
              </div>
              <div class="form-group">
                <label>ZIP / Postal Code</label>
                <input type="text" id="cust-zip" required placeholder="10001">
              </div>
            </div>

            <h3>2. Payment Method</h3>
            <div class="form-group">
              <label>Select Payment Option</label>
              <select id="pay-method" onchange="togglePaymentFields()">
                <option value="UPI / Net Banking">UPI / Net Banking</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Cash on Delivery">Cash on Delivery</option>
              </select>
            </div>

            <div id="upi-fields" class="upi-box">
              <p style="margin: 0 0 5px 0;"><strong>Store UPI ID:</strong> <span style="color: #00796b; font-size: 1.1rem; font-weight: bold;">ram74166@ptyes</span></p>
              <small style="color: #555;">Please make the payment using your UPI App (GPay/PhonePe/Paytm) to the ID above.</small>
            </div>

            <div id="card-fields" style="display:none;">
              <div class="form-group">
                <label>Card Number</label>
                <input type="text" id="card-num" placeholder="1234 5678 9101 1121" maxlength="16">
              </div>
            </div>

            <div class="actions">
              <button type="button" onclick="cancelCheckout()" style="background:#757575;">Cancel</button>
              <button type="submit" class="checkout-btn">Place Order</button>
            </div>
          </form>
        </div>

        <div id="output-page">
          <div class="receipt-header">
            <h2>✔ Order Confirmed</h2>
            <p>Thank you for shopping with MediCare Online Pharmacy!</p>
            <p><strong>Order ID:</strong> <span id="out-order-id"></span> | <strong>Date:</strong> <span id="out-date"></span></p>
          </div>

          <div class="receipt-details">
            <div>
              <h4>Shipping & Customer Info</h4>
              <p id="out-cust-name" style="margin: 0; font-weight: bold;"></p>
              <p id="out-cust-phone" style="margin: 0; color: #00796b; font-weight: bold;"></p>
              <p id="out-cust-address" style="margin: 0;"></p>
              <p id="out-cust-cityzip" style="margin: 0;"></p>
            </div>
            <div>
              <h4>Payment Info</h4>
              <p>Method: <strong id="out-pay-method"></strong></p>
              <p id="out-upi-row" style="display:none;">UPI ID: <strong style="color:#00796b;" id="out-upi-id"></strong></p>
              <p>Status: <strong style="color: green;">Confirmed</strong></p>
            </div>
          </div>

          <h3>Itemized Summary</h3>
          <table class="receipt-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody id="out-items"></tbody>
          </table>

          <div class="receipt-summary">
            <p>Subtotal: <strong>$<span id="out-subtotal"></span></strong></p>
            <p>Tax (5%): <strong>$<span id="out-tax"></span></strong></p>
            <h3>Grand Total: $<span id="out-grandtotal"></span></h3>
          </div>

          <div class="actions">
            <button onclick="window.print()">Print Receipt</button>
            <button onclick="resetStore()">Back to Store</button>
          </div>
        </div>
      </div>

      <script>
        let cart = [];

        async function fetchMedicines() {
          try {
            const res = await fetch('/api/medicines');
            const data = await res.json();
            renderMedicines(data);
          } catch (err) {
            console.error('Error loading medicines:', err);
          }
        }

        function renderMedicines(medicines) {
          const container = document.getElementById('medicine-grid');
          container.innerHTML = medicines.map(med => \`
            <div class="card">
              <div>
                <h3>\${med.name}</h3>
                <p><strong>Category:</strong> \${med.category}</p>
                <p class="price">$\${med.price.toFixed(2)}</p>
                <p><strong>Stock:</strong> \${med.stock}</p>
              </div>
              <button onclick="addToCart(\${med.id})" \${med.stock <= 0 ? 'disabled' : ''}>
                \${med.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          \`).join('');
        }

        function addToCart(id) {
          const existingItem = cart.find(item => item.id === id);
          if (existingItem) {
            existingItem.quantity += 1;
          } else {
            cart.push({ id, quantity: 1 });
          }
          
          const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
          document.getElementById('cart-count').innerText = totalCount;
        }

        function openCheckout() {
          if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
          }
          document.getElementById('shop-page').style.display = 'none';
          document.getElementById('checkout-section').style.display = 'block';
        }

        function cancelCheckout() {
          document.getElementById('checkout-section').style.display = 'none';
          document.getElementById('shop-page').style.display = 'block';
        }

        function togglePaymentFields() {
          const method = document.getElementById('pay-method').value;
          document.getElementById('upi-fields').style.display = method === 'UPI / Net Banking' ? 'block' : 'none';
          document.getElementById('card-fields').style.display = method === 'Credit / Debit Card' ? 'block' : 'none';
        }

        async function handleOrderSubmit(event) {
          event.preventDefault();

          const selectedMethod = document.getElementById('pay-method').value;

          const customerData = {
            fullName: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            address: document.getElementById('cust-address').value,
            city: document.getElementById('cust-city').value,
            zip: document.getElementById('cust-zip').value
          };

          const paymentData = {
            method: selectedMethod,
            upiId: selectedMethod === 'UPI / Net Banking' ? 'ram74166@ptyes' : ''
          };

          try {
            const res = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cart: cart,
                customer: customerData,
                payment: paymentData
              })
            });

            const result = await res.json();

            if (result.success) {
              displayOutputPage(result.receipt);
            } else {
              alert(result.message || 'Failed to place order.');
            }
          } catch (err) {
            console.error('Checkout error:', err);
          }
        }

        function displayOutputPage(receipt) {
          document.getElementById('checkout-section').style.display = 'none';
          document.getElementById('cart-nav').style.display = 'none';
          document.getElementById('output-page').style.display = 'block';

          // Receipt Metadata
          document.getElementById('out-order-id').innerText = receipt.orderId;
          document.getElementById('out-date').innerText = receipt.date;

          // Customer Contact & Address
          document.getElementById('out-cust-name').innerText = receipt.customer.fullName;
          document.getElementById('out-cust-phone').innerText = 'Phone: ' + receipt.customer.phone;
          document.getElementById('out-cust-address').innerText = receipt.customer.address;
          document.getElementById('out-cust-cityzip').innerText = \`\${receipt.customer.city}, \${receipt.customer.zip}\`;

          // Payment Details
          document.getElementById('out-pay-method').innerText = receipt.paymentMethod;
          if (receipt.paymentMethod === 'UPI / Net Banking') {
            document.getElementById('out-upi-row').style.display = 'block';
            document.getElementById('out-upi-id').innerText = receipt.upiId;
          } else {
            document.getElementById('out-upi-row').style.display = 'none';
          }

          // Items Table
          const itemsTable = document.getElementById('out-items');
          itemsTable.innerHTML = receipt.items.map(item => \`
            <tr>
              <td>\${item.name}</td>
              <td>\${item.quantity}</td>
              <td>$\${item.price.toFixed(2)}</td>
              <td>$\${item.total.toFixed(2)}</td>
            </tr>
          \`).join('');

          // Totals
          document.getElementById('out-subtotal').innerText = receipt.subtotal.toFixed(2);
          document.getElementById('out-tax').innerText = receipt.tax.toFixed(2);
          document.getElementById('out-grandtotal').innerText = receipt.grandTotal.toFixed(2);
        }

        function resetStore() {
          cart = [];
          document.getElementById('cart-count').innerText = '0';
          document.getElementById('order-form').reset();
          document.getElementById('cust-phone').value = '7569929446'; // Reset back to default
          document.getElementById('output-page').style.display = 'none';
          document.getElementById('shop-page').style.display = 'block';
          document.getElementById('cart-nav').style.display = 'block';
          fetchMedicines(); // Refresh stock
        }

        fetchMedicines();
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running at: http://localhost:${PORT}`);
});
