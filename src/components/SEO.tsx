import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  themeColor?: string;
}

export default function SEO({ 
  title = "ZXCHUB | Roblox Scripts and Keys", 
  description = "Browse ZXCHUB scripts, get key access, and manage your purchases.", 
  image = "/logo.png", 
  url,
  type = "website",
  themeColor = "#ef4444"
}: SEOProps) {
  const currentUrl = url || window.location.href;
  const currentPath = new URL(currentUrl).pathname;
  const productSlug = currentPath.startsWith('/product/') ? currentPath.split('/product/')[1]?.split('/')[0] : '';
  const fullImageUrl = image.startsWith('data:image/') && productSlug
    ? `${window.location.origin}/api/product-image?slug=${encodeURIComponent(productSlug)}`
    : image.startsWith('/') && window.location.origin 
      ? `${window.location.origin}${image}` 
      : image;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {themeColor && <meta name="theme-color" content={themeColor} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={currentUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:url" content={currentUrl} />
    </Helmet>
  );
}
