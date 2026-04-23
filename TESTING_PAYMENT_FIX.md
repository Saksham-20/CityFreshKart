# Testing Payment Fix - Green Chilli Scenario

## Quick Test: Reproduce & Verify Fix

### Scenario: Order Green Chilli with Weight Tier Override

**Setup:**
- Product: Green Chilli (ID: 5 or confirm from DB)
- Weight tier: 0.25kg → ₹30 (or current configured tier)
- Other items: Add some basic items (~₹575 total)
- Expected total: ₹605 + delivery (if applicable)

### Test Steps

#### Step 1: Verify Weight Tiers Configured
```bash
# In database, confirm Green Chilli has tiers
mysql> SELECT * FROM product_weight_prices WHERE product_id = (SELECT id FROM products WHERE name LIKE '%Green Chilli%');
# Should show: weight_option: 0.25, price_override: 30
```

#### Step 2: Load Cart
```bash
curl http://localhost:3000/api/cart \
  -H "Cookie: authToken=YOUR_TOKEN"
```

**Verify in Response:**
```json
{
  "items": [
    {
      "product_id": 5,
      "name": "Green Chilli",
      "weight_price_overrides": {
        "0.25": 30,
        "0.5": 60,
        "1.0": 120
      }
    }
  ]
}
```

✅ **FIX #1 Working:** If `weight_price_overrides` present → cart endpoint fixed!

#### Step 3: Check Browser Console (Frontend)
Open DevTools → Console:
```javascript
// Log should show weight tiers loaded
console.log("Cart with tiers loaded successfully")
```

#### Step 4: Create Order
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: authToken=YOUR_TOKEN" \
  -d '{
    "items": [
      {"product_id": 5, "quantity_kg": 0.25}
    ],
    "subtotal": 27.5,
    "delivery_fee": 0,
    "total_price": 27.5,
    "delivery_address": "123 Main St"
  }'
```

#### Step 5: Check Server Logs
Look for these patterns:

**GOOD (FIX WORKING):**
```
[ORDER_CALC] Item-by-item breakdown:
{
  "itemCount": 1,
  "itemCalculations": [
    {
      "productId": 5,
      "productName": "Green Chilli",
      "quantityKg": 0.25,
      "hasWeightTierOverride": true,
      "tierOverridePrice": 30,
      "itemTotal": 27.5
    }
  ],
  "calculatedSubtotal": 27.5
}

[ORDER_CALC_DEBUG] Final order amounts:
{
  "itemCount": 1,
  "calculatedSubtotal": 27.5,
  "calculatedTotal": 27.5
}
```

**BAD (BUG STILL PRESENT):**
```
[ORDER_CALC_DEBUG] Item-by-item breakdown: { itemCalculations: [], ... }
# EMPTY itemCalculations means no items processed!
```

✅ **FIX #2 Working:** If `itemCalculations` shows Green Chilli with `hasWeightTierOverride: true`

#### Step 6: Test Price Change Detection

After order created, modify Green Chilli price:
```bash
# Admin API - change price from 30 to 15
curl -X PUT http://localhost:3000/api/admin/products/5 \
  -H "Content-Type: application/json" \
  -d '{"price_per_kg": 15}'
```

Create another order with same items:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": 5, "quantity_kg": 0.25}],
    "subtotal": 27.5,
    "total_price": 27.5
  }'
```

Check logs for:
```
[ORDER_PRICE_CHANGED] Prices recalculated - product prices may have changed:
{
  "receivedTotal": 27.5,
  "calculatedTotal": 13.75,
  "totalDifference": 13.75,
  "percentChange": "50.00%",
  "reason": "Product prices changed after cart loaded"
}
```

✅ **FIX #4 Working:** If this log appears, price change detection working!

#### Step 7: Verify Audit Trail
```sql
SELECT * FROM order_audit_log 
WHERE event_type = 'price_recalculated' 
ORDER BY timestamp DESC 
LIMIT 1;
```

Should show:
```
id | order_id | event_type | received_total | calculated_total | discrepancy_amount | reason
5  | 3        | price_recalculated | 27.5 | 13.75 | 13.75 | Product prices changed...
```

✅ **FIX #5 Working:** If audit entry created, audit logging working!

#### Step 8: Test Payment Link Creation

Complete checkout and create payment link:
```bash
curl -X POST http://localhost:3000/api/razorpay/payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 3,
    "amount": 27.5
  }'
```

Check logs for:
```
[RAZORPAY_PAYMENT_LINK] Validating payment amount:
{
  "requestedAmount": 27.5,
  "expectedAmount": 27.5,
  "difference": 0,
  "percentDifference": "0.00%"
}

[RAZORPAY_PAYMENT_LINK_CREATE] Sending to Razorpay:
{
  "amountRupees": 27.5,
  "amountPaise": 2750
}
```

✅ **FIX #6 Working:** If exact match shown, validation working!

## Database Query: Find Orders with Discrepancies

```sql
-- Find all orders with price discrepancies
SELECT 
  al.order_id,
  al.event_type,
  al.received_total,
  al.calculated_total,
  al.discrepancy_amount,
  al.discrepancy_percent,
  al.reason,
  al.timestamp
FROM order_audit_log al
WHERE al.discrepancy_amount > 0.1
ORDER BY al.timestamp DESC;

-- Find orders with Green Chilli that had discrepancies
SELECT 
  o.order_number,
  o.total_price,
  oi.product_name,
  oi.quantity_kg,
  al.discrepancy_amount
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN order_audit_log al ON o.id = al.order_id
WHERE oi.product_name LIKE '%Chilli%'
  AND al.discrepancy_amount IS NOT NULL
ORDER BY o.created_at DESC;
```

## Regression Test Checklist

After deploying fixes, verify:

- [ ] Green Chilli 0.25kg orders include tier price (₹30, not ₹120)
- [ ] Order totals match expected calculations
- [ ] Payment amount matches order total (no ₹30 discrepancy)
- [ ] Weight tier error messages show available options
- [ ] Price changes logged when detected
- [ ] Audit log records all transactions
- [ ] Razorpay payment link creation succeeds
- [ ] No orders created with < expected item count

## Logs to Monitor

In production, watch for these error patterns:

```bash
# Shows tier mismatch
tail -f server.log | grep "ORDER_VALIDATION_FAILED"

# Shows price recalculations
tail -f server.log | grep "ORDER_PRICE_CHANGED"

# Shows payment mismatches
tail -f server.log | grep "RAZORPAY_PAYMENT_LINK_ERROR"

# Check all calculation logs
tail -f server.log | grep "ORDER_CALC"
```

## Expected Behavior After Fix

| Scenario | Expected | Before Fix |
|----------|----------|-----------|
| Green Chilli 0.25kg | Item included, ₹30 charged | Item excluded, ₹30 missing |
| Cart loads | weight_price_overrides in response | Empty object or missing |
| Price changes | Order uses new price + log warn | Silent recalculation |
| Payment mismatch | Error with details | Generic error or charge anyway |
| Audit query | Finds all discrepancies | No history available |

## Success Criteria

✅ All green checkmarks = Fix verified working!
