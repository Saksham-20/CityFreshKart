const admin = require('firebase-admin');

const getFirebaseCredentials = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (
    process.env.FIREBASE_PROJECT_ID
    && process.env.FIREBASE_CLIENT_EMAIL
    && process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  return null;
};

const firebaseCredentials = getFirebaseCredentials();
const isFirebaseAdminConfigured = Boolean(firebaseCredentials);

const firebaseAdminApp = isFirebaseAdminConfigured
  ? (admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials),
      }))
  : null;

const verifyFirebaseIdToken = async (idToken) => {
  if (!firebaseAdminApp) {
    throw new Error('Firebase admin is not configured on the server.');
  }

  return firebaseAdminApp.auth().verifyIdToken(idToken);
};

module.exports = {
  isFirebaseAdminConfigured,
  verifyFirebaseIdToken,
};
