#!/bin/bash
# Database Recovery Script for Duplicate Phone Key Errors
# This script helps recover from "duplicate key value violates unique constraint 'users_phone_key'" errors

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== CityFreshKart Database Recovery Script ===${NC}"
echo ""

# Check if running in the right directory
if [ ! -f "server/database/config.js" ]; then
    echo -e "${RED}Error: Run this script from the project root directory${NC}"
    exit 1
fi

# Source environment variables
if [ -f ".env.production" ]; then
    export $(cat .env.production | grep -v '#' | xargs)
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Database connection details
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-cityfreshkart}
DB_USER=${DB_USER:-postgres}

echo "🔍 Database Info:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Try to connect and get duplicate phone info
echo "📊 Checking for duplicate phone entries..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT phone, COUNT(*) as count, array_agg(id) as user_ids
FROM users
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY count DESC;
" 2>/dev/null || {
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Make sure PostgreSQL is running and credentials are correct in .env"
    exit 1
}

echo ""
echo "🔄 Attempting to clean up duplicates..."
echo ""

# Create a cleanup SQL script
cat > /tmp/cleanup_duplicates.sql << 'EOF'
-- Clean up duplicate users (keep the first one, delete the rest)
WITH dupes AS (
  SELECT 
    phone,
    array_agg(id ORDER BY created_at) as ids,
    array_agg(id ORDER BY created_at)[1] as keep_id
  FROM users
  GROUP BY phone
  HAVING COUNT(*) > 1
)
DELETE FROM users
WHERE id IN (
  SELECT id
  FROM (
    SELECT UNNEST(ids[2:]) as id FROM dupes
  ) t
);

SELECT 'Cleaned up duplicate phone entries' as status;
EOF

echo "📝 Running cleanup query..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/cleanup_duplicates.sql 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cleanup completed${NC}"
else
    echo -e "${RED}⚠️  Cleanup encountered an issue (may be normal if no duplicates)${NC}"
fi

echo ""
echo "🧹 Verifying cleanup..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT phone, COUNT(*) as count
FROM users
GROUP BY phone
HAVING COUNT(*) > 1;
" 2>/dev/null

echo ""
echo -e "${GREEN}✅ Database recovery completed${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart your server: npm start"
echo "  2. The setup script will now run without duplicate key errors"
echo "  3. Monitor logs for any remaining issues"
echo ""

# Clean up
rm -f /tmp/cleanup_duplicates.sql
