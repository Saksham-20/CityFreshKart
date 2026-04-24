# CityFreshKart Logout & Session Fixes - Verification Guide

## Overview
All logout and session management issues have been fixed. This guide walks you through testing and verification.

---

## Summary of Changes

### Backend (Node.js/Express)
- **Added `/auth/logout` endpoint** — Clears httpOnly cookie, enables server-side session cleanup
- **Added `/auth/refresh` endpoint** — Issues new tokens with fresh expiration, allows graceful token renewal

### Frontend (React)
- **Enhanced API interceptor** — Auto-refreshes expired tokens before failing requests (prevents sudden logouts)
- **Updated Zustand logout** — Calls /auth/logout endpoint, clears all localStorage, notifies service worker
- **Updated Context logout** — Mirrors Zustand behavior for consistency
- **Service worker enhancement** — Listens for logout message, clears all caches (PWA support)
- **Fixed async logout handlers** — Header & ProfilePage now properly await logout completion

### Key Improvements
1. **No more sudden logouts on token expiry** — System auto-refreshes tokens before they expire
2. **Complete server-side cleanup on logout** — httpOnly cookie properly cleared
3. **PWA cache invalidation** — Service worker clears caches on logout (prevents stale auth state)
4. **Refresh loop prevention** — Only one token refresh happens at a time, queues multiple 401 responses
5. **Dual auth system sync** — Both Zustand and Context properly manage logout

---

## Testing Checklist

### ✅ Backend Endpoint Tests (Use Postman/curl)

**1. Test /auth/logout endpoint**
```bash
# Prerequisite: Get a valid token from /auth/login first
TOKEN="your_token_here"

# Test logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -b "authToken=$TOKEN"

# Expected: 200 OK with success: true
# Cookie should be cleared (maxAge: 0)
```

**2. Test /auth/refresh endpoint with valid token**
```bash
TOKEN="your_token_here"

curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -b "authToken=$TOKEN"

# Expected: 200 OK with new token in response.data.token
# Cookie should have new token set
```

**3. Test /auth/refresh with expired token**
```bash
# Use a token that's expired
EXPIRED_TOKEN="expired_token_here"

curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Authorization: Bearer $EXPIRED_TOKEN" \
  -b "authToken=$EXPIRED_TOKEN"

# Expected: 200 OK with new token (expired tokens CAN be refreshed)
```

**4. Test /auth/refresh with invalid token**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Unauthorized
```

**5. Test /auth/refresh without token**
```bash
curl -X POST http://localhost:5000/api/auth/refresh

