#!/bin/bash

# Run All Load Tests
# This script runs all load tests in sequence and generates a summary report

set -e

echo "=========================================="
echo "Biotak Go Backend - Load Testing Suite"
echo "=========================================="
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080}"
RESULTS_DIR="tests/load/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Results Directory: $RESULTS_DIR"
echo "  Timestamp: $TIMESTAMP"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "ERROR: k6 is not installed"
    echo "Please install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if server is running
echo "Checking server health..."
if ! curl -s -f "$BASE_URL/health" > /dev/null; then
    echo "ERROR: Server is not responding at $BASE_URL"
    echo "Please start the server first: make run"
    exit 1
fi
echo "✓ Server is healthy"
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2
    local duration=$3
    
    echo "=========================================="
    echo "Running: $test_name"
    echo "Duration: ~$duration"
    echo "=========================================="
    
    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.txt"
    local json_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json"
    
    # Run test with both text and JSON output
    k6 run \
        --out json="$json_file" \
        "$test_file" \
        2>&1 | tee "$output_file"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✓ $test_name PASSED"
    else
        echo "✗ $test_name FAILED (exit code: $exit_code)"
    fi
    
    echo ""
    sleep 5  # Cool down between tests
    
    return $exit_code
}

# Track results
declare -a test_results

# Run tests
echo "Starting load tests..."
echo ""

# 1. Authentication Load Test
run_test "auth-load" "tests/load/auth-load.js" "5 minutes"
test_results+=($?)

# 2. Post Listing Load Test
run_test "post-listing-load" "tests/load/post-listing-load.js" "8 minutes"
test_results+=($?)

# 3. Rate Limiting Test
run_test "rate-limit-test" "tests/load/rate-limit-test.js" "1 minute"
test_results+=($?)

# 4. Cache Performance Test
run_test "cache-performance" "tests/load/cache-performance.js" "5 minutes"
test_results+=($?)

# 5. Full System Load Test
run_test "full-system-load" "tests/load/full-system-load.js" "12 minutes"
test_results+=($?)

# Generate summary
echo "=========================================="
echo "Load Testing Summary"
echo "=========================================="
echo ""

test_names=("auth-load" "post-listing-load" "rate-limit-test" "cache-performance" "full-system-load")
passed=0
failed=0

for i in "${!test_results[@]}"; do
    if [ ${test_results[$i]} -eq 0 ]; then
        echo "✓ ${test_names[$i]}: PASSED"
        ((passed++))
    else
        echo "✗ ${test_names[$i]}: FAILED"
        ((failed++))
    fi
done

echo ""
echo "Total: $((passed + failed)) tests"
echo "Passed: $passed"
echo "Failed: $failed"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""

# Exit with failure if any test failed
if [ $failed -gt 0 ]; then
    echo "❌ Some tests failed"
    exit 1
else
    echo "✅ All tests passed"
    exit 0
fi
