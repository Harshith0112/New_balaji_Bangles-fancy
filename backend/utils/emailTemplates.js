/**
 * Shared transactional email + invoice templates.
 *
 * Each builder returns either an HTML string (for the invoice/confirmation
 * renderers used by the admin) or a `{ subject, html, text }` object suitable
 * for handing straight to `sendEmail()`.
 */

export function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function frontendUrl() {
  return String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function isLocalhostUrl(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(String(url || '').trim());
}

function logoUrl() {
  const explicit = String(process.env.MAIL_LOGO_URL || process.env.STORE_LOGO_URL || '').trim();
  if (explicit) return explicit;
  const fe = frontendUrl();
  if (isLocalhostUrl(fe)) return '';
  return `${fe}/logo.png`;
}

function storeAddress() {
  return process.env.STORE_ADDRESS || 'Store Address, City, PIN';
}

function storePhone() {
  return process.env.STORE_PHONE || 'Phone: +91-XXXXXXXXXX';
}

function formatSelectedOptionsHtml(selectedOptions) {
  if (!selectedOptions || typeof selectedOptions !== 'object') return '';
  const parts = Object.entries(selectedOptions).filter(
    ([k, v]) => k != null && v != null && String(v).trim() !== ''
  );
  if (!parts.length) return '';
  const inner = parts
    .map(([k, v]) => `${escapeHtml(String(k))}: ${escapeHtml(String(v))}`)
    .join('<br/>');
  return `<div style="font-size:11px;color:#4b5563;font-weight:500;margin-top:4px;line-height:1.35;">${inner}</div>`;
}

function itemProductCellHtml(i) {
  const name = escapeHtml(i.name);
  const opts = formatSelectedOptionsHtml(i.selectedOptions);
  return `${name}${opts}`;
}

function deliveryBlockHtml(order) {
  const d = order.delivery;
  if (!d || (!d.address && !d.pincode && !d.state)) return '';
  return `
  <div class="customer-section">
    <div class="customer-heading">Delivery address</div>
    ${d.address ? `<div class="customer-row" style="align-items:flex-start;"><span class="l">Address</span><span class="r" style="white-space:pre-wrap;text-align:right;max-width:65%;">${escapeHtml(d.address)}</span></div>` : ''}
    ${d.pincode ? `<div class="customer-row"><span class="l">Pincode</span><span class="r">${escapeHtml(d.pincode)}</span></div>` : ''}
    ${d.state ? `<div class="customer-row"><span class="l">State</span><span class="r">${escapeHtml(d.state)}</span></div>` : ''}
  </div>`;
}

const SHARED_STYLES = `
  *{box-sizing:border-box;}
  body{font-family:'Segoe UI',Tahoma,Geneva,system-ui,sans-serif;font-size:14px;color:#1f2937;max-width:520px;margin:0 auto;padding:28px 24px;line-height:1.45;background:#fff;}
  .bill-header{display:flex;align-items:center;gap:16px;padding-bottom:20px;}
  .bill-logo{width:80px;height:80px;object-fit:contain;flex-shrink:0;border-radius:50%;}
  .bill-header-text{flex:1;}
  .store-name{font-size:18px;font-weight:700;color:#1f2937;letter-spacing:0.04em;text-transform:uppercase;}
  .store-tagline{font-size:11px;color:#9f1239;margin-top:4px;letter-spacing:0.02em;}
  .store-info{font-size:11px;color:#6b7280;margin-top:6px;line-height:1.5;}
  .bill-hr{border:0;height:0;border-top:2px solid #9f1239;margin:16px 0 20px;opacity:0.9;}
  .invoice-title{font-size:20px;font-weight:700;text-align:center;margin:0 0 8px;color:#1f2937;letter-spacing:0.06em;}
  .invoice-intro{text-align:center;font-size:13px;color:#4b5563;margin:0 0 18px;}
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
  .bill-cta{display:block;text-align:center;margin:18px 0;}
  .bill-cta a{display:inline-block;background:#9f1239;color:#fff !important;padding:10px 20px;border-radius:8px;font-weight:600;text-decoration:none;font-size:13px;letter-spacing:0.03em;}
  .bill-callout{margin:16px 0;padding:14px 16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:13px;color:#9a3412;}
  .bill-callout strong{display:block;font-size:14px;color:#7c2d12;margin-bottom:4px;}
  @media only screen and (max-width:600px){
    body{padding:14px 12px;font-size:13px;}
    .bill-header{gap:10px;padding-bottom:12px;align-items:flex-start;}
    .bill-logo{width:56px;height:56px;}
    .store-name{font-size:15px;line-height:1.25;}
    .store-tagline{font-size:10px;}
    .store-info{font-size:10px;line-height:1.4;}
    .bill-hr{margin:10px 0 14px;}
    .invoice-title{font-size:18px;letter-spacing:0.03em;}
    .invoice-intro{font-size:12px;margin-bottom:12px;}
    .invoice-meta{display:block;padding:10px 12px;margin-bottom:14px;}
    .invoice-meta .left,.invoice-meta .right{gap:4px;}
    .invoice-meta .right{margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;}
    .customer-section{padding:10px 12px;margin-bottom:12px;}
    .customer-row{font-size:12px;gap:8px;}
    .bill-table{font-size:12px;}
    .bill-table th,.bill-table td{padding:8px 6px;}
    .bill-totals{max-width:none;font-size:12px;}
    .bill-totals .row{gap:14px;}
    .bill-totals .label{min-width:96px;}
    .bill-totals .total-row{font-size:15px;}
    .bill-footer{margin-top:18px;padding-top:12px;}
  }
  @media print{body{padding:16px;max-width:100%;} .bill-logo{max-height:80px;}}
`;

/**
 * Render the full branded HTML page used by invoices, order confirmations, and
 * order emails. Allows a custom title, intro line, optional callout (e.g. tracking
 * info or cancellation note), optional CTA button, and optional footer line.
 *
 * @param {Object} order
 * @param {Object} [opts]
 * @param {string} [opts.title='Invoice']
 * @param {string} [opts.intro]
 * @param {string} [opts.calloutHtml]
 * @param {{ url: string, label: string }} [opts.cta]
 * @param {string} [opts.footerNote='This is a computer generated invoice']
 * @param {string} [opts.thanksLine='Thank you for your business!']
 * @param {string} [opts.metaLeftLabel='Invoice No']
 */
export function renderOrderConfirmationHtml(order, opts = {}) {
  const {
    title = 'Invoice',
    intro = '',
    calloutHtml = '',
    cta = null,
    footerNote = 'This is a computer generated invoice',
    thanksLine = 'Thank you for your business!',
    metaLeftLabel = 'Invoice No',
  } = opts;

  const itemsSubtotal = (order.items || []).reduce(
    (s, i) => s + (Number(i.lineTotal) || 0),
    0
  );
  const couponDiscount = Number(order.couponDiscount) || 0;
  const couponCode = order.couponCode || '';
  const netItems = Number(order.total) || 0;
  const shipping = Number(order.shippingCharge) || 0;
  const grandTotal = netItems + shipping;
  const customerName = order.customerName || 'Customer';
  const customerPhone = order.customerPhone || '';
  const created = new Date(order.createdAt || Date.now());
  const dateStr = created.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = created.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const paymentMode = order.paymentStatus === 'paid' ? 'Paid' : 'Pending';
  const rows = (order.items || [])
    .map(
      (i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${itemProductCellHtml(i)}</td>
      <td class="num">${i.quantity}</td>
      <td>₹ ${Number(i.price).toFixed(2)}</td>
      <td>₹ ${Number(i.lineTotal).toFixed(2)}</td>
    </tr>`
    )
    .join('');
  const logoSrc = logoUrl();
  const logoHtml = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="New Balaji Bangles and Fancy" class="bill-logo"/>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)} - ${escapeHtml(order.orderId || '')}</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="bill-header">
    ${logoHtml}
    <div class="bill-header-text">
      <div class="store-name">New Balaji Bangles and Fancy</div>
      <div class="store-tagline">Cosmetics • Jewels • Accessories</div>
      <div class="store-info">${escapeHtml(storeAddress())}<br/>${escapeHtml(storePhone())}</div>
    </div>
  </div>
  <hr class="bill-hr"/>
  <h1 class="invoice-title">${escapeHtml(title)}</h1>
  ${intro ? `<p class="invoice-intro">${escapeHtml(intro)}</p>` : ''}
  ${calloutHtml || ''}
  <div class="invoice-meta">
    <div class="left">
      <div><strong>${escapeHtml(metaLeftLabel)}:</strong> ${escapeHtml(order.orderId || '')}</div>
      <div><strong>Time:</strong> ${timeStr}</div>
    </div>
    <div class="right">
      <div><strong>Date:</strong> ${dateStr}</div>
      <div><strong>Payment Mode:</strong> ${escapeHtml(paymentMode)}</div>
    </div>
  </div>
  <div class="customer-section">
    <div class="customer-heading">Customer Details</div>
    <div class="customer-row"><span class="l">Name</span><span class="r">${escapeHtml(customerName)}</span></div>
    <div class="customer-row"><span class="l">Phone</span><span class="r">${escapeHtml(customerPhone) || '—'}</span></div>
  </div>
  ${deliveryBlockHtml(order)}
  <table class="bill-table">
    <thead>
      <tr><th>S.No</th><th>Product Name</th><th class="num">Qty</th><th>Rate</th><th>Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="bill-totals">
    <div class="row"><span class="label">Items subtotal</span><span>₹ ${itemsSubtotal.toFixed(2)}</span></div>
    ${couponDiscount > 0 ? `<div class="row"><span class="label">Coupon discount${couponCode ? ` (${escapeHtml(couponCode)})` : ''}</span><span>− ₹ ${couponDiscount.toFixed(2)}</span></div>` : ''}
    ${shipping > 0 ? `<div class="row"><span class="label">Shipping</span><span>₹ ${shipping.toFixed(2)}</span></div>` : ''}
    <div class="row total-row"><span class="label">Total Amount</span><span>₹ ${grandTotal.toFixed(2)}</span></div>
  </div>
  ${cta ? `<div class="bill-cta"><a href="${escapeHtml(cta.url)}">${escapeHtml(cta.label)}</a></div>` : ''}
  <div class="bill-footer">
    <div class="line1">${escapeHtml(footerNote)}</div>
    <div class="thanks">${escapeHtml(thanksLine)}</div>
  </div>
</body>
</html>`;
}

/* -------- Generic branded wrapper for non-order emails (welcome, password reset) -------- */

function renderBrandedHtml({ title, bodyHtml, footerNote = '' }) {
  const logoSrc = logoUrl();
  const logoHtml = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="New Balaji Bangles and Fancy" class="bill-logo"/>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="bill-header">
    ${logoHtml}
    <div class="bill-header-text">
      <div class="store-name">New Balaji Bangles and Fancy</div>
      <div class="store-tagline">Cosmetics • Jewels • Accessories</div>
      <div class="store-info">${escapeHtml(storeAddress())}<br/>${escapeHtml(storePhone())}</div>
    </div>
  </div>
  <hr class="bill-hr"/>
  <h1 class="invoice-title">${escapeHtml(title)}</h1>
  ${bodyHtml}
  <div class="bill-footer">
    ${footerNote ? `<div class="line1">${escapeHtml(footerNote)}</div>` : ''}
    <div class="thanks">Thank you for shopping with New Balaji Bangles &amp; Fancy</div>
  </div>
</body>
</html>`;
}

/* -------- Public template builders (return { subject, html, text }) -------- */

export function welcomeEmail({ name, phone }) {
  const safeName = String(name || 'there').trim() || 'there';
  const subject = 'Welcome to New Balaji Bangles & Fancy!';
  const shopUrl = `${frontendUrl()}/shop`;
  const accountUrl = `${frontendUrl()}/customer/account`;
  const bodyHtml = `
    <p style="font-size:14px;color:#1f2937;margin:0 0 12px;">
      Hi ${escapeHtml(safeName)},
    </p>
    <p style="font-size:14px;color:#1f2937;margin:0 0 12px;line-height:1.6;">
      Your account is all set. We've registered you with the phone number
      <strong style="font-family:monospace;">${escapeHtml(String(phone || ''))}</strong>.
      You can now save delivery addresses, place orders online, and track them anytime from your account.
    </p>
    <div class="bill-cta">
      <a href="${escapeHtml(shopUrl)}">Start shopping</a>
    </div>
    <p style="font-size:13px;color:#4b5563;margin:0 0 8px;text-align:center;">
      Or visit your <a href="${escapeHtml(accountUrl)}" style="color:#9f1239;">account dashboard</a>.
    </p>`;
  const html = renderBrandedHtml({
    title: 'Welcome aboard!',
    bodyHtml,
  });
  const text = `Hi ${safeName}, welcome to New Balaji Bangles & Fancy! Your account is registered with phone ${phone}. Visit ${shopUrl} to start shopping.`;
  return { subject, html, text };
}

export function orderPlacedEmail(order) {
  const orderId = order.orderId || '';
  const subject = `Thanks for your order — ${orderId}`;
  const trackUrl = `${frontendUrl()}/track?order=${encodeURIComponent(orderId)}`;
  const html = renderOrderConfirmationHtml(order, {
    title: 'Thanks for your order!',
    intro: `We've received your order. Here's a quick summary — we'll email you again as your order moves along.`,
    cta: { url: trackUrl, label: 'Track my order' },
    footerNote: 'This is a computer generated order confirmation',
    thanksLine: 'Thank you for shopping with us!',
    metaLeftLabel: 'Order No',
  });
  const text = `Thanks for your order ${orderId}! Track it anytime at ${trackUrl}.`;
  return { subject, html, text };
}

export function orderItemsUpdatedEmail(order) {
  const orderId = order.orderId || '';
  const subject = `Your order was updated — ${orderId}`;
  const trackUrl = `${frontendUrl()}/track?order=${encodeURIComponent(orderId)}`;
  const html = renderOrderConfirmationHtml(order, {
    title: 'Order updated',
    intro:
      "Your order items were updated by our team. Please review the latest order summary below.",
    cta: { url: trackUrl, label: 'Track my order' },
    footerNote: 'This is an automated order update',
    thanksLine: 'Thank you for shopping with us!',
    metaLeftLabel: 'Order No',
  });
  const text = `Your order ${orderId} was updated. Track it anytime at ${trackUrl}.`;
  return { subject, html, text };
}

const STATUS_COPY = {
  confirmed: {
    title: 'Your order is confirmed',
    intro: "We've confirmed your order and started preparing it. We'll let you know when it's packed.",
    subjectPrefix: 'Order confirmed',
  },
  packed: {
    title: 'Your order is packed',
    intro: 'Good news — your order is packed and ready for dispatch. Shipping details will follow shortly.',
    subjectPrefix: 'Order packed',
  },
  shipped: {
    title: 'Your order has shipped',
    intro: 'Your order is on its way! Use the tracking details below to follow your shipment.',
    subjectPrefix: 'Order shipped',
  },
  cancelled: {
    title: 'Your order has been cancelled',
    intro:
      "We're sorry — your order has been cancelled. If this looks unexpected, please reply to this email or contact us.",
    subjectPrefix: 'Order cancelled',
  },
};

export function orderStatusEmail(order, status) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  const orderId = order.orderId || '';
  const subject = `${copy.subjectPrefix} — ${orderId}`;
  const trackUrl = `${frontendUrl()}/track?order=${encodeURIComponent(orderId)}`;

  let calloutHtml = '';
  if (status === 'shipped') {
    const tracking = String(order.trackingNumber || '').trim();
    const carrier = String(order.shippingCarrier || '').trim();
    if (tracking || carrier) {
      calloutHtml = `<div class="bill-callout">
        <strong>Tracking details</strong>
        ${carrier ? `Shipped by: ${escapeHtml(carrier)}<br/>` : ''}
        ${tracking ? `Tracking number: <span style="font-family:monospace;">${escapeHtml(tracking)}</span>` : ''}
      </div>`;
    }
  }

  const html = renderOrderConfirmationHtml(order, {
    title: copy.title,
    intro: copy.intro,
    calloutHtml,
    cta: { url: trackUrl, label: 'Track my order' },
    footerNote: 'This is an automated order update',
    thanksLine: 'Thank you for shopping with us!',
    metaLeftLabel: 'Order No',
  });
  const text = `${copy.title}: ${orderId}. ${copy.intro} Track: ${trackUrl}`;
  return { subject, html, text };
}

