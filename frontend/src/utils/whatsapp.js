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

/**
 * Build WhatsApp message for full cart order (with NBF codes and options).
 * @param {Array} cartItems
 * @param {{ address: string, pincode: string, state: string } | null} delivery - optional delivery details
 */
export function whatsappCartOrderMessage(cartItems, delivery = null) {
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
  let message = `Hi, I would like to place an order:\n\n${lines.join('\n')}\n\nTotal: ₹${total}`;
  if (delivery && (delivery.address || delivery.pincode || delivery.state)) {
    message += '\n\n*Delivery address*';
    if (delivery.address?.trim()) message += `\nAddress: ${delivery.address.trim()}`;
    if (delivery.pincode?.trim()) message += `\nPincode: ${delivery.pincode.trim()}`;
    if (delivery.state?.trim()) message += `\nState: ${delivery.state.trim()}`;
  }
  return message;
}

export function whatsappChatUrl(message = '') {
  const text = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, '')}${text ? `?text=${text}` : ''}`;
}
