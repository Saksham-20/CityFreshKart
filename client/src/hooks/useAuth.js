import { useAuthStore } from '../store/useAuthStore';

const useAuth = () => {
  const {
    user,
    isAuthenticated,
    loading,
    bootstrapping,
    token,
    register: storeRegister,
    login: storeLogin,
    loginWithGoogle: storeLoginWithGoogle,
    forgotPasswordStart,
    forgotPasswordWithEmail,
    verifyResetOtp,
    resetPasswordWithOtp,
    linkGoogleAccount,
    unlinkGoogleAccount,
    refreshCurrentUser,
    logout,
  } = useAuthStore();
  
  return {
    user: isAuthenticated ? user : null,
    isAuthenticated,
    loading,
    bootstrapping,
    token,
    register: (data) => {
      // Accept object with {name, phone, password}
      return storeRegister(data.phone, data.password, data.name);
    },
    login: storeLogin,
    loginWithGoogle: storeLoginWithGoogle,
    forgotPasswordStart,
    forgotPasswordWithEmail,
    verifyResetOtp,
    resetPasswordWithOtp,
    linkGoogleAccount,
    unlinkGoogleAccount,
    refreshCurrentUser,
    logout,
  };
};

export { useAuth };
export default useAuth;
