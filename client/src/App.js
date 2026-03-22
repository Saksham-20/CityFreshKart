import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout Components
import AdminLayout from './components/layout/AdminLayout';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import MobileBottomNav from './components/layout/MobileBottomNav';
import WhatsAppFloatingButton from './components/common/WhatsAppFloatingButton';
import InstallPrompt from './components/pwa/InstallPrompt';
import RedirectPreserveSearch from './components/routing/RedirectPreserveSearch';

// Auth Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import useAuth from './hooks/useAuth';
import { useAuthStore } from './store/useAuthStore';
import { useCartStore } from './store/useCartStore';

// Lazy load page components for better performance
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/AdminCategoriesPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const AdminMarketingBannersPage = lazy(() => import('./pages/AdminMarketingBannersPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="text-center">
      <div className="animate-spin rounded-full h-14 w-14 border-2 border-primary/30 border-t-primary mx-auto mb-4" />
      <p className="text-on-surface font-headline font-semibold text-base">Loading CityFreshKart...</p>
    </div>
  </div>
);

const MainLayout = ({ children }) => (
  <div className="app-shopper min-h-screen flex flex-col bg-surface">
    <Header />
    <main className="flex-1 pb-24 md:pb-0">{children}</main>
    <Footer />
    <MobileBottomNav />
  </div>
);

const FloatingOverlays = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isCheckout = location.pathname === '/checkout';

  if (isAdminRoute) return null;

  return (
    <>
      {!isCheckout && <WhatsAppFloatingButton />}
      {!isCheckout && <InstallPrompt />}
    </>
  );
};

function App() {
  const { isAuthenticated, loading } = useAuth();
  const initialize = useAuthStore(state => state.initialize);

  // Initialize auth and store settings on app load
  useEffect(() => {
    initialize();
    useCartStore.getState().loadSettings();
  }, [initialize]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={(
              <AdminRoute>
                <AdminLayout><AdminDashboardPage /></AdminLayout>
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/products"
            element={(
              <AdminRoute>
                <AdminLayout><AdminProductsPage /></AdminLayout>
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/categories"
            element={(
              <AdminRoute>
                <AdminLayout><AdminCategoriesPage /></AdminLayout>
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/orders"
            element={(
              <AdminRoute>
                <AdminLayout><AdminOrdersPage /></AdminLayout>
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/users"
            element={(
              <AdminRoute>
                <AdminLayout><AdminUsersPage /></AdminLayout>
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/analytics"
            element={(
              <AdminRoute>
                <AdminLayout><AdminAnalyticsPage /></AdminLayout>
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/settings"
            element={(
              <AdminRoute>
                <AdminLayout><AdminSettingsPage /></AdminLayout>
              </AdminRoute>
            )}
          />
          <Route
            path="/admin/marketing-banners"
            element={(
              <AdminRoute>
                <AdminLayout><AdminMarketingBannersPage /></AdminLayout>
              </AdminRoute>
            )}
          />

          <Route
            path="/"
            element={isAuthenticated ? (
              <MainLayout><ProductsPage /></MainLayout>
            ) : <Navigate to="/login" replace />}
          />
          <Route path="/products" element={<RedirectPreserveSearch to="/" />} />
          <Route path="/cart" element={isAuthenticated ? <MainLayout><CartPage /></MainLayout> : <Navigate to="/login" replace />} />
          <Route path="/checkout" element={<ProtectedRoute><MainLayout><CheckoutPage /></MainLayout></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><MainLayout><OrdersPage /></MainLayout></ProtectedRoute>} />
          <Route path="/orders/:orderId/confirmation" element={<ProtectedRoute><MainLayout><OrderConfirmationPage /></MainLayout></ProtectedRoute>} />
          <Route path="/orders/:orderId" element={<ProtectedRoute><MainLayout><OrderDetailPage /></MainLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><MainLayout><ProfilePage /></MainLayout></ProtectedRoute>} />
          <Route path="*" element={isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      <FloatingOverlays />
      <Toaster />
    </Router>
  );
}

export default App;
