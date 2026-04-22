import fs from 'fs';
import path from 'path';
import { getAdminDb } from './_lib/firebase-admin.js';
import { getQueryValue, getRequestOrigin } from './_lib/http.js';
import type { ApiRequest, ApiResponse } from './_lib/http.js';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripMarkdown(value: string) {
  return value
    .replace(/[#*_>`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAbsoluteImageUrl(image: string | undefined, origin: string, slug: string) {
  if (!image) {
    return `${origin}/background.png`;
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  if (image.startsWith('data:image/')) {
    return `${origin}/api/product-image?slug=${encodeURIComponent(slug)}`;
  }

  return `${origin}${image.startsWith('/') ? image : `/${image}`}`;
}

function replaceMetaTag(html: string, attrName: string, attrValue: string, replacement: string) {
  const escapedAttrName = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedAttrValue = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${escapedAttrName}=["']${escapedAttrValue}["'][^>]*>`, 'i');
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `    ${replacement}\n  </head>`);
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
    const origin = getRequestOrigin(req);
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

    if (!slug) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
      return;
    }

    const product = await getProduct(slug);

    if (product) {
      const title = escapeHtml(`${product.title || 'Product'} | Rumble Hub`);
      const description = escapeHtml(
        stripMarkdown(product.description || `Buy ${product.title || 'this product'} on Rumble Hub.`).slice(0, 180)
      );
      const image = escapeHtml(getAbsoluteImageUrl(product.image, origin, slug));
      const url = escapeHtml(`${origin}/product/${slug}`);

      html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
      html = replaceMetaTag(html, 'name', 'description', `<meta name="description" content="${description}" />`);
      html = replaceMetaTag(html, 'property', 'og:type', `<meta property="og:type" content="product" />`);
      html = replaceMetaTag(html, 'property', 'og:title', `<meta property="og:title" content="${title}" />`);
      html = replaceMetaTag(html, 'property', 'og:description', `<meta property="og:description" content="${description}" />`);
      html = replaceMetaTag(html, 'property', 'og:image', `<meta property="og:image" content="${image}" />`);
      html = replaceMetaTag(html, 'property', 'og:url', `<meta property="og:url" content="${url}" />`);
      html = replaceMetaTag(html, 'name', 'twitter:card', `<meta name="twitter:card" content="summary_large_image" />`);
      html = replaceMetaTag(html, 'name', 'twitter:title', `<meta name="twitter:title" content="${title}" />`);
      html = replaceMetaTag(html, 'name', 'twitter:description', `<meta name="twitter:description" content="${description}" />`);
      html = replaceMetaTag(html, 'name', 'twitter:image', `<meta name="twitter:image" content="${image}" />`);
      html = replaceMetaTag(html, 'name', 'twitter:url', `<meta name="twitter:url" content="${url}" />`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error: any) {
    console.error('Product page render error:', error);
    res.status(500).send(error.message || 'Failed to render product page.');
  }
}
