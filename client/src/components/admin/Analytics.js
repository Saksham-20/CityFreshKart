import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import api from '../../services/api';
import { getImageUrl, IMAGE_DIMS } from '../../utils/imageUtils';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState({
    revenue: {
      total: 0,
      change: 0,
      trend: 'up'
    },
    orders: {
      total: 0,
      change: 0,
      trend: 'up'
    },
    customers: {
      total: 0,
      change: 0,
      trend: 'up'
    },
    products: {
      total: 0,
      change: 0,
      trend: 'up'
    }
  });
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [dailyOrders, setDailyOrders] = useState(0);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/analytics', { params: { period: timeRange } });
      const data = response.data;

      setAnalyticsData({
        revenue: {
          total: data.stats?.totalRevenue || data.salesData.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0),
          change: 0,
          trend: 'up'
        },
        orders: {
          total: data.stats?.totalOrders || data.salesData.reduce((sum, item) => sum + parseInt(item.orders || 0), 0),
          change: 0,
          trend: 'up'
        },
        customers: {
          total: data.stats?.totalUsers || 0,
          change: 0,
          trend: 'up'
        },
        products: {
          total: data.stats?.totalProducts || 0,
          change: 0,
          trend: 'up'
        }
      });

      setTopProducts(data.topProducts || []);
      setRecentOrders(data.recentOrders || []);
      setSalesData(data.salesData || []);
      setCategoryData(data.categoryData || []);
      setDailyRevenue(Number(data.dailyRevenue || data.stats?.dailyRevenue || 0));
      setDailyOrders(Number(data.dailyOrders || data.stats?.dailyOrders || 0));
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  };

  const getTrendColor = (trend) => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          <Button onClick={fetchAnalytics}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Daily Revenue (Today)</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(dailyRevenue)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Daily Orders (Today)</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(dailyOrders)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(analyticsData.revenue.total)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(analyticsData.revenue.trend)}
            <span className={`ml-2 text-sm font-medium ${getTrendColor(analyticsData.revenue.trend)}`}>
              {analyticsData.revenue.change > 0 ? '+' : ''}{analyticsData.revenue.change}%
            </span>
            <span className="ml-2 text-sm text-gray-500">from last period</span>
          </div>
        </div>

        {/* Orders Card */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(analyticsData.orders.total)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(analyticsData.orders.trend)}
            <span className={`ml-2 text-sm font-medium ${getTrendColor(analyticsData.orders.trend)}`}>
              {analyticsData.orders.change > 0 ? '+' : ''}{analyticsData.orders.change}%
            </span>
            <span className="ml-2 text-sm text-gray-500">from last period</span>
          </div>
        </div>

        {/* Customers Card */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(analyticsData.customers.total)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(analyticsData.customers.trend)}
            <span className={`ml-2 text-sm font-medium ${getTrendColor(analyticsData.customers.trend)}`}>
              {analyticsData.customers.change > 0 ? '+' : ''}{analyticsData.customers.change}%
            </span>
            <span className="ml-2 text-sm text-gray-500">from last period</span>
          </div>
        </div>

        {/* Products Card */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(analyticsData.products.total)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center">
            {getTrendIcon(analyticsData.products.trend)}
            <span className={`ml-2 text-sm font-medium ${getTrendColor(analyticsData.products.trend)}`}>
              {analyticsData.products.change > 0 ? '+' : ''}{analyticsData.products.change}%
            </span>
            <span className="ml-2 text-sm text-gray-500">from last period</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Selling Products</h3>
          </div>
          <div className="p-4 sm:p-6">
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center min-w-0">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}</span>
                      <img
                        src={product.image_url ? getImageUrl(product.image_url) : '/placeholder-product.jpg'}
                        alt={product.name}
                        width={IMAGE_DIMS.adminRowSm.width}
                        height={IMAGE_DIMS.adminRowSm.height}
                        className="w-10 h-10 rounded object-cover ml-3"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="ml-3 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-sm text-gray-500 truncate">{product.category_name}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(product.total_quantity || 0)} sold
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(product.total_revenue || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="p-4 sm:p-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col space-y-2">
                      {/* Order Header */}
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            Order #{order.order_number ? order.order_number.split('-')[0] : order.id}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                          {formatCurrency(order.total_amount)}
                        </p>
                      </div>
                      
                      {/* Customer Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
                          <span className="font-medium">
                            {order.first_name || 'Unknown'} {order.last_name || 'Customer'}
                          </span>
                          <span className="hidden sm:inline text-gray-400">•</span>
                          <span>
                            {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Unknown Date'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Sales Chart Placeholder */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Sales Trend</h3>
        </div>
        <div className="p-4 sm:p-6">
          {salesData.length > 0 ? (
            <div className="h-64 bg-gray-50 rounded-lg p-4">
              <div className="flex items-end justify-between h-full space-x-2">
                {salesData.map((item, index) => {
                  const maxRevenue = Math.max(...salesData.map(d => parseFloat(d.revenue || 0)));
                  const revenue = parseFloat(item.revenue || 0);
                  return (
                    <div key={index} className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className="bg-blue-500 rounded-t w-full min-h-[4px]"
                        style={{
                          height: `${Math.max(4, maxRevenue > 0 ? (revenue / maxRevenue) * 200 : 0)}px`
                        }}
                        title={`₹${formatNumber(revenue)}`}
                      />
                      <div className="text-xs text-gray-600 mt-2 text-center truncate w-full">
                        {item.period || item.date || ''}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate w-full text-center">
                        ₹{formatNumber(revenue)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">No sales data available for the selected period</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Performance */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Category Performance</h3>
        </div>
        <div className="p-4 sm:p-6">
          {categoryData.length > 0 ? (
            <div className="space-y-4">
              {categoryData.map((category) => (
                <div key={category.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center min-w-0">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                    <span className="ml-3 text-sm font-medium text-gray-900">{category.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-sm text-gray-500">{formatNumber(category.product_count || 0)} products</span>
                    <span className="text-sm text-gray-500">{formatNumber(category.order_count || 0)} sales</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(category.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
