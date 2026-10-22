#!/usr/bin/env python3
"""
Generate all 8 Archify Diagram Candidate JSON files and compile them with Archify.
Conforms strictly to Archify schema v1 (architecture, sequence) and v2 (workflow).
"""
import json
import os
import subprocess
import sys

DIAGRAMS_DIR = "docs/kyron-audit/diagrams"
ARCHIFY_BIN = "/Users/onlymec/.agents/skills/archify/bin/archify.mjs"

os.makedirs(DIAGRAMS_DIR, exist_ok=True)

# -------------------------------------------------------------
# 1. DIAGRAM A: KYRON System Architecture (architecture)
# -------------------------------------------------------------
diagram_a = {
    "schema_version": 1,
    "diagram_type": "architecture",
    "meta": {
        "title": "Diagram A: KYRON System Architecture",
        "output": f"{DIAGRAMS_DIR}/diagram-a-system-architecture.html",
        "quality_profile": "showcase"
    },
    "components": [
        {"id": "browser", "type": "external", "label": "User Browser", "sublabel": "Desktop / Mobile Web", "pos": [40, 260], "size": [140, 64]},
        {"id": "spa", "type": "frontend", "label": "KYRON React SPA", "sublabel": "React 19 + Tailwind", "pos": [240, 260], "size": [150, 64], "tag": "Port 5173"},
        {"id": "vite_proxy", "type": "cloud", "label": "Vite Dev Proxy", "sublabel": "Reverse Proxy :5173", "pos": [440, 260], "size": [140, 64], "tag": "/api & /mcp"},
        {"id": "auth_mod", "type": "security", "label": "JWT & Bcrypt", "sublabel": "Auth Middleware", "pos": [440, 120], "size": [140, 64], "tag": "HMAC-SHA256"},
        {"id": "api_server", "type": "backend", "label": "Express 4 Backend", "sublabel": "Node.js API Server", "pos": [640, 260], "size": [160, 64], "tag": "Port 3000"},
        {"id": "ast_scanner", "type": "security", "label": "AST Security Scanner", "sublabel": "8-Point Threat Engine", "pos": [640, 120], "size": [160, 64], "tag": "Heuristic AST"},
        {"id": "mcp_service", "type": "messagebus", "label": "MCP Protocol Server", "sublabel": "JSON-RPC 2.0 Streaming", "pos": [640, 400], "size": [160, 64], "tag": "5 AI Tools"},
        {"id": "sqlite_db", "type": "database", "label": "SQLite Database", "sublabel": "better-sqlite3 WAL", "pos": [870, 260], "size": [150, 64], "tag": "7 Tables"},
        {"id": "mock_stripe", "type": "cloud", "label": "Stripe Gateway", "sublabel": "Credits Purchase", "pos": [870, 400], "size": [150, 64], "tag": "Mock Mode"}
    ],
    "boundaries": [
        {"kind": "region", "label": "Client Runtime Boundary", "wraps": ["browser", "spa"]},
        {"kind": "security-group", "label": "Local Development Edge", "wraps": ["vite_proxy"]},
        {"kind": "region", "label": "KYRON Core Application Services (Node.js)", "wraps": ["auth_mod", "api_server", "ast_scanner", "mcp_service"]},
        {"kind": "region", "label": "Persistence & External Integrations", "wraps": ["sqlite_db", "mock_stripe"]}
    ],
    "connections": [
        {"id": "c1", "from": "browser", "to": "spa", "label": "User Interaction", "variant": "emphasis"},
        {"id": "c2", "from": "spa", "to": "vite_proxy", "label": "HTTP /api & /mcp", "variant": "default"},
        {"id": "c3", "from": "vite_proxy", "to": "api_server", "label": "Proxy Forward :3000", "variant": "emphasis"},
        {"id": "c4", "from": "api_server", "to": "auth_mod", "label": "Verify Bearer Token", "variant": "security", "fromSide": "top", "toSide": "bottom"},
        {"id": "c5", "from": "api_server", "to": "ast_scanner", "label": "Scan Skill Payload", "variant": "security", "fromSide": "top", "toSide": "bottom"},
        {"id": "c6", "from": "api_server", "to": "sqlite_db", "label": "SQL Transactions", "variant": "emphasis", "fromSide": "right", "toSide": "left"},
        {"id": "c7", "from": "api_server", "to": "mcp_service", "label": "JSON-RPC /mcp", "variant": "default", "fromSide": "bottom", "toSide": "top"},
        {"id": "c8", "from": "api_server", "to": "mock_stripe", "label": "Credit Package Topup", "variant": "dashed", "fromSide": "bottom", "toSide": "left"}
    ],
    "cards": [
        {"dot": "cyan", "title": "Frontend Tier", "items": ["React 19 SPA built with TailwindCSS and Lucide Icons", "Client-side RouterContext with history API pushState", "AuthContext manages token in localStorage"]},
        {"dot": "emerald", "title": "Backend Tier", "items": ["Express 4 application serving REST endpoints on port 3000", "Native JSON-RPC 2.0 streaming handler for Model Context Protocol", "Synchronous better-sqlite3 with WAL journal mode for ACID safety"]},
        {"dot": "rose", "title": "Security & AST Engine", "items": ["JWT stateless authentication with bcrypt password hashing", "Custom 8-point AST scanner inspecting eval, child_process, network calls", "Automated security score (0-100) assigned to all submitted skills"]}
    ]
}