# Expected: 401 with message "Token required for refresh"
```

---

### ✅ Frontend Integration Tests (Browser)

#### **Test 1: Basic Login & Logout**
1. Open app in browser
2. Navigate to login page
3. Log in with valid credentials
4. Open DevTools → Application → Cookies → Check `authToken` exists
5. Open DevTools → Application → Storage → localStorage → Check `token` key exists
6. Click logout button
7. Verify:
   - ✅ Redirected to login page
   - ✅ Cookies cleared: `authToken` should not exist
   - ✅ localStorage cleared: `token` and `user` should not exist
   - ✅ Toast shows "Logged out successfully"

#### **Test 2: Auto-Refresh on Token Expiry**
1. Log in successfully
2. Open DevTools → Console
3. Manually update token in localStorage to an expired token:
   ```javascript
   // In DevTools console
   const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid";
   localStorage.setItem('token', expiredToken);
   ```
4. Make any API request (e.g., go to profile page)
5. Verify in DevTools → Network:
   - ✅ First request gets 401
   - ✅ POST /auth/refresh is called
   - ✅ Original request is retried with new token
   - ✅ Original request succeeds (200 OK)

#### **Test 3: Multiple Simultaneous Requests After Token Expiry**
1. Log in successfully
2. Set expired token in localStorage (see Test 2)
3. Rapidly navigate to multiple pages that require auth (profile, cart, orders)
4. Check DevTools → Network:
   - ✅ Multiple 401 responses
   - ✅ **Only ONE** POST /auth/refresh call (not multiple)
   - ✅ All pending requests queue and retry with new token
   - ✅ No refresh loop

#### **Test 4: PWA Cache Invalidation on Logout**
1. Ensure app is installed as PWA (or use DevTools → Application → Service Workers)
2. Log in successfully
3. Open DevTools → Application → Cache Storage → Note cached pages
4. Click logout
5. Wait 1-2 seconds
6. Check DevTools → Application → Cache Storage:
   - ✅ All caches should be cleared
7. Log back in
8. Verify no cached data from previous session is shown

#### **Test 5: Stay Logged In After Refresh**
1. Log in successfully
2. Press F5 (refresh page)
3. Verify:
   - ✅ Still logged in after refresh
   - ✅ User info displayed
   - ✅ No automatic logout

#### **Test 6: Token Refresh in Background**
1. Log in successfully
2. Wait for 5+ minutes (token should still be valid)
3. Make a request to any endpoint
4. Should complete without 401 or refresh
5. If token is close to 7-day expiry:
   - Make request
   - Should auto-refresh in background
   - Request succeeds with new token

#### **Test 7: Logout Persists After Kill App (PWA)**
1. On Android/iOS: Install PWA from Chrome menu
2. Log in within PWA
3. Close app completely (force quit)
4. Reopen PWA
5. Verify still logged in (PWA has local storage)
6. Click logout
7. Close app completely
8. Reopen PWA
9. Verify logged out (redirects to login page)

#### **Test 8: Session Revocation (Optional - Advanced)**
1. Log in from Device A
2. Get the JWT token from DevTools
3. Log in from Device B (same user)
4. From backend: Increment user's `token_version` in database
5. On Device A: Try to make any API request
6. Verify:
   - ✅ Request fails with 401
   - ✅ Token refresh attempt also fails (token_version mismatch)
   - ✅ Automatically logs out
   - ✅ Redirects to login

---

### ✅ Mobile/Android PWA Tests

#### **Prerequisites**
- Deploy app to production or use ngrok for HTTPS tunneling
- Open Chrome on Android phone
- Navigate to site URL
- Install PWA from Chrome menu

#### **Test 1: PWA Install & Login**
1. Install app as PWA
2. Open installed app
3. Log in
4. Verify:
   - ✅ Still logged in if close and reopen app
   - ✅ Background data sync works

#### **Test 2: PWA Logout**
1. Log in from PWA
2. Tap menu → Logout
3. Verify:
   - ✅ Logged out
   - ✅ If reopen app, redirects to login
   - ✅ Cache is cleared

#### **Test 3: PWA Offline Token Refresh**
1. Log in from PWA
2. Expire the token in DevTools
3. Go offline (airplane mode)
4. Try to navigate to protected page
5. Verify:
   - ✅ Fails gracefully (can't refresh offline)
   - ✅ Shows offline message or cached page
6. Come back online
7. Try again:
   - ✅ Should refresh token and succeed

#### **Test 4: PWA Session Persistence**
1. Log in from PWA
2. Leave app running in background for 1 hour
3. Return to app
4. Verify:
   - ✅ Still logged in (token refreshed in background)
   - ✅ Can make requests normally

---

## Edge Cases & Known Behaviors

### ✅ What Should Happen

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| Token expires while app is idle | Auto-refresh on next request | ✅ Implemented |
| Multiple 401s simultaneously | Only one refresh, others queue | ✅ Implemented |
| Logout from one tab | Other tabs still have auth until refresh | ⚠️ Expected (httpOnly cookie still sent by browser) |
| Logout endpoint unreachable | Client state still clears | ✅ Implemented (best effort) |
| Token refresh fails | Automatic logout | ✅ Implemented |
| PWA offline with expired token | Can't refresh, needs online | ✅ Implemented |
| Service worker not available | Logout still works | ✅ Implemented (graceful fallback) |
| Rapid logout calls | Handled gracefully, no errors | ✅ Implemented |

### ⚠️ Known Limitations

1. **Logout from one browser tab doesn't immediately log out other tabs**
   - Browser limitation: httpOnly cookies still sent to all tabs until they refresh
   - Solution: Could add cross-tab messaging (future improvement)

2. **7-day hard expiration still exists**
   - If user doesn't use app for 7 days, token is gone
   - Solution: Implement 15-min + 7-day token split (future improvement)

3. **Offline PWA can't refresh tokens**
   - PWA can't call server while offline
   - Solution: Pre-refresh token before going offline (future improvement)

---

## Rollback Plan

If issues arise:

1. **Backend only**:
   - Remove `/auth/logout` and `/auth/refresh` routes from `server/routes/auth.js`
   - Revert to original behavior (no server-side logout)

2. **Frontend only**:
   - Revert `client/src/services/api.js` to not attempt refresh
   - Immediate logout on 401 (old behavior)

3. **Full rollback**:
   - Revert all files from git
   - Clear PWA caches on all devices

---

## Debugging

### Check if endpoints exist
```bash
curl -X OPTIONS http://localhost:5000/api/auth/logout -v
curl -X OPTIONS http://localhost:5000/api/auth/refresh -v
```

### Check token in DevTools
```javascript
// In browser console
console.log('localStorage token:', localStorage.getItem('token'));
console.log('localStorage user:', localStorage.getItem('user'));
console.log('Cookies:', document.cookie);
```

### Check refresh interceptor
```javascript
// In browser console - should log refresh attempt
fetch('/api/products', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
}).then(r => {
  console.log('Status:', r.status);
  return r.json();
}).then(d => console.log(d));
```

### Monitor Network Activity
1. DevTools → Network tab
2. Make request that triggers 401
3. Should see:
   - ① Original request → 401
   - ② POST /auth/refresh → 200
   - ③ Original request (retry) → 200

### Check Service Worker Logs
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('ServiceWorker:', reg);
  });
});
```

---

## Success Criteria

✅ **All of the following must pass:**

1. ✅ Both endpoints exist and respond correctly (Postman tests)
2. ✅ Login → Logout → properly clears all state
3. ✅ Expired token auto-refreshes before request fails
4. ✅ Multiple 401s don't cause multiple refresh calls
5. ✅ PWA cache clears on logout
6. ✅ No unexpected logouts during active sessions
7. ✅ Android PWA logout persists (doesn't re-login automatically)
8. ✅ All error cases handled gracefully

---

## Reporting Issues

If you encounter issues during testing:

1. **Screenshot of error message**
2. **DevTools Network tab** (showing request/response)
3. **Browser console logs** (paste full error)
4. **Steps to reproduce** (detailed)
5. **Device/Browser info** (OS, browser version)
6. **Network tab showing sequence** of requests

---

## Support & Questions

For questions about the implementation, review:
- `/memories/session/plan.md` — Detailed implementation plan
- Backend files: `server/routes/auth.js`, `server/middleware/auth.js`
- Frontend files: `client/src/services/api.js`, `client/src/store/useAuthStore.js`
- PWA files: `client/public/sw.js`

---

**Last Updated**: April 24, 2026
**Status**: Implementation Complete ✅
**Testing**: Ready for verification
