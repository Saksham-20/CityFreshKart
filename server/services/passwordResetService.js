const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../database/config');

const OTP_LENGTH = 6;
const OTP_MAX_ATTEMPTS = 5;
const OTP_TTL_MINUTES = Math.max(parseInt(process.env.PASSWORD_RESET_OTP_TTL_MINUTES || '10', 10) || 10, 1);
const OTP_RESEND_COOLDOWN_SECONDS = Math.max(parseInt(process.env.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS || '60', 10) || 60, 10);
const RESET_TOKEN_TTL_MINUTES = Math.max(parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '10', 10) || 10, 1);

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizePhone(phone = '') {
  return String(phone).replace(/\D/g, '').slice(-10);
}

function generateOtp() {
  const max = 10 ** OTP_LENGTH;
  return String(crypto.randomInt(0, max)).padStart(OTP_LENGTH, '0');
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createAndStoreOtp({ userId, email, phone }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await pool.query('BEGIN');
  try {
    const activeResult = await pool.query(
      `SELECT id, last_sent_at
       FROM password_reset_otps
       WHERE user_id = $1
         AND email = $2
         AND phone = $3
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [userId, normalizedEmail, normalizedPhone],
    );

    if (activeResult.rows[0]) {
      const lastSentAt = new Date(activeResult.rows[0].last_sent_at).getTime();
      const elapsedSeconds = Math.floor((Date.now() - lastSentAt) / 1000);
      if (elapsedSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        const err = new Error('Please wait before requesting another OTP');
        err.code = 'OTP_RESEND_COOLDOWN';
        err.retryAfterSeconds = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        throw err;
      }
    }

    await pool.query(
      `UPDATE password_reset_otps
       SET used_at = NOW()
       WHERE user_id = $1
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [userId],
    );

    await pool.query(
      `INSERT INTO password_reset_otps (
         user_id, email, phone, otp_hash, reset_token_hash, expires_at,
         attempt_count, last_sent_at, created_at
       )
       VALUES (
         $1, $2, $3, $4, NULL, NOW() + ($5 || ' minutes')::interval,
         0, NOW(), NOW()
       )`,
      [userId, normalizedEmail, normalizedPhone, otpHash, OTP_TTL_MINUTES],
    );

    await pool.query('COMMIT');
    return otp;
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function verifyOtpAndCreateResetToken({ phone, email, otp }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  await pool.query('BEGIN');
  try {
    const otpResult = await pool.query(
      `SELECT id, otp_hash, attempt_count
       FROM password_reset_otps
       WHERE phone = $1
         AND email = $2
         AND used_at IS NULL
         AND expires_at > NOW()
         AND verified_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedPhone, normalizedEmail],
    );

    const record = otpResult.rows[0];
    if (!record) {
      const err = new Error('Invalid or expired OTP');
      err.code = 'OTP_INVALID_OR_EXPIRED';
      throw err;
    }

    if (record.attempt_count >= OTP_MAX_ATTEMPTS) {
      await pool.query('UPDATE password_reset_otps SET used_at = NOW() WHERE id = $1', [record.id]);
      const err = new Error('OTP attempt limit exceeded');
      err.code = 'OTP_ATTEMPTS_EXCEEDED';
      throw err;
    }

    const isMatch = await bcrypt.compare(String(otp || ''), record.otp_hash || '');
    if (!isMatch) {
      const updateAttempt = await pool.query(
        `UPDATE password_reset_otps
         SET attempt_count = attempt_count + 1,
             used_at = CASE WHEN attempt_count + 1 >= $2 THEN NOW() ELSE used_at END
         WHERE id = $1
         RETURNING attempt_count`,
        [record.id, OTP_MAX_ATTEMPTS],
      );
      const attemptsUsed = updateAttempt.rows[0]?.attempt_count || record.attempt_count + 1;
      const err = new Error('Invalid OTP');
      err.code = 'OTP_INVALID';
      err.attemptsRemaining = Math.max(OTP_MAX_ATTEMPTS - attemptsUsed, 0);
      throw err;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    await pool.query(
      `UPDATE password_reset_otps
       SET otp_hash = NULL,
           reset_token_hash = $2,
           verified_at = NOW(),
           expires_at = NOW() + ($3 || ' minutes')::interval,
           attempt_count = 0
       WHERE id = $1`,
      [record.id, tokenHash, RESET_TOKEN_TTL_MINUTES],
    );
    await pool.query('COMMIT');
    return rawToken;
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

async function consumeResetTokenAndUpdatePassword({ phone, email, resetToken, newPassword }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);
  const tokenHash = hashResetToken(resetToken);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('BEGIN');
  try {
    const otpResult = await pool.query(
      `SELECT id, user_id
       FROM password_reset_otps
       WHERE phone = $1
         AND email = $2
         AND reset_token_hash = $3
         AND used_at IS NULL
         AND verified_at IS NOT NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [normalizedPhone, normalizedEmail, tokenHash],
    );
    const record = otpResult.rows[0];
    if (!record) {
      const err = new Error('Invalid or expired reset token');
      err.code = 'RESET_TOKEN_INVALID';
      throw err;
    }

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           token_version = COALESCE(token_version, 0) + 1,
           password_changed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, record.user_id],
    );

    await pool.query('UPDATE password_reset_otps SET used_at = NOW() WHERE id = $1', [record.id]);
    await pool.query(
      `UPDATE password_reset_otps
       SET used_at = NOW()
       WHERE user_id = $1
         AND id <> $2
         AND used_at IS NULL`,
      [record.user_id, record.id],
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

module.exports = {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MINUTES,
  normalizePhone,
  normalizeEmail,
  createAndStoreOtp,
  verifyOtpAndCreateResetToken,
  consumeResetTokenAndUpdatePassword,
};
