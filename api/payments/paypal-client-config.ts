import { getPayPalConfig } from '../_lib/paypal.js';

type VercelRequest = {
  method?: string;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', 'GET');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const config = await getPayPalConfig();
    res.status(200).json({
      clientId: config.clientId,
      currency: 'USD'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'PayPal is not configured' });
  }
}
