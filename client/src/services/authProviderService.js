import { AUTH_PROVIDER } from '../config/authProvider';
import backendOtpAuthProvider from './authProviders/backendOtpAuthProvider';
import firebasePhoneAuthProvider from './authProviders/firebasePhoneAuthProvider';

const providers = {
  firebase: firebasePhoneAuthProvider,
  'backend-otp': backendOtpAuthProvider,
};

const activeProvider = providers[AUTH_PROVIDER] || backendOtpAuthProvider;

export { AUTH_PROVIDER };
export default activeProvider;
