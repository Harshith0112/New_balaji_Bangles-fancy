const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210';

export function whatsappOrderUrl(productName, price, nbfCode, selectedOptions) {
  let line = `${productName}`;
  if (nbfCode) line += ` (NBF: ${nbfCode})`;
  if (selectedOptions && Object.keys(selectedOptions).length) {
    line += ` [${Object.entries(selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}]`;
  }
  line += ` – ₹${price}`;
  const text = encodeURIComponent(`Hi, I want to order this product: ${line}`);
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}?text=${text}`;
}

/** Build WhatsApp message for full cart order (with NBF codes and options) */
export function whatsappCartOrderMessage(cartItems) {
  const lines = cartItems.map((item) => {
    let line = `• ${item.name}`;
    if (item.nbfCode) line += ` (NBF: ${item.nbfCode})`;
    if (item.selectedOptions && Object.keys(item.selectedOptions).length) {
      line += ` [${Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}]`;
    }
    line += ` – ₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}`;
    return line;
  });
  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const message = `Hi, I would like to place an order:\n\n${lines.join('\n')}\n\nTotal: ₹${total}`;
  return message;
}

export function whatsappChatUrl(message = '') {
  const text = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}${text ? `?text=${text}` : ''}`;
}
