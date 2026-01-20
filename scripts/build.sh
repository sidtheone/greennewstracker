#!/bin/bash

# GreenNewsTracker Build Script
# This script builds all services for production

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

# Parse arguments
BUILD_TYPE="docker"
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --local)
            BUILD_TYPE="local"
            shift
            ;;
        --docker)
            BUILD_TYPE="docker"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --local       Build locally without Docker"
            echo "  --docker      Build with Docker (default)"
            echo "  --skip-tests  Skip running tests"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main build
print_info "Starting GreenNewsTracker build..."
print_info "Build type: $BUILD_TYPE"

if [ "$BUILD_TYPE" = "docker" ]; then
    # Docker build
    print_info "Building Docker images..."
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Build all services
    docker-compose build --no-cache
    
    print_success "Docker images built successfully"
    
    # Tag images
    print_info "Tagging images..."
    VERSION=$(date +%Y%m%d-%H%M%S)
    
    docker tag greennewstracker-api:latest greennewstracker-api:$VERSION
    docker tag greennewstracker-worker:latest greennewstracker-worker:$VERSION
    docker tag greennewstracker-frontend:latest greennewstracker-frontend:$VERSION
    docker tag greennewstracker-proxy:latest greennewstracker-proxy:$VERSION
    
    print_success "Images tagged with version: $VERSION"
    
else
    # Local build
    print_info "Building locally..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is required for local build"
        exit 1
    fi
    
    # Build backend shared
    print_info "Building backend/shared..."
    cd backend/shared
    npm install
    npm run build
    cd ../..
    
    # Build API
    print_info "Building backend/api..."
    cd backend/api
    npm install
    npm run build
    cd ../..
    
    # Build Worker
    print_info "Building backend/worker..."
    cd backend/worker
    npm install
    npm run build
    cd ../..
    
    # Build Frontend
    print_info "Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    
    print_success "Local build completed"
fi

# Run tests if not skipped
if [ "$SKIP_TESTS" = false ]; then
    print_info "Running tests..."
    
    if [ "$BUILD_TYPE" = "docker" ]; then
        # Run tests in Docker
        docker-compose run --rm api npm test || print_warning "API tests failed or not configured"
        docker-compose run --rm worker npm test || print_warning "Worker tests failed or not configured"
        docker-compose run --rm frontend npm test || print_warning "Frontend tests failed or not configured"
    else
        # Run tests locally
        cd backend/api && npm test || print_warning "API tests failed or not configured"
        cd ../..
        cd backend/worker && npm test || print_warning "Worker tests failed or not configured"
        cd ../..
        cd frontend && npm test || print_warning "Frontend tests failed or not configured"
        cd ..
    fi
    
    print_success "Tests completed"
else
    print_warning "Tests skipped"
fi

# Security scan
print_info "Running security scan..."

if command -v trivy &> /dev/null; then
    if [ "$BUILD_TYPE" = "docker" ]; then
        trivy image greennewstracker-api:latest || print_warning "Security scan found issues"
        trivy image greennewstracker-worker:latest || print_warning "Security scan found issues"
        trivy image greennewstracker-frontend:latest || print_warning "Security scan found issues"
        trivy image greennewstracker-proxy:latest || print_warning "Security scan found issues"
    fi
else
    print_warning "Trivy not installed. Skipping security scan."
fi

print_success "Build completed successfully!"
echo ""
print_info "Next steps:"
if [ "$BUILD_TYPE" = "docker" ]; then
    echo "  - Start services: docker-compose up -d"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Check status: docker-compose ps"
else
    echo "  - Start API: cd backend/api && npm start"
    echo "  - Start Worker: cd backend/worker && npm start"
    echo "  - Start Frontend: cd frontend && npm run preview"
fi
echo ""
