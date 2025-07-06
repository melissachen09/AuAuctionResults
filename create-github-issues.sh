#!/bin/bash

echo "🚀 Creating GitHub Issues for Property Dashboard Redesign"
echo "========================================================"
echo ""

# Check if gh is authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI not authenticated. Please run:"
    echo "   gh auth login"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Issue 1: Database Schema Enhancement
echo "📝 Creating Issue 1: Database Schema Enhancement..."
gh issue create \
    --title "Database Schema: Add propertyUrl field to Auction model" \
    --body "$(cat github-issues/01-database-schema-enhancement.md)" \
    --label "database,enhancement,high-priority"

# Issue 2: Enhanced Domain Scraper  
echo "📝 Creating Issue 2: Enhanced Domain Scraper..."
gh issue create \
    --title "Enhanced Domain Scraper: Extract Property URLs" \
    --body "$(cat github-issues/02-enhance-domain-scraper.md)" \
    --label "scraper,enhancement,domain"

# Issue 3: Enhanced REA Scraper
echo "📝 Creating Issue 3: Enhanced REA Scraper..."
gh issue create \
    --title "Enhanced REA Scraper: Extract Property URLs" \
    --body "$(cat github-issues/03-enhance-rea-scraper.md)" \
    --label "scraper,enhancement,rea"

# Issue 4: Deduplication Enhancement
echo "📝 Creating Issue 4: Deduplication Enhancement..."
gh issue create \
    --title "Enhanced Deduplication: Prevent Cross-Source Duplicates" \
    --body "$(cat github-issues/04-deduplication-enhancement.md)" \
    --label "database,enhancement,deduplication,performance"

# Issue 5: Dashboard Redesign
echo "📝 Creating Issue 5: Dashboard Redesign..."
gh issue create \
    --title "Dashboard Redesign: Individual Property Search & Display" \
    --body "$(cat github-issues/05-dashboard-redesign.md)" \
    --label "frontend,dashboard,enhancement,ui/ux"

# Issue 6: API Endpoints Update
echo "📝 Creating Issue 6: API Endpoints Update..."
gh issue create \
    --title "API Endpoints: Update for Individual Property Search" \
    --body "$(cat github-issues/06-api-endpoints-update.md)" \
    --label "api,backend,enhancement"

echo ""
echo "✅ All GitHub issues created successfully!"
echo ""
echo "🔗 View issues at: https://github.com/melissachen09/AuAuctionResults/issues"
echo ""
echo "📋 Summary:"
echo "   1. Database Schema Enhancement (database, enhancement, high-priority)"
echo "   2. Enhanced Domain Scraper (scraper, enhancement, domain)"
echo "   3. Enhanced REA Scraper (scraper, enhancement, rea)" 
echo "   4. Deduplication Enhancement (database, enhancement, deduplication, performance)"
echo "   5. Dashboard Redesign (frontend, dashboard, enhancement, ui/ux)"
echo "   6. API Endpoints Update (api, backend, enhancement)"