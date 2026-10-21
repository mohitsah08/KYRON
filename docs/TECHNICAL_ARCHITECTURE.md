# KYRON Technical Architecture

## 1. Architectural Overview
**KYRON** is an independent, enterprise-grade AI Agent Skill Marketplace and Runtime Gateway designed to discover, acquire, publish, manage, and securely execute reusable AI capabilities.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KYRON Web Client (SPA)                         │
│  ┌───────────────┬─────────────────────────────┬────────────────────┐  │
│  │ Marketplace   │ Interactive Detail & Runner │ Creator Studio     │  │
│  │ Catalog & AI  │ What's Inside Tree          │ 8-Point Scanner UI │  │
│  │ Search UI     │ Deals Engine (-33%)         │ Payouts Analytics  │  │
│  └───────────────┴─────────────────────────────┴────────────────────┘  │
│  ┌─────────────────────────────┬────────────────────────────────────┐  │
│  │ Credit Purchase & Topup     │ Buyer Library & Social Voting      │  │
│  └─────────────────────────────┴────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        KYRON Backend Server                           │
│  ┌───────────────────────┬────────────────────────┬─────────────────┐  │
│  │ REST API Router       │ MCP JSON-RPC Gateway   │ Auth & Session  │  │
│  │ /api/skills           │ /api/mcp (Tools List & │ Management      │  │
│  │ /api/categories       │ /api/mcp/auth Tools    │ (JWT / Token)   │  │
│  │ /api/votes, /saved    │ Execution)             │                 │  │
│  └───────────────────────┴────────────────────────┴─────────────────┘  │
│  ┌───────────────────────┬────────────────────────┬─────────────────┐  │
│  │ 8-Point Security      │ Payment & Credit       │ Package Storage │  │
│  │ Rule Engine           │ Ledger Engine (Stripe/ │ & Secure Zip    │  │
│  │ (AST / Regex / Detections) Mock Provider)      │ Delivery        │  │
│  └───────────────────────┴────────────────────────┴─────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Persistence Engine                             │
│  ┌───────────────────┬───────────────────┬──────────────────────────┐  │
│  │ skills            │ skill_deals       │ profiles (credits)       │  │
│  │ skill_votes       │ saved_skills      │ user_purchases / orders  │  │
│  │ skill_reviews     │ creator_follows   │ security_audit_logs      │  │
│  └───────────────────┴───────────────────┴──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design & Directory Structure
```
KYRON/
├── docs/                             # Audit & Architectural documentation
│   ├── REFERENCE_AUDIT.md
│   ├── FEATURE_INVENTORY.md
│   ├── USER_FLOWS.md
│   ├── REFERENCE_EVIDENCE.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   └── FEATURE_PARITY.md
├── server/                           # Backend Node/Express Server
│   ├── index.ts                      # Server entry point & routing
│   ├── db/
│   │   ├── schema.sql                # SQL schema definitions
│   │   ├── database.ts               # Database connection & query helper
│   │   └── seed.ts                   # Realistic seed data (100+ skills, deals, reviews)
│   ├── routes/
│   │   ├── skills.ts                 # Catalog, detail, filters, search
│   │   ├── votes.ts                  # Upvotes, downvotes, save/bookmarks
│   │   ├── purchases.ts              # Credits, free install, purchase entitlement
│   │   ├── creator.ts                # Publishing studio, version updates
│   │   ├── auth.ts                   # Login, signup, profiles
│   │   └── mcp.ts                    # MCP Model Context Protocol endpoints
│   ├── services/
│   │   ├── securityScanner.ts        # 8-Point automated security analyzer
│   │   ├── storageService.ts         # Secure package file management
│   │   └── paymentProvider.ts        # Credit ledger & Stripe/mock payment
├── client/                           # React + Vite Frontend
│   ├── index.html                    # Root HTML with SEO tags
│   ├── src/
│   │   ├── App.tsx                   # Main app & route controller
│   │   ├── main.tsx                  # Client entry point
│   │   ├── index.css                 # Premium Tailwind/Vanilla CSS tokens
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Navigation, search bar, dark mode, auth
│   │   │   ├── Footer.tsx            # Full directory footer
│   │   │   ├── SkillCard.tsx         # Card with deal tag, votes, creator, rating
│   │   │   ├── CreditModal.tsx       # Credit purchase modal ($5, $10, $20, $50)
│   │   │   ├── SessionPreview.tsx    # Interactive command runner preview
│   │   │   ├── PackageExplorer.tsx   # "What's Inside" file & folder tree
│   │   │   └── SecurityBadge.tsx     # 8-Point security scan indicator
│   │   ├── pages/
│   │   │   ├── HomePage.tsx          # Landing page with prompt chips & hero
│   │   │   ├── SkillsPage.tsx        # 32 categories, 7 sort options, price filter
│   │   │   ├── SkillDetailPage.tsx   # Complete detail, runner, package tree
│   │   │   ├── McpHubPage.tsx        # Agent connector, live simulation, setup
│   │   │   ├── SellPage.tsx          # Creator pricing, 70% share, submit wizard
│   │   │   ├── DashboardPage.tsx     # Buyer library, creator studio, topup
│   │   │   └── AuthPage.tsx          # Sign in / sign up portal
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Auth state, credit balance, user role
│   │   └── utils/
│   │       └── api.ts                # API client with error handling
├── tests/                            # Automated Tests
│   ├── api.test.ts                   # Backend API test suite
│   ├── securityScanner.test.ts       # 8-Point scanner test suite
│   └── mcp.test.ts                   # MCP protocol compliance test suite
├── package.json
└── tsconfig.json
```