# -------------------------------------------------------------
# 2. DIAGRAM B: Complete Application Sitemap (architecture)
# -------------------------------------------------------------
diagram_b = {
    "schema_version": 1,
    "diagram_type": "architecture",
    "meta": {
        "title": "Diagram B: KYRON Complete Application Sitemap",
        "output": f"{DIAGRAMS_DIR}/diagram-b-application-sitemap.html",
        "quality_profile": "showcase"
    },
    "components": [
        {"id": "route_home", "type": "frontend", "label": "/ (Home)", "sublabel": "Hero, Deals, Spotlight", "pos": [50, 100], "size": [150, 60], "tag": "Public"},
        {"id": "route_catalog", "type": "frontend", "label": "/skills", "sublabel": "Catalog, Search, Filters", "pos": [250, 100], "size": [150, 60], "tag": "Public"},
        {"id": "route_detail", "type": "frontend", "label": "/skills/:slug", "sublabel": "Detail, Audit, Code", "pos": [450, 100], "size": [150, 60], "tag": "Public"},
        {"id": "route_docs", "type": "frontend", "label": "/docs/mcp-setup", "sublabel": "MCP Installation Guide", "pos": [650, 100], "size": [150, 60], "tag": "Public"},
        {"id": "route_auth", "type": "security", "label": "/auth", "sublabel": "Login & Register Views", "pos": [50, 260], "size": [150, 60], "tag": "Public / Guest"},
        {"id": "route_dashboard", "type": "frontend", "label": "/dashboard", "sublabel": "Library, Saved, Credits", "pos": [250, 260], "size": [150, 60], "tag": "Authenticated"},
        {"id": "route_sell", "type": "frontend", "label": "/sell", "sublabel": "Creator Skill Intake", "pos": [450, 260], "size": [150, 60], "tag": "Authenticated"},
        {"id": "route_mcp", "type": "messagebus", "label": "/mcp", "sublabel": "MCP Protocol Endpoint", "pos": [650, 260], "size": [150, 60], "tag": "System / API"},
        {"id": "modal_credits", "type": "cloud", "label": "CreditModal", "sublabel": "Topup Balance Overlay", "pos": [250, 400], "size": [150, 60], "tag": "Modal"},
        {"id": "drawer_audit", "type": "security", "label": "SecurityDrawer", "sublabel": "AST Vulnerability Sheet", "pos": [450, 400], "size": [150, 60], "tag": "Drawer"},
        {"id": "drawer_nav", "type": "frontend", "label": "MobileNavDrawer", "sublabel": "Responsive Navigation", "pos": [50, 400], "size": [150, 60], "tag": "Drawer"}
    ],
    "boundaries": [
        {"kind": "region", "label": "Public Browsing Surface", "wraps": ["route_home", "route_catalog", "route_detail", "route_docs"]},
        {"kind": "security-group", "label": "Authenticated Member & Creator Area", "wraps": ["route_auth", "route_dashboard", "route_sell", "route_mcp"]},
        {"kind": "region", "label": "Interactive Overlays & Drawers", "wraps": ["modal_credits", "drawer_audit", "drawer_nav"]}
    ],
    "connections": [
        {"id": "b1", "from": "route_home", "to": "route_catalog", "label": "Explore Skills", "variant": "default"},
        {"id": "b2", "from": "route_catalog", "to": "route_detail", "label": "Select Skill", "variant": "emphasis"},
        {"id": "b3", "from": "route_detail", "to": "drawer_audit", "label": "Inspect AST", "variant": "security", "fromSide": "bottom", "toSide": "top"},
        {"id": "b4", "from": "route_detail", "to": "route_auth", "label": "Login to Buy", "variant": "dashed", "fromSide": "bottom", "toSide": "right"},
        {"id": "b5", "from": "route_auth", "to": "route_dashboard", "label": "Auth Success", "variant": "emphasis"},
        {"id": "b6", "from": "route_dashboard", "to": "modal_credits", "label": "Add Credits", "variant": "default", "fromSide": "bottom", "toSide": "top"},
        {"id": "b7", "from": "route_dashboard", "to": "route_sell", "label": "Publish Skill", "variant": "default"},
        {"id": "b8", "from": "route_detail", "to": "route_docs", "label": "Integration Docs", "variant": "dashed"},
        {"id": "b9", "from": "route_docs", "to": "route_mcp", "label": "Connect Agent", "variant": "emphasis", "fromSide": "bottom", "toSide": "top"}
    ],
    "cards": [
        {"dot": "cyan", "title": "Route Inventory", "items": ["8 Primary Route Patterns mapped to single React App shell", "3 High-value interactive drawers/modals for workflow acceleration", "All routes support browser back/forward buttons via custom RouterContext"]},
        {"dot": "emerald", "title": "Role & Access Control", "items": ["Guest users access home, catalog, detail, and setup docs", "Member routes (/dashboard, /sell) enforce client token check", "Backend auth middleware rejects missing or invalid JWT tokens with 401"]}
    ]
}

