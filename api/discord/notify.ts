import { getAdminDb } from '../_lib/firebase-admin.js';

type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

async function sendWebhook(webhookUrl: string, payload: any) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { type, orderId, ticketId } = req.body ?? {};
    const db = getAdminDb();
    const settingsSnap = await db.collection('settings').doc('discord').get();
    const webhookUrl = settingsSnap.data()?.webhookUrl;

    if (!webhookUrl) {
      res.status(200).json({ skipped: true });
      return;
    }

    if (type === 'order_paid' && orderId) {
      const orderSnap = await db.collection('transactions').doc(orderId).get();
      if (!orderSnap.exists) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      const order = orderSnap.data() || {};
      const userSnap = order.userId ? await db.collection('users').doc(order.userId).get() : null;
      const user = userSnap?.data() || {};

      await sendWebhook(webhookUrl, {
        username: 'ZXCHUB',
        embeds: [{
          title: 'New Paid Order',
          color: 0xef4444,
          fields: [
            { name: 'Customer', value: user.email || order.userId || 'Unknown', inline: true },
            { name: 'Discord', value: user.discordUsername || user.discordId || 'Not linked', inline: true },
            { name: 'Amount', value: `$${Number(order.amount || 0).toFixed(2)}`, inline: true },
            { name: 'Scripts', value: (order.items || []).map((item: any) => `${item.productName} (${item.variantName || 'Standard'})`).join('\n') || order.productTitle || 'Order' },
            { name: 'Promo', value: order.promoCode || 'None', inline: true },
            { name: 'Order ID', value: orderId, inline: false }
          ],
          timestamp: new Date(order.createdAt || Date.now()).toISOString()
        }]
      });
    }

    if (type === 'ticket_created' && ticketId) {
      const ticketSnap = await db.collection('tickets').doc(ticketId).get();
      if (!ticketSnap.exists) {
        res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      const ticket = ticketSnap.data() || {};
      await sendWebhook(webhookUrl, {
        username: 'ZXCHUB Support',
        embeds: [{
          title: 'New Support Ticket',
          color: 0xf59e0b,
          fields: [
            { name: 'Customer', value: ticket.userEmail || ticket.userId || 'Unknown', inline: true },
            { name: 'Subject', value: ticket.subject || 'Support Request', inline: true },
            { name: 'Ticket ID', value: ticketId, inline: false }
          ],
          timestamp: new Date(ticket.createdAt || Date.now()).toISOString()
        }]
      });
    }

    res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Discord notify error:', error);
    res.status(500).json({ error: error.message || 'Failed to send Discord notification' });
  }
}
