import React from 'react';
import ErrorBoundary from '../components/common/ErrorBoundary';
import CategoryManager from '../components/admin/CategoryManager';

const AdminCategoriesPage = () => {
  return (
    <ErrorBoundary>
      <CategoryManager />
    </ErrorBoundary>
  );
};

export default AdminCategoriesPage;

