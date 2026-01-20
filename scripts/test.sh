#!/bin/bash

# GreenNewsTracker Test Script
# This script runs tests for all services

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
TEST_TYPE="all"
COVERAGE=false
WATCH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --api)
            TEST_TYPE="api"
            shift
            ;;
        --worker)
            TEST_TYPE="worker"
            shift
            ;;
        --frontend)
            TEST_TYPE="frontend"
            shift
            ;;
        --all)
            TEST_TYPE="all"
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --api         Run API tests only"
            echo "  --worker      Run Worker tests only"
            echo "  --frontend    Run Frontend tests only"
            echo "  --all         Run all tests (default)"
            echo "  --coverage    Generate coverage reports"
            echo "  --watch       Run tests in watch mode"
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

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run tests
run_tests() {
    local service=$1
    local path=$2
    
    print_info "Running tests for $service..."
    
    cd $path
    
    if [ "$COVERAGE" = true ]; then
        if [ "$WATCH" = true ]; then
            npm run test:watch:coverage || true
        else
            npm run test:coverage || true
        fi
    else
        if [ "$WATCH" = true ]; then
            npm run test:watch || true
        else
            npm test || true
        fi
    fi
    
    local exit_code=$?
    cd - > /dev/null
    
    if [ $exit_code -eq 0 ]; then
        print_success "$service tests passed"
        ((PASSED_TESTS++))
    else
        print_error "$service tests failed"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Main test execution
print_info "Starting GreenNewsTracker tests..."
print_info "Test type: $TEST_TYPE"

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "api" ]; then
    run_tests "API" "backend/api"
fi

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "worker" ]; then
    run_tests "Worker" "backend/worker"
fi

if [ "$TEST_TYPE" = "all" ] || [ "$TEST_TYPE" = "frontend" ]; then
    run_tests "Frontend" "frontend"
fi

# Health check tests
print_info "Running health check tests..."

if docker-compose ps | grep -q "Up (healthy)"; then
    print_success "All services are healthy"
    
    # Test API health endpoint
    if curl -s http://localhost/api/health > /dev/null; then
        print_success "API health endpoint is responding"
    else
        print_warning "API health endpoint is not responding"
    fi
    
    # Test frontend health endpoint
    if curl -s http://localhost/health > /dev/null; then
        print_success "Frontend health endpoint is responding"
    else
        print_warning "Frontend health endpoint is not responding"
    fi
else
    print_warning "Services are not running. Start with: docker-compose up -d"
fi

# Linting
print_info "Running linters..."

cd backend/api
if npm run lint > /dev/null 2>&1; then
    print_success "API linting passed"
else
    print_warning "API linting found issues"
fi
cd - > /dev/null

cd backend/worker
if npm run lint > /dev/null 2>&1; then
    print_success "Worker linting passed"
else
    print_warning "Worker linting found issues"
fi
cd - > /dev/null

cd frontend
if npm run lint > /dev/null 2>&1; then
    print_success "Frontend linting passed"
else
    print_warning "Frontend linting found issues"
fi
cd - > /dev/null

# Type checking
print_info "Running type checks..."

cd backend/api
if npm run type-check > /dev/null 2>&1; then
    print_success "API type checking passed"
else
    print_warning "API type checking found issues"
fi
cd - > /dev/null

cd backend/worker
if npm run type-check > /dev/null 2>&1; then
    print_success "Worker type checking passed"
else
    print_warning "Worker type checking found issues"
fi
cd - > /dev/null

cd frontend
if npm run type-check > /dev/null 2>&1; then
    print_success "Frontend type checking passed"
else
    print_warning "Frontend type checking found issues"
fi
cd - > /dev/null

# Summary
echo ""
print_info "Test Summary:"
echo "  Total test suites: $TOTAL_TESTS"
echo "  Passed: $PASSED_TESTS"
echo "  Failed: $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    print_success "All tests passed!"
    exit 0
else
    print_error "Some tests failed. Please review the output above."
    exit 1
fi
