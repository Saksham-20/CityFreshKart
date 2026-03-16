import { useState, useEffect, useCallback } from 'react';

const useProducts = (initialFilters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
  });

  const fetchProducts = useCallback(async (newFilters = filters, page = 1) => {
    try {
      console.log('📦 useProducts: Starting fetch with filters:', newFilters, 'page:', page);
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: pagination.itemsPerPage.toString(),
        ...newFilters
      });

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const url = `${apiUrl}/api/products?${queryParams}`;
      console.log('📦 useProducts: Fetching from URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      console.log('📦 useProducts: Raw API response:', data);
      
      // Handle the correct API response format
      const products = data.data?.products || data.products || [];
      const paginationData = data.data?.pagination || data.pagination || {};
      
      console.log('📦 useProducts: Extracted products:', products.length);
      console.log('📦 useProducts: First product:', products[0]);
      console.log('📦 useProducts: Pagination data:', paginationData);
      
      setProducts(products);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalPages: paginationData.total_pages || paginationData.totalPages || 1,
        totalItems: paginationData.total_items || paginationData.totalItems || 0
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.itemsPerPage]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [initialFilters]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  }, [pagination.totalPages]);

  const searchProducts = useCallback((query) => {
    updateFilters({ search: query });
  }, [updateFilters]);

  const filterByCategory = useCallback((category) => {
    updateFilters({ category });
  }, [updateFilters]);

  const filterByPrice = useCallback((minPrice, maxPrice) => {
    updateFilters({ minPrice, maxPrice });
  }, [updateFilters]);

  const filterByBrand = useCallback((brand) => {
    updateFilters({ brand });
  }, [updateFilters]);

  const sortProducts = useCallback((sortBy, sortOrder = 'asc') => {
    updateFilters({ sortBy, sortOrder });
  }, [updateFilters]);

  // Fetch products when filters or page changes
  useEffect(() => {
    fetchProducts(filters, pagination.currentPage);
  }, [filters, pagination.currentPage, fetchProducts]);

  return {
    products,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    resetFilters,
    goToPage,
    searchProducts,
    filterByCategory,
    filterByPrice,
    filterByBrand,
    sortProducts,
    refetch: () => fetchProducts(filters, pagination.currentPage)
  };
};

export default useProducts;
