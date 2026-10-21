# KYRON Component Inventory
## Production Architectural Specifications & Source Mappings

**Audit Date**: October 21, 2026  
**Repository**: `/Users/onlymec/Documents/Project V/KYARON/KYRON`  
**Reference Diagram**: [`KYRON_SYSTEM_ARCHITECTURE.architecture.json`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/docs/kyron-architecture/KYRON_SYSTEM_ARCHITECTURE.architecture.json) & [`KYRON_SYSTEM_ARCHITECTURE.html`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/docs/kyron-architecture/KYRON_SYSTEM_ARCHITECTURE.html)

---

### 1. User Interface & Presentation Components

| Component ID | Component Name | Source File(s) | Primary Responsibility | Input / Event | Output / State Change | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `ui_catalog` | **Catalog & Search Views** | [`client/src/pages/HomePage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/HomePage.tsx), [`client/src/pages/SkillsPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/SkillsPage.tsx) | Marketplace exploration, query search, 32 category filters, active flash deal rendering. | User keystrokes, category clicks, sort select | Updates search query state, fetches skills from API | `api.getSkills()`, `api.getCategories()`, `CategoryPills.tsx`, `SkillCard.tsx` | **REAL / WORKING** |
| `ui_detail_buy` | **Skill Detail & Acquisition** | [`client/src/pages/SkillDetailPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/SkillDetailPage.tsx) | Complete skill specification, code/session preview, 8-point security checklist, 1-click free install & credit purchase. | Click "Install Free" or "Purchase License" | Calls purchase API, updates user library, triggers CreditModal if balance low | `api.getSkillBySlug()`, `api.buySkillWithCredits()`, `SecurityBadge.tsx` | **REAL / WORKING** |
| `ui_creator_sell` | **Creator Studio & Sell** | [`client/src/pages/SellPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/SellPage.tsx), [`client/src/pages/DashboardPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/DashboardPage.tsx) | Creator onboarding, skill intake form, interactive 70% earnings calculator, and sales analytics. | Slider drags (price, installs), form submission | Renders calculated revenue; submits new skill to scanner API | `api.publishSkill()`, `api.getCreatorAnalytics()`, `AuthContext.tsx` | **REAL / WORKING** |
| `ui_mcp_hub` | **MCP Protocol Inspector** | [`client/src/pages/McpHubPage.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/pages/McpHubPage.tsx) | Interactive test sandbox for the 5 MCP tools, streaming JSON-RPC viewer, Claude Desktop & Cursor config guides. | Select tool, edit JSON arguments, click execute | Dispatches real JSON-RPC call to `/api/mcp` and renders formatted output | `api.callMcp()`, `Navbar.tsx` | **REAL / WORKING** |
| `ui_auth_context` | **AuthContext & Session** | [`client/src/context/AuthContext.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/context/AuthContext.tsx) | Manages authentication state, user profile, credit balance, token persistence in `localStorage`, and logout. | Login/register forms, 1-click sandbox profiles | Updates `user` state, sets `kyron_token`, updates balance | `api.login()`, `api.register()`, `api.getMe()` | **REAL / WORKING** |
| `ui_router` | **RouterContext Shell** | [`client/src/context/RouterContext.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/context/RouterContext.tsx) | Custom client routing using HTML5 `pushState` and `popstate` listeners, avoiding heavy third-party routing bundles. | URL change, `<Link>` clicks, programmatic `navigate()` | Updates `path` and `query` state; triggers conditional page re-render | `window.history`, `App.tsx` | **REAL / WORKING** |

---

### 2. Edge, Gateway & Middleware Components

