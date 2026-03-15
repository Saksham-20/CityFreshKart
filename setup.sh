#!/usr/bin/env bash

# 🚀 CityFreshKart v2.0 - Quick Start Script
# Run this after cloning to get started immediately

echo "🥬 Welcome to CityFreshKart v2.0"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm install
cd client && npm install && cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Setup .env
echo -e "${BLUE}Step 2: Setting up environment variables...${NC}"
if [ ! -f .env ]; then
  cp env.example .env
  echo -e "${YELLOW}Created .env file${NC}"
  echo -e "${YELLOW}⚠️  Please update DATABASE_URL in .env with your PostgreSQL connection${NC}"
else
  echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Step 3: Database setup
echo -e "${BLUE}Step 3: Setting up database...${NC}"
echo -e "${YELLOW}Running Prisma migrations...${NC}"
npx prisma migrate dev --name init
npx prisma generate

echo -e "${GREEN}✓ Database configured${NC}"
echo ""

# Step 4: Instructions
echo -e "${BLUE}🎉 Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "${YELLOW}Terminal 1 (Backend - :5000):${NC}"
echo "  npm run dev"
echo ""
echo -e "${YELLOW}Terminal 2 (Frontend - :3000):${NC}"
echo "  cd client && npm start"
echo ""
echo -e "${YELLOW}Run Tests:${NC}"
echo "  cd client && npm run test:e2e"
echo ""
echo -e "${YELLOW}View Database:${NC}"
echo "  npx prisma studio"
echo ""
echo -e "${GREEN}Documentation:${NC}"
echo "  • UPGRADE_GUIDE.md - Setup & usage"
echo "  • COMPONENTS_GUIDE.md - Component APIs"
echo "  • API.md - Backend endpoints"
echo "  • ARCHITECTURE.md - System design"
echo "  • DEPLOYMENT.md - Production setup"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
