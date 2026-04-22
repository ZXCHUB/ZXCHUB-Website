import axios from 'axios';
import { getAdminDb } from '../_lib/firebase-admin.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId } = req.body ?? {};

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const db = getAdminDb();
    const [settingsSnap, userSnap] = await Promise.all([
      db.collection('settings').doc('discord').get(),
      db.collection('users').doc(userId).get()
    ]);

    const settings = settingsSnap.data();
    const user = userSnap.data();

    if (!settings?.token || !settings?.guildId || !settings?.roleId) {
      res.status(400).json({ error: 'Discord Bot Token, Guild ID, and Role ID are required.' });
      return;
    }

    if (!user?.discordId || !user?.discordAccessToken) {
      res.status(400).json({ error: 'User has not linked Discord.' });
      return;
    }

    try {
      await axios.put(
        `https://discord.com/api/guilds/${settings.guildId}/members/${user.discordId}`,
        { access_token: user.discordAccessToken },
        {
          headers: {
            Authorization: `Bot ${settings.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      console.log('Discord guild join skipped or failed:', error.response?.data || error.message);
    }

    await axios.put(
      `https://discord.com/api/guilds/${settings.guildId}/members/${user.discordId}/roles/${settings.roleId}`,
      {},
      { headers: { Authorization: `Bot ${settings.token}` } }
    );

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Discord give role error:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || error.message || 'Failed to assign Discord role.' });
  }
}
