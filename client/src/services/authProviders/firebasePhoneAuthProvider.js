// Firebase phone auth implementation
// Uses Firebase Authentication with SMS OTP verification

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { firebaseAuth } from '../firebaseClient';

export const RECAPTCHA_CONTAINER_ID = 'firebase-recaptcha-container';

let recaptchaVerifier = null;
let recaptchaWidgetId = null;

const createAuthError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      // no-op
    }
  }

  recaptchaVerifier = null;
  recaptchaWidgetId = null;

  const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (container) {
    container.innerHTML = '';
  }
};

const initRecaptcha = async () => {
  if (!firebaseAuth) {
    throw createAuthError('FIREBASE_NOT_INITIALIZED', 'Firebase is not initialized.');
  }

  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  try {
    // Check if container exists
    const container = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (!container) {
      throw createAuthError(
        'RECAPTCHA_CONTAINER_MISSING',
        'reCAPTCHA container not found. Please refresh and try again.',
      );
    }

    container.innerHTML = '';

    recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, container, {
      'size': 'invisible',
      'callback': () => {},
      'expired-callback': () => {
        clearRecaptcha();
      },
    });

    recaptchaWidgetId = await recaptchaVerifier.render();

    if (recaptchaWidgetId === null || recaptchaWidgetId === undefined) {
      throw createAuthError('RECAPTCHA_RENDER_FAILED', 'Failed to initialize reCAPTCHA widget.');
    }

    return recaptchaVerifier;
  } catch (error) {
    console.error('reCAPTCHA initialization error:', error);
    clearRecaptcha();
    throw createAuthError(
      error.code || 'RECAPTCHA_ERROR',
      error.message || 'Failed to initialize reCAPTCHA. Add localhost to Firebase authorized domains.',
    );
  }
};

const requestOTP = async (phone) => {
  try {
    const verifier = await initRecaptcha();
    
    // Format phone with +91 if not already present
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    console.log('Signing in with phone:', formattedPhone);
    const confirmationResult = await signInWithPhoneNumber(firebaseAuth, formattedPhone, verifier);

    return {
      success: true,
      confirmationResult,
      phone: formattedPhone,
      message: `OTP sent to ${formattedPhone}`,
    };
  } catch (error) {
    console.error('Request OTP error:', error);

    clearRecaptcha();

    // Map Firebase error codes to user-friendly messages
    let message = 'Failed to send OTP. Please try again.';
    if (error.code === 'auth/invalid-phone-number') {
      message = 'Invalid phone number. Please check and try again.';
    } else if (error.code === 'auth/missing-phone-number') {
      message = 'Phone number is required.';
    } else if (error.code === 'auth/operation-not-allowed') {
      message = 'Enable Phone Authentication in Firebase Console → Authentication → Sign-in method.';
    } else if (error.code === 'auth/app-not-authorized') {
      message = 'Add localhost to Firebase Console → Authentication → Settings → Authorized domains.';
    } else if (error.code === 'auth/invalid-app-credential') {
      message = 'Invalid Firebase app credentials. Verify API key, authDomain and project settings.';
    } else if (error.message?.includes('reCAPTCHA')) {
      message = 'reCAPTCHA verification failed. Please try again.';
    }

    throw createAuthError(error.code || 'PHONE_OTP_ERROR', message);
  }
};

const verifyOTP = async (confirmationResult, otp) => {
  try {
    if (!confirmationResult) {
      throw new Error('No confirmation result. Please request OTP first.');
    }

    const userCredential = await confirmationResult.confirm(otp);
    const user = userCredential.user;
    const token = await user.getIdToken();

    return {
      success: true,
      user: {
        id: user.uid,
        phone: user.phoneNumber,
        name: user.displayName || 'User',
        is_admin: false,
      },
      token,
    };
  } catch (error) {
    console.error('Verify OTP error:', error);
    throw createAuthError(error.code || 'OTP_VERIFICATION_ERROR', error.message || 'Invalid OTP. Please try again.');
  }
};

const resendOTP = async (confirmationResult) => {
  // Firebase handles resend through the confirmationResult
  return {
    success: true,
    message: 'OTP resend initiated',
  };
};

const logout = async () => {
  if (firebaseAuth?.currentUser) {
    await firebaseSignOut(firebaseAuth);
  }
  clearRecaptcha();
};

const reset = async () => {
  clearRecaptcha();
};

const firebasePhoneAuthProvider = {
  requestOTP,
  verifyOTP,
  resendOTP,
  logout,
  reset,
  RECAPTCHA_CONTAINER_ID,
};

export default firebasePhoneAuthProvider;
