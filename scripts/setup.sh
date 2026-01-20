#!/bin/bash

# GreenNewsTracker Setup Script
# This script sets up the environment for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

# Main setup
print_info "Starting GreenNewsTracker setup..."

# Check prerequisites
print_info "Checking prerequisites..."

if ! check_command docker; then
    print_error "Docker is required but not installed"
    exit 1
fi

if ! check_command docker-compose; then
    print_error "Docker Compose is required but not installed"
    exit 1
fi

if ! check_command node; then
    print_warning "Node.js is not installed (required for local development only)"
fi

print_success "All prerequisites met"

# Check if .env file exists
if [ ! -f .env ]; then
    print_info "Creating .env file from .env.example..."
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please edit .env and set your OPENAI_API_KEY"
else
    print_info ".env file already exists"
fi

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p data
mkdir -p logs
mkdir -p backups
print_success "Directories created"

# Check if Docker is running
print_info "Checking if Docker is running..."
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Build Docker images
print_info "Building Docker images (this may take a while)..."
docker-compose build
print_success "Docker images built"

# Start services
print_info "Starting services..."
docker-compose up -d
print_success "Services started"

# Wait for services to be healthy
print_info "Waiting for services to be healthy..."
sleep 10

# Check service health
print_info "Checking service health..."
if docker-compose ps | grep -q "Up (healthy)"; then
    print_success "Services are healthy"
else
    print_warning "Some services may still be starting. Check with: docker-compose ps"
fi

# Display access information
echo ""
print_success "Setup complete!"
echo ""
echo "Access the application at:"
echo "  - Frontend: http://localhost"
echo "  - API: http://localhost/api"
echo "  - API Health: http://localhost/api/health"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Check status: docker-compose ps"
echo ""
print_warning "Don't forget to set your OPENAI_API_KEY in .env file!"
echo ""
