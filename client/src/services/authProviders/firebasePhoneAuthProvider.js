import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import api from '../api';
import { firebaseAuth, hasFirebaseClientConfig } from '../firebaseClient';

let confirmationResult = null;
let recaptchaVerifier = null;

const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha-container';

const ensureFirebaseConfigured = () => {
  if (!hasFirebaseClientConfig || !firebaseAuth) {
    throw new Error('Firebase auth is not configured. Add Firebase client env values first.');
  }
};

const ensureRecaptcha = () => {
  ensureFirebaseConfigured();

  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, RECAPTCHA_CONTAINER_ID, {
    size: 'invisible',
    callback: () => {},
  });

  return recaptchaVerifier;
};

const requestOTP = async (phone) => {
  const verifier = ensureRecaptcha();
  confirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier);

  return {
    success: true,
    userId: phone,
    provider: 'firebase',
  };
};

const verifyOTP = async (_userId, otp) => {
  ensureFirebaseConfigured();

  if (!confirmationResult) {
    throw new Error('OTP session not found. Please request a new OTP.');
  }

  const credentialResult = await confirmationResult.confirm(otp);
  const idToken = await credentialResult.user.getIdToken();
  const response = await api.post('/auth/provider-session', {
    provider: 'firebase',
    idToken,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Firebase sign-in failed');
  }

  return {
    success: true,
    user: response.data?.data?.user,
    token: response.data?.data?.token,
    provider: 'firebase',
  };
};

const reset = async () => {
  confirmationResult = null;
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};

export { RECAPTCHA_CONTAINER_ID };

const firebasePhoneAuthProvider = {
  requestOTP,
  verifyOTP,
  reset,
};

export default firebasePhoneAuthProvider;
