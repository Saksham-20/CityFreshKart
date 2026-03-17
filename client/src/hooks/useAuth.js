import { useAuthStore } from '../store/useAuthStore';

const useAuth = () => {
  const store = useAuthStore();
  return { ...store, loading: store.isLoading };
};

export { useAuth };
export default useAuth;
