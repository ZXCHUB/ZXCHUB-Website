import { getAdminDb } from '../_lib/firebase-admin.js';
import { getQueryValue, getRequestOrigin } from '../_lib/http.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', 'GET');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const uid = getQueryValue(req.query?.uid);
    if (!uid) {
      res.status(400).json({ error: 'uid is required' });
      return;
    }

    const settingsSnap = await getAdminDb().collection('settings').doc('discord').get();
    const settings = settingsSnap.data();

    if (!settings?.appId) {
      res.status(400).json({ error: 'Discord Application ID is not configured.' });
      return;
    }

    const redirectUri = `${getRequestOrigin(req)}/api/discord/callback`;
    const url = new URL('https://discord.com/api/oauth2/authorize');

    url.searchParams.set('client_id', settings.appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify guilds.join');
    url.searchParams.set('state', uid);

    res.status(302);
    res.setHeader('Location', url.toString());
    res.end();
  } catch (error: any) {
    console.error('Discord auth url error:', error);
    res.status(500).json({ error: error.message || 'Failed to start Discord OAuth.' });
  }
}