| Component ID | Component Name | Source File(s) | Primary Responsibility | Input / Event | Output / State Change | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `vite_dev_proxy` | **Vite Reverse Proxy** | [`vite.config.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/vite.config.ts) | Proxies frontend requests on port 5173 matching `/api` and `/mcp` directly to Express backend on port 3000. | HTTP client requests from browser | Rewritten HTTP socket forwarded to `http://localhost:3000` | Vite dev server | **REAL / WORKING** |
| `express_server` | **Express 4 Server Engine** | [`server/index.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/index.ts) | Core HTTP server, global CORS headers, 15MB JSON body-parser limit, static production bundle fallback, port 3000 listener. | Inbound HTTP sockets | Dispatches request to domain routers; returns JSON responses | Express 4, `server/db/database.ts` | **REAL / WORKING** |
| `auth_middleware` | **JWT & Bcrypt Guard** | [`server/middleware/auth.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/middleware/auth.ts) | Validates Bearer tokens via HMAC-SHA256, extracts user identity, provides `requireAuth` (401 check) and `optionalAuth` (guest-friendly). | `Authorization: Bearer <token>` header | Attaches `req.user` payload or returns HTTP 401 Unauthorized | `jsonwebtoken`, `server/db/database.ts` | **REAL / WORKING** |

---

### 3. Core Marketplace Domain Services

| Component ID | Component Name | Source File(s) | Primary Responsibility | Input / Event | Output / State Change | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `svc_skills` | **Skills Catalog Router** | [`server/routes/skills.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/skills.ts) | Catalog filtering (category, query, sort), active promotional flash deals, full skill details, and package entitlement checks. | `GET /api/skills`, `/categories`, `/deals`, `/:slug/package` | JSON catalog array, deal objects, entitlement-gated package contents | `skills`, `skill_deals`, `skill_packages`, `user_purchases` | **REAL / WORKING** |
| `svc_purchases` | **Purchase & Wallet Engine** | [`server/routes/purchases.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/purchases.ts) | Handles 1-click free installations, credit balance purchases, cryptographic license key generation (`KYRON-LIC-...`), and user library. | `POST /api/purchases/free`, `/credit`, `GET /library` | Creates `user_purchases` rows, debits `credit_balance`, returns license keys | `profiles`, `skills`, `user_purchases` | **REAL / WORKING** |
| `svc_creator` | **Creator Publishing Router** | [`server/routes/creator.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/creator.ts) | Intake for new skills, triggers automated 8-point security scan, writes to catalog & package vault, computes 70% revenue analytics. | `POST /api/creator/publish`, `GET /analytics` | Inserts `skills`, `skill_packages`, `security_audit_logs`; calculates net creator share | `securityScanner.ts`, `skills`, `user_purchases` | **REAL / WORKING** |
| `svc_community` | **Votes & Bookmarks Router** | [`server/routes/votes.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/votes.ts) | Records community upvotes/downvotes, updates net vote counts, manages user saved skill bookmarks for price drop alerts. | `POST /api/skills/:id/vote`, `POST /:id/save`, `GET /saved` | Inserts/deletes `skill_votes` and `saved_skills`; updates `skills.net_votes` | `skill_votes`, `saved_skills`, `skills` | **REAL / WORKING** |

---

### 4. AI & Model Context Protocol (MCP) Tier

| Component ID | Component Name | Source File(s) | Primary Responsibility | Input / Event | Output / State Change | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `mcp_gateway` | **MCP JSON-RPC Gateway** | [`server/routes/mcp.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | Implements Model Context Protocol 2024-11-05 spec; streams JSON-RPC 2.0 requests over `/mcp` and `/api/mcp` and handles SSE streams. | JSON-RPC requests (`tools/list`, `tools/call`) | Structured JSON-RPC responses with tools list or tool execution output | `express.Router`, `mcp_tools` | **REAL / WORKING** |
| `mcp_tools` | **5 Autonomous Agent Tools** | [`server/routes/mcp.ts:L30-L240`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/routes/mcp.ts) | `search_skills`, `get_skill_details`, `install_skill`, `get_my_skills`, `execute_skill_workflow`. Enforces payment approval for paid skills. | Tool call arguments and optional auth token | Skill discovery, entitlement acquisition, or workflow execution results | `server/db/database.ts`, `skills`, `user_purchases` | **REAL / WORKING** |

---

### 5. Security & Threat Intelligence Engine

| Component ID | Component Name | Source File(s) | Primary Responsibility | Input / Event | Output / State Change | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `sec_scanner` | **8-Point AST & Threat Scanner** | [`server/services/securityScanner.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/services/securityScanner.ts) | Exhaustive static & heuristic analyzer evaluating frontmatter, prompt injections, disk mutations, credential harvesting, reverse shells, telemetry, and obfuscation. | Submitted `SKILL.md` markdown text | Pass/Fail report across all 8 rules with granular diagnostic findings | Pure TypeScript AST parser & regex heuristics | **REAL / WORKING** |
| `sec_audit_log` | **Security Audit Records** | [`server/db/schema.sql:L87-L94`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/db/schema.sql#L87-L94) | Persistent ledger storing audit findings per rule for every published skill. | Rule scan results | Written to `security_audit_logs` table, served publicly via `/api/skills/:slug` | SQLite database | **REAL / WORKING** |

---

### 6. Persistence & Data Storage Layer

| Component ID | Component Name | Source File(s) | Primary Responsibility | Input / Event | Output / State Change | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `db_sqlite` | **SQLite Engine (WAL)** | [`server/db/database.ts`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/server/db/database.ts) | Node 22+ native `node:sqlite` (`DatabaseSync`), Write-Ahead Logging (`WAL`), strict foreign keys, synchronous transactions. | Parameterized SQL statements | Commits ACID transactions to `data/kyron.sqlite` | Node 22 stdlib (`node:sqlite`) | **REAL / WORKING** |
| `db_core_tables` | **Core Catalog Entities** | [`data/kyron.sqlite`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/data/kyron.sqlite) | Tables: `profiles`, `skills`, `skill_deals`, `skill_votes`, `saved_skills`. Stores user accounts, marketplace catalog, and social signals. | SQL Queries / Mutations | Relational rows persisted with indexed lookups | `server/db/schema.sql` | **REAL / WORKING** |
| `db_ledger_tables` | **Purchases & Package Store** | [`data/kyron.sqlite`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/data/kyron.sqlite) | Tables: `user_purchases`, `skill_reviews`, `security_audit_logs`, `skill_packages`. Stores license keys, reviews, audit logs, and raw skill files. | SQL Queries / Mutations | Cryptographic license records and quarantined skill packages | `server/db/schema.sql` | **REAL / WORKING** |

---

### 7. External Integrations & Boundary Gaps

| Component ID | Component Name | Source File(s) | Primary Responsibility | Input / Event | Output / State Change | Dependencies | Implementation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `ext_browser` | **Developer & Buyer Browser** | Client Browser Runtime | Desktop and mobile user interface for skill exploration, testing, and purchase. | User mouse/keyboard | Navigates SPA, stores JWT in localStorage | Web Standards | **REAL / WORKING** |
| `ext_agent_ide` | **AI Agent Runtimes** | External Developer IDEs | Claude Code, Cursor IDE, Codex, and standalone agents invoking KYRON via MCP. | Natural language prompts / tool calls | Receives structured markdown playbooks and executes tool actions | MCP Client Libraries | **REAL / WORKING** |
| `ext_mock_stripe` | **Credit Topup Simulator** | [`client/src/components/CreditModal.tsx`](file:///Users/onlymec/Documents/Project%20V/KYARON/KYRON/client/src/components/CreditModal.tsx) | Simulates payment checkout and directly credits balance with a timer delay. | Select package ($5, $10, $25, $50) | Directly increments profile balance without payment gateway charge | Client modal state | **MOCKED / SIMULATED** |
| `ext_missing_payouts`| **Stripe Connect Payouts** | None (Documented Gap) | External fiat bank transfers / ACH payouts for creator 70% earnings. | None | None | None | **NOT IMPLEMENTED** |
| `ext_missing_google` | **Google One-Tap OAuth** | None (Documented Gap) | 1-Click federated Google identity login. | None | None | None | **NOT IMPLEMENTED** |
