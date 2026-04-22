import axios from 'axios';
import type { DocumentReference } from 'firebase-admin/firestore';

type DiscordSettings = {
  appId?: string;
  clientSecret?: string;
  token?: string;
  guildId?: string;
};

type DiscordUserData = {
  discordId?: string;
  discordAccessToken?: string;
  discordRefreshToken?: string;
  discordTokenExpiresAt?: number;
};

export async function refreshDiscordAccessToken(
  settings: DiscordSettings,
  user: DiscordUserData,
  userRef?: DocumentReference
) {
  if (!user.discordRefreshToken) {
    throw new Error('Missing Discord refresh token.');
  }

  if (!settings.appId || !settings.clientSecret) {
    throw new Error('Discord Application ID or Client Secret is missing.');
  }

  const params = new URLSearchParams();
  params.set('client_id', settings.appId);
  params.set('client_secret', settings.clientSecret);
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', user.discordRefreshToken);

  const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const tokens = tokenRes.data;
  const tokenPayload = {
    discordAccessToken: tokens.access_token,
    discordRefreshToken: tokens.refresh_token || user.discordRefreshToken,
    discordTokenExpiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000
  };

  if (userRef) {
    await userRef.update(tokenPayload);
  }

  return tokenPayload.discordAccessToken as string;
}

export async function getUsableDiscordAccessToken(
  settings: DiscordSettings,
  user: DiscordUserData,
  userRef?: DocumentReference
) {
  if (!user.discordAccessToken && !user.discordRefreshToken) {
    throw new Error('User has not authorized Discord guild join.');
  }

  if (user.discordAccessToken && Number(user.discordTokenExpiresAt || 0) > Date.now() + 60000) {
    return user.discordAccessToken;
  }

  if (user.discordRefreshToken) {
    return refreshDiscordAccessToken(settings, user, userRef);
  }

  return user.discordAccessToken as string;
}

export async function addDiscordGuildMember(settings: DiscordSettings, discordId: string, accessToken: string) {
  if (!settings.token || !settings.guildId) {
    throw new Error('Discord Bot Token or Server ID is missing.');
  }

  await axios.put(
    `https://discord.com/api/guilds/${settings.guildId}/members/${discordId}`,
    { access_token: accessToken },
    {
      headers: {
        Authorization: `Bot ${settings.token}`,
        'Content-Type': 'application/json'
      }
    }
  );
}
