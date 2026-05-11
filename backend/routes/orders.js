import express from 'express';
import Order from '../models/Order.js';
import DraftOrder from '../models/DraftOrder.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Customer from '../models/Customer.js';
import { protect } from '../middleware/auth.js';
import { computeCouponDiscountAmount, normalizeCouponCode } from '../utils/couponHelpers.js';
import { sendEmail } from '../utils/mailer.js';
import {
  renderOrderConfirmationHtml,
  orderPlacedEmail,
  orderItemsUpdatedEmail,
  orderStatusEmail,
} from '../utils/emailTemplates.js';

const router = express.Router();

/**
 * Split WhatsApp cart message into order lines + optional *Delivery address* block.
 * Delivery lines: Address:, Pincode:, State:
 */
function splitOrderAndDelivery(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return {
      orderText: '',
      delivery: { address: '', pincode: '', state: '' },
      hasDeliverySection: false,
      deliveryComplete: true,
    };
  }
  const patterns = [
    /\*{1,2}\s*Delivery address\s*\*{1,2}/i,
    /\n\s*Delivery address\s*\n/i,
  ];
  for (const re of patterns) {
    const match = raw.match(re);
    if (match && match.index != null) {
      const orderText = raw.slice(0, match.index).trim();
      const deliveryBlock = raw.slice(match.index + match[0].length).trim();
      const delivery = parseDeliveryFields(deliveryBlock);
      const hasDeliverySection = true;
      const deliveryComplete = !!(delivery.address && delivery.pincode && delivery.state);
      return { orderText, delivery, hasDeliverySection, deliveryComplete };
    }
  }
  return {
    orderText: raw,
    delivery: { address: '', pincode: '', state: '' },
    hasDeliverySection: false,
    deliveryComplete: true,
  };
}

function parseDeliveryFields(block) {
  const b = String(block || '').trim();
  if (!b) return { address: '', pincode: '', state: '' };
  const addrM = b.match(/^Address:\s*(.+)$/m);
  const pinM = b.match(/^Pincode:\s*(\S+)/im);
  const stateM = b.match(/^State:\s*(.+)$/im);
  let address = addrM ? addrM[1].trim() : '';
  let pincode = pinM ? pinM[1].trim() : '';
  let state = stateM ? stateM[1].trim() : '';
  state = state.replace(/""+\s*$/g, '').replace(/^"+|"+$/g, '').trim();
  return { address, pincode, state };
}

/**
 * Parse pasted order text.
 * Lines: "• name (NBF: code) – ₹price x qty = ₹lineTotal"
 * Last: "Total: ₹total"
 * Optional footer: *Delivery address* / Address: / Pincode: / State: (ignored for line math)
 */
