# KYRON Data-Flow & Transition Inventory
## Comprehensive Edge & Execution Path Mappings

**Audit Date**: October 21, 2026  
**Repository**: `/Users/onlymec/Documents/Project V/KYARON/KYRON`  
**Referenced Diagrams**:
- [`KYRON_SYSTEM_ARCHITECTURE.html`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/docs/kyron-architecture/KYRON_SYSTEM_ARCHITECTURE.html)
- [`KYRON_MARKETPLACE_AND_PURCHASE_FLOW.html`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/docs/kyron-architecture/KYRON_MARKETPLACE_AND_PURCHASE_FLOW.html)
- [`KYRON_MCP_AND_TOOL_EXECUTION_FLOW.html`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/docs/kyron-architecture/KYRON_MCP_AND_TOOL_EXECUTION_FLOW.html)
- [`KYRON_SECURITY_AND_DATA_FLOW.html`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/docs/kyron-architecture/KYRON_SECURITY_AND_DATA_FLOW.html)

---

## 1. System Architecture Data Flows (`KYRON_SYSTEM_ARCHITECTURE`)

The primary architecture diagram illustrates the end-to-end topology connecting external clients, frontend presentation, proxy gateway, domain routing, security analysis, and SQLite persistence.

| Edge ID | Source Component | Destination Component | Data / Payload Transmitted | Protocol / Route / Function | Implementation File(s) | Implementation Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| `e1` | `ext_browser` (Web User) | `ui_detail_buy` (Detail Page) | User mouse/keyboard events, click "Install" or "Purchase" | DOM Events / React Virtual DOM | [`client/src/pages/SkillDetailPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/SkillDetailPage.tsx) | **REAL / WORKING** |
| `e2` | `ext_agent_ide` (Claude/Cursor) | `ui_mcp_hub` (McpHubPage) | Agent config inspection, tool schema requests | HTML5 Webpage / Clipboard Copy | [`client/src/pages/McpHubPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/McpHubPage.tsx) | **REAL / WORKING** |
| `e3` | `ext_mock_stripe` (Mock Checkout) | `ui_auth_context` (Auth Context) | Simulated package top-up event (`+100`, `+500`, `+1200` credits) | In-memory balance mutation / localStorage | [`client/src/components/CreditModal.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/components/CreditModal.tsx) | **MOCK / SIMULATED** |
| `e4` | `ui_detail_buy` (Detail Page) | `vite_dev_proxy` (Vite Proxy) | API requests: `POST /api/purchases/credit`, `POST /api/purchases/free` | HTTP/1.1 REST JSON Payload | [`client/src/lib/api.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/lib/api.ts), [`vite.config.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/vite.config.ts) | **REAL / WORKING** |
| `e5` | `ui_auth_context` (Auth Context) | `auth_middleware` (Auth Guard) | `Authorization: Bearer <jwt_token>` header | HTTP Header / HMAC-SHA256 Token | [`server/middleware/auth.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/middleware/auth.ts) | **REAL / WORKING** |
| `e6` | `vite_dev_proxy` (Vite Proxy) | `express_server` (Express 4) | Proxied HTTP socket stream forwarded from port 5173 | TCP Socket Forward (`localhost:3000`) | [`vite.config.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/vite.config.ts), [`server/index.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/index.ts) | **REAL / WORKING** |
| `e7` | `auth_middleware` (Auth Guard) | `express_server` (Express 4) | Decoded user claims (`userId`, `username`, `role`) attached to `req.user` | Node.js Express Request Middleware Pipe | [`server/middleware/auth.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/middleware/auth.ts) | **REAL / WORKING** |
| `e8` | `express_server` (Express 4) | `svc_skills` (Skills Router) | Dispatches catalog search, filters, deals, and detail requests | Express Mount: `app.use('/api/skills', skillsRouter)` | [`server/routes/skills.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/skills.ts) | **REAL / WORKING** |
| `e9` | `express_server` (Express 4) | `svc_creator` (Creator Router) | Dispatches skill publishing intake and creator sales analytics | Express Mount: `app.use('/api/creator', creatorRouter)` | [`server/routes/creator.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/creator.ts) | **REAL / WORKING** |
| `e10` | `express_server` (Express 4) | `mcp_gateway` (MCP Router) | Dispatches JSON-RPC 2.0 streaming requests (`tools/list`, `tools/call`) | Express Mount: `app.use(['/mcp', '/api/mcp'], mcpRouter)` | [`server/routes/mcp.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `e11` | `express_server` (Express 4) | `svc_purchases` (Purchase Engine)| Dispatches credit deduction, free install, and library queries | Express Mount: `app.use('/api/purchases', purchasesRouter)` | [`server/routes/purchases.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/purchases.ts) | **REAL / WORKING** |
| `e12` | `svc_creator` (Creator Router) | `sec_scanner` (8-Point Scanner) | Raw submitted `SKILL.md` playbook content for AST analysis | Function Call: `securityScanner.scanSkill(markdown)` | [`server/services/securityScanner.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/services/securityScanner.ts) | **REAL / WORKING** |
| `e13` | `mcp_gateway` (MCP Router) | `mcp_tools` (Tool Handlers) | Dispatches requested tool name and arguments dictionary | In-process handler invocation: `tool.handler(args, req)` | [`server/routes/mcp.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `e14` | `svc_purchases` (Purchase Engine)| `db_sqlite` (SQLite Engine) | Atomic transaction: update `profiles.credit_balance` and insert `user_purchases` | SQL Prepared Statement (`DatabaseSync.prepare`) | [`server/routes/purchases.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/purchases.ts) | **REAL / WORKING** |
| `e15` | `sec_scanner` (8-Point Scanner) | `db_core_tables` (Core Tables) | Inserts per-rule audit records into `security_audit_logs` | SQL: `INSERT INTO security_audit_logs (...)` | [`server/routes/creator.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/creator.ts) | **REAL / WORKING** |
| `e16` | `mcp_tools` (Tool Handlers) | `db_ledger_tables` (Packages) | Verifies user entitlement and retrieves quarantined skill package | SQL: `SELECT content FROM skill_packages WHERE skill_id = ?` | [`server/routes/mcp.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `e17` | `db_sqlite` (SQLite Engine) | `db_core_tables` (Core Entities) | Schema migrations, indices (`idx_skills_slug`), and WAL journal commits | Native C/C++ SQLite3 engine binding | [`server/db/database.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/db/database.ts) | **REAL / WORKING** |
| `e18` | `db_core_tables` (Core Entities)| `db_ledger_tables` (Ledger Tables)| Enforces relational foreign keys (`REFERENCES skills(id) ON DELETE CASCADE`) | SQLite SQLite Foreign Key Engine (`PRAGMA foreign_keys = ON`) | [`server/db/schema.sql`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/db/schema.sql) | **REAL / WORKING** |

---

## 2. Marketplace & Purchase Workflow Transitions (`KYRON_MARKETPLACE_AND_PURCHASE_FLOW`)

Tracks a buyer's progression from discovering a skill to verifying its security report, passing credit balance gates, and minting an immutable license key.

| Step / Edge | From Node | To Node | Transition Trigger & Payload | Business Logic & Verification | Source Implementation | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| `e1` | `w_browse` (Browse Catalog) | `w_search` (Filter & Search) | Category pill selection, search bar input | Filters catalog array by query, tag, or deals | [`client/src/pages/HomePage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/HomePage.tsx) | **REAL / WORKING** |
| `e2` | `w_search` (Filter & Search) | `w_detail` (Skill Detail) | User clicks skill card in grid | Navigates to `/skills/:slug`, calls `getSkillBySlug` | [`client/src/pages/SkillDetailPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/SkillDetailPage.tsx) | **REAL / WORKING** |
| `e3` | `w_detail` (Skill Detail) | `w_audit` (Inspect Audit) | User expands Security Checklist tab | Fetches audit findings from `security_audit_logs` | [`client/src/components/SecurityBadge.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/components/SecurityBadge.tsx) | **REAL / WORKING** |
| `e4` | `w_audit` (Inspect Audit) | `w_funds` (Check Balance) | User clicks "Purchase License" or "Unlock" | Inspects `credit_balance` in `AuthContext` vs `deal_price` | [`client/src/pages/SkillDetailPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/SkillDetailPage.tsx) | **REAL / WORKING** |
| `e5` | `w_funds` (Check Balance) | `w_topup` (CreditModal) | `credit_balance < deal_price` | Opens modal dialog prompting user to top up credits | [`client/src/components/CreditModal.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/components/CreditModal.tsx) | **MOCK / SIMULATED** |
| `e6` | `w_topup` (CreditModal) | `w_grant` (Deduct & Insert) | User clicks simulated credit tier (e.g., $10 / 500c) | Balance topped up in memory; re-triggers purchase API | [`client/src/components/CreditModal.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/components/CreditModal.tsx) | **MOCK / SIMULATED** |
| `e7` | `w_funds` (Check Balance) | `w_grant` (Deduct & Insert) | `credit_balance >= deal_price` | Executes `POST /api/purchases/credit` atomically | [`server/routes/purchases.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/purchases.ts) | **REAL / WORKING** |
| `e8` | `w_grant` (Deduct & Insert) | `w_dashboard` (My Library) | Purchase succeeds; mints `KYRON-LIC-...` key | Returns HTTP 201; redirects to buyer library | [`client/src/pages/DashboardPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/DashboardPage.tsx) | **REAL / WORKING** |
| `e9` | `w_dashboard` (My Library) | `w_mcp_run` (MCP Execution) | Buyer copies agent config snippet or runs tool | Autonomous agent loads playbook via MCP server | [`server/routes/mcp.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |

---

## 3. Model Context Protocol (MCP) Execution Sequence (`KYRON_MCP_AND_TOOL_EXECUTION_FLOW`)

Traces external AI agent interactions over JSON-RPC 2.0 streaming transport through handshakes, discovery, authenticated entitlement validation, and sandbox execution.

| Message ID | Source Participant | Target Participant | Message Label & Payload | Protocol & Method | Handled In Source Code | Implementation Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| `m1` | `agent` (Claude/Cursor) | `proxy` (Vite Proxy) | `POST /mcp` (`{"method":"tools/list"}`) | JSON-RPC 2.0 over HTTP | [`vite.config.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/vite.config.ts) | **REAL / WORKING** |
| `m2` | `proxy` (Vite Proxy) | `mcp_gw` (MCP Gateway) | Forward socket stream to port 3000 | HTTP Reverse Proxy | [`server/index.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/index.ts) | **REAL / WORKING** |
| `m3` | `mcp_gw` (MCP Gateway) | `tool_dsp` (Tool Registry) | Inspect registered MCP tools | JavaScript Object Inspection | [`server/routes/mcp.ts:L30-L100`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m4` | `tool_dsp` (Tool Registry) | `mcp_gw` (MCP Gateway) | Returns 5 Tool JSON schemas | In-memory Schema Array | [`server/routes/mcp.ts:L35-L95`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m5` | `mcp_gw` (MCP Gateway) | `agent` (Claude/Cursor) | HTTP 200 OK (`{"tools": [...]}`) | JSON-RPC 2.0 Response | [`server/routes/mcp.ts:L115`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m6` | `agent` (Claude/Cursor) | `mcp_gw` (MCP Gateway) | `tools/call search_skills` (`{"query":"dev"}`) | JSON-RPC 2.0 Tool Call | [`server/routes/mcp.ts:L130`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m7` | `mcp_gw` (MCP Gateway) | `sqlite` (SQLite DB) | Query `skills` where status='live' AND name LIKE ? | SQL Prepared Statement | [`server/routes/mcp.ts:L142`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m8` | `sqlite` (SQLite DB) | `mcp_gw` (MCP Gateway) | Returns matching skills recordset | In-memory Row Array | [`server/db/database.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/db/database.ts) | **REAL / WORKING** |
| `m9` | `mcp_gw` (MCP Gateway) | `agent` (Claude/Cursor) | Structured JSON skill metadata & ratings | JSON-RPC 2.0 Result Content | [`server/routes/mcp.ts:L155`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m10` | `agent` (Claude/Cursor) | `mcp_gw` (MCP Gateway) | `tools/call install_skill` (`{"skill_slug":"..."}`) | JSON-RPC 2.0 Tool Call | [`server/routes/mcp.ts:L165`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m11` | `mcp_gw` (MCP Gateway) | `auth_mw` (Auth Guard) | Validate Bearer JWT token from header or param | JWT HMAC-SHA256 Decode | [`server/middleware/auth.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/middleware/auth.ts) | **REAL / WORKING** |
| `m12` | `auth_mw` (Auth Guard) | `sqlite` (SQLite DB) | Check `user_purchases` for active entitlement | SQL: `SELECT id FROM user_purchases...` | [`server/routes/mcp.ts:L180`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m13` | `sqlite` (SQLite DB) | `tool_dsp` (Tool Registry) | Entitlement confirmed; grants package access | SQLite Query Result | [`server/routes/mcp.ts:L192`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m14` | `agent` (Claude/Cursor) | `mcp_gw` (MCP Gateway) | `tools/call execute_skill_workflow` | JSON-RPC 2.0 Tool Call | [`server/routes/mcp.ts:L210`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m15` | `mcp_gw` (MCP Gateway) | `tool_dsp` (Tool Registry) | Dispatch workflow command in sandbox | In-process Playbook Dispatcher | [`server/routes/mcp.ts:L225`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |
| `m16` | `tool_dsp` (Tool Registry) | `agent` (Claude/Cursor) | Return execution telemetry & step findings | JSON-RPC 2.0 Result Content | [`server/routes/mcp.ts:L238`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | **REAL / WORKING** |

---

## 4. Security Threat Scanner & Data Publishing Flow (`KYRON_SECURITY_AND_DATA_FLOW`)

Documents the zero-trust submission pipeline enforcing static syntax rules, dynamic heuristics, automated audit indexing, and catalog isolation.

| Flow ID | Source Node | Destination Node | Transmitted Data & Validation Logic | Rejection Condition | Implementation File(s) | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| `e1` | `creator_client` (Creator) | `sell_page_ui` (Sell Form) | Raw markdown file, slug, price, and category | Client-side form empty checks | [`client/src/pages/SellPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/SellPage.tsx) | **REAL / WORKING** |
| `e2` | `sell_page_ui` (Sell Form) | `creator_router` (Creator API) | `POST /api/creator/publish` with JSON skill metadata | Network drop or malformed JSON | [`client/src/lib/api.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/lib/api.ts) | **REAL / WORKING** |
| `e3` | `auth_guard` (JWT Guard) | `creator_router` (Creator API) | Extracts creator identity claims; validates session | HTTP 401 if token missing or invalid | [`server/middleware/auth.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/middleware/auth.ts) | **REAL / WORKING** |
| `e4` | `creator_router` (Creator API) | `scanner_core` (Scanner Engine)| Passes `content` string to 8-rule pipeline | Missing or non-string content | [`server/services/securityScanner.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/services/securityScanner.ts) | **REAL / WORKING** |
| `e5` | `scanner_core` (Scanner Engine)| `rule_ast_static` (AST Rules) | Evaluates YAML frontmatter, schema, markdown AST | Fails if frontmatter missing name or version | [`server/services/securityScanner.ts:L45`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/services/securityScanner.ts) | **REAL / WORKING** |
| `e6` | `scanner_core` (Scanner Engine)| `rule_system_heuristic` (Threat Rules)| Evaluates prompt injection, disk mutation, eval, curl | Fails if `rm -rf`, eval, or exfil detected | [`server/services/securityScanner.ts:L90`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/services/securityScanner.ts) | **REAL / WORKING** |
| `e7` | `scanner_core` (Scanner Engine)| `audit_logger` (Verdict Engine)| Aggregates pass/fail score across all 8 rules | None (aggregate output) | [`server/services/securityScanner.ts:L160`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/services/securityScanner.ts) | **REAL / WORKING** |
| `e8` | `audit_logger` (Verdict Engine)| `rejection_gate` (Rejection Gate)| Any rule failure triggers immediate rejection | Returns HTTP 400 with diagnostic array | [`server/routes/creator.ts:L85`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/creator.ts) | **REAL / WORKING** |
| `e9` | `audit_logger` (Verdict Engine)| `db_audit_logs` (Audit Table) | Writes 8 individual rows to `security_audit_logs` | SQLite insertion error | [`server/routes/creator.ts:L110`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/creator.ts) | **REAL / WORKING** |
| `e10` | `audit_logger` (Verdict Engine)| `db_skills_catalog` (Skills Table)| All 8 passed: Inserts live record into `skills` | Blocked if any rule failed | [`server/routes/creator.ts:L125`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/creator.ts) | **REAL / WORKING** |
| `e11` | `audit_logger` (Verdict Engine)| `db_skill_packages` (Package Vault)| Inserts quarantined playbook code into `skill_packages` | Blocked if any rule failed | [`server/routes/creator.ts:L140`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/creator.ts) | **REAL / WORKING** |
