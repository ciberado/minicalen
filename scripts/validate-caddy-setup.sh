#!/bin/bash

# Validation script for Caddy deployment setup

echo "🔍 Validating MiniCalen Caddy deployment configuration..."

# Check required environment variables
echo ""
echo "📋 Checking environment variables:"

check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ $1 is not set"
        return 1
    else
        echo "✅ $1 = ${!1}"
        return 0
    fi
}

missing_vars=0

# Check Caddy environment variables
check_env_var "MINICALEN_HOST" || ((missing_vars++))
check_env_var "MINICALEN_BACKEND" || ((missing_vars++))
check_env_var "MINICALEN_FRONTEND" || ((missing_vars++))

echo ""
echo "📋 Checking optional environment variables:"
check_env_var "NODE_ENV"
check_env_var "PORT"
check_env_var "ALLOWED_ORIGINS"

# Check if Caddyfile exists
echo ""
echo "📄 Checking configuration files:"
if [ -f "Caddyfile" ]; then
    echo "✅ Caddyfile exists"
else
    echo "❌ Caddyfile not found"
    ((missing_vars++))
fi

# Check if package.json has required scripts
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
    
    if grep -q '"server:build"' package.json; then
        echo "✅ server:build script found"
    else
        echo "❌ server:build script not found in package.json"
        ((missing_vars++))
    fi
    
    if grep -q '"preview"' package.json; then
        echo "✅ preview script found"
    else
        echo "❌ preview script not found in package.json"
        ((missing_vars++))
    fi
else
    echo "❌ package.json not found"
    ((missing_vars++))
fi

# Check if server directory exists
if [ -d "server" ]; then
    echo "✅ server directory exists"
else
    echo "❌ server directory not found"
    ((missing_vars++))
fi

# Check if src directory exists
if [ -d "src" ]; then
    echo "✅ src directory exists"
else
    echo "❌ src directory not found"
    ((missing_vars++))
fi

echo ""
if [ $missing_vars -eq 0 ]; then
    echo "🎉 All checks passed! Ready for Caddy deployment."
    echo ""
    echo "📝 To deploy with Caddy:"
    echo "1. Build the frontend: npm run build"
    echo "2. Start the backend: npm run server:build"
    echo "3. Start Caddy: caddy run --config Caddyfile"
    exit 0
else
    echo "❌ $missing_vars issues found. Please fix them before deploying."
    echo ""
    echo "📖 See DEPLOYMENT.md for configuration details."
    exit 1
fi
