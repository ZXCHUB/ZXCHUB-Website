import Stripe from 'stripe';
import { getAdminDb } from './firebase-admin.js';

let stripeClient: Stripe | null = null;

export async function getStripe() {
  if (!stripeClient) {
    let key = process.env.STRIPE_SECRET_KEY || '';

    if (!key) {
      try {
        const snap = await getAdminDb().collection('settings').doc('payments').get();
        const stripe = snap.data()?.stripe;
        if (stripe?.enabled && stripe?.apiKey) {
          key = stripe.apiKey;
        }
      } catch (error) {
        console.error('Failed to load Stripe settings:', error);
      }
    }

    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set in the environment variables.');
    }

    stripeClient = new Stripe(key, {
      apiVersion: '2026-02-25.clover' as any
    });
  }

  return stripeClient;
}
