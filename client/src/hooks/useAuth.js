import { useAuthStore } from '../store/useAuthStore';

const useAuth = () => {
  const {
    user,
    isAuthenticated,
    loading,
    token,
    register: storeRegister,
    login: storeLogin,
    loginWithGoogle: storeLoginWithGoogle,
    logout,
  } = useAuthStore();
  
  return {
    user: isAuthenticated ? user : null,
    isAuthenticated,
    loading,
    token,
    register: (data) => {
      // Accept object with {name, phone, password}
      return storeRegister(data.phone, data.password, data.name);
    },
    login: storeLogin,
    loginWithGoogle: storeLoginWithGoogle,
    logout,
  };
};

export { useAuth };
export default useAuth;
