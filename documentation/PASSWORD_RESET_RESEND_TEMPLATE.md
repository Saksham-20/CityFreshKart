# Password Reset via Resend Template

This project uses OTP-based password reset with template-driven emails through Resend.

## Required Server Environment Variables

```bash
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL="CityFreshKart <no-reply@cityfreshkart.com>"
RESEND_PASSWORD_RESET_TEMPLATE_ID=your_template_id
PASSWORD_RESET_OTP_TTL_MINUTES=10
PASSWORD_RESET_RESEND_COOLDOWN_SECONDS=60
PASSWORD_RESET_TOKEN_TTL_MINUTES=10
RESET_INIT_RATE_LIMIT_MAX=20
RESET_VERIFY_RATE_LIMIT_MAX=30
```

In production, the server fails fast at startup if `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, or `RESEND_PASSWORD_RESET_TEMPLATE_ID` is missing.

## Resend Template Variables

The password reset template must define these variables:

- `otp_code`
- `expiry_time`
- `app_name`

Subject is controlled in Resend template configuration (not by backend payload).

## API Test Flow

Use these requests after server restart:

```bash
# 1) Start with phone
curl -X POST http://localhost:5006/api/auth/forgot-password/start \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```

```bash
# 2) Confirm phone + email and send OTP
curl -X POST http://localhost:5006/api/auth/forgot-password/email \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","email":"known-user@cityfreshkart.com"}'
```

```bash
# 3) Verify OTP from email
curl -X POST http://localhost:5006/api/auth/verify-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","email":"known-user@cityfreshkart.com","otp":"123456"}'
```

```bash
# 4) Reset password using resetToken from step 3
curl -X POST http://localhost:5006/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","email":"known-user@cityfreshkart.com","resetToken":"RESET_TOKEN_HERE","newPassword":"NewStrongPass123"}'
```

## Production Readiness Checklist

- Phone verification step ensures reset is tied to account phone.
- Email mismatch for a valid phone returns clear mismatch message.
- If account has no email, flow allows attaching email before OTP send.
- OTP resend before cooldown returns `429` + `OTP_RESEND_COOLDOWN`.
- Invalid OTP increments attempts and enforces lockout at max attempts.
- Reset token is single-use and expires.
- Password reset increments user `token_version` so old JWT sessions are invalidated.
