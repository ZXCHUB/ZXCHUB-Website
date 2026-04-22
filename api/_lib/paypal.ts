import { getAdminDb } from './firebase-admin.js';

type PayPalConfig = {
  clientId: string;
  secret: string;
  baseUrl: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalConfig(): Promise<PayPalConfig> {
  let clientId = process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || '';
  let secret = process.env.PAYPAL_SECRET || process.env.PAYPAL_CLIENT_SECRET || '';
  const mode = (process.env.PAYPAL_MODE || 'live').toLowerCase();

  if (!clientId || !secret) {
    try {
      const snap = await getAdminDb().collection('settings').doc('payments').get();
      const paypal = snap.data()?.paypal;
      if (paypal?.enabled) {
        clientId = clientId || paypal.clientId || '';
        secret = secret || paypal.secret || '';
      }
    } catch (error) {
      console.error('Failed to load PayPal settings:', error);
    }
  }

  if (!clientId || !secret) {
    throw new Error('PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_SECRET.');
  }

  return {
    clientId,
    secret,
    baseUrl: mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
  };
}

export async function getPayPalAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken.value;
  }

  const config = await getPayPalConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.secret}`).toString('base64');
  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to authenticate PayPal: ${details}`);
  }

  const data = await response.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3200) * 1000
  };

  return cachedToken.value;
}
