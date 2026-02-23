import express from 'express';
import Order from '../models/Order.js';
import DraftOrder from '../models/DraftOrder.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * Parse pasted order text.
 * Lines: "• name (NBF: code) – ₹price x qty = ₹lineTotal"
 * Last: "Total: ₹total"
 */
function parseOrderText(text) {
  if (!text || typeof text !== 'string') return { items: [], total: 0, totalValid: false };

  const lines = text.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  let totalFromMessage = null;

  // With NBF, optional [option: value]: • name (NBF: x) [size: 2.7] – ₹price x qty = ₹lineTotal
  const lineWithNbf = /^\s*[•\-]\s*(.+?)\s*\(NBF:\s*([^)]+)\)\s*(?:\[([^\]]*)\])?\s*[–\-]\s*₹\s*([\d.]+)\s*x\s*(\d+)\s*=\s*₹\s*([\d.]+)\s*$/i;
  // Without NBF, optional [options]: • name [size: 2.7] – ₹price x qty = ₹lineTotal
  const lineNoNbf = /^\s*[•\-]\s*(.+?)\s*(?:\[([^\]]*)\])?\s*[–\-]\s*₹\s*([\d.]+)\s*x\s*(\d+)\s*=\s*₹\s*([\d.]+)\s*$/i;
  // Single-product format (from product page): "Hi, I want to order this product: name (NBF: x) [size: 2.7] – ₹549.8"
  const singleProductWithNbf = /Hi,\s*I want to order this product:\s*(.+?)\s*\(NBF:\s*([^)]+)\)\s*(?:\[([^\]]*)\])?\s*[–\-]\s*₹\s*([\d.]+)\s*$/i;
  const singleProductNoNbf = /Hi,\s*I want to order this product:\s*(.+?)\s*(?:\[([^\]]*)\])?\s*[–\-]\s*₹\s*([\d.]+)\s*$/i;
  const totalLine = /Total:\s*₹\s*([\d.]+)/i;
  const totalLineLoose = /total:\s*₹?\s*([\d.]+)/i;

  function parseOptionsString(s) {
    if (!s || typeof s !== 'string') return {};
    const opts = {};
    s.split(',').forEach((part) => {
      const m = part.trim().match(/^([^:]+):\s*(.+)$/);
      if (m) opts[m[1].trim().toLowerCase()] = m[2].trim();
    });
    return opts;
  }

  // If the whole text is a single-product line (no newlines or just one line), try to parse it as such first
  const fullText = text.trim();
  const singleWithNbf = fullText.match(singleProductWithNbf);
  const singleNoNbf = fullText.match(singleProductNoNbf);
  if (singleWithNbf && lines.length <= 2) {
    const [, name, nbfCode, optionsRaw, price] = singleWithNbf;
    const p = parseFloat(price);
    const selectedOptions = parseOptionsString(optionsRaw || '');
    items.push({
      name: name.trim(),
      nbfCode: nbfCode.trim(),
      price: p,
      quantity: 1,
      lineTotal: p,
      selectedOptions,
    });
  } else if (singleNoNbf && lines.length <= 2 && !singleWithNbf) {
    const [, name, optionsRaw, price] = singleNoNbf;
    const p = parseFloat(price);
    const selectedOptions = parseOptionsString(optionsRaw || '');
    items.push({
      name: name.trim(),
      nbfCode: '',
      price: p,
      quantity: 1,
      lineTotal: p,
      selectedOptions,
    });
  }

  for (const line of lines) {
    const totalMatch = line.match(totalLine) || line.match(totalLineLoose);
    if (totalMatch) {
      totalFromMessage = parseFloat(totalMatch[1]);
      continue;
    }
    // Skip if we already parsed as single-product (avoid double-parse)
    if (items.length === 1 && (singleWithNbf || singleNoNbf) && (line.match(singleProductWithNbf) || line.match(singleProductNoNbf))) {
      continue;
    }
    let name, nbfCode, price, quantity, lineTotal, optionsRaw = '';
    const withNbf = line.match(lineWithNbf);
    if (withNbf) {
      [, name, nbfCode, optionsRaw, price, quantity, lineTotal] = withNbf;
      name = name.trim();
      nbfCode = nbfCode.trim();
      price = parseFloat(price);
      quantity = parseInt(quantity, 10);
      lineTotal = parseFloat(lineTotal);
    } else {
      const noNbf = line.match(lineNoNbf);
      if (noNbf) {
        [, name, optionsRaw, price, quantity, lineTotal] = noNbf;
        name = name.trim();
        nbfCode = '';
        price = parseFloat(price);
        quantity = parseInt(quantity, 10);
        lineTotal = parseFloat(lineTotal);
      } else continue;
    }
    const selectedOptions = parseOptionsString(optionsRaw);
    items.push({ name, nbfCode, price, quantity, lineTotal, selectedOptions });
  }

  const calculatedTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const total = totalFromMessage != null ? totalFromMessage : calculatedTotal;
  const totalValid =
    totalFromMessage != null
      ? Math.abs(calculatedTotal - totalFromMessage) < 0.02
      : items.length > 0;

  return { items, total, calculatedTotal, totalValid, totalFromMessage };
}

