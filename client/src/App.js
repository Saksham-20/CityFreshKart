import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout Components
import AdminLayout from './components/layout/AdminLayout';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import useAuth from './hooks/useAuth';
import { useAuthStore } from './store/useAuthStore';

// Lazy load page components for better performance
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-green-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-fresh-green mx-auto mb-4"></div>
      <p className="text-fresh-green font-semibold text-lg">Loading FreshCart...</p>
    </div>
  </div>
);

function App() {
  const { isAuthenticated, loading } = useAuth();
  const initialize = useAuthStore(state => state.initialize);

  // Initialize auth on app load
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
                {/* Auth Routes - No Header */}
                <Route path="/login" element={<LoginPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout>
                <AdminDashboardPage />
              </AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/products" element={
            <AdminRoute>
              <AdminLayout>
                <AdminProductsPage />
              </AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/orders" element={
            <AdminRoute>
              <AdminLayout>
                <AdminOrdersPage />
              </AdminLayout>
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminLayout>
                <AdminUsersPage />
              </AdminLayout>
            </AdminRoute>
          } />

                {/* Main App Routes - With Header, authenticated users only */}
                <Route path="/*" element={
                  isAuthenticated ? (
                    <div className="min-h-screen bg-white flex flex-col">
                      <Header />
                      <main className="flex-1">
                        <Routes>
                          {/* Redirect root to products */}
                          <Route path="/" element={<ProductsPage />} />
                          <Route path="/products" element={<ProductsPage />} />
                          <Route path="/cart" element={<CartPage />} />
                          <Route path="/checkout" element={
                            <ProtectedRoute>
                              <CheckoutPage />
                            </ProtectedRoute>
                          } />
                          <Route path="/orders/:orderId/confirmation" element={
                            <ProtectedRoute>
                              <OrderConfirmationPage />
                            </ProtectedRoute>
                          } />
                          {/* Catch all - redirect to products */}
                          <Route path="*" element={<Navigate to="/products" replace />} />
                        </Routes>
                      </main>
                      <Footer />
                    </div>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                } />

                {/* Admin Routes - No Header */}
                <Route path="/admin/*" element={
                  <AdminRoute>
                    <AdminLayout>
                      <Routes>
                        <Route path="/" element={<AdminDashboardPage />} />
                        <Route path="/products" element={<AdminProductsPage />} />
                        <Route path="/orders" element={<AdminOrdersPage />} />
                        <Route path="/users" element={<AdminUsersPage />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                      </Routes>
                    </AdminLayout>
                  </AdminRoute>
                } />

                {/* Catch all unmatched routes */}
                <Route path="*" element={
                  isAuthenticated ? <Navigate to="/products" replace /> : <Navigate to="/login" replace />
                } />
        </Routes>
      </Suspense>
      <Toaster />
    </Router>
  );
}

export default App;
