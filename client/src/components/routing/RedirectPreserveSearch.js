import { Navigate, useLocation } from 'react-router-dom';

/**
 * Redirects to a path while keeping the current query string (e.g. /products?category=Fruits → /?category=Fruits).
 */
export function RedirectPreserveSearch({ to = '/' }) {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
}

export default RedirectPreserveSearch;