const PRICE_TOLERANCE = 0.02;

/**
 * Get expected unit price for a product given selected options (base + option value prices).
 */
function getExpectedUnitPrice(product, selectedOptions) {
  if (!product) return null;
  let unitPrice = Number(product.price) || 0;
  const opts = selectedOptions || {};
  (product.options || []).forEach((opt) => {
    const optName = (opt.name || '').toLowerCase().trim();
    const selectedVal = optName ? opts[optName] : null;
    if (selectedVal == null) return;
    const val = (opt.values || []).find((v) => {
      const vStr = typeof v === 'string' ? v : (v.value || '');
      return String(vStr).toLowerCase().trim() === String(selectedVal).toLowerCase().trim();
    });
    if (val && typeof val === 'object' && val.price != null) {
      unitPrice += Number(val.price) || 0;
    }
  });
  return unitPrice;
}

/**
 * Match parsed items to products. When message has NBF code, match ONLY by that NBF (no name fallback) to detect tampering.
 */
async function matchItemsToProducts(items) {
  const products = await Product.find({}).lean();
  const matched = items.map((item) => {
    let product = null;
    const hasNbfInMessage = item.nbfCode && String(item.nbfCode).trim() !== '';
    if (hasNbfInMessage) {
      product = products.find(
        (p) => p.nbfCode && String(p.nbfCode).toLowerCase() === String(item.nbfCode).toLowerCase()
      );
      // Do not fall back to name when NBF is in message: wrong NBF = tampering (e.g. NBF: 3 when no product has code 3)
    } else {
      product = products.find(
        (p) => String(p.name).toLowerCase().trim() === String(item.name).toLowerCase().trim()
      );
      if (!product) {
        product = products.find((p) =>
          String(p.name).toLowerCase().includes(String(item.name).toLowerCase())
        );
      }
    }
    const expectedUnitPrice = getExpectedUnitPrice(product, item.selectedOptions);
    const productPrice = product ? Number(product.price) : null;
    const expectedLineTotal = expectedUnitPrice != null ? expectedUnitPrice * item.quantity : null;
    const priceMatch =
      expectedUnitPrice != null && Math.abs(Number(item.price) - expectedUnitPrice) < PRICE_TOLERANCE;
    const lineTotalMatch =
      expectedLineTotal != null &&
      Math.abs(Number(item.lineTotal) - expectedLineTotal) < PRICE_TOLERANCE;
    const itemValid = priceMatch && lineTotalMatch;

    return {
      ...item,
      productId: product ? product._id : null,
      image: product && product.images && product.images[0] ? product.images[0] : '',
      productPrice: expectedUnitPrice ?? productPrice ?? null,
      priceMatch,
      lineTotalMatch,
      itemValid,
    };
  });
  return matched;
}