# -------------------------------------------------------------
# 3. DIAGRAM C: Buyer/User Workflow (workflow schema 2)
# -------------------------------------------------------------
diagram_c = {
    "schema_version": 2,
    "diagram_type": "workflow",
    "meta": {
        "title": "Diagram C: KYRON Buyer/User Workflow",
        "output": f"{DIAGRAMS_DIR}/diagram-c-buyer-workflow.html",
        "quality_profile": "showcase",
        "animation": "trace",
        "visual_preset": "signal-flow"
    },
    "lanes": [
        {"id": "buyer_surface", "label": "Buyer UI Surface"},
        {"id": "catalog_engine", "label": "Catalog & Search"},
        {"id": "wallet_policy", "label": "Wallet & License Policy", "variant": "exception"},
        {"id": "integration_hub", "label": "Library & MCP Execution"}
    ],
    "phases": [
        {"id": "p_discovery", "label": "Discovery", "fromCol": 0, "toCol": 1},
        {"id": "p_evaluation", "label": "Security Evaluation", "fromCol": 2, "toCol": 3, "variant": "emphasis"},
        {"id": "p_acquisition", "label": "License Grant", "fromCol": 4, "toCol": 6, "variant": "dashed"}
    ],
    "groups": [
        {"id": "g_eval", "label": "Trust Verification", "lane": "catalog_engine", "fromCol": 2, "toCol": 3, "variant": "security"},
        {"id": "g_transact", "label": "Credit Settlement", "lane": "wallet_policy", "fromCol": 3, "toCol": 5, "variant": "emphasis"}
    ],
    "mainPath": ["w_browse", "w_search", "w_detail", "w_audit", "w_check_funds", "w_grant", "w_dashboard", "w_mcp_run"],
    "nodes": [
        {"id": "w_browse", "lane": "buyer_surface", "col": 0, "type": "frontend", "label": "Browse Catalog", "sublabel": "Homepage or /skills", "width": 130},
        {"id": "w_search", "lane": "catalog_engine", "col": 1, "type": "backend", "label": "Filter & Search", "sublabel": "Category & query", "width": 130},
        {"id": "w_detail", "lane": "buyer_surface", "col": 2, "type": "frontend", "label": "Skill Detail", "sublabel": "/skills/:slug", "width": 130},
        {"id": "w_audit", "lane": "catalog_engine", "col": 3, "type": "security", "label": "Inspect Audit", "sublabel": "AST score & report", "tag": "Score >= 70", "width": 130},
        {"id": "w_check_funds", "lane": "wallet_policy", "col": 3, "type": "security", "label": "Check Balance", "sublabel": "credits >= price", "tag": "Policy Gate", "width": 130},
        {"id": "w_topup", "lane": "buyer_surface", "col": 4, "type": "cloud", "label": "CreditModal", "sublabel": "Topup packages", "tag": "Mock Checkout", "width": 130},
        {"id": "w_grant", "lane": "wallet_policy", "col": 5, "type": "database", "label": "Deduct & Insert", "sublabel": "user_purchases row", "tag": "ACID TX", "width": 130},
        {"id": "w_dashboard", "lane": "buyer_surface", "col": 6, "type": "frontend", "label": "My Library", "sublabel": "/dashboard access", "width": 130},
        {"id": "w_mcp_run", "lane": "integration_hub", "col": 6, "type": "messagebus", "label": "MCP Execution", "sublabel": "tools/call via AI", "tag": "Live Agent", "width": 130}
    ],
    "edges": [
        {"id": "e1", "from": "w_browse", "to": "w_search", "variant": "default"},
        {"id": "e2", "from": "w_search", "to": "w_detail", "variant": "emphasis"},
        {"id": "e3", "from": "w_detail", "to": "w_audit", "label": "Verify Trust", "variant": "security"},
        {"id": "e4", "from": "w_audit", "to": "w_check_funds", "label": "Click Unlock", "variant": "emphasis"},
        {"id": "e5", "from": "w_check_funds", "to": "w_topup", "label": "Insufficient", "variant": "security", "role": "error"},
        {"id": "e6", "from": "w_topup", "to": "w_check_funds", "label": "Funded", "variant": "dashed", "role": "branch"},
        {"id": "e7", "from": "w_check_funds", "to": "w_grant", "label": "Sufficient", "variant": "emphasis"},
        {"id": "e8", "from": "w_grant", "to": "w_dashboard", "label": "Unlock Code", "variant": "emphasis"},
        {"id": "e9", "from": "w_dashboard", "to": "w_mcp_run", "label": "Execute Agent", "variant": "default"}
    ],
    "cards": [
        {"dot": "cyan", "title": "Discovery to Acquisition", "items": ["Buyers browse catalog and filter by categories, tags, or search query", "Skill detail page displays price in credits and verified AST security score", "Wallet policy ensures user has sufficient credits before granting access"]},
        {"dot": "emerald", "title": "Fulfillment & Execution", "items": ["Atomic database transaction deducts balance and creates user_purchases record", "Skill immediately appears in user library on /dashboard with full code preview", "Buyer connects MCP config snippet to Claude Desktop, Cursor, or Antigravity"]}
    ]
}

