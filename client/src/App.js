import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';
import { useCartStore } from './store/useCartStore';

// Layout Components
import AdminLayout from './components/layout/AdminLayout';

// PWA Components
import InstallPrompt from './components/pwa/InstallPrompt';
import CartDrawer from './components/cart/CartDrawer';
import MobileBottomNav from './components/layout/MobileBottomNav';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Lazy load page components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-green-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p className="text-green-600 font-semibold text-lg">Loading...</p>
    </div>
  </div>
);

function App() {
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loadUserCart = useCartStore((s) => s.loadUserCart);
  const initGuestCart = useCartStore((s) => s.initGuestCart);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      loadUserCart();
    } else {
      initGuestCart();
    }
  }, [isAuthenticated, loadUserCart, initGuestCart]);

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <InstallPrompt />
        <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
        
        <Routes>
          {/* Auth Routes - No Navigation */}
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

          {/* Main App Routes */}
          <Route path="/*" element={
            <div className="min-h-screen bg-white flex flex-col pb-20">
              <main className="flex-1">
                <Routes>
                  {/* Default to products */}
                  <Route path="/" element={<ProductsPage />} />
                  
                  {/* Public Routes */}
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/:id" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />

                  {/* Protected Routes */}
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              
              {/* Simple Mobile Bottom Navigation for logged-in users */}
              <MobileBottomNav onCartClick={() => setCartDrawerOpen(true)} />
            </div>
          } />
        </Routes>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#363636', color: '#fff' },
            success: {
              duration: 3000,
              iconTheme: { primary: '#16a34a', secondary: '#fff' },
            },
            error: {
              duration: 5000,
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </Suspense>
    </Router>
  );
}

export default App;
