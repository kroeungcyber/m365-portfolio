#!/bin/bash

# M365 Security Lab - Testing Demo Script
# This script demonstrates how to interact with the Production-Ready Security API.

PORT=${1:-3000}
BASE_URL="http://localhost:$PORT"

echo "--------------------------------------------------"
echo "🚀 Starting M365 Security Lab Testing Demo"
echo "--------------------------------------------------"

# 1. Health Check (Public)
echo -e "\n1. Checking API Health (Public Endpoint)..."
curl -s "$BASE_URL/health" | jq .

# 2. Profile Access (Requires Authentication)
echo -e "\n2. Accessing Profile without Token (Expect 401)..."
curl -s -i "$BASE_URL/api/profile" | head -n 1

# 3. Admin Access (Requires Auth + Admin Role)
echo -e "\n3. Accessing Admin Settings without Token (Expect 401)..."
curl -s -i "$BASE_URL/api/admin/settings" | head -n 1

echo -e "\n--------------------------------------------------"
echo "📝 Note: To test authorized routes, you must provide a valid"
echo "Microsoft Entra ID Bearer token in the Authorization header."
echo ""
echo "Example command:"
echo "curl -H 'Authorization: Bearer <YOUR_TOKEN>' $BASE_URL/api/profile"
echo "--------------------------------------------------"