function parseOrderText(text) {
  if (!text || typeof text !== 'string') {
    return {
      items: [],
      total: 0,
      totalValid: false,
      delivery: null,
      hasDeliverySection: false,
      deliveryComplete: true,
    };
  }

  const { orderText, delivery, hasDeliverySection, deliveryComplete } = splitOrderAndDelivery(text);
  const textForLines = orderText;

  const lines = textForLines.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
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
  const fullText = textForLines.trim();
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

  return {
    items,
    total,
    calculatedTotal,
    totalValid,
    totalFromMessage,
    delivery: hasDeliverySection ? delivery : null,
    hasDeliverySection,
    deliveryComplete,
  };
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
    // Cart / ProductDetail use opt.name as key (e.g. "Size"); keep in sync with isProductLineOrderable
    const selectedVal = optName ? opts[optName] ?? opts[opt.name] : null;
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
 * Whether this product can be ordered with the given option selection (visibility, stock, option-level stock).
 * Keys in selectedOptions may be option name or lowercased name (storefront sends same shape as cart).
 */
function isProductLineOrderable(product, selectedOptions) {
  if (!product) return { ok: false, message: 'Product not found' };
  if (product.visible === false) return { ok: false, message: 'Product is not available' };

  const opts = selectedOptions || {};
  const productOptions = product.options || [];

  if (!productOptions.length) {
    return product.inStock !== false
      ? { ok: true }
      : { ok: false, message: 'Product is out of stock' };
  }

  for (const opt of productOptions) {
    const optName = (opt.name || '').toLowerCase().trim();
    const selectedValueRaw = opts[optName] ?? opts[opt.name];
    const selectedValue = selectedValueRaw != null ? String(selectedValueRaw) : '';
    if (!selectedValue && (opt.values || []).length) {
      return { ok: false, message: `Missing ${opt.name || 'option'}` };
    }
    if (!selectedValue) continue;

    const optionValue = (opt.values || []).find((v) => {
      const val = typeof v === 'string' ? v : (v.value || '');
      return String(val).toLowerCase().trim() === selectedValue.toLowerCase().trim();
    });

    if (!optionValue) {
      return { ok: false, message: `Invalid ${opt.name || 'option'}` };
    }
    const inStock = typeof optionValue === 'string' ? true : optionValue.inStock !== false;
    if (!inStock) {
      return { ok: false, message: `${opt.name || 'Option'}: ${selectedValue} is out of stock` };
    }
  }

  if (product.inStock === false) {
    return { ok: false, message: 'Product is out of stock' };
  }

  return { ok: true };
}

/**
 * Match parsed items to products. When message has NBF code, match ONLY by that NBF (no name fallback) to detect tampering.
 */
async function matchItemsToProducts(items) {
  const products = await Product.find({}).lean();
  const matched = items.map((item) => {
    let product = null;
    if (item.productId) {
      product = products.find((p) => String(p._id) === String(item.productId));
    }
    const hasNbfInMessage = item.nbfCode && String(item.nbfCode).trim() !== '';
    if (!product && hasNbfInMessage) {
      product = products.find(
        (p) => p.nbfCode && String(p.nbfCode).toLowerCase() === String(item.nbfCode).toLowerCase()
      );
      // Do not fall back to name when NBF is in message: wrong NBF = tampering (e.g. NBF: 3 when no product has code 3)
    }
    if (!product && !hasNbfInMessage) {
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

    const stock = isProductLineOrderable(product, item.selectedOptions);

    return {
      ...item,
      productId: product ? product._id : null,
      image: product && product.images && product.images[0] ? product.images[0] : '',
      productPrice: expectedUnitPrice ?? productPrice ?? null,
      priceMatch,
      lineTotalMatch,
      itemValid,
      stockOk: stock.ok,
      stockMessage: stock.message || '',
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
      delivery: parsed.delivery,
      hasDeliverySection: parsed.hasDeliverySection,
      deliveryComplete: parsed.deliveryComplete,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Generate next order ID (e.g. NB20260001)
async function getNextOrderId() {
  const year = new Date().getFullYear();

  // New format: NB{year}{orderNumber}
  // Example: NB20260001 (year=2026, orderNumber=0001)
  const newPrefix = `NB${year}`;
  const newYearPattern = new RegExp(`^${newPrefix}(\\d{4})$`);
  const newLast = await Order.findOne({ orderId: newYearPattern }).sort({ orderId: -1 }).lean();

  // Old format (already existing in DB): NB{orderNumber}{year}
  // Example: NB00012026 (orderNumber=0001, year=2026)
  const oldYearPattern = new RegExp(`^NB(\\d{4})${year}$`);
  const oldLast = await Order.findOne({ orderId: oldYearPattern }).sort({ orderId: -1 }).lean();

  const parseCountFromNew = (orderId) => {
    const str = String(orderId || '');
    if (!str.startsWith(newPrefix)) return 0;
    const countStr = str.slice(newPrefix.length);
    const n = parseInt(countStr, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const parseCountFromOld = (orderId) => {
    const str = String(orderId || '');
    const m = str.match(/^NB(\d{4})/);
    if (!m) return 0;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : 0;
  };

  const lastCount = Math.max(parseCountFromNew(newLast?.orderId), parseCountFromOld(oldLast?.orderId));
  const next = lastCount > 0 ? lastCount + 1 : 1;

  return `${newPrefix}${String(next).padStart(4, '0')}`;
}

// Public: create an order from online ecommerce flow (no login)
router.post('/online', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail: customerEmailRaw,
      items,
      total,
      delivery,
      couponCode: couponCodeRaw,
    } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }
    const phoneDigits = String(customerPhone || '').replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      return res.status(400).json({ message: 'Valid customer phone is required' });
    }

    // Capture an email for transactional updates: prefer the email submitted with
    // the order; otherwise fall back to whatever's on the registered customer
    // record matching this phone (so logged-in customers always get emails).
    const submittedEmail = String(customerEmailRaw || '').trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submittedEmail);
    let resolvedEmail = isValidEmail ? submittedEmail : '';
    if (!resolvedEmail) {
      try {
        const matched = await Customer.findOne({ phone: phoneDigits }).lean();
        if (matched?.email) resolvedEmail = String(matched.email).toLowerCase();
      } catch (_) {}
    }

    const deliveryDoc =
      delivery && typeof delivery === 'object'
        ? {
            address: String(delivery.address || '').trim(),
            pincode: String(delivery.pincode || '').trim(),
            state: String(delivery.state || '').trim(),
          }
        : { address: '', pincode: '', state: '' };

    // Normalize items so validation/matching has required fields.
    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const lineTotal =
        item.lineTotal != null && item.lineTotal !== ''
          ? Number(item.lineTotal) || price * quantity
          : price * quantity;
      return {
        productId: item.productId || undefined,
        name: item.name || '',
        nbfCode: item.nbfCode || '',
        selectedOptions: item.selectedOptions || {},
        price,
        quantity,
        lineTotal,
      };
    });

    // Validate items against our product catalog (NBF + price/lineTotal) to prevent tampering.
    const matched = await matchItemsToProducts(normalizedItems);
    const allItemsValid = matched.length > 0 && matched.every((i) => i.itemValid);
    const allInStock = matched.every((i) => i.stockOk);

    const calculatedTotal = matched.reduce((sum, i) => sum + Number(i.lineTotal) || 0, 0);

    let couponDiscount = 0;
    let appliedCouponCode = '';
    const rawCoupon = normalizeCouponCode(couponCodeRaw);
    if (rawCoupon) {
      const coupon = await Coupon.findOne({ code: rawCoupon, enabled: true }).lean();
      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or inactive coupon code.' });
      }
      couponDiscount = computeCouponDiscountAmount(coupon, calculatedTotal);
      if (couponDiscount <= 0) {
        return res.status(400).json({
          message: 'This coupon cannot be applied to this order (minimum amount, expiry, or usage limit).',
        });
      }
      appliedCouponCode = coupon.code;
    }

    const netTotal = Math.round((calculatedTotal - couponDiscount) * 100) / 100;
    if (netTotal < 0) {
      return res.status(400).json({ message: 'Invalid discount.' });
    }

    const providedTotal = total != null && total !== '' ? Number(total) : netTotal;
    const totalValid = Math.abs(netTotal - providedTotal) < PRICE_TOLERANCE;

    if (!allItemsValid || !totalValid) {
      return res.status(400).json({
        message: 'Order validation failed. Prices/totals do not match our products.',
        totalValid,
        allItemsValid,
      });
    }

    if (!allInStock) {
      const stockIssues = matched
        .filter((i) => !i.stockOk)
        .map((i) => ({
          name: i.name,
          nbfCode: i.nbfCode,
          message: i.stockMessage || 'Out of stock or unavailable',
        }));
      return res.status(400).json({
        message: 'Some items are out of stock or no longer available. Please update your cart and try again.',
        stockIssues,
      });
    }

    const orderId = await getNextOrderId();
    const orderItems = matched.map((item) => {
      const opts = item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {};
      return {
        productId: item.productId || undefined,
        name: item.name,
        nbfCode: item.nbfCode || '',
        price: Number(item.price),
        quantity: Number(item.quantity),
        lineTotal: Number(item.lineTotal),
        image: item.image || '',
        selectedOptions: opts,
        packed: false,
      };
    });

    const order = await Order.create({
      orderId,
      rawMessage: '',
      customerName: String(customerName || '').trim(),
      customerPhone: phoneDigits,
      customerEmail: resolvedEmail,
      items: orderItems,
      total: netTotal,
      couponCode: appliedCouponCode,
      couponDiscount: couponDiscount || 0,
      totalValid: true,
      shippingCharge: 0,
      delivery: deliveryDoc,
      status: 'pending',
      paymentStatus: 'pending',
      packedAt: null,
    });

    if (appliedCouponCode && couponDiscount > 0) {
      await Coupon.updateOne({ code: appliedCouponCode }, { $inc: { usedCount: 1 } });
    }

    // Fire-and-forget "thanks for your order" email — never block placement on mail.
    if (resolvedEmail) {
      const { subject, html, text } = orderPlacedEmail(order.toObject());
      sendEmail({ to: resolvedEmail, subject, html, text }).catch((e) =>
        console.error('[orders] order-placed email failed:', e?.message || e)
      );
    }

    res.status(201).json({
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: create order (save details, generate orderId and bill)
router.post('/', protect, async (req, res) => {
  try {
    const { rawMessage, items, total, totalValid, packedItems, shippingCharge, delivery } = req.body || {};
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
      selectedOptions:
        item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {},
      packed: Array.isArray(packedItems) ? packedItems.includes(idx) : true,
    }));
    const subtotal = Number(total);
    const shipCharge = Number(shippingCharge) || 0;
    const deliveryDoc =
      delivery && typeof delivery === 'object'
        ? {
            address: String(delivery.address || '').trim(),
            pincode: String(delivery.pincode || '').trim(),
            state: String(delivery.state || '').trim(),
          }
        : { address: '', pincode: '', state: '' };
    const order = await Order.create({
      orderId,
      rawMessage: rawMessage || '',
      items: orderItems,
      total: subtotal,
      shippingCharge: shipCharge,
      totalValid: totalValid !== false,
      delivery: deliveryDoc,
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
  return renderOrderConfirmationHtml(order, {
    title: 'Invoice',
    metaLeftLabel: 'Invoice No',
    footerNote: 'This is a computer generated invoice',
    thanksLine: 'Thank you for your business!',
  });
}

function formatOrderConfirmation(order) {
  return renderOrderConfirmationHtml(order, {
    title: 'Order Confirmation',
    metaLeftLabel: 'Order No',
    footerNote: 'This is a computer generated order confirmation',
    thanksLine: 'Thank you for your order!',
  });
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
      selectedOptions:
        item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : {},
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
      selectedOptions:
        i.selectedOptions && typeof i.selectedOptions === 'object' ? i.selectedOptions : {},
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

// Public: track order by business orderId (e.g. NB00012026) — no auth
router.get('/track/:orderId', async (req, res) => {
  try {
    const raw = String(req.params.orderId || '').trim();
    if (!raw) {
      return res.status(400).json({ message: 'Order number is required' });
    }
    const safe = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const order = await Order.findOne({ orderId: new RegExp(`^${safe}$`, 'i') }).lean();
    if (!order) {
      return res.status(404).json({ message: 'No order found with this number. Check the ID and try again.' });
    }
    // Public tracking: status only — no line items, totals, or delivery address
    const payload = {
      orderId: order.orderId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shippedAt: order.shippedAt || null,
      packedAt: order.packedAt || null,
      customerName: order.customerName || '',
    };
    if (order.status === 'shipped' || order.status === 'completed') {
      payload.trackingNumber = String(order.trackingNumber || '').trim();
      payload.shippingCarrier = String(order.shippingCarrier || '').trim();
    }
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: get lightweight online order history by customer phone
router.get('/by-phone/:phone', async (req, res) => {
  try {
    const phoneDigits = String(req.params.phone || '').replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 10) {
      return res.status(400).json({ message: 'Valid phone is required' });
    }

    // We store online-order phone numbers as digits-only, so direct equality works here.
    const orders = await Order.find({ customerPhone: phoneDigits }).sort({ createdAt: -1 }).limit(50).lean();

    const list = orders.map((o) => {
      const totalNum = Number(o.total) || 0;
      const shipped = o.status === 'shipped' || o.status === 'completed';
      return {
        _id: o._id,
        orderId: o.orderId,
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        total: totalNum,
        trackingNumber: shipped ? String(o.trackingNumber || '').trim() : '',
        shippingCarrier: shipped ? String(o.shippingCarrier || '').trim() : '',
      };
    });

    res.json({ orders: list });
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
    const previousStatus = order.status;
    let itemsUpdated = false;
    const {
      status,
      paymentStatus,
      trackingNumber,
      shippingCarrier,
      shippingCharge,
      items: newItems,
      packedItemIndices,
      customerName,
      customerPhone,
    } = req.body || {};

    if (customerName !== undefined) order.customerName = String(customerName).trim();
    if (customerPhone !== undefined) order.customerPhone = String(customerPhone).trim();
    if (shippingCharge !== undefined) {
      const parsedShipping = Number(shippingCharge);
      if (!Number.isFinite(parsedShipping) || parsedShipping < 0) {
        return res.status(400).json({ message: 'Shipping charge must be a non-negative number' });
      }
      order.shippingCharge = Math.round(parsedShipping * 100) / 100;
    }

    if (Array.isArray(newItems) && newItems.length > 0) {
      itemsUpdated = true;
      const orderItems = newItems.map((i) => ({
        productId: i.productId || undefined,
        name: i.name || '',
        nbfCode: i.nbfCode || '',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        lineTotal: Number(i.lineTotal) || 0,
        image: i.image || '',
        selectedOptions:
          i.selectedOptions && typeof i.selectedOptions === 'object' ? i.selectedOptions : {},
        packed: Boolean(i.packed),
      }));
      order.items = orderItems;
      const subtotal = order.items.reduce((sum, i) => sum + i.lineTotal, 0);
      const existingDiscount = Math.max(0, Number(order.couponDiscount) || 0);
      const boundedDiscount = Math.min(existingDiscount, subtotal);
      order.couponDiscount = boundedDiscount;
      order.total = Math.round((subtotal - boundedDiscount) * 100) / 100;
    }

    if (status && ['pending', 'confirmed', 'packed', 'shipped', 'cancelled', 'returned'].includes(status)) {
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
        if (shippingCarrier !== undefined) order.shippingCarrier = String(shippingCarrier).trim();
      }
    }
    if (paymentStatus && ['pending', 'paid'].includes(paymentStatus)) {
      order.paymentStatus = paymentStatus;
    }
    if (trackingNumber !== undefined && order.status === 'shipped') {
      order.trackingNumber = String(trackingNumber).trim();
    }
    if (shippingCarrier !== undefined && order.status === 'shipped') {
      order.shippingCarrier = String(shippingCarrier).trim();
    }
    await order.save();

    // When admin edits order items, notify customer with updated summary.
    if (itemsUpdated && order.customerEmail) {
      const { subject, html, text } = orderItemsUpdatedEmail(order.toObject());
      sendEmail({ to: order.customerEmail, subject, html, text }).catch((e) =>
        console.error('[orders] items-updated email failed:', e?.message || e)
      );
    }

    // If the status transitioned to one we email about, fire-and-forget the email.
    const STATUSES_WITH_EMAIL = ['confirmed', 'packed', 'shipped', 'cancelled'];
    const statusChanged = previousStatus !== order.status;
    if (
      statusChanged &&
      STATUSES_WITH_EMAIL.includes(order.status) &&
      order.customerEmail
    ) {
      const built = orderStatusEmail(order.toObject(), order.status);
      if (built) {
        const { subject, html, text } = built;
        sendEmail({ to: order.customerEmail, subject, html, text }).catch((e) =>
          console.error(`[orders] status (${order.status}) email failed:`, e?.message || e)
        );
      }
    }

    res.json(order.toObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
