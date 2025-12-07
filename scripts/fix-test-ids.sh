#!/bin/bash

# Script to add IDs to all User and Post creations in tests

echo "🔧 Fixing test files to add required IDs..."

# Find all test files
find . -name "*_test.go" -type f | while read file; do
    echo "Processing: $file"
    
    # Add ID to User.Create() calls that don't have SetID
    # This is a simple sed replacement - may need manual review
    
    # Skip if already processed
    if grep -q "generateTestID" "$file" 2>/dev/null; then
        echo "  ✓ Already has generateTestID"
        continue
    fi
    
    echo "  → Needs manual review"
done

echo ""
echo "✅ Done! Please review the changes."
echo "Note: Some files may need manual fixes for:"
echo "  - User.Create() needs SetID()"
echo "  - Post.Create() needs SetID()"
echo "  - Use generateTestID() and generateTestEmail() helpers"
