const hasFirebaseConfig = Boolean(
  process.env.REACT_APP_FIREBASE_API_KEY
  && process.env.REACT_APP_FIREBASE_AUTH_DOMAIN
  && process.env.REACT_APP_FIREBASE_PROJECT_ID
  && process.env.REACT_APP_FIREBASE_APP_ID,
);

const AUTH_PROVIDER = process.env.REACT_APP_AUTH_PROVIDER || (hasFirebaseConfig ? 'firebase' : 'backend-otp');

export { AUTH_PROVIDER, hasFirebaseConfig };