# -------------------------------------------------------------
# 4. DIAGRAM D: Creator/Seller Workflow (workflow schema 2)
# -------------------------------------------------------------
diagram_d = {
    "schema_version": 2,
    "diagram_type": "workflow",
    "meta": {
        "title": "Diagram D: KYRON Creator/Seller Workflow",
        "output": f"{DIAGRAMS_DIR}/diagram-d-creator-workflow.html",
        "quality_profile": "showcase",
        "animation": "trace",
        "visual_preset": "signal-flow"
    },
    "lanes": [
        {"id": "creator_surface", "label": "Creator Workspace"},
        {"id": "submission_intake", "label": "Submission & Schema Intake"},
        {"id": "security_gate", "label": "Automated AST Security Gate"},
        {"id": "security_policy", "label": "Security Exceptions", "variant": "exception"},
        {"id": "marketplace_pub", "label": "Marketplace Publishing"}
    ],
    "phases": [
        {"id": "p_creation", "label": "Creation & Intake", "fromCol": 0, "toCol": 1},
        {"id": "p_analysis", "label": "AST Security Analysis", "fromCol": 2, "toCol": 3, "variant": "emphasis"},
        {"id": "p_publish", "label": "Catalog Clearance", "fromCol": 4, "toCol": 5, "variant": "dashed"}
    ],
    "groups": [
        {"id": "g_ast_scan", "label": "Heuristic Code Audit", "lane": "security_gate", "fromCol": 2, "toCol": 3, "variant": "security"},
        {"id": "g_listing", "label": "Live Distribution", "lane": "marketplace_pub", "fromCol": 4, "toCol": 5, "variant": "emphasis"}
    ],
    "mainPath": ["c_sell_page", "c_metadata", "c_code_upload", "c_scanner_run", "c_score_calc", "c_db_insert", "c_published", "c_analytics"],
    "nodes": [
        {"id": "c_sell_page", "lane": "creator_surface", "col": 0, "type": "frontend", "label": "Creator Onboarding", "sublabel": "Open /sell portal", "width": 130},
        {"id": "c_metadata", "lane": "submission_intake", "col": 1, "type": "backend", "label": "Input Metadata", "sublabel": "Name, slug, tags, price", "width": 130},
        {"id": "c_code_upload", "lane": "creator_surface", "col": 2, "type": "frontend", "label": "Input Tool Code", "sublabel": "MCP JSON / TypeScript", "width": 130},
        {"id": "c_scanner_run", "lane": "security_gate", "col": 2, "type": "security", "label": "AST Threat Engine", "sublabel": "Parse imports & eval", "tag": "8-point AST", "width": 130},
        {"id": "c_rejected", "lane": "security_policy", "col": 3, "type": "security", "label": "Audit Rejection", "sublabel": "Score < 70 (Blocked)", "tag": "Flagged Risks", "width": 130},
        {"id": "c_score_calc", "lane": "security_gate", "col": 3, "type": "security", "label": "Security Clearance", "sublabel": "Score >= 70 Approved", "tag": "Score 100", "width": 130},
        {"id": "c_db_insert", "lane": "submission_intake", "col": 4, "type": "database", "label": "Insert Listing", "sublabel": "skills table insertion", "width": 130},
        {"id": "c_published", "lane": "marketplace_pub", "col": 5, "type": "frontend", "label": "Live in Catalog", "sublabel": "Visible on /skills", "width": 130},
        {"id": "c_analytics", "lane": "creator_surface", "col": 5, "type": "cloud", "label": "Earnings & Views", "sublabel": "Creator Dashboard", "tag": "Mock Metrics", "width": 130}
    ],
    "edges": [
        {"id": "de1", "from": "c_sell_page", "to": "c_metadata", "variant": "default"},
        {"id": "de2", "from": "c_metadata", "to": "c_code_upload", "variant": "default"},
        {"id": "de3", "from": "c_code_upload", "to": "c_scanner_run", "label": "Trigger Audit", "variant": "security"},
        {"id": "de4", "from": "c_scanner_run", "to": "c_rejected", "label": "Eval/Process Found", "variant": "security", "role": "error"},
        {"id": "de5", "from": "c_scanner_run", "to": "c_score_calc", "label": "Code Clean", "variant": "emphasis"},
        {"id": "de6", "from": "c_rejected", "to": "c_code_upload", "label": "Fix & Resubmit", "variant": "dashed", "role": "branch"},
        {"id": "de7", "from": "c_score_calc", "to": "c_db_insert", "label": "Attach Badge", "variant": "emphasis"},
        {"id": "de8", "from": "c_db_insert", "to": "c_published", "label": "Index in Catalog", "variant": "emphasis"},
        {"id": "de9", "from": "c_published", "to": "c_analytics", "label": "Track Downloads", "variant": "default"}
    ],
    "cards": [
        {"dot": "cyan", "title": "Automated Quality Gate", "items": ["Every submitted skill is scanned by scanner.ts before database persistence", "Checks for eval(), child_process, dangerous fs access, network exfiltration", "Generates detailed line findings and security score calculation"]},
        {"dot": "emerald", "title": "Listing Management", "items": ["Approved skills become instantly discoverable via REST API and MCP protocol", "Creators earn credits when users unlock their skills (mock payout balance)", "Security badge displayed on skill card fosters buyer trust"]}
    ]
}

