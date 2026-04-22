import { getAuth } from 'firebase-admin/auth';
import { addDiscordGuildMember, getUsableDiscordAccessToken } from '../_lib/discord.js';
import { getAdminDb } from '../_lib/firebase-admin.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

type RejoinResult = {
  userId: string;
  discordUsername?: string;
  status: 'joined' | 'skipped' | 'failed';
  reason?: string;
};

async function requireAdmin(req: ApiRequest) {
  const header = req.headers.authorization || req.headers.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const token = value?.startsWith('Bearer ') ? value.slice(7) : '';

  if (!token) {
    throw new Error('Missing admin token.');
  }

  const decoded = await getAuth().verifyIdToken(token);
  const db = getAdminDb();
  const userSnap = await db.collection('users').doc(decoded.uid).get();
  const role = userSnap.data()?.role;

  if (role !== 'admin' && decoded.email !== 'zxchubadmin@gmail.com') {
    throw new Error('Admin access is required.');
  }

  return decoded.uid;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await requireAdmin(req);

    const db = getAdminDb();
    const settingsSnap = await db.collection('settings').doc('discord').get();
    const settings = settingsSnap.data();

    if (!settings?.token || !settings?.guildId || !settings?.appId || !settings?.clientSecret) {
      res.status(400).json({
        error: 'Discord Bot Token, Server ID, Application ID, and Client Secret are required before Force Rejoin.'
      });
      return;
    }

    const usersSnap = await db.collection('users').get();
    const results: RejoinResult[] = [];

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();

      if (!user.discordId) {
        results.push({ userId: userDoc.id, status: 'skipped', reason: 'No linked Discord account.' });
        continue;
      }

      if (!user.discordAccessToken && !user.discordRefreshToken) {
        results.push({
          userId: userDoc.id,
          discordUsername: user.discordUsername,
          status: 'skipped',
          reason: 'Missing Discord OAuth token.'
        });
        continue;
      }

      try {
        const accessToken = await getUsableDiscordAccessToken(settings, user, userDoc.ref);
        await addDiscordGuildMember(settings, user.discordId, accessToken);
        results.push({
          userId: userDoc.id,
          discordUsername: user.discordUsername,
          status: 'joined'
        });
      } catch (error: any) {
        results.push({
          userId: userDoc.id,
          discordUsername: user.discordUsername,
          status: 'failed',
          reason: error.response?.data?.message || error.response?.data?.error_description || error.message || 'Discord join failed.'
        });
      }
    }

    const summary = results.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { joined: 0, skipped: 0, failed: 0 }
    );

    res.status(200).json({
      success: true,
      guildInvite: settings.guildInvite || 'https://discord.gg/zxchub',
      summary,
      results: results.slice(0, 100)
    });
  } catch (error: any) {
    const message = error.message || 'Force rejoin failed.';
    const status = message.includes('Admin access') || message.includes('admin token') ? 403 : 500;
    console.error('Discord force rejoin error:', error.response?.data || message);
    res.status(status).json({ error: message });
  }
}
