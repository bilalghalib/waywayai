#!/bin/bash

# WayWay AI - Development Environment Setup Script

set -e  # Exit on error

echo "🎨 WayWay AI - Setup Script"
echo "============================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18 or higher required. You have: $(node -v)"
  echo "   Please install from: https://nodejs.org"
  exit 1
fi
echo "✓ Node.js $(node -v) detected"
echo ""

# Check Docker (for Supabase local)
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
  echo "⚠️  Docker not found (optional for local Supabase)"
  echo "   Install from: https://www.docker.com/products/docker-desktop"
else
  echo "✓ Docker detected"
fi
echo ""

# Install dependencies
echo "Installing npm dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Install Supabase CLI
echo "Installing Supabase CLI..."
npm install -g supabase
echo "✓ Supabase CLI installed"
echo ""

# Copy environment template
if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cp .env.example .env.local
  echo "✓ .env.local created"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.local and add your Supabase credentials!"
  echo "   Get them from: https://app.supabase.com/project/_/settings/api"
else
  echo "✓ .env.local already exists"
fi
echo ""

# Ask about local Supabase
read -p "Start local Supabase now? (requires Docker) [y/N]: " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Starting Supabase locally..."
  npx supabase start
  echo ""
  echo "✓ Supabase started!"
  echo "  Studio: http://localhost:54323"
  echo "  API: http://localhost:54321"
fi
echo ""

# Success message
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your Supabase credentials"
echo "  2. Run 'npm run dev' to start development server"
echo "  3. Open http://localhost:3000"
echo ""
echo "For deployment:"
echo "  - Read DEPLOYMENT.md"
echo "  - Run 'vercel' to deploy"
echo ""
echo "Happy coding! 🚀"
