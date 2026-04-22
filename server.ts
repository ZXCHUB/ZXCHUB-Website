import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './src/firebase';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Helper to get Stripe client using dynamic settings from Firestore
async function getStripeClient() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'payments'));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      if (data?.stripe?.apiKey && data?.stripe?.enabled) {
        return new Stripe(data.stripe.apiKey, { apiVersion: '2026-02-25.clover' as any });
      }
    }
  } catch (err) {
    console.error("Error fetching stripe settings:", err);
  }
  
  // Fallback to env var
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe integration is not configured properly in Settings or ENV.");
  }
  return new Stripe(key, { apiVersion: '2026-02-25.clover' as any });
}

async function getPayPalConfig() {
  let clientId = process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || '';
  let secret = process.env.PAYPAL_SECRET || process.env.PAYPAL_CLIENT_SECRET || '';
  const mode = (process.env.PAYPAL_MODE || 'live').toLowerCase();

  if (!clientId || !secret) {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'payments'));
      const paypal = settingsDoc.data()?.paypal;
      if (paypal?.enabled) {
        clientId = clientId || paypal.clientId || '';
        secret = secret || paypal.secret || '';
      }
    } catch (err) {
      console.error("Error fetching paypal settings:", err);
    }
  }

  if (!clientId || !secret) {
    throw new Error("PayPal integration is not configured properly in Settings or ENV.");
  }

  return {
    clientId,
    secret,
    baseUrl: mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
  };
}

let paypalTokenCache: { value: string; expiresAt: number } | null = null;

async function getPayPalAccessToken() {
  if (paypalTokenCache && paypalTokenCache.expiresAt > Date.now() + 30000) {
    return paypalTokenCache.value;
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
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.message || 'Failed to authenticate PayPal.');
  }
  paypalTokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3200) * 1000
  };
  return paypalTokenCache.value;
}

// API Routes for Payments
app.post('/api/payments/create-checkout-session', async (req, res) => {
  try {
    const { amount, method, userId, metadata, successUrl, cancelUrl } = req.body;
    
    if (method === 'stripe') {
      const stripe = await getStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: metadata.type === 'topup' ? 'Balance Top Up' : (metadata.productTitle || 'Order Checkout'),
              },
              unit_amount: Math.max(50, Math.round(amount * 100)),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: { userId, ...metadata },
      });
      res.json({ url: session.url });
    } else {
      res.status(400).json({ error: "Unsupported payment method" });
    }
  } catch (error: any) {
    console.error("Payment Error:", error);
    let errorMessage = error.message || "An unexpected error occurred.";
    if (errorMessage.includes("Invalid API key provided")) {
      errorMessage = "Invalid payment configuration. Please contact support.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.post('/api/payments/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const stripe = await getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      res.json({ success: true, metadata: session.metadata, amount: session.amount_total ? session.amount_total / 100 : 0 });
    } else {
      res.json({ success: false });
    }
  } catch (error: any) {
    console.error("Verify Error:", error);
    let errorMessage = error.message || "An unexpected error occurred.";
    if (errorMessage.includes("Invalid API key provided")) {
      errorMessage = "Invalid payment configuration. Please contact support.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/payments/paypal-client-config', async (_req, res) => {
  try {
    const config = await getPayPalConfig();
    res.json({ clientId: config.clientId, currency: 'USD' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'PayPal is not configured' });
  }
});

app.post('/api/payments/paypal-create-order', async (req, res) => {
  try {
    const { amount, userId, metadata } = req.body;
    const numericAmount = Number(amount || 0);
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' });
    }

    const config = await getPayPalConfig();
    const token = await getPayPalAccessToken();
    const response = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: metadata?.type === 'topup' ? 'zxchub-balance-topup' : 'zxchub-key-order',
          custom_id: userId,
          amount: { currency_code: 'USD', value: numericAmount.toFixed(2) }
        }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.message || 'Failed to create PayPal order', details: data });
    res.json({ id: data.id });
  } catch (error: any) {
    console.error("PayPal create order error:", error);
    res.status(500).json({ error: error.message || 'Failed to create PayPal order' });
  }
});

