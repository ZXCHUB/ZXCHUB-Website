import { getAdminDb } from './_lib/firebase-admin.js';
import type { ApiRequest, ApiResponse } from './_lib/http.js';

export default async function handler(_req: ApiRequest, res: ApiResponse) {
  try {
    const db = getAdminDb();
    const transactionsSnap = await db.collection('transactions').where('type', '==', 'purchase').get();

    const productsSold = transactionsSnap.docs.reduce((total, doc) => {
      const data = doc.data();
      return total + (Array.isArray(data.items) ? data.items.length : 1);
    }, 0);

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    res.status(200).json({ productsSold });
  } catch (error: any) {
    console.error('Store stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to load store stats.' });
  }
}