# -------------------------------------------------------------
# 5. DIAGRAM E: Function and Interaction Map (architecture)
# -------------------------------------------------------------
diagram_e = {
    "schema_version": 1,
    "diagram_type": "architecture",
    "meta": {
        "title": "Diagram E: KYRON Function and Interaction Map",
        "output": f"{DIAGRAMS_DIR}/diagram-e-function-interaction-map.html",
        "quality_profile": "showcase"
    },
    "components": [
        {"id": "ui_nav", "type": "frontend", "label": "Navbar & Controls", "sublabel": "Auth, Search, Nav links", "pos": [50, 100], "size": [160, 64], "tag": "12 Controls"},
        {"id": "ui_catalog", "type": "frontend", "label": "Catalog Controls", "sublabel": "Tabs, Sort, Filter pills", "pos": [50, 250], "size": [160, 64], "tag": "14 Controls"},
        {"id": "ui_detail", "type": "frontend", "label": "Detail & Modals", "sublabel": "Buy, Save, Audit drawer", "pos": [50, 400], "size": [160, 64], "tag": "15 Controls"},
        {"id": "ui_creator", "type": "frontend", "label": "Creator Form", "sublabel": "Inputs, Pre-scan, Submit", "pos": [50, 550], "size": [160, 64], "tag": "10 Controls"},
        {"id": "fn_auth", "type": "security", "label": "Auth Handlers", "sublabel": "login, register, logout", "pos": [330, 100], "size": [170, 64], "tag": "AuthContext"},
        {"id": "fn_search", "type": "backend", "label": "Search Handlers", "sublabel": "filterSkills, setCategory", "pos": [330, 250], "size": [170, 64], "tag": "Client Filter"},
        {"id": "fn_buy", "type": "backend", "label": "Purchase Handlers", "sublabel": "handleBuy, addCredits", "pos": [330, 400], "size": [170, 64], "tag": "apiClient.ts"},
        {"id": "fn_scan", "type": "security", "label": "Scan & Submit", "sublabel": "auditSecurity, submitSkill", "pos": [330, 550], "size": [170, 64], "tag": "scanner.ts"},
        {"id": "api_auth_ep", "type": "backend", "label": "POST /api/auth/*", "sublabel": "authController.ts", "pos": [610, 100], "size": [160, 64]},
        {"id": "api_skills_ep", "type": "backend", "label": "GET /api/skills/*", "sublabel": "skillsController.ts", "pos": [610, 250], "size": [160, 64]},
        {"id": "api_buy_ep", "type": "backend", "label": "POST /api/purchases/*", "sublabel": "purchasesController.ts", "pos": [610, 400], "size": [160, 64]},
        {"id": "api_scan_ep", "type": "backend", "label": "POST /api/security/scan", "sublabel": "securityController.ts", "pos": [610, 550], "size": [160, 64]},
        {"id": "tbl_profiles", "type": "database", "label": "profiles Table", "sublabel": "Users, Credits, Roles", "pos": [880, 100], "size": [150, 64]},
        {"id": "tbl_skills", "type": "database", "label": "skills & deals", "sublabel": "Catalog & Discounts", "pos": [880, 250], "size": [150, 64]},
        {"id": "tbl_purchases", "type": "database", "label": "user_purchases", "sublabel": "Licenses & History", "pos": [880, 400], "size": [150, 64]},
        {"id": "tbl_audit", "type": "database", "label": "security_audit_logs", "sublabel": "Scan Findings Archive", "pos": [880, 550], "size": [150, 64]}
    ],
    "boundaries": [
        {"kind": "region", "label": "User-Facing Interaction Layer (61 Controls)", "wraps": ["ui_nav", "ui_catalog", "ui_detail", "ui_creator"]},
        {"kind": "security-group", "label": "Frontend Handlers & Business Logic", "wraps": ["fn_auth", "fn_search", "fn_buy", "fn_scan"]},
        {"kind": "region", "label": "Express API Endpoints (19 Endpoints)", "wraps": ["api_auth_ep", "api_skills_ep", "api_buy_ep", "api_scan_ep"]},
        {"kind": "region", "label": "SQLite Tables (7 Tables)", "wraps": ["tbl_profiles", "tbl_skills", "tbl_purchases", "tbl_audit"]}
    ],
    "connections": [
        {"id": "m1", "from": "ui_nav", "to": "fn_auth", "label": "Click Login/Logout", "variant": "emphasis"},
        {"id": "m2", "from": "ui_catalog", "to": "fn_search", "label": "Change Query/Filter", "variant": "default"},
        {"id": "m3", "from": "ui_detail", "to": "fn_buy", "label": "Click Buy/Unlock", "variant": "emphasis"},
        {"id": "m4", "from": "ui_creator", "to": "fn_scan", "label": "Click Run Pre-scan", "variant": "security"},
        {"id": "m5", "from": "fn_auth", "to": "api_auth_ep", "label": "HTTP Request", "variant": "emphasis"},
        {"id": "m6", "from": "fn_search", "to": "api_skills_ep", "label": "Fetch Catalog", "variant": "default"},
        {"id": "m7", "from": "fn_buy", "to": "api_buy_ep", "label": "Submit Purchase", "variant": "emphasis"},
        {"id": "m8", "from": "fn_scan", "to": "api_scan_ep", "label": "Analyze Payload", "variant": "security"},
        {"id": "m9", "from": "api_auth_ep", "to": "tbl_profiles", "label": "Lookup / Insert", "variant": "default"},
        {"id": "m10", "from": "api_skills_ep", "to": "tbl_skills", "label": "Query Skills", "variant": "default"},
        {"id": "m11", "from": "api_buy_ep", "to": "tbl_purchases", "label": "Atomic TX", "variant": "emphasis"},
        {"id": "m12", "from": "api_scan_ep", "to": "tbl_audit", "label": "Save Scan Log", "variant": "security"}
    ],
    "cards": [
        {"dot": "cyan", "title": "Interactive Control Coverage", "items": ["61 Interactive controls mapped to specific React state or API endpoints", "54 controls verified as fully functional in the live browser runtime", "4 controls designated as partial/mock (Stripe tier purchases)", "3 controls visual-only (deal countdown timer, social share links)"]},
        {"dot": "emerald", "title": "Architecture Cohesion", "items": ["Clean unidirectional data flow from UI controls -> Handlers -> APIs -> SQLite", "Client-side state synchronized immediately upon server response confirmation", "Auth token automatically injected into request headers by centralized apiClient.ts"]}
    ]
}

