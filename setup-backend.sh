#!/bin/bash

# CityFreshKart Backend Quick Start Script
# Run this script to set up and start the backend server

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  CityFreshKart Backend Setup & Startup                     ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js and npm
echo ""
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Install from: https://nodejs.org/ (LTS recommended)"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    echo "   npm should come with Node.js"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ Node.js${NC} ($NODE_VERSION)"
echo -e "${GREEN}✅ npm${NC} ($NPM_VERSION)"

# Check PostgreSQL
echo ""
echo "📋 Checking PostgreSQL..."

if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL CLI (psql) not found${NC}"
    echo "   Install from: https://www.postgresql.org/download/"
    echo "   Or use: brew install postgresql@15 (macOS)"
    echo "   The server may still work if PostgreSQL is running on localhost:5432"
else
    PG_VERSION=$(psql --version)
    echo -e "${GREEN}✅ PostgreSQL${NC} found ($PG_VERSION)"
fi

# Check database connection
echo ""
echo "📋 Checking database connection..."

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-lux_ecom}

if command -v psql &> /dev/null; then
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL database is running${NC} ($DB_HOST:$DB_PORT/$DB_NAME)"
    else
        echo -e "${YELLOW}⚠️  Cannot connect to PostgreSQL${NC}"
        echo "   Expected: postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
        echo "   Please ensure PostgreSQL is running with the correct credentials"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot verify database (psql not available)${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."

if [ ! -d "node_modules" ]; then
    echo "   Installing root dependencies..."
    npm install --silent
    echo -e "${GREEN}✅ Root dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Root dependencies already installed${NC}"
fi

if [ ! -d "server/node_modules" ]; then
    echo "   Installing server dependencies..."
    cd server
    npm install --silent
    cd ..
    echo -e "${GREEN}✅ Server dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Server dependencies already installed${NC}"
fi

if [ ! -d "client/node_modules" ]; then
    echo "   Installing client dependencies..."
    cd client
    npm install --silent
    cd ..
    echo -e "${GREEN}✅ Client dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Client dependencies already installed${NC}"
fi

# Initialize Prisma
echo ""
echo "🗄️  Setting up Prisma ORM..."

cd server

if [ ! -d "prisma/migrations" ]; then
    echo "   Creating initial migration..."
    npx prisma migrate dev --name init --skip-seed
    echo -e "${GREEN}✅ Prisma schema initialized${NC}"
else
    echo -e "${GREEN}✅ Prisma migrations already initialized${NC}"
fi

cd ..

# Display startup information
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete! Ready to Start Development                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "🚀 To start the development environment, run:"
echo ""
echo "   # Terminal 1 - Backend server"
echo -e "   ${YELLOW}cd server && npm run dev${NC}"
echo ""
echo "   # Terminal 2 - Frontend development"
echo -e "   ${YELLOW}cd client && npm run dev${NC}"
echo ""
echo "URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000"
echo "   Health:    http://localhost:5000/health"
echo ""

echo "📖 Documentation:"
echo "   - Backend Migration:  ./BACKEND_MIGRATION.md"
echo "   - Upgrade Guide:      ./UPGRADE_GUIDE.md"
echo "   - API Documentation: ./API.md"
echo ""

echo "🔧 Useful commands:"
echo -e "   ${YELLOW}npm run dev${NC}            - Start backend (server/)"
echo -e "   ${YELLOW}npm run db:studio${NC}      - Open Prisma Studio"
echo -e "   ${YELLOW}npm run db:reset${NC}       - Reset database (destructive)"
echo -e "   ${YELLOW}npm run db:migrate${NC}     - Run migrations"
echo ""

echo -e "${GREEN}✨ Happy coding! ✨${NC}"
