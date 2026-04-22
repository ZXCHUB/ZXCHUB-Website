import axios from 'axios';
import { getAdminDb } from '../_lib/firebase-admin.js';
import { getQueryValue, getRequestOrigin } from '../_lib/http.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', 'GET');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const code = getQueryValue(req.query?.code);
  const uid = getQueryValue(req.query?.state);

  if (!code || !uid) {
    res.status(400).send('Missing code or state');
    return;
  }

  try {
    const settingsSnap = await getAdminDb().collection('settings').doc('discord').get();
    const settings = settingsSnap.data();

    if (!settings?.appId || !settings?.clientSecret) {
      res.status(400).send('Discord app is missing Application ID or Client Secret.');
      return;
    }

    const redirectUri = `${getRequestOrigin(req)}/api/discord/callback`;
    const params = new URLSearchParams();

    params.set('client_id', settings.appId);
    params.set('client_secret', settings.clientSecret);
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', redirectUri);

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
      discordTokenExpiresAt: Date.now() + tokens.expires_in * 1000
    }).replace(/</g, '\\u003c');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`
      <!doctype html>
      <html>
        <body>
          <script>
            window.opener?.postMessage({ type: 'discord_auth_success', data: ${payload} }, '*');
            window.close();
          </script>
          Discord linked. You can close this window.
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Discord oauth error:', error.response?.data || error.message);
    res.status(500).send(`Failed to link Discord: ${error.response?.data?.error_description || error.message}`);
  }
}