# -------------------------------------------------------------
# 6. DIAGRAM F: Backend Request Sequence (sequence)
# -------------------------------------------------------------
diagram_f = {
    "schema_version": 1,
    "diagram_type": "sequence",
    "meta": {
        "title": "Diagram F: KYRON Backend Request Sequence",
        "output": f"{DIAGRAMS_DIR}/diagram-f-backend-request-sequence.html",
        "quality_profile": "showcase",
        "animation": "trace",
        "column_fit": "spread",
        "viewBox": [1120, 680]
    },
    "participants": [
        {"id": "user", "type": "external", "label": "User", "sublabel": "Browser Agent"},
        {"id": "react_ui", "type": "frontend", "label": "React UI", "sublabel": "SPA Client"},
        {"id": "express_api", "type": "backend", "label": "Express API", "sublabel": ":3000 Server"},
        {"id": "auth_mw", "type": "security", "label": "Auth MW", "sublabel": "JWT Verifier"},
        {"id": "sqlite", "type": "database", "label": "SQLite DB", "sublabel": "kyron.db WAL"},
        {"id": "scanner", "type": "security", "label": "AST Scanner", "sublabel": "Threat Engine"},
        {"id": "mcp_hub", "type": "messagebus", "label": "MCP Server", "sublabel": "JSON-RPC 2.0"}
    ],
    "segments": [
        {"from": 160, "to": 280, "label": "1. Authentication Lifecycle"},
        {"from": 290, "to": 410, "label": "2. Skill Discovery & Audit Inspection"},
        {"from": 420, "to": 540, "label": "3. Atomic Purchase & License Grant"},
        {"from": 550, "to": 640, "label": "4. MCP AI Agent Tool Execution"}
    ],
    "messages": [
        {"id": "seq1", "from": "user", "to": "react_ui", "y": 170, "label": "Submit Login (demo@kyron.ai)", "variant": "default"},
        {"id": "seq2", "from": "react_ui", "to": "express_api", "y": 195, "label": "POST /api/auth/login", "variant": "emphasis"},
        {"id": "seq3", "from": "express_api", "to": "sqlite", "y": 215, "label": "SELECT * FROM profiles WHERE email=?", "variant": "default"},
        {"id": "seq4", "from": "sqlite", "to": "express_api", "y": 235, "label": "User Record (bcrypt hash, credits)", "variant": "return"},
        {"id": "seq5", "from": "express_api", "to": "react_ui", "y": 255, "label": "200 OK { token, user }", "variant": "return"},
        {"id": "seq6", "from": "react_ui", "to": "user", "y": 275, "label": "Store Token & Update Header", "variant": "default"},
        
        {"id": "seq7", "from": "user", "to": "react_ui", "y": 300, "label": "Select 'Data Analyst Pro'", "variant": "default"},
        {"id": "seq8", "from": "react_ui", "to": "express_api", "y": 325, "label": "GET /api/skills/data-analyst-pro", "variant": "default"},
        {"id": "seq9", "from": "express_api", "to": "sqlite", "y": 345, "label": "SELECT skill + reviews + audit", "variant": "default"},
        {"id": "seq10", "from": "sqlite", "to": "express_api", "y": 365, "label": "Skill Payload & Security Score", "variant": "return"},
        {"id": "seq11", "from": "express_api", "to": "react_ui", "y": 385, "label": "200 OK Skill Data", "variant": "return"},
        {"id": "seq12", "from": "react_ui", "to": "user", "y": 405, "label": "Render Detail & AST Badge", "variant": "default"},
        
        {"id": "seq13", "from": "user", "to": "react_ui", "y": 430, "label": "Click 'Unlock Skill (100 credits)'", "variant": "emphasis"},
        {"id": "seq14", "from": "react_ui", "to": "express_api", "y": 450, "label": "POST /api/purchases/buy (Bearer)", "variant": "emphasis"},
        {"id": "seq15", "from": "express_api", "to": "auth_mw", "y": 470, "label": "Verify JWT Signature", "variant": "security"},
        {"id": "seq16", "from": "auth_mw", "to": "express_api", "y": 490, "label": "Claims Valid (userId: demo)", "variant": "return"},
        {"id": "seq17", "from": "express_api", "to": "sqlite", "y": 510, "label": "BEGIN TX: deduct credits, insert purchase", "variant": "emphasis"},
        {"id": "seq18", "from": "sqlite", "to": "express_api", "y": 525, "label": "COMMIT TX (license_key generated)", "variant": "return"},
        {"id": "seq19", "from": "express_api", "to": "react_ui", "y": 535, "label": "200 OK { success, licenseKey }", "variant": "return"},
        
        {"id": "seq20", "from": "user", "to": "mcp_hub", "y": 560, "label": "POST /mcp tools/call 'search_skills'", "variant": "emphasis"},
        {"id": "seq21", "from": "mcp_hub", "to": "sqlite", "y": 580, "label": "Query Catalog", "variant": "default"},
        {"id": "seq22", "from": "sqlite", "to": "mcp_hub", "y": 600, "label": "Matching Tools", "variant": "return"},
        {"id": "seq23", "from": "mcp_hub", "to": "user", "y": 620, "label": "JSON-RPC 2.0 Response", "variant": "return"}
    ],
    "activations": [
        {"participant": "react_ui", "from": 190, "to": 280, "type": "frontend"},
        {"participant": "express_api", "from": 195, "to": 260, "type": "backend"},
        {"participant": "react_ui", "from": 320, "to": 410, "type": "frontend"},
        {"participant": "express_api", "from": 325, "to": 390, "type": "backend"},
        {"participant": "react_ui", "from": 445, "to": 540, "type": "frontend"},
        {"participant": "express_api", "from": 450, "to": 538, "type": "backend"},
        {"participant": "auth_mw", "from": 468, "to": 492, "type": "security"},
        {"participant": "mcp_hub", "from": 558, "to": 625, "type": "messagebus"}
    ],
    "cards": [
        {"dot": "emerald", "title": "Verified Request Lifecycles", "items": ["All depicted sequence flows have been verified against the live Express server", "ACID transactions protect buyer balance and prevent double-spending", "MCP tools execute natively inside Node runtime without external subprocess overhead"]},
        {"dot": "rose", "title": "Security Boundaries", "items": ["JWT Bearer verification enforced at HTTP router level", "Password comparison performed with salted bcrypt.compareSync", "Malformed JSON-RPC payloads handled cleanly with RFC 7662 error packets"]}
    ]
}

