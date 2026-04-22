import axios from 'axios';
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

async function requireAdmin(req: ApiRequest, db: ReturnType<typeof getAdminDb>) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  const value = Array.isArray(header) ? header[0] : header;
  const token = value?.startsWith('Bearer ') ? value.slice(7) : '';

  if (!token) {
    throw new Error('Missing admin token.');
  }

  const decoded = await getAuth().verifyIdToken(token);
  const userSnap = await db.collection('users').doc(decoded.uid).get();
  const role = userSnap.data()?.role;

  if (role !== 'admin' && decoded.email !== 'zxchubadmin@gmail.com') {
    throw new Error('Admin access is required.');
  }
}

async function forceAllRejoin(req: ApiRequest, res: ApiResponse) {
  const db = getAdminDb();
  await requireAdmin(req, db);

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
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { action, userId } = req.body ?? {};

    if (action === 'force-rejoin') {
      await forceAllRejoin(req, res);
      return;
    }

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
      const accessToken = await getUsableDiscordAccessToken(settings, user, userSnap.ref);
      await addDiscordGuildMember(settings, user.discordId, accessToken);
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