---

## 3. Database Schema Specification
The persistence engine enforces relational integrity, unique indexes, and audit trails:

1. **`profiles`**:
   - `id` TEXT PRIMARY KEY
   - `email` TEXT UNIQUE NOT NULL
   - `password_hash` TEXT
   - `display_name` TEXT NOT NULL
   - `username` TEXT UNIQUE NOT NULL
   - `bio` TEXT
   - `avatar_url` TEXT
   - `credit_balance` REAL DEFAULT 0.00
   - `is_unlimited_credit_user` INTEGER DEFAULT 0
   - `created_at` TEXT NOT NULL

2. **`skills`**:
   - `id` TEXT PRIMARY KEY
   - `name` TEXT NOT NULL
   - `slug` TEXT UNIQUE NOT NULL
   - `summary` TEXT NOT NULL
   - `description` TEXT NOT NULL
   - `category` TEXT NOT NULL
   - `tags` TEXT NOT NULL -- JSON array
   - `logo_url` TEXT
   - `pricing_type` TEXT CHECK (pricing_type IN ('free', 'paid', 'subscription'))
   - `price` REAL DEFAULT 0.00
   - `subscription_price_monthly` REAL
   - `current_version` TEXT DEFAULT '1.0'
   - `creator_id` TEXT NOT NULL REFERENCES profiles(id)
   - `security_status` TEXT CHECK (security_status IN ('pass', 'fail', 'pending')) DEFAULT 'pass'
   - `status` TEXT CHECK (status IN ('live', 'draft', 'rejected')) DEFAULT 'live'
   - `install_count` INTEGER DEFAULT 0
   - `view_count` INTEGER DEFAULT 0
   - `net_votes` INTEGER DEFAULT 0
   - `average_rating` REAL DEFAULT 0.0
   - `review_count` INTEGER DEFAULT 0
   - `package_tree` TEXT -- JSON file/folder hierarchy
   - `session_preview` TEXT -- JSON interactive command run simulation
   - `created_at` TEXT NOT NULL

3. **`skill_deals`**:
   - `id` TEXT PRIMARY KEY
   - `skill_id` TEXT NOT NULL REFERENCES skills(id)
   - `creator_id` TEXT NOT NULL REFERENCES profiles(id)
   - `discount_percent` INTEGER NOT NULL
   - `expires_at` TEXT NOT NULL
   - `is_active` INTEGER DEFAULT 1

