#!/bin/bash

echo "🚀 Pushing Canada Drives Clone to GitHub"
echo "======================================="

# Check if already authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ You need to authenticate with GitHub first!"
    echo "Run: gh auth login"
    echo "Then run this script again."
    exit 1
fi

echo "✅ GitHub authentication verified"

# Create the GitHub repository
echo "📦 Creating GitHub repository..."
gh repo create canada-drives-clone \
    --public \
    --source=. \
    --remote=origin \
    --description="Green Light Automotive - A Canada Drives clone website with car browsing, financing, and delivery features" \
    --push

if [ $? -eq 0 ]; then
    echo "✅ Successfully created and pushed to GitHub!"
    echo ""
    echo "🔗 Your repository is now available at:"
    gh repo view --web --no-browser
    echo ""
    echo "Next steps:"
    echo "1. Deploy to Vercel: vercel --prod"
    echo "2. Or connect this GitHub repo to Vercel via their web interface"
else
    echo "❌ Failed to create repository. The repository might already exist."
    echo ""
    echo "If the repo already exists, try:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/canada-drives-clone.git"
    echo "git push -u origin main"
fi