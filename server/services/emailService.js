const { Resend } = require('resend');
const { logStructured } = require('../utils/requestContext');
const { OTP_TTL_MINUTES } = require('./passwordResetService');

let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

function isEmailDeliveryEnabled() {
  return Boolean(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_FROM_EMAIL &&
    process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID,
  );
}

function assertEmailConfigForProduction() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_PASSWORD_RESET_TEMPLATE_ID',
  ];
  const missing = required.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length > 0) {
    console.error(`FATAL: Missing required email env vars in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function sendPasswordResetOtpEmail({ toEmail, otp }) {
  const client = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL;
  const templateId = process.env.RESEND_PASSWORD_RESET_TEMPLATE_ID;
  if (!client || !from || !templateId) {
    const err = new Error('Email provider is not configured');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const appName = process.env.APP_NAME || 'CityFreshKart';
  try {
    await client.emails.send({
      from,
      to: [toEmail],
      template: {
        id: templateId,
        variables: {
          otp_code: String(otp),
          expiry_time: String(OTP_TTL_MINUTES),
          app_name: appName,
        },
      },
    });
  } catch (error) {
    logStructured('error', {
      event: 'password_reset_email_failed',
      message: error.message,
      code: error.code,
      provider: 'resend',
    });
    const err = new Error('Failed to send reset email');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }
}

module.exports = {
  assertEmailConfigForProduction,
  isEmailDeliveryEnabled,
  sendPasswordResetOtpEmail,
};
