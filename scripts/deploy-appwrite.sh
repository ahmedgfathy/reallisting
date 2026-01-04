#!/bin/bash

# Appwrite Deployment Script for Reallisting Platform
# This script sets up and deploys the application to Appwrite

set -e

echo "🚀 Appwrite Deployment Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="694ba83300116af11b75"
ENDPOINT="https://fra.cloud.appwrite.io/v1"
DATABASE_ID="reallisting"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Endpoint: $ENDPOINT"
echo "  Database ID: $DATABASE_ID"
echo ""

# Check if Appwrite CLI is installed
if ! command -v appwrite &> /dev/null; then
    echo -e "${YELLOW}⚠️  Appwrite CLI not found. Installing...${NC}"
    npm install -g appwrite-cli
    echo -e "${GREEN}✅ Appwrite CLI installed${NC}"
fi

# Check for API key
if [ -z "$APPWRITE_API_KEY" ]; then
    echo -e "${RED}❌ Error: APPWRITE_API_KEY environment variable not set${NC}"
    echo ""
    echo "To set your API key:"
    echo "  1. Go to Appwrite Console → Project Settings → API Keys"
    echo "  2. Create a new API key with all permissions"
    echo "  3. Run: export APPWRITE_API_KEY='your-api-key'"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ API key found${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${BLUE}📦 Step 1: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Setup database
echo -e "${BLUE}🗄️  Step 2: Setting up database...${NC}"
node scripts/setup-appwrite-db.js
echo -e "${GREEN}✅ Database setup complete${NC}"
echo ""

# Step 3: Build React app
echo -e "${BLUE}🔨 Step 3: Building React application...${NC}"
npm run build
echo -e "${GREEN}✅ React app built${NC}"
echo ""

# Step 4: Login to Appwrite CLI
echo -e "${BLUE}🔐 Step 4: Configuring Appwrite CLI...${NC}"
appwrite login --endpoint "$ENDPOINT"
appwrite init project --project-id "$PROJECT_ID"
echo -e "${GREEN}✅ Appwrite CLI configured${NC}"
echo ""

# Step 5: Deploy functions (if using Appwrite Functions)
echo -e "${BLUE}⚡ Step 5: Deploying functions...${NC}"
echo "  Note: Function deployment requires manual setup in Appwrite Console"
echo "  Your function files are ready in the api/ directory"
echo ""

# Step 6: Deploy static site
echo -e "${BLUE}🌐 Step 6: Deploying static site...${NC}"
echo "  Static files are in the 'build' directory"
echo "  To deploy:"
echo "    1. Go to Appwrite Console → Storage → Create Bucket"
echo "    2. Upload contents of 'build' directory"
echo "    3. Configure CDN/hosting as needed"
echo ""

# Final instructions
echo -e "${GREEN}✨ Deployment preparation complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Manual steps required:${NC}"
echo ""
echo "1. ${BLUE}Deploy Static Files:${NC}"
echo "   - Option A: Use Appwrite Storage + CDN"
echo "   - Option B: Use Netlify/Vercel for frontend + Appwrite for backend"
echo "   - Option C: Use Appwrite Cloud hosting when available"
echo ""
echo "2. ${BLUE}Deploy Functions:${NC}"
echo "   Go to Appwrite Console → Functions → Create Function"
echo "   - Upload each function from api/*-appwrite.js"
echo "   - Set runtime: Node.js 18"
echo "   - Configure environment variables"
echo ""
echo "3. ${BLUE}Environment Variables:${NC}"
echo "   Set in Appwrite Console → Settings → Variables:"
echo "   - APPWRITE_API_KEY"
echo "   - APPWRITE_DATABASE_ID=$DATABASE_ID"
echo ""
echo "4. ${BLUE}Configure Domains:${NC}"
echo "   - Add your custom domain in Appwrite Console"
echo "   - Update CORS settings if needed"
echo ""
echo -e "${GREEN}🎉 Your app is ready for Appwrite!${NC}"
echo ""
