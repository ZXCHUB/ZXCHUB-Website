import { getStripe } from '../_lib/stripe.js';

type VercelRequest = {
  method?: string;
  body?: any;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { sessionId } = req.body ?? {};

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      res.status(200).json({
        success: true,
        metadata: session.metadata,
        amount: session.amount_total ? session.amount_total / 100 : 0
      });
      return;
    }

    res.status(200).json({ success: false });
  } catch (error: any) {
    console.error('Verify Error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify checkout session' });
  }
}
