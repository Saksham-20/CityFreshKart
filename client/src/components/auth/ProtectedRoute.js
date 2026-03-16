import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Loading from '../ui/Loading';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if email is verified (unless exempting certain routes)
  if (!user.is_verified) {
    // Allow access to order confirmation page without verification
    if (location.pathname.includes('/orders/') && location.pathname.includes('/confirmation')) {
      return children;
    }
    // Redirect to pending verification page
    return <Navigate to="/pending-verification" replace />;
  }

  return children;
};

export default ProtectedRoute;