# -------------------------------------------------------------
# 7. DIAGRAM G: Data Model / ER Diagram (architecture)
# -------------------------------------------------------------
diagram_g = {
    "schema_version": 1,
    "diagram_type": "architecture",
    "meta": {
        "title": "Diagram G: KYRON Data Model / ER Diagram",
        "output": f"{DIAGRAMS_DIR}/diagram-g-data-model-er.html",
        "quality_profile": "showcase"
    },
    "components": [
        {"id": "e_profiles", "type": "database", "label": "profiles Table", "sublabel": "id, email, hash, role, credits", "pos": [50, 180], "size": [180, 80], "tag": "Primary User Entity"},
        {"id": "e_skills", "type": "database", "label": "skills Table", "sublabel": "id, slug, name, author_id, price", "pos": [350, 180], "size": [180, 80], "tag": "Skill Asset Entity"},
        {"id": "e_purchases", "type": "database", "label": "user_purchases Table", "sublabel": "id, user_id, skill_id, license_key", "pos": [200, 340], "size": [180, 80], "tag": "Ownership Ledger"},
        {"id": "e_saved", "type": "database", "label": "saved_skills Table", "sublabel": "id, user_id, skill_id, saved_at", "pos": [50, 340], "size": [180, 80], "tag": "Bookmarks"},
        {"id": "e_reviews", "type": "database", "label": "skill_reviews Table", "sublabel": "id, skill_id, user_id, rating", "pos": [350, 340], "size": [180, 80], "tag": "Community Feedback"},
        {"id": "e_deals", "type": "database", "label": "skill_deals Table", "sublabel": "id, skill_id, discount, expires_at", "pos": [650, 180], "size": [180, 80], "tag": "Flash Deals"},
        {"id": "e_audit", "type": "security", "label": "security_audit_logs", "sublabel": "id, skill_id, score, flagged_items", "pos": [650, 340], "size": [180, 80], "tag": "AST Scan Archive"}
    ],
    "boundaries": [
        {"kind": "region", "label": "Core Identity & Marketplace Assets", "wraps": ["e_profiles", "e_skills"]},
        {"kind": "security-group", "label": "Transaction, Engagement & Audit Tables", "wraps": ["e_purchases", "e_saved", "e_reviews", "e_deals", "e_audit"]}
    ],
    "connections": [
        {"id": "rel1", "from": "e_profiles", "to": "e_skills", "label": "author_id (1:N)", "variant": "emphasis"},
        {"id": "rel2", "from": "e_profiles", "to": "e_purchases", "label": "user_id (1:N)", "variant": "default", "fromSide": "bottom", "toSide": "top"},
        {"id": "rel3", "from": "e_skills", "to": "e_purchases", "label": "skill_id (1:N)", "variant": "emphasis", "fromSide": "bottom", "toSide": "top"},
        {"id": "rel4", "from": "e_profiles", "to": "e_saved", "label": "user_id (1:N)", "variant": "default", "fromSide": "bottom", "toSide": "top"},
        {"id": "rel5", "from": "e_skills", "to": "e_saved", "label": "skill_id (1:N)", "variant": "dashed", "fromSide": "bottom", "toSide": "top"},
        {"id": "rel6", "from": "e_skills", "to": "e_reviews", "label": "skill_id (1:N)", "variant": "default", "fromSide": "bottom", "toSide": "top"},
        {"id": "rel7", "from": "e_skills", "to": "e_deals", "label": "skill_id (1:1)", "variant": "dashed", "fromSide": "right", "toSide": "left"},
        {"id": "rel8", "from": "e_skills", "to": "e_audit", "label": "skill_id (1:N)", "variant": "security", "fromSide": "right", "toSide": "left"}
    ],
    "cards": [
        {"dot": "cyan", "title": "Schema Integrity", "items": ["All 7 SQLite tables defined in server/db.ts with explicit constraints", "Foreign key constraints active with indexed lookups on foreign keys", "Default seed data provisions 8 skills, 2 user profiles, reviews and deals"]},
        {"dot": "emerald", "title": "Entity Normalization", "items": ["User identity separated from asset ownership via user_purchases join table", "Security audit logs preserved independently to allow historical score tracking", "Skills code snippet stored inline as TEXT for immediate MCP code dispatch"]}
    ]
}

