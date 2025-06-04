#!/bin/bash

# Script to automatically setup branch protection rules
# Requires GitHub CLI (gh) to be installed and authenticated

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Setting up branch protection rules...${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first:${NC}"
    echo "   brew install gh"
    echo "   or visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI. Please run:${NC}"
    echo "   gh auth login"
    exit 1
fi

# Get current repository info
REPO=$(gh repo view --json owner,name -q '.owner.login + "/" + .name')
echo -e "${YELLOW}📁 Repository: ${REPO}${NC}"

# Detect main branch (main or master)
MAIN_BRANCH=$(gh api repos/${REPO} --jq '.default_branch')
echo -e "${YELLOW}🌿 Main branch: ${MAIN_BRANCH}${NC}"

# Setup branch protection
echo -e "${YELLOW}🛡️  Applying branch protection rules...${NC}"

# Create temporary JSON file
cat > /tmp/branch-protection.json << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": []
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Apply branch protection using the JSON file
gh api repos/${REPO}/branches/${MAIN_BRANCH}/protection \
  --method PUT \
  --input /tmp/branch-protection.json

# Clean up temporary file
rm /tmp/branch-protection.json

echo -e "${GREEN}✅ Branch protection rules successfully applied!${NC}"
echo -e "${GREEN}🎉 Your repository is now secured with:${NC}"
echo -e "   • Pull requests required before merging"
echo -e "   • At least 1 approval required"
echo -e "   • Stale reviews dismissed on new commits"
echo -e "   • Force pushes disabled"
echo -e "   • Branch deletions disabled"
echo -e "   • Rules apply to administrators"

echo -e "\n${YELLOW}💡 Next steps:${NC}"
echo -e "   1. Add status checks if you have CI/CD workflows"
echo -e "   2. Configure NPM_TOKEN secret for automated releases"
echo -e "   3. Start using conventional commits (feat:, fix:, etc.)" 