app.post('/api/payments/paypal-capture-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    const config = await getPayPalConfig();
    const token = await getPayPalAccessToken();
    const response = await fetch(`${config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.message || 'Failed to capture PayPal order', details: data });
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    res.json({
      success: data.status === 'COMPLETED' || capture?.status === 'COMPLETED',
      orderId: data.id,
      amount: Number(capture?.amount?.value || 0),
      payerEmail: data.payer?.email_address || ''
    });
  } catch (error: any) {
    console.error("PayPal capture order error:", error);
    res.status(500).json({ error: error.message || 'Failed to capture PayPal order' });
  }
});

app.post('/api/payments/create-intent', async (req, res) => {
  try {
    const { amount, method, userId, metadata } = req.body;
    
    if (method === 'stripe') {
      const stripe = await getStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.max(50, Math.round(amount * 100)), // Convert to cents, minimum 50 cents
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: { userId, ...metadata }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } else {
      res.status(400).json({ error: "Unsupported payment method" });
    }
  } catch (error: any) {
    console.error("Payment Error:", error);
    let errorMessage = error.message || "An unexpected error occurred.";
    if (errorMessage.includes("Invalid API key provided")) {
      errorMessage = "Invalid payment configuration. Please contact support.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.get('/api/discord/auth-url', async (req, res) => {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'discord'));
    const data = docSnap.data();
    if (!data?.appId) return res.status(400).json({error: "Discord not configured"});
    
    const state = req.query.uid;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/discord/callback`;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${data.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds.join&state=${state}`;
    res.redirect(url);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/discord/callback', async (req, res) => {
  const code = req.query.code;
  const uid = req.query.state;
  if (!code || !uid) return res.status(400).send("Missing code or state");
  
  const docSnap = await getDoc(doc(db, 'settings', 'discord'));
  const data = docSnap.data();
  if (!data?.appId || !data?.clientSecret) return res.status(400).send("Discord app missing configuration");

  const redirectUri = `${req.protocol}://${req.get('host')}/api/discord/callback`;
  
  try {
    const params = new URLSearchParams();
    params.append('client_id', data.appId);
    params.append('client_secret', data.clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code as string);
    params.append('redirect_uri', redirectUri);

    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokens = tokenRes.data;

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const discordUser = userRes.data;

    const payload = JSON.stringify({
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordAccessToken: tokens.access_token,
      discordRefreshToken: tokens.refresh_token,
      discordTokenExpiresAt: Date.now() + (tokens.expires_in * 1000)
    });

    res.send(`<script>window.opener.postMessage({ type: 'discord_auth_success', data: ${payload} }, '*'); window.close();</script>`);
  } catch (err: any) {
    console.error("Discord oauth err", err.response?.data || err.message);
    res.status(500).send("Failed to link discord: " + (err.response?.data?.error_description || err.message));
  }
});

app.post('/api/discord/give-role', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Check discord settings
    const docSnap = await getDoc(doc(db, 'settings', 'discord'));
    const data = docSnap.data();
    if (!data?.token || !data?.guildId || !data?.roleId) {
       console.log("Discord bot token, guild ID, or role ID is not configured.");
       return res.status(400).json({ success: false, reason: "Discord settings incomplete" });
    }

    const userSnap = await getDoc(doc(db, 'users', userId));
    const userData = userSnap.data();
    if (!userData?.discordId || !userData?.discordAccessToken) {
        return res.json({ success: false, reason: "User has no linked discord" });
    }

    // Add member to guild
    try {
      await axios.put(`https://discord.com/api/guilds/${data.guildId}/members/${userData.discordId}`, {
        access_token: userData.discordAccessToken
      }, {
        headers: { 'Authorization': `Bot ${data.token}`, 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      console.log("Member may already be in guild, or adding failed", e.response?.data || e.message);
    }
    
    // Give Role
    try {
      await axios.put(`https://discord.com/api/guilds/${data.guildId}/members/${userData.discordId}/roles/${data.roleId}`, {}, {
         headers: { 'Authorization': `Bot ${data.token}` }
      });
    } catch(e:any) {
      console.log("Failed to give role", e.response?.data || e.message);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Discord give role error:", err);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
