# 🔐 OTP Authentication - Testing Guide

## ✅ What's Ready

All OTP endpoints are now implemented and the database schema is updated:

### Backend Files Updated
- ✅ `server/routes/auth.js` - 5 OTP endpoints implemented
- ✅ `server/services/otpService.js` - OTP service complete
- ✅ `server/middleware/auth.js` - Updated for phone-based auth
- ✅ `server/prisma/schema.prisma` - OTPSession model added, schema maps fixed
- ✅ Database migration applied successfully

### Endpoints Ready to Test

```
POST /api/auth/request-otp
POST /api/auth/verify-otp
GET  /api/auth/me
POST /api/auth/logout
PUT  /api/auth/profile
```

---

## 🧪 Testing Instructions

### 1. Start the Backend Server

```bash
cd server
npm start
# Server runs on http://localhost:5000
```

### 2. Request OTP (Step 1: Initiate Login)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "userId": "uuid-here",
  "message": "OTP sent to your phone"
}
```

**Console Output:**
```
📱 OTP for +919876543210: 123456
```
(The OTP will be logged to console in development mode)

---

### 3. Verify OTP (Step 2: Complete Login)

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-from-step-1",
    "otp": "123456"
  }' \
  -c cookies.txt  # Save cookies for next requests
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "phone": "+919876543210",
      "name": "User-3210",
      "is_admin": false
    },
    "token": "eyJhbGc..."
  }
}
```

**What Happens:**
- ✅ OTP session is deleted from database (one-time use)
- ✅ JWT token is generated (valid for 7 days)
- ✅ httpOnly cookie is set automatically

---

### 4. Verify Session (Check if Logged In)

**Request:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -b cookies.txt  # Use cookies from step 3
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "phone": "+919876543210",
      "name": "User-3210",
      "is_admin": false
    }
  }
}
```

---

### 5. Update Profile

**Request:**
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe"
  }' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": {
    "user": {
      "id": "uuid-here",
      "phone": "+919876543210",
      "name": "John Doe",
      "is_admin": false
    }
  }
}
```

---

### 6. Logout

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**What Happens:**
- ✅ authToken cookie is cleared
- ✅ User must request OTP again to login

---

## 🚨 Error Scenarios to Test

### Invalid Phone
```bash
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "123"}' # Too short
```
→ Returns 400: "Valid phone number required"

### Expired OTP
```bash
# Wait 5+ minutes after requesting OTP, then try to verify
→ Returns 400: "OTP expired. Please request a new one."
```

### Wrong OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "...",
    "otp": "999999"  # Wrong code
  }'
```
→ Returns 400: "Invalid OTP"

### Not Authenticated
```bash
curl -X GET http://localhost:5000/api/auth/me
# No cookies/token provided
```
→ Returns 401: "Access token required"

---

## 📱 Frontend Integration (Next Step)

Once backend is verified working:

1. Update `client/src/pages/LoginPage.js` to use OTP flow:
   ```javascript
   const store = useAuthStore();
   
   // Step 1: Request OTP
   const userId = await store.requestOTP(phone);
   
   // Step 2: Verify OTP
   await store.verifyOTP(userId, otp);
   
   // User is now logged in, redirect to home
   ```

2. The `useAuthStore` already has these methods implemented

---

## 🛠️ Development Notes

### Console Logs
The OTP is printed to server console in development:
```
📱 OTP for +919876543210: 123456
```

### Production SMS Integration
When deploying to production:
1. Update `server/services/otpService.js` - `sendOTP()` method
2. Integrate with MSG91 API or Firebase Cloud Messaging
3. Remove console.log for security

### Database
- OTP sessions expire automatically (5 minutes)
- Used OTPs are deleted immediately
- User is created automatically on first OTP request

---

## ✉️ Complete E2E Test Flow

```bash
# 1. Request OTP for new user
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "9999999999"}' \
  -v > /tmp/otp_response.txt

# Extract userId from response
export USER_ID="<uuid-from-response>"
export OTP="<otp-from-console-log>"

# 2. Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"otp\": \"$OTP\"}" \
  -c /tmp/cookies.txt \
  -v

# 3. Check authentication
curl -X GET http://localhost:5000/api/auth/me \
  -b /tmp/cookies.txt \
  -v

# 4. Update profile
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User"}' \
  -b /tmp/cookies.txt \
  -v

# 5. Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -b /tmp/cookies.txt \
  -v

# 6. Try accessing protected route after logout (should fail)
curl -X GET http://localhost:5000/api/auth/me \
  -b /tmp/cookies.txt \
  -v
```

---

## ✅ Checklist - Before Moving to LoginPage Refactor

- [ ] Server starts without errors
- [ ] POST /api/auth/request-otp returns userId
- [ ] OTP is printed to console
- [ ] POST /api/auth/verify-otp accepts OTP and returns token
- [ ] GET /api/auth/me returns current user with httpOnly cookie
- [ ] PUT /api/auth/profile updates user name
- [ ] POST /api/auth/logout clears cookie
- [ ] OTP expires after 5 minutes (cannot verify old OTP)
- [ ] Invalid OTP is rejected
- [ ] Phone validation works (rejects < 10 digits)
- [ ] Multiple users can register with different phones
- [ ] Admin user can be set manually: `UPDATE users SET is_admin = true WHERE phone = '+919999999999'`

---

**Status:** ✅ Backend OTP Auth Complete - Ready for Frontend Integration

Next: [Refactor LoginPage.js](../client/src/pages/LoginPage.js) to use OTP flow
