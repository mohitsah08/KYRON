import os
import json
import csv
from pathlib import Path

REPO_ROOT = Path("/Users/onlymec/Documents/Project V/KYARON/KYRON")
DATA_DIR = REPO_ROOT / "docs" / "kyron-audit" / "data"

# 3. FUNCTION INVENTORY
functions = [
    # Frontend Context & Utils
    {
        "func_id": "FN_ROUTER_NAVIGATE",
        "name": "navigate",
        "file": "client/src/context/RouterContext.tsx",
        "category": "Frontend Hook / Navigation",
        "caller": "All page components, Navbar, SkillCard",
        "purpose": "Updates window.history and router state without full page refresh.",
        "inputs": "to: string",
        "outputs": "void",
        "dependencies": ["window.history.pushState", "window.dispatchEvent"],
        "tests": "tests/e2eVerification.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright)"
    },
    {
        "func_id": "FN_AUTH_LOGIN",
        "name": "login",
        "file": "client/src/context/AuthContext.tsx",
        "category": "Frontend Auth Context",
        "caller": "AuthPage, QuickLogin buttons",
        "purpose": "Authenticates user via API, sets token in localStorage and updates user state.",
        "inputs": "email: string, password: string",
        "outputs": "Promise<void>",
        "dependencies": ["api.login()", "localStorage"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright)"
    },
    {
        "func_id": "FN_AUTH_REGISTER",
        "name": "register",
        "file": "client/src/context/AuthContext.tsx",
        "category": "Frontend Auth Context",
        "caller": "AuthPage",
        "purpose": "Registers a new user, claims $10 welcome balance, stores token.",
        "inputs": "payload: { email, password, display_name, username }",
        "outputs": "Promise<void>",
        "dependencies": ["api.register()", "localStorage"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_AUTH_LOGOUT",
        "name": "logout",
        "file": "client/src/context/AuthContext.tsx",
        "category": "Frontend Auth Context",
        "caller": "Navbar sign-out button",
        "purpose": "Clears token from localStorage, clears user state, redirects to /.",
        "inputs": "none",
        "outputs": "void",
        "dependencies": ["localStorage", "RouterContext.navigate"],
        "tests": "tests/e2eVerification.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright)"
    },
    {
        "func_id": "FN_API_REQUEST",
        "name": "request",
        "file": "client/src/utils/api.ts",
        "category": "Frontend HTTP Client",
        "caller": "All api.* methods",
        "purpose": "Generic fetch wrapper attaching Bearer token, JSON headers, and error parsing.",
        "inputs": "path: string, options: RequestInit",
        "outputs": "Promise<T>",
        "dependencies": ["fetch", "localStorage"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (All API requests)"
    },
    {
        "func_id": "FN_API_GET_SKILLS",
        "name": "api.getSkills",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "HomePage, SkillsPage",
        "purpose": "Fetches paginated skills matching category, sort, and search query.",
        "inputs": "params: { category, sort, filter, q, limit, offset }",
        "outputs": "Promise<{ skills, total }>",
        "dependencies": ["GET /api/skills"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright & Curl)"
    },
    {
        "func_id": "FN_API_GET_CATEGORIES",
        "name": "api.getCategories",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "SkillsPage",
        "purpose": "Retrieves all 32 categories with dynamic live skill counts.",
        "inputs": "none",
        "outputs": "Promise<{ categories, total_skills }>",
        "dependencies": ["GET /api/skills/categories"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright & Curl)"
    },
    {
        "func_id": "FN_API_GET_DEALS",
        "name": "api.getDeals",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "HomePage",
        "purpose": "Retrieves active promotional deals and Skill of the Month.",
        "inputs": "none",
        "outputs": "Promise<{ deals }>",
        "dependencies": ["GET /api/skills/deals"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright & Curl)"
    },
    {
        "func_id": "FN_API_GET_SKILL_BY_SLUG",
        "name": "api.getSkillBySlug",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "SkillDetailPage",
        "purpose": "Retrieves complete skill metadata, creator profile, reviews, and security report.",
        "inputs": "slug: string",
        "outputs": "Promise<{ skill, creator, deal, security_audit, reviews, is_purchased }>",
        "dependencies": ["GET /api/skills/:slug"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright & Curl)"
    },
    {
        "func_id": "FN_API_INSTALL_FREE_SKILL",
        "name": "api.installFreeSkill",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "SkillDetailPage",
        "purpose": "Executes 1-click free installation, returns completed purchase and license key.",
        "inputs": "skillId: string",
        "outputs": "Promise<{ success, message, purchase }>",
        "dependencies": ["POST /api/purchases/free"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright)"
    },
    {
        "func_id": "FN_API_BUY_SKILL_CREDITS",
        "name": "api.buySkillWithCredits",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "SkillDetailPage",
        "purpose": "Purchases skill using account credit balance, generates license key.",
        "inputs": "skillId: string",
        "outputs": "Promise<{ success, message, purchase, remaining_balance }>",
        "dependencies": ["POST /api/purchases/credit"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright)"
    },
    {
        "func_id": "FN_API_TOPUP_CREDITS",
        "name": "api.topupCredits",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "CreditModal",
        "purpose": "Adds credits to user profile balance.",
        "inputs": "amount: number",
        "outputs": "Promise<{ success, message, new_balance }>",
        "dependencies": ["POST /api/credits/topup"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_API_GET_LIBRARY",
        "name": "api.getMyLibrary",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "DashboardPage",
        "purpose": "Fetches acquired skills and active license keys for authenticated user.",
        "inputs": "none",
        "outputs": "Promise<{ library, purchases, count }>",
        "dependencies": ["GET /api/purchases/library"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright & Curl)"
    },
    {
        "func_id": "FN_API_PUBLISH_SKILL",
        "name": "api.publishSkill",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "SellPage",
        "purpose": "Submits new skill and triggers 8-point security AST verification.",
        "inputs": "payload: { name, slug, summary, description, category, tags, pricing_type, price, skill_md_content }",
        "outputs": "Promise<{ success, skill_id, slug, security_status, audit_report }>",
        "dependencies": ["POST /api/creator/publish"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright)"
    },
    {
        "func_id": "FN_API_GET_CREATOR_ANALYTICS",
        "name": "api.getCreatorAnalytics",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "DashboardPage",
        "purpose": "Fetches sales metrics, gross volume, platform fee, and 70% earnings.",
        "inputs": "none",
        "outputs": "Promise<{ analytics: CreatorAnalytics }>",
        "dependencies": ["GET /api/creator/analytics"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright & Curl)"
    },
    {
        "func_id": "FN_API_CALL_MCP",
        "name": "api.callMcp",
        "file": "client/src/utils/api.ts",
        "category": "Frontend API Client",
        "caller": "McpHubPage sandbox",
        "purpose": "Dispatches JSON-RPC 2.0 requests to /api/mcp endpoint.",
        "inputs": "method: string, params: object",
        "outputs": "Promise<any>",
        "dependencies": ["POST /api/mcp"],
        "tests": "tests/mcp.test.ts",
        "reachable": True,
        "verification": "VERIFIED (Playwright & Curl)"
    },

    # Backend Database & Middleware Functions
    {
        "func_id": "FN_DB_INIT",
        "name": "initDatabase",
        "file": "server/db/database.ts",
        "category": "Backend Database",
        "caller": "server/index.ts, server/db/seed.ts",
        "purpose": "Executes schema.sql to create tables and indexes in SQLite.",
        "inputs": "none",
        "outputs": "Database instance",
        "dependencies": ["better-sqlite3", "server/db/schema.sql"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_AUTH_MIDDLEWARE_REQUIRE",
        "name": "requireAuth",
        "file": "server/middleware/auth.ts",
        "category": "Backend Middleware",
        "caller": "purchases, creator, protected routes",
        "purpose": "Validates JWT Bearer token or api_key; returns 401 if missing/invalid.",
        "inputs": "req, res, next",
        "outputs": "next() or res.status(401)",
        "dependencies": ["jsonwebtoken", "db.profiles"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED (401/403 verified)"
    },
    {
        "func_id": "FN_AUTH_MIDDLEWARE_OPTIONAL",
        "name": "optionalAuth",
        "file": "server/middleware/auth.ts",
        "category": "Backend Middleware",
        "caller": "skills catalog, skill detail, votes",
        "purpose": "Attaches user profile to req.user if valid token provided; does not reject guests.",
        "inputs": "req, res, next",
        "outputs": "next()",
        "dependencies": ["jsonwebtoken"],
        "tests": "tests/api.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },

    # Backend Security Scanner Service
    {
        "func_id": "FN_SCAN_SKILL_PACKAGE",
        "name": "scanSkillPackage",
        "file": "server/services/securityScanner.ts",
        "category": "Backend Security Engine",
        "caller": "server/routes/creator.ts",
        "purpose": "Executes 8-point static & heuristic security scan against Skill.md markdown.",
        "inputs": "content: string, metadata: object",
        "outputs": "{ status: pass|fail, rules: SecurityAuditRule[] }",
        "dependencies": ["RegExp security patterns, YAML frontmatter parser"],
        "tests": "tests/securityScanner.test.ts (7 unit tests)",
        "reachable": True,
        "verification": "VERIFIED (Unit tests & Playwright)"
    },
    {
        "func_id": "FN_SCAN_RULE_1_FRONTMATTER",
        "name": "rule1_frontmatter",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Verifies valid YAML frontmatter containing name, description, version.",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["RegExp"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_SCAN_RULE_2_PROMPT_INJECTION",
        "name": "rule2_prompt_injection",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Detects adversarial prompt injections and jailbreak patterns.",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["RegExp (ignore previous instructions, override system prompt)"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_SCAN_RULE_3_FILESYSTEM",
        "name": "rule3_destructive_disk",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Detects destructive disk mutation commands (rm -rf /, format, mkfs).",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["RegExp"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_SCAN_RULE_4_CREDENTIALS",
        "name": "rule4_credential_exfiltration",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Detects credential and secret scraping (id_rsa, .env, AWS keys, cat /etc/shadow).",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["RegExp"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_SCAN_RULE_5_REVERSE_SHELL",
        "name": "rule5_reverse_shell",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Detects reverse shells and raw pipe-to-bash (nc -e, bash -i >&, curl | bash).",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["RegExp"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_SCAN_RULE_6_EGRESS",
        "name": "rule6_network_egress",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Checks for suspicious unencrypted telemetry endpoints or raw IP connections.",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["RegExp"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_SCAN_RULE_7_OBFUSCATION",
        "name": "rule7_obfuscation",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Detects obfuscated code execution (eval(atob(...)), base64 decode execution).",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["RegExp"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },
    {
        "func_id": "FN_SCAN_RULE_8_SANDBOX",
        "name": "rule8_sandbox_validation",
        "file": "server/services/securityScanner.ts",
        "category": "Security Rule",
        "caller": "scanSkillPackage",
        "purpose": "Simulates dry-run parser execution in isolated sandbox context.",
        "inputs": "content: string",
        "outputs": "{ pass: bool, details: string }",
        "dependencies": ["Parser sandbox"],
        "tests": "tests/securityScanner.test.ts",
        "reachable": True,
        "verification": "VERIFIED"
    },

    # Backend MCP Tool Handlers
    {
        "func_id": "FN_MCP_HANDLE_SEARCH",
        "name": "mcp_search_skills",
        "file": "server/routes/mcp.ts",
        "category": "MCP JSON-RPC Tool Handler",
        "caller": "POST /api/mcp (method: 'tools/call', name: 'search_skills')",
        "purpose": "Queries catalog via natural language search for external agent runtimes.",
        "inputs": "params: { query, category, limit }",
        "outputs": "{ content: [{ type: 'text', text: JSON }] }",
        "dependencies": ["db.skills"],
        "tests": "tests/mcp.test.ts",
        "reachable": True,
        "verification": "VERIFIED (MCP Tests & Browser Playground)"
    },
    {
        "func_id": "FN_MCP_HANDLE_DETAILS",
        "name": "mcp_get_skill_details",
        "file": "server/routes/mcp.ts",
        "category": "MCP JSON-RPC Tool Handler",
        "caller": "POST /api/mcp (method: 'tools/call', name: 'get_skill_details')",
        "purpose": "Returns full playbooks, pricing, active deals, and audit status.",
        "inputs": "params: { slug_or_id }",
        "outputs": "{ content: [{ type: 'text', text: JSON }] }",
        "dependencies": ["db.skills", "db.skill_deals"],
        "tests": "tests/mcp.test.ts",
        "reachable": True,
        "verification": "VERIFIED (MCP Tests)"
    },
    {
        "func_id": "FN_MCP_HANDLE_INSTALL",
        "name": "mcp_install_skill",
        "file": "server/routes/mcp.ts",
        "category": "MCP JSON-RPC Tool Handler",
        "caller": "POST /api/mcp (method: 'tools/call', name: 'install_skill')",
        "purpose": "Allows agents to acquire skills autonomously; enforces payment approval for paid items.",
        "inputs": "params: { skill_id, auth_token, approved_price }",
        "outputs": "{ content: [{ type: 'text', text: JSON }] }",
        "dependencies": ["db.skills", "db.user_purchases", "db.profiles"],
        "tests": "tests/mcp.test.ts",
        "reachable": True,
        "verification": "VERIFIED (MCP Tests)"
    },
    {
        "func_id": "FN_MCP_HANDLE_MY_SKILLS",
        "name": "mcp_get_my_skills",
        "file": "server/routes/mcp.ts",
        "category": "MCP JSON-RPC Tool Handler",
        "caller": "POST /api/mcp (method: 'tools/call', name: 'get_my_skills')",
        "purpose": "Lists all skills currently owned and available in user agent library.",
        "inputs": "params: { auth_token }",
        "outputs": "{ content: [{ type: 'text', text: JSON }] }",
        "dependencies": ["db.user_purchases", "db.skills"],
        "tests": "tests/mcp.test.ts",
        "reachable": True,
        "verification": "VERIFIED (MCP Tests)"
    },
    {
        "func_id": "FN_MCP_HANDLE_EXECUTE",
        "name": "mcp_execute_skill_workflow",
        "file": "server/routes/mcp.ts",
        "category": "MCP JSON-RPC Tool Handler",
        "caller": "POST /api/mcp (method: 'tools/call', name: 'execute_skill_workflow')",
        "purpose": "Executes verified skill workflow command (e.g. /geo quick <url>) and returns findings.",
        "inputs": "params: { command, skill_slug }",
        "outputs": "{ content: [{ type: 'text', text: JSON }] }",
        "dependencies": ["Skill runtime dispatcher"],
        "tests": "tests/mcp.test.ts",
        "reachable": True,
        "verification": "VERIFIED (MCP Tests)"
    }
]

# 4. API & INTEGRATION INVENTORY
endpoints = [
    {
        "endpoint_id": "API_HEALTH",
        "method": "GET",
        "path": "/api/health",
        "purpose": "System liveness probe and gateway status verification",
        "auth": "Public",
        "params": "None",
        "response": '{"status":"ok","service":"KYRON AI Agent Skill Gateway","timestamp":"..."}',
        "dependencies": "Express server",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK captured)"
    },
    {
        "endpoint_id": "API_SKILLS_LIST",
        "method": "GET",
        "path": "/api/skills",
        "purpose": "Filter, search, and sort marketplace skill catalog",
        "auth": "Public (Optional Bearer token for ownership check)",
        "params": "category, pricing_type, q, sort, limit, offset",
        "response": '{"skills": Skill[], "count": number}',
        "dependencies": "SQLite table skills, profiles, skill_deals",
        "tests": "tests/api.test.ts, tests/e2eVerification.test.ts",
        "verification": "VERIFIED (200 OK captured)"
    },
    {
        "endpoint_id": "API_SKILLS_CATEGORIES",
        "method": "GET",
        "path": "/api/skills/categories",
        "purpose": "Dynamic category list with live skill counts across 32 domains",
        "auth": "Public",
        "params": "None",
        "response": '{"categories": [{slug, name, domain, count}], "total": number}',
        "dependencies": "SQLite table skills GROUP BY category",
        "tests": "tests/api.test.ts, tests/e2eVerification.test.ts",
        "verification": "VERIFIED (200 OK captured)"
    },
    {
        "endpoint_id": "API_SKILLS_DEALS",
        "method": "GET",
        "path": "/api/skills/deals",
        "purpose": "Fetch active promotional deals and Skill of the Month",
        "auth": "Public",
        "params": "None",
        "response": '{"deals": [{deal_id, discount_percent, expires_at, skill: {...}}]}',
        "dependencies": "SQLite table skill_deals JOIN skills JOIN profiles",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK captured)"
    },
    {
        "endpoint_id": "API_SKILL_DETAIL",
        "method": "GET",
        "path": "/api/skills/:slug",
        "purpose": "Retrieve complete skill specification, creator profile, reviews, and audit log",
        "auth": "Public (Optional Bearer token)",
        "params": "slug (path)",
        "response": '{"skill": {...}, "creator": {...}, "deal": {...}, "is_purchased": bool, "reviews": [], "security_audit": []}',
        "dependencies": "SQLite table skills, profiles, skill_reviews, security_audit_logs",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK captured)"
    },
    {
        "endpoint_id": "API_SKILL_PACKAGE",
        "method": "GET",
        "path": "/api/skills/:slug/package",
        "purpose": "Secure entitlement-gated download of full Skill.md package and assets",
        "auth": "Authenticated (Requires active purchase entitlement)",
        "params": "slug (path)",
        "response": '{"skill_name": string, "skill_md": string, "files": Record<string,string>}',
        "dependencies": "SQLite user_purchases entitlement check",
        "tests": "tests/api.test.ts (401/403/200 verified)",
        "verification": "VERIFIED (401 without auth, 403 without purchase, 200 with purchase)"
    },
    {
        "endpoint_id": "API_SKILL_VOTE",
        "method": "POST",
        "path": "/api/skills/:id/vote",
        "purpose": "Cast upvote (+1) or downvote (-1) on a skill",
        "auth": "Authenticated",
        "params": 'Body: {"vote_type": 1 | -1 | 0}',
        "response": '{"success": true, "net_votes": number, "user_vote": number}',
        "dependencies": "SQLite table skill_votes & UPDATE skills SET net_votes",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK)"
    },
    {
        "endpoint_id": "API_SKILL_SAVE",
        "method": "POST",
        "path": "/api/skills/:id/save",
        "purpose": "Bookmark skill for price drop alerts and user favorites",
        "auth": "Authenticated",
        "params": 'Body: {"saved": boolean}',
        "response": '{"saved": boolean}',
        "dependencies": "SQLite table saved_skills",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK)"
    },
    {
        "endpoint_id": "API_SKILL_REVIEWS",
        "method": "POST",
        "path": "/api/skills/:id/reviews",
        "purpose": "Submit verified user review and rating (1-5 stars)",
        "auth": "Authenticated",
        "params": 'Body: {"rating": number, "comment": string}',
        "response": '{"success": true, "review": {...}, "average_rating": number, "review_count": number}',
        "dependencies": "SQLite table skill_reviews & UPDATE skills average_rating",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK)"
    },
    {
        "endpoint_id": "API_PURCHASE_FREE",
        "method": "POST",
        "path": "/api/purchases/free",
        "purpose": "1-Click free skill acquisition and license generation",
        "auth": "Authenticated",
        "params": 'Body: {"skill_id": string}',
        "response": '{"success": true, "status": "installed", "license_key": string}',
        "dependencies": "SQLite INSERT INTO user_purchases, UPDATE skills install_count",
        "tests": "tests/api.test.ts, tests/e2eVerification.test.ts",
        "verification": "VERIFIED (200 OK, license key generated)"
    },
    {
        "endpoint_id": "API_PURCHASE_CREDIT",
        "method": "POST",
        "path": "/api/purchases/credit",
        "purpose": "Purchase paid skill using account credit balance with deal pricing support",
        "auth": "Authenticated",
        "params": 'Body: {"skill_id": string}',
        "response": '{"success": true, "status": "purchased", "new_balance": number, "license_key": string}',
        "dependencies": "SQLite UPDATE profiles credit_balance, INSERT user_purchases",
        "tests": "tests/api.test.ts, tests/e2eVerification.test.ts",
        "verification": "VERIFIED (200 OK, balance debited, license key generated)"
    },
    {
        "endpoint_id": "API_CREDITS_TOPUP",
        "method": "POST",
        "path": "/api/credits/topup",
        "purpose": "Top up credit balance ($5, $10, $25, $50)",
        "auth": "Authenticated",
        "params": 'Body: {"amount": number}',
        "response": '{"success": true, "credit_balance": number}',
        "dependencies": "SQLite UPDATE profiles SET credit_balance = credit_balance + amount",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK)"
    },
    {
        "endpoint_id": "API_LIBRARY_GET",
        "method": "GET",
        "path": "/api/purchases/library",
        "purpose": "Retrieve user's acquired skill library, license keys, and version status",
        "auth": "Authenticated",
        "params": "None",
        "response": '{"library": [...], "purchases": [...], "count": number}',
        "dependencies": "SQLite user_purchases JOIN skills JOIN profiles",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK, verified with live tokens)"
    },
    {
        "endpoint_id": "API_CREATOR_PUBLISH",
        "method": "POST",
        "path": "/api/creator/publish",
        "purpose": "Submit skill for automated 8-point static/heuristic scan and publish listing",
        "auth": "Authenticated",
        "params": 'Body: {name, slug, summary, description, category, tags, pricing_type, price, skill_md_content}',
        "response": '{"success": true, "skill_id": string, "slug": string, "security_status": "pass", "audit_report": [...]}',
        "dependencies": "securityScanner.ts, SQLite skills & security_audit_logs",
        "tests": "tests/api.test.ts, tests/securityScanner.test.ts",
        "verification": "VERIFIED (200 OK, published Cloud Native Kubernetes Auditor)"
    },
    {
        "endpoint_id": "API_CREATOR_ANALYTICS",
        "method": "GET",
        "path": "/api/creator/analytics",
        "purpose": "Retrieve creator sales funnel, gross earnings, and 70% revenue payout share",
        "auth": "Authenticated",
        "params": "None",
        "response": '{"analytics": {total_earnings, gross_sales, platform_fee, total_installs, skills: [...]}}',
        "dependencies": "SQLite skills & user_purchases aggregation",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK)"
    },
    {
        "endpoint_id": "API_AUTH_LOGIN",
        "method": "POST",
        "path": "/api/auth/login",
        "purpose": "Authenticate user with bcrypt verify, issue JWT token and profile info",
        "auth": "Public",
        "params": 'Body: {"email": string, "password": string}',
        "response": '{"token": string, "user": Profile}',
        "dependencies": "bcryptjs, jsonwebtoken, SQLite profiles",
        "tests": "tests/api.test.ts, tests/e2eVerification.test.ts",
        "verification": "VERIFIED (200 OK with demo@kyron.dev)"
    },
    {
        "endpoint_id": "API_AUTH_REGISTER",
        "method": "POST",
        "path": "/api/auth/register",
        "purpose": "Register account with bcrypt hash and $10 welcome balance credit gift",
        "auth": "Public",
        "params": 'Body: {"email", "password", "display_name", "username"}',
        "response": '{"token": string, "user": Profile}',
        "dependencies": "bcryptjs, jsonwebtoken, SQLite profiles",
        "tests": "tests/api.test.ts, tests/e2eVerification.test.ts",
        "verification": "VERIFIED (200 OK)"
    },
    {
        "endpoint_id": "API_AUTH_ME",
        "method": "GET",
        "path": "/api/auth/me",
        "purpose": "Fetch current authenticated user profile and live balance",
        "auth": "Authenticated",
        "params": "None",
        "response": '{"user": Profile}',
        "dependencies": "SQLite profiles",
        "tests": "tests/api.test.ts",
        "verification": "VERIFIED (200 OK)"
    },
    {
        "endpoint_id": "API_MCP_JSONRPC",
        "method": "POST",
        "path": "/api/mcp and /mcp",
        "purpose": "Model Context Protocol JSON-RPC 2.0 streaming & execution gateway",
        "auth": "Public discovery (tools/list, search_skills, get_skill_details); Token required for install_skill & get_my_skills",
        "params": 'Body: {"jsonrpc":"2.0", "id": 1, "method": string, "params": object}',
        "response": '{"jsonrpc":"2.0", "id": 1, "result": {...}}',
        "dependencies": "server/routes/mcp.ts, SQLite skills, user_purchases",
        "tests": "tests/mcp.test.ts (8 tests passing)",
        "verification": "VERIFIED (200 OK, all 5 tools verified)"
    }
]

# Write Functions JSON & CSV
with open(DATA_DIR / "functions.json", "w") as f:
    json.dump({"functions": functions, "count": len(functions)}, f, indent=2)

with open(DATA_DIR / "functions.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Function ID", "Name", "File", "Category", "Caller", "Purpose", "Tests", "Verification"])
    for fn in functions:
        writer.writerow([fn["func_id"], fn["name"], fn["file"], fn["category"], fn["caller"], fn["purpose"], fn["tests"], fn["verification"]])

# Write Endpoints JSON & CSV
with open(DATA_DIR / "endpoints.json", "w") as f:
    json.dump({"endpoints": endpoints, "count": len(endpoints)}, f, indent=2)

with open(DATA_DIR / "endpoints.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Endpoint ID", "Method", "Path", "Purpose", "Auth", "Dependencies", "Tests", "Verification"])
    for ep in endpoints:
        writer.writerow([ep["endpoint_id"], ep["method"], ep["path"], ep["purpose"], ep["auth"], ep["dependencies"], ep["tests"], ep["verification"]])

print(f"Saved {len(functions)} functions and {len(endpoints)} API endpoints.")
