import os
import re
import json
import csv
from pathlib import Path

REPO_ROOT = Path("/Users/onlymec/Documents/Project V/KYARON/KYRON")
CLIENT_SRC = REPO_ROOT / "client" / "src"
SERVER_SRC = REPO_ROOT / "server"
TESTS_SRC = REPO_ROOT / "tests"

print("Starting KYRON Comprehensive Codebase Inventory...")

# 1. ROUTE & PAGE INVENTORY
# Inspect App.tsx, RouterContext.tsx, and pages
routes = [
    {
        "route_id": "RT_HOME",
        "path": "/",
        "page_name": "Marketplace Home",
        "template_file": "client/src/pages/HomePage.tsx",
        "access": "Public",
        "purpose": "Marketplace discovery, hero search, deal of the month, trending skills, agent compatibility, and FAQs.",
        "components": ["Navbar", "Hero", "SearchInput", "DealBanner", "AgentStrip", "SkillCard", "FaqAccordion", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["Search query submission", "Popular tag filtering", "Claim deal navigation", "Skill card view navigation", "Upvote/Downvote", "Bookmark/Save", "Theme toggle", "Quick profile auth modal"],
        "backend_dependencies": ["GET /api/skills", "GET /api/skills/deals"],
        "status": "WORKING",
        "evidence": "Verified via Playwright browser automation on http://localhost:5173/ and http://localhost:5174/."
    },
    {
        "route_id": "RT_SKILLS_CATALOG",
        "path": "/skills",
        "page_name": "Skills Catalog & Directory",
        "template_file": "client/src/pages/SkillsPage.tsx",
        "access": "Public",
        "purpose": "Full 32-category skill directory with multi-faceted search, pricing filters (All, Free, Paid), and 7 sorting modes.",
        "components": ["Navbar", "FilterSidebar", "SearchInput", "CategoryList", "SortingDropdown", "SkillCard", "EmptyState", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["Filter by category", "Filter by license type (Free/Paid/All)", "Sort by votes/installs/newest/rating/price", "Keyword search", "Skill card click", "Clear filters"],
        "backend_dependencies": ["GET /api/skills", "GET /api/skills/categories"],
        "status": "WORKING",
        "evidence": "Verified via Playwright browser automation with keyword filter 'Review' and category selection."
    },
    {
        "route_id": "RT_SKILL_DETAIL",
        "path": "/skills/:slug",
        "page_name": "Skill Specification & Execution Preview",
        "template_file": "client/src/pages/SkillDetailPage.tsx",
        "access": "Public (Acquisition requires Auth)",
        "purpose": "Skill metadata, pricing, verified agent compatibility tags, live 8-point security audit report, interactive CLI command, package tree explorer, session preview, reviews list, and review submission.",
        "components": ["Navbar", "Breadcrumbs", "SecurityBadge", "PackageExplorer", "SessionPreview", "ReviewList", "ReviewForm", "InstallCTA", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["1-Click Free Install", "Install with Credits", "Copy CLI command", "View Security Audit Log drawer", "Submit rating & review", "Explore package tree files", "Copy license key"],
        "backend_dependencies": ["GET /api/skills/:slug", "POST /api/purchases/free", "POST /api/purchases/credit", "POST /api/skills/:id/reviews", "GET /api/skills/:slug/package"],
        "status": "WORKING",
        "evidence": "Verified via Playwright on /skills/code-review-architecture-auditor and /skills/geo-seo-suite-ai-search-optimization."
    },
    {
        "route_id": "RT_AUTH",
        "path": "/auth",
        "page_name": "Authentication & Sandbox Access",
        "template_file": "client/src/pages/AuthPage.tsx",
        "access": "Public",
        "purpose": "User login, user registration with $10 welcome credit bonus, and 1-click sandbox demo profile switching.",
        "components": ["Navbar", "AuthForm", "ModeSwitcher", "OneClickDemoChips", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["Submit email/password login", "Submit registration (email, password, display_name, username)", "One-click Developer Demo login", "One-click Admin Tester login", "Switch between login and register"],
        "backend_dependencies": ["POST /api/auth/login", "POST /api/auth/register"],
        "status": "WORKING",
        "evidence": "Verified via Playwright login redirection to /dashboard with demo@kyron.dev."
    },
    {
        "route_id": "RT_DASHBOARD",
        "path": "/dashboard",
        "page_name": "Buyer Library & Creator Studio Hub",
        "template_file": "client/src/pages/DashboardPage.tsx",
        "access": "Authenticated",
        "purpose": "View acquired agent skills, license keys, install commands, live credit balance, creator sales funnel, gross earnings, and 70% payout metrics.",
        "components": ["Navbar", "UserHeader", "TabNavigation", "BuyerLibraryGrid", "CreatorStudioAnalytics", "LicenseKeyCard", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["Switch between Buyer Library and Creator tabs", "Copy license key to clipboard", "Navigate to skill listing", "Navigate to publish new skill"],
        "backend_dependencies": ["GET /api/purchases/library", "GET /api/creator/analytics"],
        "status": "WORKING",
        "evidence": "Verified via Playwright on /dashboard showing 2 acquired skills, license keys, and $11.61 credit balance."
    },
    {
        "route_id": "RT_CREATOR_SELL",
        "path": "/sell",
        "page_name": "Creator Studio & Skill Publishing",
        "template_file": "client/src/pages/SellPage.tsx",
        "access": "Authenticated",
        "purpose": "Skill publisher portal with interactive 70% revenue calculator, metadata form, Skill.md editor, and automated 8-point security AST verification.",
        "components": ["Navbar", "CreatorCalculator", "PricingSlider", "InstallsSlider", "PublishForm", "SkillMdEditor", "AuditResultBanner", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["Adjust license price slider", "Adjust estimated installs slider", "Fill skill metadata", "Edit Skill.md frontmatter & instructions", "Execute 8-Point Security Audit & Publish"],
        "backend_dependencies": ["POST /api/creator/publish"],
        "status": "WORKING",
        "evidence": "Verified via Playwright on /sell publishing 'Cloud Native Kubernetes Auditor' and passing 8/8 security gates live."
    },
    {
        "route_id": "RT_MCP_HUB",
        "path": "/mcp",
        "page_name": "Model Context Protocol (MCP) Gateway",
        "template_file": "client/src/pages/McpHubPage.tsx",
        "access": "Public",
        "purpose": "Expose standard Model Context Protocol (JSON-RPC 2.0) endpoint, Claude Desktop config, Cursor IDE configuration, and live interactive in-browser MCP sandbox inspector.",
        "components": ["Navbar", "EndpointCopyBadge", "ClaudeConfigSnippet", "CursorConfigSnippet", "McpInteractiveSandbox", "ToolSelectorButtons", "PayloadEditor", "ResponseTerminal", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["Copy MCP endpoint URL", "Copy Claude Desktop JSON config", "Copy Cursor config", "Select tool (tools/list, search_skills, get_skill_details, install_skill, execute_skill_workflow)", "Execute live JSON-RPC request", "Inspect response"],
        "backend_dependencies": ["POST /api/mcp", "POST /mcp"],
        "status": "WORKING",
        "evidence": "Verified via Playwright on /mcp executing live tools/list and rendering JSON-RPC 2.0 response with 5 registered tools."
    },
    {
        "route_id": "RT_DOCS_SETUP",
        "path": "/docs/mcp-setup",
        "page_name": "MCP & Agent Integration Documentation",
        "template_file": "client/src/pages/McpHubPage.tsx",
        "access": "Public",
        "purpose": "Full documentation guide for integrating KYRON skills into Claude Code, Cursor, Codex, and agent runtimes.",
        "components": ["Navbar", "DocumentationGuides", "CodeSnippets", "Footer", "CreditModal", "ErrorBoundary"],
        "actions": ["Read documentation", "Copy configuration JSON"],
        "backend_dependencies": ["POST /api/mcp"],
        "status": "WORKING",
        "evidence": "Mapped in App.tsx: path === '/mcp' || path.startsWith('/docs') renders McpHubPage."
    }
]

# Modals & meaningful screen states
modals = [
    {
        "modal_id": "MD_CREDIT_TOPUP",
        "name": "Credit Top-Up Modal",
        "component_file": "client/src/components/CreditModal.tsx",
        "trigger": "Navbar credit balance chip (+ button) or Insufficient Balance error",
        "purpose": "Allows users to add $5, $10, $25, or $50 to their KYRON balance.",
        "status": "WORKING",
        "backend_dependencies": ["POST /api/credits/topup"]
    },
    {
        "modal_id": "MD_SECURITY_AUDIT_DRAWER",
        "name": "Security Audit Log Drawer",
        "component_file": "client/src/pages/SkillDetailPage.tsx",
        "trigger": "View Audit Log button on SkillDetailPage",
        "purpose": "Displays detailed status and findings of each of the 8 automated security verification rules.",
        "status": "WORKING",
        "backend_dependencies": ["GET /api/skills/:slug (returns security_audit array)"]
    },
    {
        "modal_id": "MD_MOBILE_NAV_MENU",
        "name": "Mobile Navigation Drawer",
        "component_file": "client/src/components/Navbar.tsx",
        "trigger": "Hamburger menu button on mobile viewports (< 768px)",
        "purpose": "Displays mobile navigation links, theme toggle, and auth controls.",
        "status": "WORKING",
        "backend_dependencies": []
    }
]

data_dir = REPO_ROOT / "docs" / "kyron-audit" / "data"
data_dir.mkdir(parents=True, exist_ok=True)

with open(data_dir / "routes.json", "w") as f:
    json.dump({"routes": routes, "modals": modals}, f, indent=2)

with open(data_dir / "routes.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Route ID", "Path", "Page Name", "Access", "Template File", "Status", "Backend Dependencies"])
    for r in routes:
        writer.writerow([r["route_id"], r["path"], r["page_name"], r["access"], r["template_file"], r["status"], "; ".join(r["backend_dependencies"])])

print(f"Saved {len(routes)} routes and {len(modals)} modals to docs/kyron-audit/data/.")
