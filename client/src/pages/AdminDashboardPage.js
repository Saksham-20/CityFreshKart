import React from 'react';
import Dashboard from '../components/admin/Dashboard';
import ErrorBoundary from '../components/common/ErrorBoundary';

const AdminDashboardPage = () => {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
};

export default AdminDashboardPage;