4. **`skill_votes`**:
   - `skill_id` TEXT NOT NULL REFERENCES skills(id)
   - `user_id` TEXT NOT NULL REFERENCES profiles(id)
   - `vote_type` INTEGER NOT NULL -- +1 or -1
   - `updated_at` TEXT NOT NULL
   - PRIMARY KEY (skill_id, user_id)

5. **`saved_skills`**:
   - `skill_id` TEXT NOT NULL REFERENCES skills(id)
   - `user_id` TEXT NOT NULL REFERENCES profiles(id)
   - `created_at` TEXT NOT NULL
   - PRIMARY KEY (skill_id, user_id)

6. **`user_purchases`** (Entitlements):
   - `id` TEXT PRIMARY KEY
   - `user_id` TEXT NOT NULL REFERENCES profiles(id)
   - `skill_id` TEXT NOT NULL REFERENCES skills(id)
   - `amount_paid` REAL NOT NULL
   - `license_key` TEXT NOT NULL
   - `purchased_at` TEXT NOT NULL
   - `status` TEXT DEFAULT 'completed'

7. **`skill_reviews`**:
   - `id` TEXT PRIMARY KEY
   - `skill_id` TEXT NOT NULL REFERENCES skills(id)
   - `user_id` TEXT NOT NULL REFERENCES profiles(id)
   - `rating` INTEGER CHECK (rating BETWEEN 1 AND 5)
   - `comment` TEXT NOT NULL
   - `is_verified_purchase` INTEGER DEFAULT 1
   - `created_at` TEXT NOT NULL

8. **`security_audit_logs`**:
   - `id` TEXT PRIMARY KEY
   - `skill_id` TEXT NOT NULL
   - `rule_name` TEXT NOT NULL
   - `status` TEXT NOT NULL -- 'pass' | 'fail'
   - `details` TEXT NOT NULL
   - `scanned_at` TEXT NOT NULL

---

## 4. MCP JSON-RPC Protocol Specification
The Model Context Protocol endpoint `/api/mcp` serves standard JSON-RPC 2.0 requests:
- **`tools/list`**: Returns definitions for `search_skills`, `get_skill_details`, `install_skill`, `get_my_skills`.
- **`tools/call`**:
  - `search_skills({ query, category, limit })`: Searches verified marketplace skills.
  - `get_skill_details({ slug_or_id })`: Retrieves metadata, pricing, deal terms, and compatibility.
  - `install_skill({ skill_id, auth_token })`: Validates entitlement and returns full executable `SKILL.md` instructions into agent memory.
  - `get_my_skills({ auth_token })`: Returns list of currently owned skills.

---

## 5. Automated 8-Point Security Scanner
The analyzer inspects uploaded package contents (`SKILL.md`, scripts, configs) against 8 distinct rules:
1. `RULE_FRONTMATTER`: Requires valid YAML frontmatter with `name`, `description`, and `metadata`.
2. `RULE_PROMPT_INJECTION`: Flags prompt overrides (e.g. `ignore previous instructions`, `bypass restrictions`).
3. `RULE_DISK_MUTATION`: Flags destructive filesystem commands (`rm -rf /`, formatting, unauthorized write paths).
4. `RULE_EXFILTRATION`: Flags credential harvesting (`id_rsa`, `.env`, API keys exfiltration).
5. `RULE_SHELL_EXECUTION`: Flags unauthorized arbitrary shell execution or reverse shells.
6. `RULE_TELEMETRY_PROBES`: Flags hidden background trackers and phone-home endpoints.
7. `RULE_SANITIZED_OUTPUT`: Ensures output instructions avoid generating vulnerable or unsanitized code.
8. `RULE_PACKAGE_STRUCTURE`: Verifies standard package structure with non-empty root `SKILL.md`.
