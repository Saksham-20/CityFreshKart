const db = require('../database/config');

// Get admin dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get total sales
    const [salesResult] = await db.execute(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(total) as totalSales,
        AVG(total) as averageOrderValue
      FROM orders 
      WHERE status != 'cancelled'
    `);

    // Get sales change (compare with previous month)
    const [salesChangeResult] = await db.execute(`
      SELECT 
        SUM(total) as currentMonthSales
      FROM orders 
      WHERE status != 'cancelled' 
      AND MONTH(createdAt) = MONTH(CURRENT_DATE())
      AND YEAR(createdAt) = YEAR(CURRENT_DATE())
    `);

    const [previousMonthSalesResult] = await db.execute(`
      SELECT 
        SUM(total) as previousMonthSales
      FROM orders 
      WHERE status != 'cancelled' 
      AND MONTH(createdAt) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      AND YEAR(createdAt) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const currentMonthSales = salesChangeResult[0]?.currentMonthSales || 0;
    const previousMonthSales = previousMonthSalesResult[0]?.previousMonthSales || 0;
    const salesChange = previousMonthSales > 0
      ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100
      : 0;

    // Get total customers
    const [customersResult] = await db.execute('SELECT COUNT(*) as totalCustomers FROM users WHERE role = "customer"');

    // Get customers change
    const [customersChangeResult] = await db.execute(`
      SELECT COUNT(*) as currentMonthCustomers
      FROM users 
      WHERE role = "customer"
      AND MONTH(createdAt) = MONTH(CURRENT_DATE())
      AND YEAR(createdAt) = YEAR(CURRENT_DATE())
    `);

    const [previousMonthCustomersResult] = await db.execute(`
      SELECT COUNT(*) as previousMonthCustomers
      FROM users 
      WHERE role = "customer"
      AND MONTH(createdAt) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      AND YEAR(createdAt) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const currentMonthCustomers = customersChangeResult[0]?.currentMonthCustomers || 0;
    const previousMonthCustomers = previousMonthCustomersResult[0]?.previousMonthCustomers || 0;
    const customersChange = previousMonthCustomers > 0
      ? ((currentMonthCustomers - previousMonthCustomers) / previousMonthCustomers) * 100
      : 0;

    // Get total products
    const [productsResult] = await db.execute('SELECT COUNT(*) as totalProducts FROM products');

    // Get products change
    const [productsChangeResult] = await db.execute(`
      SELECT COUNT(*) as currentMonthProducts
      FROM products 
      WHERE MONTH(createdAt) = MONTH(CURRENT_DATE())
      AND YEAR(createdAt) = YEAR(CURRENT_DATE())
    `);

    const [previousMonthProductsResult] = await db.execute(`
      SELECT COUNT(*) as previousMonthProducts
      FROM products 
      WHERE MONTH(createdAt) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      AND YEAR(createdAt) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const currentMonthProducts = productsChangeResult[0]?.currentMonthProducts || 0;
    const previousMonthProducts = previousMonthProductsResult[0]?.previousMonthProducts || 0;
    const productsChange = previousMonthProducts > 0
      ? ((currentMonthProducts - previousMonthProducts) / previousMonthProducts) * 100
      : 0;

    // Get recent orders
    const [recentOrders] = await db.execute(`
      SELECT 
        o.*,
        u.firstName,
        u.lastName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      ORDER BY o.createdAt DESC
      LIMIT 5
    `);

    // Get recent products
    const [recentProducts] = await db.execute(`
      SELECT * FROM products 
      ORDER BY createdAt DESC 
      LIMIT 5
    `);

    // Get top selling products
    const [topProducts] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.image,
        COUNT(oi.id) as orderCount,
        SUM(oi.quantity) as totalQuantity
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.id
      ORDER BY totalQuantity DESC
      LIMIT 5
    `);

    // Get order status breakdown
    const [orderStatusBreakdown] = await db.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders 
      GROUP BY status
    `);

    // Get sales by category
    const [salesByCategory] = await db.execute(`
      SELECT 
        p.category,
        COUNT(oi.id) as orderCount,
        SUM(oi.quantity * oi.price) as totalSales
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.category
      ORDER BY totalSales DESC
    `);

    res.json({
      overview: {
        totalSales: salesResult[0]?.totalSales || 0,
        totalOrders: salesResult[0]?.totalOrders || 0,
        totalCustomers: customersResult[0]?.totalCustomers || 0,
        totalProducts: productsResult[0]?.totalProducts || 0,
        averageOrderValue: salesResult[0]?.averageOrderValue || 0,
      },
      changes: {
        salesChange: Math.round(salesChange * 100) / 100,
        ordersChange: 0, // TODO: Calculate orders change
        customersChange: Math.round(customersChange * 100) / 100,
        productsChange: Math.round(productsChange * 100) / 100,
      },
      recentActivity: {
        orders: recentOrders,
        products: recentProducts,
      },
      analytics: {
        topProducts,
        orderStatusBreakdown,
        salesByCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get admin analytics
const getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter = '';
    let groupBy = '';

    switch (period) {
    case 'week':
      dateFilter = 'AND createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)';
      groupBy = 'DATE(createdAt)';
      break;
    case 'month':
      dateFilter = 'AND createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)';
      groupBy = 'DATE(createdAt)';
      break;
    case 'year':
      dateFilter = 'AND createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR)';
      groupBy = 'MONTH(createdAt)';
      break;
    default:
      dateFilter = 'AND createdAt >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)';
      groupBy = 'DATE(createdAt)';
    }

    // Get sales data
    const [salesData] = await db.execute(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as orders,
        SUM(total) as revenue,
        AVG(total) as averageOrder
      FROM orders 
      WHERE status != 'cancelled' ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period
    `);

    // Get customer acquisition data
    const [customerData] = await db.execute(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as newCustomers
      FROM users 
      WHERE role = 'customer' ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period
    `);

    // Get product performance data
    const [productData] = await db.execute(`
      SELECT 
        p.name,
        p.category,
        COUNT(oi.id) as orderCount,
        SUM(oi.quantity) as totalQuantity,
        SUM(oi.quantity * oi.price) as totalRevenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.productId
      LEFT JOIN orders o ON oi.orderId = o.id
      WHERE o.status != 'cancelled' ${dateFilter}
      GROUP BY p.id
      ORDER BY totalRevenue DESC
      LIMIT 10
    `);

    res.json({
      period,
      salesData,
      customerData,
      productData,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get admin settings
const getSettings = async (req, res) => {
  try {
    // TODO: Implement settings retrieval from database
    // For now, return default settings

    const settings = {
      store: {
        name: process.env.APP_NAME || 'CityFreshKart',
        description: process.env.APP_DESCRIPTION || 'Farm-fresh vegetables delivered to your doorstep',
        email: process.env.APP_EMAIL || 'admin@cityfreshkart.in',
        phone: process.env.APP_PHONE || '+91-98765-43210',
        address: {
          street: process.env.STORE_STREET || '123 CityFreshKart Lane',
          city: process.env.STORE_CITY || 'Chandigarh',
          state: process.env.STORE_STATE || 'Chandigarh',
          zipCode: process.env.STORE_ZIP || '160022',
          country: process.env.STORE_COUNTRY || 'IN',
        },
      },
      shipping: {
        freeShippingThreshold: parseFloat(process.env.FREE_SHIPPING_THRESHOLD) || 100,
        defaultShippingCost: parseFloat(process.env.DEFAULT_SHIPPING_COST) || 9.99,
        expressShippingCost: parseFloat(process.env.EXPRESS_SHIPPING_COST) || 19.99,
      },
      payment: {
        acceptedMethods: (process.env.ACCEPTED_PAYMENT_METHODS || 'credit_card,paypal').split(','),
        currency: process.env.CURRENCY || 'INR',
        taxRate: parseFloat(process.env.TAX_RATE) || 8.5,
      },
      notifications: {
        orderConfirmation: process.env.ORDER_CONFIRMATION_EMAIL === 'true',
        shippingUpdates: process.env.SHIPPING_UPDATES_EMAIL === 'true',
        marketingEmails: process.env.MARKETING_EMAILS === 'true',
      },
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update admin settings
const updateSettings = async (req, res) => {
  try {
    const settings = req.body;

    // TODO: Implement settings update in database
    // For now, just return success

    res.json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get system health
const getSystemHealth = async (req, res) => {
  try {
    // Check database connection
    const [dbResult] = await db.execute('SELECT 1 as health');
    const dbHealth = dbResult.length > 0 ? 'healthy' : 'unhealthy';

    // Check disk space (placeholder)
    const diskHealth = 'healthy'; // TODO: Implement actual disk space check

    // Check memory usage (placeholder)
    const memoryHealth = 'healthy'; // TODO: Implement actual memory check

    // Get uptime
    const uptime = process.uptime();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        disk: diskHealth,
        memory: memoryHealth,
      },
      uptime: {
        seconds: Math.floor(uptime),
        minutes: Math.floor(uptime / 60),
        hours: Math.floor(uptime / 3600),
        days: Math.floor(uptime / 86400),
      },
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getAnalytics,
  getSettings,
  updateSettings,
  getSystemHealth,
};
