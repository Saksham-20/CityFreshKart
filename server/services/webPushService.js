const webpush = require('web-push');
const { query } = require('../database/config');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@cityfreshkart.local';

let enabled = false;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  enabled = true;
} else {
  console.warn('Web Push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing');
}

function normalizePayload(payload = {}) {
  return {
    title: payload.title || 'CityFreshKart',
    body: payload.body || 'You have a new update.',
    url: payload.url || '/',
    orderId: payload.orderId || null,
    type: payload.type || 'general',
  };
}

async function subscribe(subscription, userId) {
  if (!subscription || !subscription.endpoint || !userId) {
    throw new Error('Invalid subscription payload');
  }

  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, subscription)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (endpoint)
     DO UPDATE SET user_id = EXCLUDED.user_id, subscription = EXCLUDED.subscription, updated_at = CURRENT_TIMESTAMP`,
    [userId, subscription.endpoint, JSON.stringify(subscription)],
  );
}

async function unsubscribeByEndpoint(endpoint) {
  if (!endpoint) return;
  await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

async function unsubscribeByEndpointForUser(endpoint, userId) {
  if (!endpoint || !userId) return 0;
  const result = await query(
    'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
    [endpoint, userId],
  );
  return result.rowCount;
}

async function sendToSubscription(subscription, payload) {
  if (!enabled) return { sent: false, reason: 'web-push-disabled' };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(normalizePayload(payload)));
    return { sent: true };
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      // Subscription expired or no longer valid
      await unsubscribeByEndpoint(subscription.endpoint);
    }
    return { sent: false, reason: error.message };
  }
}

async function sendToUser(userId, payload) {
  if (!userId) return { sent: 0 };
  const result = await query(
    'SELECT endpoint, subscription FROM push_subscriptions WHERE user_id = $1',
    [userId],
  );

  let sent = 0;
  for (const row of result.rows) {
    const status = await sendToSubscription(row.subscription, payload);
    if (status.sent) sent += 1;
  }
  return { sent };
}

async function sendToAdmins(payload) {
  const admins = await query('SELECT id FROM users WHERE is_admin = true');
  let sent = 0;
  for (const admin of admins.rows) {
    const status = await sendToUser(admin.id, payload);
    sent += status.sent || 0;
  }
  return { sent };
}

async function sendToAllSubscribers(payload) {
  const result = await query('SELECT endpoint, subscription FROM push_subscriptions');
  let sent = 0;
  for (const row of result.rows) {
    const status = await sendToSubscription(row.subscription, payload);
    if (status.sent) sent += 1;
  }
  return { sent };
}

module.exports = {
  enabled,
  subscribe,
  unsubscribeByEndpoint,
  unsubscribeByEndpointForUser,
  sendToUser,
  sendToAdmins,
  sendToAllSubscribers,
};