# -------------------------------------------------------------
# 8. DIAGRAM H: Agensi.io Reference vs KYRON Feature Parity (architecture)
# -------------------------------------------------------------
diagram_h = {
    "schema_version": 1,
    "diagram_type": "architecture",
    "meta": {
        "title": "Diagram H: Agensi.io Reference vs KYRON Feature Parity",
        "output": f"{DIAGRAMS_DIR}/diagram-h-reference-parity.html",
        "quality_profile": "showcase"
    },
    "components": [
        {"id": "ref_catalog", "type": "frontend", "label": "Agensi Catalog", "sublabel": "Search, Categories, Deals", "pos": [50, 100], "size": [160, 64], "tag": "Reference"},
        {"id": "ref_auth", "type": "security", "label": "Agensi Auth", "sublabel": "Google One-Tap, Magic Link", "pos": [50, 240], "size": [160, 64], "tag": "Reference"},
        {"id": "ref_stripe", "type": "cloud", "label": "Agensi Payments", "sublabel": "Stripe Connect, Payouts", "pos": [50, 380], "size": [160, 64], "tag": "Reference"},
        {"id": "ref_inbox", "type": "messagebus", "label": "Agensi Messaging", "sublabel": "Creator/Buyer Messages", "pos": [50, 520], "size": [160, 64], "tag": "Reference"},
        
        {"id": "kyron_catalog", "type": "frontend", "label": "KYRON Catalog", "sublabel": "Full Filter, Deals, Cards", "pos": [450, 100], "size": [160, 64], "tag": "WORKING"},
        {"id": "kyron_auth", "type": "security", "label": "KYRON Auth", "sublabel": "JWT + Bcrypt (Local DB)", "pos": [450, 240], "size": [160, 64], "tag": "WORKING"},
        {"id": "kyron_payments", "type": "cloud", "label": "KYRON Wallet", "sublabel": "Credits System (Mock Stripe)", "pos": [450, 380], "size": [160, 64], "tag": "PARTIAL"},
        {"id": "kyron_inbox", "type": "messagebus", "label": "KYRON Inbox", "sublabel": "In-app Chat / Messaging", "pos": [450, 520], "size": [160, 64], "tag": "MISSING"},
        
        {"id": "kyron_scanner", "type": "security", "label": "KYRON AST Scanner", "sublabel": "8-Point Threat Engine", "pos": [750, 100], "size": [160, 64], "tag": "INNOVATION"},
        {"id": "kyron_mcp", "type": "messagebus", "label": "KYRON Native MCP", "sublabel": "JSON-RPC 2.0 Streaming", "pos": [750, 240], "size": [160, 64], "tag": "INNOVATION"},
        {"id": "kyron_license", "type": "database", "label": "Instant License Gen", "sublabel": "UUID Keys & Code Vault", "pos": [750, 380], "size": [160, 64], "tag": "WORKING"}
    ],
    "boundaries": [
        {"kind": "region", "label": "Agensi.io Reference Baseline (Observed via REA)", "wraps": ["ref_catalog", "ref_auth", "ref_stripe", "ref_inbox"]},
        {"kind": "security-group", "label": "KYRON Implemented Parity", "wraps": ["kyron_catalog", "kyron_auth", "kyron_payments", "kyron_inbox"]},
        {"kind": "region", "label": "KYRON Advanced Differentiators", "wraps": ["kyron_scanner", "kyron_mcp", "kyron_license"]}
    ],
    "connections": [
        {"id": "p1", "from": "ref_catalog", "to": "kyron_catalog", "label": "100% Visual & Func Parity", "variant": "emphasis"},
        {"id": "p2", "from": "ref_auth", "to": "kyron_auth", "label": "Email/Password JWT parity", "variant": "default"},
        {"id": "p3", "from": "ref_stripe", "to": "kyron_payments", "label": "Mock Credits vs Real Stripe", "variant": "dashed"},
        {"id": "p4", "from": "ref_inbox", "to": "kyron_inbox", "label": "Gap: Chat Inbox Missing", "variant": "security"},
        {"id": "p5", "from": "kyron_catalog", "to": "kyron_scanner", "label": "AST Security Badge", "variant": "security"},
        {"id": "p6", "from": "kyron_catalog", "to": "kyron_mcp", "label": "Direct MCP Tool Dispatch", "variant": "emphasis"}
    ],
    "cards": [
        {"dot": "emerald", "title": "Parity Achievements", "items": ["Catalog discovery, category navigation, deals, and detail views match Agensi.io", "Self-contained local database and JWT auth allows offline verification", "KYRON delivers superior technical architecture via native MCP and AST scanning"]},
        {"dot": "rose", "title": "High-Priority Implementation Gaps", "items": ["1. Google One-Tap authentication (Agensi.io uses Google One-Tap popup)", "2. Real Stripe Webhook integration for production currency transactions", "3. Buyer-to-Creator direct messaging inbox (MessagesInbox component)"]}
    ]
}

diagrams = [
    ("architecture", "diagram-a-system-architecture", diagram_a),
    ("architecture", "diagram-b-application-sitemap", diagram_b),
    ("workflow", "diagram-c-buyer-workflow", diagram_c),
    ("workflow", "diagram-d-creator-workflow", diagram_d),
    ("architecture", "diagram-e-function-interaction-map", diagram_e),
    ("sequence", "diagram-f-backend-request-sequence", diagram_f),
    ("architecture", "diagram-g-data-model-er", diagram_g),
    ("architecture", "diagram-h-reference-parity", diagram_h),
]

print("=== Starting Archify Diagram Generation ===")
results = []
for dtype, name, spec in diagrams:
    json_path = f"{DIAGRAMS_DIR}/{name}.{dtype}.json"
    html_path = f"{DIAGRAMS_DIR}/{name}.html"
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2)
    print(f"[OK] Wrote {json_path}")
    
    # Run archify validate
    v_res = subprocess.run([
        "node", ARCHIFY_BIN, "validate", dtype, json_path
    ], capture_output=True, text=True)
    if v_res.returncode != 0:
        print(f"[ERROR] Validate failed for {name}: {v_res.stderr.strip() or v_res.stdout.strip()}")
        results.append((name, "FAIL_VALIDATE", v_res.stderr or v_res.stdout))
        continue
    else:
        print(f"[PASS] Validated {name}")
        
    # Run archify finalize
    f_res = subprocess.run([
        "node", ARCHIFY_BIN, "finalize", dtype, json_path, html_path
    ], capture_output=True, text=True)
    if f_res.returncode != 0:
        print(f"[ERROR] Finalize failed for {name}: {f_res.stderr.strip() or f_res.stdout.strip()}")
        results.append((name, "FAIL_FINALIZE", f_res.stderr or f_res.stdout))
    else:
        print(f"[PASS] Finalized {html_path}")
        results.append((name, "PASS", html_path))

print("\n=== Final Diagram Results ===")
for name, status, out in results:
    print(f"- {name}: {status}")
