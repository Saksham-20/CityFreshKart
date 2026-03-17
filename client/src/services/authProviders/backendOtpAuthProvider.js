import api from '../api';

const requestOTP = async (phone) => {
  const response = await api.post('/auth/request-otp', { phone });

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Failed to send OTP');
  }

  return {
    success: true,
    userId: response.data.userId,
    provider: 'backend-otp',
  };
};

const verifyOTP = async (userId, otp) => {
  const response = await api.post('/auth/verify-otp', { userId, otp });

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'OTP verification failed');
  }

  return {
    success: true,
    user: response.data?.data?.user,
    token: response.data?.data?.token,
    provider: 'backend-otp',
  };
};

const reset = async () => {};

const backendOtpAuthProvider = {
  requestOTP,
  verifyOTP,
  reset,
};

export default backendOtpAuthProvider;
