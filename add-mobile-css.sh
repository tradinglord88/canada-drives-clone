#!/bin/bash

# Add mobile.css link to all HTML files that have styles.css but not mobile.css
for file in *.html; do
    if [ -f "$file" ]; then
        # Check if file has styles.css but not mobile.css
        if grep -q "assets/css/styles.css" "$file" && ! grep -q "assets/css/mobile.css" "$file"; then
            echo "Adding mobile.css to $file"
            # Add mobile.css after styles.css
            sed -i '' 's|<link rel="stylesheet" href="assets/css/styles.css">|<link rel="stylesheet" href="assets/css/styles.css">\
    <link rel="stylesheet" href="assets/css/mobile.css">|' "$file"
        fi
    fi
done

echo "Mobile CSS has been added to all HTML files!"