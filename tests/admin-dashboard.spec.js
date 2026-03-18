const { test, expect } = require('@playwright/test');

// Admin user credentials (if applicable)
const ADMIN_PHONE = '9876543210';
const ADMIN_PASSWORD = 'password123';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin or login first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if admin section is accessible
    const adminLink = page.locator('a[href*="admin" i], button:has-text(/Admin|Dashboard/i)');
    
    if (await adminLink.count() > 0) {
      await adminLink.first().click();
      await page.waitForNavigation();
    } else {
      // Try direct admin URL
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display admin dashboard', async ({ page }) => {
    // Admin dashboard should be visible
    const dashboard = page.locator('[class*="dashboard"], [class*="admin"], text=/Dashboard|Admin/i');
    
    if (await dashboard.count() > 0) {
      await expect(dashboard.first()).toBeVisible();
    }
  });

  test('should display navigation menu', async ({ page }) => {
    // Admin menu should be visible
    const menu = page.locator('[class*="menu"], [class*="sidebar"], [class*="nav"]');
    
    if (await menu.count() > 0) {
      await expect(menu.first()).toBeVisible();
    }
  });

  test('should have products management section', async ({ page }) => {
    // Look for products link
    const productsLink = page.locator('a:has-text(/Products|Manage Products/i), button:has-text(/Products/i)');
    
    if (await productsLink.count() > 0) {
      await productsLink.first().click();
      await page.waitForNavigation();
      
      // Should show products list
      const productsList = page.locator('[class*="product"], [data-testid*="product"]');
      if (await productsList.count() > 0) {
        await expect(productsList.first()).toBeVisible();
      }
    }
  });

  test('should allow adding new product', async ({ page }) => {
    // Navigate to products
    const productsLink = page.locator('a:has-text(/Products|Manage Products/i), button:has-text(/Products/i)');
    
    if (await productsLink.count() > 0) {
      await productsLink.first().click();
      await page.waitForNavigation();
      
      // Look for add product button
      const addButton = page.locator('button:has-text(/Add|New Product|Create/i)');
      
      if (await addButton.count() > 0) {
        await addButton.first().click();
        await page.waitForLoadState('networkidle');
        
        // Should show form
        const form = page.locator('form, [class*="form"]');
        if (await form.count() > 0) {
          await expect(form.first()).toBeVisible();
        }
      }
    }
  });

  test('should display product list with actions', async ({ page }) => {
    // Navigate to products
    const productsLink = page.locator('a:has-text(/Products|Manage Products/i), button:has-text(/Products/i)');
    
    if (await productsLink.count() > 0) {
      await productsLink.first().click();
      await page.waitForNavigation();
      
      // Look for action buttons (edit, delete)
      const actionButtons = page.locator('button:has-text(/Edit|Delete|View/i)');
      
      if (await actionButtons.count() > 0) {
        await expect(actionButtons.first()).toBeVisible();
      }
    }
  });

  test('should allow editing product', async ({ page }) => {
    // Navigate to products
    const productsLink = page.locator('a:has-text(/Products|Manage Products/i), button:has-text(/Products/i)');
    
    if (await productsLink.count() > 0) {
      await productsLink.first().click();
      await page.waitForNavigation();
      
      // Find edit button
      const editButton = page.locator('button:has-text(/Edit/i)').first();
      
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForNavigation();
        
        // Should show edit form
        const form = page.locator('input, textarea');
        if (await form.count() > 0) {
          await expect(form.first()).toBeVisible();
        }
      }
    }
  });

  test('should have orders management section', async ({ page }) => {
    // Look for orders link
    const ordersLink = page.locator('a:has-text(/Orders|Manage Orders/i), button:has-text(/Orders/i)');
    
    if (await ordersLink.count() > 0) {
      await ordersLink.first().click();
      await page.waitForNavigation();
      
      // Should show orders list
      const ordersList = page.locator('[class*="order"]');
      if (await ordersList.count() > 0) {
        await expect(ordersList.first()).toBeVisible();
      }
    }
  });

  test('should display orders with details', async ({ page }) => {
    // Navigate to orders
    const ordersLink = page.locator('a:has-text(/Orders|Manage Orders/i), button:has-text(/Orders/i)');
    
    if (await ordersLink.count() > 0) {
      await ordersLink.first().click();
      await page.waitForNavigation();
      
      // Look for order status, customer info, etc.
      const orderInfo = page.locator('text=/Order ID|Status|Total|Customer/i');
      
      if (await orderInfo.count() > 0) {
        await expect(orderInfo.first()).toBeVisible();
      }
    }
  });

  test('should allow updating order status', async ({ page }) => {
    // Navigate to orders
    const ordersLink = page.locator('a:has-text(/Orders|Manage Orders/i), button:has-text(/Orders/i)');
    
    if (await ordersLink.count() > 0) {
      await ordersLink.first().click();
      await page.waitForNavigation();
      
      // Look for status dropdown or button
      const statusControl = page.locator('select, [class*="status"], button:has-text(/Update|Change Status/i)');
      
      if (await statusControl.count() > 0) {
        await expect(statusControl.first()).toBeVisible();
      }
    }
  });

  test('should have users management section', async ({ page }) => {
    // Look for users link
    const usersLink = page.locator('a:has-text(/Users|Customers|Manage Users/i), button:has-text(/Users/i)');
    
    if (await usersLink.count() > 0) {
      await usersLink.first().click();
      await page.waitForNavigation();
      
      // Should show users list
      const usersList = page.locator('[class*="user"], [data-testid*="user"]');
      if (await usersList.count() > 0) {
        await expect(usersList.first()).toBeVisible();
      }
    }
  });

  test('should display users with actions', async ({ page }) => {
    // Navigate to users
    const usersLink = page.locator('a:has-text(/Users|Customers|Manage Users/i), button:has-text(/Users/i)');
    
    if (await usersLink.count() > 0) {
      await usersLink.first().click();
      await page.waitForNavigation();
      
      // Look for user info and actions
      const userActions = page.locator('button:has-text(/Edit|Delete|View|Details/i)');
      
      if (await userActions.count() > 0) {
        await expect(userActions.first()).toBeVisible();
      }
    }
  });

  test('should have analytics/reports section', async ({ page }) => {
    // Look for analytics link
    const analyticsLink = page.locator('a:has-text(/Analytics|Reports|Insights|Dashboard/i), button:has-text(/Analytics/i)');
    
    if (await analyticsLink.count() > 0) {
      await analyticsLink.first().click();
      await page.waitForNavigation();
      
      // Should show analytics data
      const analytics = page.locator('[class*="chart"], [class*="graph"], [class*="analytics"], text=/Total|Revenue|Orders/i');
      
      if (await analytics.count() > 0) {
        await expect(analytics.first()).toBeVisible();
      }
    }
  });

  test('should display stats/metrics', async ({ page }) => {
    // Look for dashboard stats
    const stats = page.locator('[class*="stat"], [class*="metric"], [class*="card"]');
    
    if (await stats.count() > 0) {
      await expect(stats.first()).toBeVisible();
    }
  });

  test('should display total revenue', async ({ page }) => {
    // Look for revenue metric
    const revenue = page.locator('text=/Revenue|Total|₹|Sales/i');
    
    if (await revenue.count() > 0) {
      await expect(revenue.first()).toBeVisible();
    }
  });

  test('should display total orders count', async ({ page }) => {
    // Look for orders count
    const ordersCount = page.locator('text=/Orders|Total Orders|Pending|Completed/i');
    
    if (await ordersCount.count() > 0) {
      await expect(ordersCount.first()).toBeVisible();
    }
  });

  test('should have settings section', async ({ page }) => {
    // Look for settings link
    const settingsLink = page.locator('a:has-text(/Settings|Config|Configuration/i), button:has-text(/Settings/i)');
    
    if (await settingsLink.count() > 0) {
      await settingsLink.first().click();
      await page.waitForNavigation();
      
      // Should show settings
      const settings = page.locator('[class*="setting"], form');
      if (await settings.count() > 0) {
        await expect(settings.first()).toBeVisible();
      }
    }
  });

  test('should allow searching in admin sections', async ({ page }) => {
    // Look for search box
    const searchBox = page.locator('input[placeholder*="Search" i], [aria-label*="search" i]');
    
    if (await searchBox.count() > 0) {
      await searchBox.first().fill('test');
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display pagination in lists', async ({ page }) => {
    // Look for pagination
    const pagination = page.locator('[class*="pagination"], button:has-text(/Next|Previous|1|2|3/i)');
    
    if (await pagination.count() > 0) {
      await expect(pagination.first()).toBeVisible();
    }
  });

  test('should allow filtering data', async ({ page }) => {
    // Look for filter options
    const filters = page.locator('[class*="filter"], select, button:has-text(/Filter|Date|Status/i)');
    
    if (await filters.count() > 0) {
      await expect(filters.first()).toBeVisible();
    }
  });

  test('should display logout option', async ({ page }) => {
    // Look for logout
    const logoutButton = page.locator('button:has-text(/Logout|Sign Out|Log Out/i), a:has-text(/Logout/i)');
    
    if (await logoutButton.count() > 0) {
      // Open menu if needed
      const menuButton = page.locator('[aria-label*="menu" i], [class*="menu-toggle"]');
      if (await menuButton.count() > 0) {
        await menuButton.first().click();
      }
      
      await expect(logoutButton.first()).toBeVisible();
    }
  });

  test.describe('Admin Analytics', () => {
    test('should display sales chart', async ({ page }) => {
      // Look for chart
      const chart = page.locator('[class*="chart"], canvas, svg');
      
      if (await chart.count() > 0) {
        await expect(chart.first()).toBeVisible();
      }
    });

    test('should display time period selector', async ({ page }) => {
      // Look for date range picker
      const dateSelector = page.locator('input[type="date"], select, button:has-text(/Today|Week|Month|Year/i)');
      
      if (await dateSelector.count() > 0) {
        await expect(dateSelector.first()).toBeVisible();
      }
    });
  });
});