// Admin: parse pasted order and validate against product (NBF, price, total) for tamper detection
router.post('/parse', protect, async (req, res) => {
  try {
    const { text } = req.body || {};
    const parsed = parseOrderText(text);
    const items = await matchItemsToProducts(parsed.items);
    const allItemsValid = items.length > 0 && items.every((i) => i.itemValid);
    const messageTampered = !parsed.totalValid || !allItemsValid;
    res.json({
      items,
      total: parsed.total,
      calculatedTotal: parsed.calculatedTotal,
      totalValid: parsed.totalValid,
      totalFromMessage: parsed.totalFromMessage,
      messageTampered,
      allItemsValid,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate next order ID (e.g. NB-2025-0001)
async function getNextOrderId() {
  const year = new Date().getFullYear();
  const prefix = `NB-${year}-`;
  const last = await Order.findOne({ orderId: new RegExp(`^${prefix}`) })
    .sort({ orderId: -1 })
    .lean();
  let next = 1;
  if (last && last.orderId) {
    const num = parseInt(last.orderId.replace(prefix, ''), 10);
    if (!Number.isNaN(num)) next = num + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// Admin: create order (save details, generate orderId and bill)
router.post('/', protect, async (req, res) => {
  try {
    const { rawMessage, items, total, totalValid, packedItems, shippingCharge } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }
    const orderId = await getNextOrderId();
    const orderItems = items.map((item, idx) => ({
      productId: item.productId || undefined,
      name: item.name,
      nbfCode: item.nbfCode || '',
      price: Number(item.price),
      quantity: Number(item.quantity),
      lineTotal: Number(item.lineTotal),
      image: item.image || '',
      packed: Array.isArray(packedItems) ? packedItems.includes(idx) : true,
    }));
    const subtotal = Number(total);
    const shipCharge = Number(shippingCharge) || 0;
    const order = await Order.create({
      orderId,
      rawMessage: rawMessage || '',
      items: orderItems,
      total: subtotal,
      shippingCharge: shipCharge,
      totalValid: totalValid !== false,
      status: 'pending',
      paymentStatus: 'pending',
      packedAt: null,
    });
    const bill = formatBill(order);
    res.status(201).json({ order: order.toObject(), bill });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function formatBill(order) {
  const subtotal = Number(order.total) || 0;
  const shipping = Number(order.shippingCharge) || 0;
  const grandTotal = subtotal + shipping;
  const customerName = order.customerName || 'Customer';
  const customerPhone = order.customerPhone || '';
  const created = new Date(order.createdAt);
  const dateStr = created.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const paymentMode = (order.paymentStatus === 'paid' ? 'Paid' : 'Pending');
  const storeAddress = process.env.STORE_ADDRESS || 'Store Address, City, PIN';
  const storePhone = process.env.STORE_PHONE || 'Phone: +91-XXXXXXXXXX';
  const rows = (order.items || []).map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(i.name)}${i.nbfCode ? ` (${escapeHtml(i.nbfCode)})` : ''}</td>
      <td class="num">${i.quantity}</td>
      <td>₹ ${Number(i.price).toFixed(2)}</td>
      <td>₹ ${Number(i.lineTotal).toFixed(2)}</td>
    </tr>`).join('');
  const logoUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/logo.png` : '/logo.png';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Invoice - ${escapeHtml(order.orderId)}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family:'Segoe UI',Tahoma,Geneva,system-ui,sans-serif;font-size:14px;color:#1f2937;max-width:520px;margin:0 auto;padding:28px 24px;line-height:1.45;background:#fff;}
    .bill-header{display:flex;align-items:center;gap:16px;padding-bottom:20px;}
    .bill-logo{width:80px;height:80px;object-fit:contain;flex-shrink:0;border-radius:50%;}
    .bill-header-text{flex:1;}
    .store-name{font-size:18px;font-weight:700;color:#1f2937;letter-spacing:0.04em;text-transform:uppercase;}
    .store-tagline{font-size:11px;color:#9f1239;margin-top:4px;letter-spacing:0.02em;}
    .store-info{font-size:11px;color:#6b7280;margin-top:6px;line-height:1.5;}
    .bill-hr{border:0;height:0;border-top:2px solid #9f1239;margin:16px 0 20px;opacity:0.9;}
    .invoice-title{font-size:20px;font-weight:700;text-align:center;margin:0 0 20px;color:#1f2937;letter-spacing:0.06em;}
    .invoice-meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px;padding:14px 16px;background:#fafafa;border-radius:8px;border:1px solid #f3f4f6;font-size:13px;}
    .invoice-meta .left,.invoice-meta .right{display:flex;flex-direction:column;gap:6px;}
    .invoice-meta strong{color:#374151;}
    .customer-section{margin-bottom:20px;padding:14px 16px;background:#fafafa;border-radius:8px;border:1px solid #f3f4f6;}
    .customer-heading{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;color:#9f1239;}
    .customer-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:4px 0;}
    .customer-row .l{color:#6b7280;} .customer-row .r{font-weight:600;color:#1f2937;}
    .bill-table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;border:1px solid #000;}
    .bill-table th{text-align:left;padding:12px 10px;background:#9f1239;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.03em;border:1px solid #000;}
    .bill-table td{padding:10px;border:1px solid #000;}
    .bill-table tbody tr:nth-child(even){background:#fafafa;}
    .bill-table th:last-child,.bill-table td:last-child{text-align:right;}
    .bill-table .num{text-align:center;}
    .bill-totals{text-align:right;font-size:13px;margin-top:4px;max-width:240px;margin-left:auto;}
    .bill-totals .row{display:flex;justify-content:flex-end;gap:32px;padding:6px 0;}
    .bill-totals .label{color:#6b7280;min-width:100px;}
    .bill-totals .total-row{border-top:2px solid #9f1239;margin-top:8px;padding-top:12px;font-weight:700;font-size:16px;color:#9f1239;}
    .bill-footer{text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;}
    .bill-footer .line1{margin-bottom:4px;}
    .bill-footer .thanks{font-weight:600;color:#374151;margin-top:6px;}
    @media print{body{padding:16px;max-width:100%;} .bill-logo{max-height:80px;}}
  </style>
</head>
<body>
  <div class="bill-header">
    <img src="${escapeHtml(logoUrl)}" alt="New Balaji Bangles and Fancy" class="bill-logo"/>
    <div class="bill-header-text">
      <div class="store-name">New Balaji Bangles and Fancy</div>
      <div class="store-tagline">Cosmetics • Jewels • Accessories</div>
      <div class="store-info">${escapeHtml(storeAddress)}<br/>${escapeHtml(storePhone)}</div>
    </div>
  </div>
  <hr class="bill-hr"/>
  <h1 class="invoice-title">Invoice</h1>
  <div class="invoice-meta">
    <div class="left">
      <div><strong>Invoice No:</strong> ${escapeHtml(order.orderId)}</div>
      <div><strong>Time:</strong> ${timeStr}</div>
    </div>
    <div class="right">
      <div><strong>Date:</strong> ${dateStr}</div>
      <div><strong>Payment Mode:</strong> ${paymentMode}</div>
    </div>
  </div>
  <div class="customer-section">
    <div class="customer-heading">Customer Details</div>
    <div class="customer-row"><span class="l">Name</span><span class="r">${escapeHtml(customerName)}</span></div>
    <div class="customer-row"><span class="l">Phone</span><span class="r">${escapeHtml(customerPhone) || '—'}</span></div>
  </div>
  <table class="bill-table">
    <thead>
      <tr><th>S.No</th><th>Product Name</th><th class="num">Qty</th><th>Rate</th><th>Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="bill-totals">
    <div class="row"><span class="label">Subtotal</span><span>₹ ${subtotal.toFixed(2)}</span></div>
    ${shipping > 0 ? `<div class="row"><span class="label">Shipping</span><span>₹ ${shipping.toFixed(2)}</span></div>` : ''}
    <div class="row total-row"><span class="label">Total Amount</span><span>₹ ${grandTotal.toFixed(2)}</span></div>
  </div>
  <div class="bill-footer">
    <div class="line1">This is a computer generated invoice</div>
    <div class="thanks">Thank you for your business!</div>
  </div>
</body>
</html>`;
}
function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatOrderConfirmation(order) {
  const subtotal = Number(order.total) || 0;
  const shipping = Number(order.shippingCharge) || 0;
  const grandTotal = subtotal + shipping;
  const customerName = order.customerName || 'Customer';
  const customerPhone = order.customerPhone || '';
  const created = new Date(order.createdAt);
  const dateStr = created.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const paymentMode = (order.paymentStatus === 'paid' ? 'Paid' : 'Pending');
  const storeAddress = process.env.STORE_ADDRESS || 'Store Address, City, PIN';
  const storePhone = process.env.STORE_PHONE || 'Phone: +91-XXXXXXXXXX';
  const rows = (order.items || []).map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(i.name)}${i.nbfCode ? ` (${escapeHtml(i.nbfCode)})` : ''}</td>
      <td class="num">${i.quantity}</td>
      <td>₹ ${Number(i.price).toFixed(2)}</td>
      <td>₹ ${Number(i.lineTotal).toFixed(2)}</td>
    </tr>`).join('');
  const logoUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/logo.png` : '/logo.png';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Order Confirmation - ${escapeHtml(order.orderId)}</title>
  <style>
    *{box-sizing:border-box;}
    body{font-family:'Segoe UI',Tahoma,Geneva,system-ui,sans-serif;font-size:14px;color:#1f2937;max-width:520px;margin:0 auto;padding:28px 24px;line-height:1.45;background:#fff;}
    .bill-header{display:flex;align-items:center;gap:16px;padding-bottom:20px;}
    .bill-logo{width:80px;height:80px;object-fit:contain;flex-shrink:0;border-radius:50%;}
    .bill-header-text{flex:1;}
    .store-name{font-size:18px;font-weight:700;color:#1f2937;letter-spacing:0.04em;text-transform:uppercase;}
    .store-tagline{font-size:11px;color:#9f1239;margin-top:4px;letter-spacing:0.02em;}
    .store-info{font-size:11px;color:#6b7280;margin-top:6px;line-height:1.5;}
    .bill-hr{border:0;height:0;border-top:2px solid #9f1239;margin:16px 0 20px;opacity:0.9;}
    .invoice-title{font-size:20px;font-weight:700;text-align:center;margin:0 0 20px;color:#1f2937;letter-spacing:0.06em;}
    .invoice-meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:20px;padding:14px 16px;background:#fafafa;border-radius:8px;border:1px solid #f3f4f6;font-size:13px;}
    .invoice-meta .left,.invoice-meta .right{display:flex;flex-direction:column;gap:6px;}
    .invoice-meta strong{color:#374151;}
    .customer-section{margin-bottom:20px;padding:14px 16px;background:#fafafa;border-radius:8px;border:1px solid #f3f4f6;}
    .customer-heading{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;color:#9f1239;}
    .customer-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:4px 0;}
    .customer-row .l{color:#6b7280;} .customer-row .r{font-weight:600;color:#1f2937;}
    .bill-table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;border:1px solid #000;}
    .bill-table th{text-align:left;padding:12px 10px;background:#9f1239;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.03em;border:1px solid #000;}
    .bill-table td{padding:10px;border:1px solid #000;}
    .bill-table tbody tr:nth-child(even){background:#fafafa;}
    .bill-table th:last-child,.bill-table td:last-child{text-align:right;}
    .bill-table .num{text-align:center;}
    .bill-totals{text-align:right;font-size:13px;margin-top:4px;max-width:240px;margin-left:auto;}
    .bill-totals .row{display:flex;justify-content:flex-end;gap:32px;padding:6px 0;}
    .bill-totals .label{color:#6b7280;min-width:100px;}
    .bill-totals .total-row{border-top:2px solid #9f1239;margin-top:8px;padding-top:12px;font-weight:700;font-size:16px;color:#9f1239;}
    .bill-footer{text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;}
    .bill-footer .line1{margin-bottom:4px;}
    .bill-footer .thanks{font-weight:600;color:#374151;margin-top:6px;}
    @media print{body{padding:16px;max-width:100%;} .bill-logo{max-height:80px;}}
  </style>
</head>
<body>
  <div class="bill-header">
    <img src="${escapeHtml(logoUrl)}" alt="New Balaji Bangles and Fancy" class="bill-logo"/>
    <div class="bill-header-text">
      <div class="store-name">New Balaji Bangles and Fancy</div>
      <div class="store-tagline">Cosmetics • Jewels • Accessories</div>
      <div class="store-info">${escapeHtml(storeAddress)}<br/>${escapeHtml(storePhone)}</div>
    </div>
  </div>
  <hr class="bill-hr"/>
  <h1 class="invoice-title">Order Confirmation</h1>
  <div class="invoice-meta">
    <div class="left">
      <div><strong>Order No:</strong> ${escapeHtml(order.orderId)}</div>
      <div><strong>Time:</strong> ${timeStr}</div>
    </div>
    <div class="right">
      <div><strong>Date:</strong> ${dateStr}</div>
      <div><strong>Payment Mode:</strong> ${paymentMode}</div>
    </div>
  </div>
  <div class="customer-section">
    <div class="customer-heading">Customer Details</div>
    <div class="customer-row"><span class="l">Name</span><span class="r">${escapeHtml(customerName)}</span></div>
    <div class="customer-row"><span class="l">Phone</span><span class="r">${escapeHtml(customerPhone) || '—'}</span></div>
  </div>
  <table class="bill-table">
    <thead>
      <tr><th>S.No</th><th>Product Name</th><th class="num">Qty</th><th>Rate</th><th>Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="bill-totals">
    <div class="row"><span class="label">Subtotal</span><span>₹ ${subtotal.toFixed(2)}</span></div>
    ${shipping > 0 ? `<div class="row"><span class="label">Shipping</span><span>₹ ${shipping.toFixed(2)}</span></div>` : ''}
    <div class="row total-row"><span class="label">Total Amount</span><span>₹ ${grandTotal.toFixed(2)}</span></div>
  </div>
  <div class="bill-footer">
    <div class="line1">This is a computer generated order confirmation</div>
    <div class="thanks">Thank you for your order!</div>
  </div>
</body>
</html>`;
}

// Admin: list orders
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ----- Draft orders (packing in Orders tab; generate order ID in Processing tab) -----
// Admin: list drafts
router.get('/drafts', protect, async (req, res) => {
  try {
    const drafts = await DraftOrder.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(drafts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: create draft (from Processing after validate)
router.post('/drafts', protect, async (req, res) => {
  try {
    const { rawMessage, items, total, totalValid } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }
    const draftItems = items.map((item) => ({
      productId: item.productId || undefined,
      name: item.name,
      nbfCode: item.nbfCode || '',
      price: Number(item.price),
      quantity: Number(item.quantity),
      lineTotal: Number(item.lineTotal),
      image: item.image || '',
      packed: false,
    }));
    const draft = await DraftOrder.create({
      rawMessage: rawMessage || '',
      items: draftItems,
      total: Number(total),
      totalValid: totalValid !== false,
      readyForOrderId: false,
    });
    res.status(201).json(draft.toObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update draft (packing checklist in Orders tab)
router.patch('/drafts/:id', protect, async (req, res) => {
  try {
    const draft = await DraftOrder.findById(req.params.id);
    if (!draft) return res.status(404).json({ message: 'Draft not found' });
    const { packedItems, readyForOrderId } = req.body || {};
    if (Array.isArray(packedItems)) {
      draft.items = draft.items.map((item, idx) => ({
        ...item.toObject ? item.toObject() : item,
        packed: packedItems.includes(idx),
      }));
      const allPacked = draft.items.length > 0 && draft.items.every((i) => i.packed);
      draft.readyForOrderId = allPacked;
    }
    if (readyForOrderId === true) draft.readyForOrderId = true;
    await draft.save();
    res.json(draft.toObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: confirm draft → create Order (generate order ID) and delete draft. Call from Processing tab only.
router.post('/drafts/:id/confirm', protect, async (req, res) => {
  try {
    const draft = await DraftOrder.findById(req.params.id);
    if (!draft) return res.status(404).json({ message: 'Draft not found' });
    if (!draft.readyForOrderId) {
      return res.status(400).json({ message: 'Complete packing checklist in Orders tab first' });
    }
    const orderId = await getNextOrderId();
    const orderItems = draft.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      nbfCode: i.nbfCode || '',
      price: Number(i.price),
      quantity: Number(i.quantity),
      lineTotal: Number(i.lineTotal),
      image: i.image || '',
      packed: true,
    }));
    const order = await Order.create({
      orderId,
      rawMessage: draft.rawMessage || '',
      items: orderItems,
      total: Number(draft.total),
      totalValid: draft.totalValid !== false,
      status: 'packed',
      packedAt: new Date(),
    });
    const bill = formatBill(order);
    await DraftOrder.findByIdAndDelete(draft._id);
    res.status(201).json({ order: order.toObject(), bill });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get bill for an order (must be before /:id route)
router.get('/:id/bill', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const bill = formatBill(order);
    res.json({ bill, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get order confirmation for an order (must be before /:id route)
router.get('/:id/confirmation', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const confirmation = formatOrderConfirmation(order);
    res.json({ confirmation, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update order (status, payment, tracking, items, packing checklist)
router.put('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const { status, paymentStatus, trackingNumber, items: newItems, packedItemIndices, customerName, customerPhone } = req.body || {};

    if (customerName !== undefined) order.customerName = String(customerName).trim();
    if (customerPhone !== undefined) order.customerPhone = String(customerPhone).trim();

    if (Array.isArray(newItems) && newItems.length > 0) {
      const orderItems = newItems.map((i) => ({
        productId: i.productId || undefined,
        name: i.name || '',
        nbfCode: i.nbfCode || '',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        lineTotal: Number(i.lineTotal) || 0,
        image: i.image || '',
        packed: Boolean(i.packed),
      }));
      order.items = orderItems;
      const subtotal = order.items.reduce((sum, i) => sum + i.lineTotal, 0);
      order.total = subtotal;
    }

    if (status && ['pending', 'confirmed', 'packed', 'shipped', 'cancelled'].includes(status)) {
      order.status = status;
      if (status === 'packed') {
        if (!order.packedAt) order.packedAt = new Date();
        if (Array.isArray(packedItemIndices)) {
          order.items = order.items.map((item, idx) => ({
            ...item.toObject ? item.toObject() : item,
            packed: packedItemIndices.includes(idx),
          }));
        } else {
          order.items = order.items.map((item) => ({
            ...item.toObject ? item.toObject() : item,
            packed: true,
          }));
        }
      }
      if (status === 'shipped') {
        order.shippedAt = order.shippedAt || new Date();
        if (trackingNumber !== undefined) order.trackingNumber = String(trackingNumber).trim();
      }
    }
    if (paymentStatus && ['pending', 'paid'].includes(paymentStatus)) {
      order.paymentStatus = paymentStatus;
    }
    if (trackingNumber !== undefined && order.status === 'shipped') {
      order.trackingNumber = String(trackingNumber).trim();
    }
    await order.save();
    res.json(order.toObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
