/**
 * Telegram Notification Service
 * Sends real-time instant alerts to shop administrators when a new online order is placed.
 */

export interface TelegramOrderItem {
  title: string;
  quantity: number;
  price: number;
}

export interface TelegramOrderNotification {
  saleId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  district?: string;
  items: TelegramOrderItem[];
  total: number;
  paymentMethod: string;
  transactionId?: string;
  orderNote?: string;
  packageName?: string;
}

export async function sendTelegramOrderAlert(order: TelegramOrderNotification): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || '9255723188:AAGQdmOdPEjRromAy0vRCoUMZc1309lV_SY';
  const chatId = process.env.TELEGRAM_CHAT_ID || '5246585189';

  if (!token || !chatId) {
    console.warn('Telegram notifications not configured: missing token or chatId');
    return false;
  }

  try {
    const paymentLabel = order.paymentMethod === 'Cash'
      ? 'ক্যাশ অন ডেলিভারি (Cash on Delivery)'
      : `বিকাশ / নগদ (TrxID: ${order.transactionId || 'N/A'})`;

    const itemsList = order.items
      .map((item) => `• <b>${item.title}</b> × ${item.quantity} — ৳${item.price * item.quantity}`)
      .join('\n');

    const lines = [
      '🔔 <b>নতুন অনলাইন অর্ডার এসেছে!</b>',
      '━━━━━━━━━━━━━━━━━━━━',
      `<b>অর্ডার আইডি:</b> <code>#${order.saleId}</code>`,
      `<b>গ্রাহক:</b> ${order.customerName}`,
      `<b>ফোন:</b> <code>${order.customerPhone}</code>`,
      `<b>ঠিকানা:</b> ${order.shippingAddress}${order.district ? ` (${order.district})` : ''}`,
      order.packageName ? `<b>প্যাকেজ:</b> ${order.packageName}` : '',
      '',
      '📚 <b>অর্ডারকৃত বইসমূহ:</b>',
      itemsList,
      '',
      `💰 <b>সর্বমোট বিল:</b> <b>৳${order.total}</b> (ফ্রি ডেলিভারি)`,
      `💳 <b>পেমেন্ট মাধ্যম:</b> ${paymentLabel}`,
      order.orderNote ? `📝 <b>গ্রাহকের নোট:</b> <i>${order.orderNote}</i>` : '',
      '━━━━━━━━━━━━━━━━━━━━',
      '🌐 <i>JPSA Shop • Victory Flag Publications</i>',
    ];

    const message = lines.filter((line) => line !== '').join('\n');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API error:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}
