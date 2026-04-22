import { getAdminDb } from '../_lib/firebase-admin.js';
import { getQueryValue } from '../_lib/http.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

function parseDataImage(image: string | undefined) {
  if (!image?.startsWith('data:image/')) return null;

  const match = image.match(/^data:(image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if (!match) return null;

  return {
    contentType: match[1].toLowerCase().replace('image/jpg', 'image/jpeg'),
    buffer: Buffer.from(match[2], 'base64')
  };
}

async function getProduct(slug: string) {
  const db = getAdminDb();
  const byId = await db.collection('products').doc(slug).get();

  if (byId.exists) {
    return byId.data();
  }

  const bySlug = await db.collection('products').where('slug', '==', slug).limit(1).get();
  return bySlug.empty ? null : bySlug.docs[0].data();
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const slug = getQueryValue(req.query?.slug);

    if (!slug) {
      res.status(400).send('Missing product slug.');
      return;
    }

    const product = await getProduct(slug);
    const parsed = parseDataImage(product?.image);

    if (!parsed) {
      res.status(404).send('Product image not found.');
      return;
    }

    res.setHeader('Content-Type', parsed.contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(parsed.buffer);
  } catch (error: any) {
    console.error('Product image render error:', error);
    res.status(500).send(error.message || 'Failed to render product image.');
  }
}