export function passwordResetEmail({ name, resetUrl, expiresInMinutes = 30 }) {
  const safeName = String(name || 'there').trim() || 'there';
  const subject = 'Reset your New Balaji Bangles & Fancy password';
  const bodyHtml = `
    <p style="font-size:14px;color:#1f2937;margin:0 0 12px;">
      Hi ${escapeHtml(safeName)},
    </p>
    <p style="font-size:14px;color:#1f2937;margin:0 0 12px;line-height:1.6;">
      We got a request to reset the password on your customer account.
      Click the button below to set a new password — this link will expire in
      ${escapeHtml(String(expiresInMinutes))} minutes.
    </p>
    <div class="bill-cta">
      <a href="${escapeHtml(resetUrl)}">Reset password</a>
    </div>
    <p style="font-size:12px;color:#6b7280;margin:0 0 8px;line-height:1.6;">
      If the button doesn't work, copy and paste this link into your browser:
      <br/>
      <a href="${escapeHtml(resetUrl)}" style="color:#9f1239;word-break:break-all;">${escapeHtml(resetUrl)}</a>
    </p>
    <p style="font-size:12px;color:#6b7280;margin:12px 0 0;line-height:1.6;">
      Didn't ask to reset your password? You can safely ignore this email — your
      current password will keep working.
    </p>`;
  const html = renderBrandedHtml({
    title: 'Password reset',
    bodyHtml,
    footerNote: 'This is an automated security email',
  });
  const text = `Reset your password using this link (expires in ${expiresInMinutes} minutes): ${resetUrl}`;
  return { subject, html, text };
}
