#!/bin/bash
# Quick start script for A-Quire Backend

set -e

echo "🚀 A-Quire Backend Quick Start"
echo "=============================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from .env.example"
    cp .env.example .env
    echo "⚠️  Update .env with your settings before deploying to production"
fi

# Start services
echo "🐳 Starting Docker Compose services..."
docker-compose up -d

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run migrations
echo "🔄 Running database migrations..."
docker-compose exec -T backend alembic upgrade head

# Health check
echo "🏥 Running health check..."
sleep 2

# Get access info
BACKEND_URL="http://localhost:8000"

echo ""
echo "✅ Backend is ready!"
echo ""
echo "📊 Access Points:"
echo "  - API Docs:      $BACKEND_URL/docs"
echo "  - ReDoc:         $BACKEND_URL/redoc"
echo "  - Health:        $BACKEND_URL/health"
echo ""
echo "📝 Next Steps:"
echo "  1. Register a user: POST /api/v1/auth/register"
echo "  2. Login: POST /api/v1/auth/login"
echo "  3. Create courses: POST /api/v1/courses/"
echo ""
echo "📋 Common Commands:"
echo "  - View logs:      docker-compose logs -f backend"
echo "  - Stop services:  docker-compose down"
echo "  - Run tests:      docker-compose exec backend pytest tests/ -v"
echo ""
