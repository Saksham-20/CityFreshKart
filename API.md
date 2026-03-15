# CityFreshKart API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 🛍️ Products API

### Get All Products
```http
GET /products
```
**Query Parameters:**
- `category` - Filter by category
- `search` - Search term
- `sort` - 'price_asc', 'price_desc', 'featured'
- `limit` - Items per page (default: 20)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tomatoes",
      "category_name": "Vegetables",
      "price_per_kg": 40,
      "discount": 5,
      "stock": 100,
      "image": "https://...",
      "rating": 4.5,
      "reviews": 234
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Single Product
```http
GET /products/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Tomatoes",
    "description": "Fresh red tomatoes...",
    "category_name": "Vegetables",
    "price_per_kg": 40,
    "discount": 5,
    "stock": 100,
    "image": "https://...",
    "rating": 4.5,
    "reviews": 234
  }
}
```

---

## 🛒 Cart API

### Get Cart
```http
GET /cart
```
**Auth:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "name": "Tomatoes",
        "quantity": 2,
        "weight": 1.5,
        "price": 60,
        "image": "https://..."
      }
    ],
    "summary": {
      "item_count": 2,
      "subtotal": 120,
      "delivery_fee": 0,
      "total": 120
    }
  }
}
```

### Add to Cart
```http
POST /cart/items
```
**Auth:** Required

**Body:**
```json
{
  "product_id": "uuid",
  "quantity": 1,
  "weight": 1.5,
  "price": 60
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": { /*cart object*/ }
}
```

### Update Cart Item
```http
PUT /cart/items/:itemId
```
**Auth:** Required

**Body:**
```json
{
  "quantity": 2,
  "weight": 2
}
```

### Remove from Cart
```http
DELETE /cart/items/:itemId
```
**Auth:** Required

### Clear Cart
```http
DELETE /cart
```
**Auth:** Required

---

## 📦 Orders API

### Create Order
```http
POST /orders
```
**Auth:** Required

**Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 1,
      "weight": 1.5,
      "price_per_kg": 40,
      "calculated_price": 60
    }
  ],
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_line_1": "123 Main St",
    "address_line_2": "Apt 4",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "phone": "555-1234"
  },
  "payment_method": "card",
  "notes": "Call before delivery"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "CFB-20260315-001",
    "subtotal": 120,
    "delivery_fee": 0,
    "total": 120,
    "status": "pending",
    "created_at": "2026-03-15T10:30:00Z"
  }
}
```

### Get Orders
```http
GET /orders
```
**Auth:** Required

**Query Parameters:**
- `status` - Filter by status
- `limit` - Items per page
- `offset` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "order_id": "uuid",
      "order_number": "CFB-20260315-001",
      "subtotal": 120,
      "delivery_fee": 0,
      "total": 120,
      "status": "confirmed",
      "items": [ /*array*/ ],
      "created_at": "2026-03-15T10:30:00Z"
    }
  ]
}
```

### Get Single Order
```http
GET /orders/:orderId
```
**Auth:** Required

---

## 👤 Authentication API

### Register
```http
POST /auth/register
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "555-1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "token": "eyJhbGc..."
  }
}
```

### Login
```http
POST /auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "email": "user@example.com",
    "token": "eyJhbGc..."
  }
}
```

### Logout
```http
POST /auth/logout
```
**Auth:** Required

---

## 💝 Wishlist API

### Get Wishlist
```http
GET /wishlist
```
**Auth:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid",
      "name": "Tomatoes",
      "price_per_kg": 40,
      "image": "https://..."
    }
  ]
}
```

### Add to Wishlist
```http
POST /wishlist/items
```
**Auth:** Required

**Body:**
```json
{
  "product_id": "uuid"
}
```

### Remove from Wishlist
```http
DELETE /wishlist/items/:productId
```
**Auth:** Required

---

## ⚙️ Admin API

### Add Product (Admin only)
```http
POST /admin/products
```
**Auth:** Required (Admin)

**Body:**
```json
{
  "name": "Fresh Tomatoes",
  "slug": "fresh-tomatoes",
  "description": "Farm fresh red tomatoes...",
  "category": "Vegetables",
  "price_per_kg": 40,
  "discount": 5,
  "stock": 100,
  "image": "https://..."
}
```

### Update Product
```http
PUT /admin/products/:id
```
**Auth:** Required (Admin)

### Delete Product
```http
DELETE /admin/products/:id
```
**Auth:** Required (Admin)

### Update Order Status
```http
PUT /admin/orders/:orderId
```
**Auth:** Required (Admin)

**Body:**
```json
{
  "status": "delivered"
}
```

---

## 🔍 Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes
- `INVALID_INPUT` - Validation error
- `UNAUTHORIZED` - Missing/invalid token
- `FORBIDDEN` - Not allowed (admin only)
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `INTERNAL_ERROR` - Server error

---

## 📊 Rate Limiting

- **Limit**: 100 requests per 15 minutes
- **Header**: `X-RateLimit-Remaining`

---

## 🔐 Security Headers

All responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## 💾 Database with Prisma

Access Prisma Studio:
```bash
npx prisma studio
```

View auto-generated docs:
```bash
npx prisma generate --watch
```

---

**Last Updated**: March 15, 2026
