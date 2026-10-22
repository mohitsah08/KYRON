import { db, initDatabase } from './database.ts';
import bcrypt from 'bcryptjs';

export function runSeed() {
  initDatabase();

  console.log('Seeding KYRON database...');

  // 1. Create Profiles
  const insertProfile = db.prepare(`
    INSERT OR REPLACE INTO profiles (id, email, password_hash, display_name, username, bio, avatar_url, credit_balance, is_unlimited_credit_user, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const passwordHash = bcrypt.hashSync('password123', 8);
  const now = new Date().toISOString();

  const creators = [
    {
      id: 'usr_juan_gabriel',
      email: 'juan@kyron.dev',
      display_name: 'Juan Gabriel Gomila Salas',
      username: 'juan-gabriel-gomila-salas',
      bio: 'Bestselling instructor, AI Search engineer, and founder of Frogames.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      balance: 1450.00,
      unlimited: 0
    },
    {
      id: 'usr_fredrik_akerstrom',
      email: 'fredrik@kyron.dev',
      display_name: 'Fredrik Akerstrom',
      username: 'fredrik-akerstrom',
      bio: 'Quantitative trader specializing in CAN SLIM and Minervini breakout architectures.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      balance: 890.00,
      unlimited: 0
    },
    {
      id: 'usr_antara_chindarkar',
      email: 'antara@kyron.dev',
      display_name: 'Antara Chindarkar',
      username: 'antara-chindarkar',
      bio: 'Lead Game Architect with 10+ years in AAA mechanics and indie systems.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      balance: 420.00,
      unlimited: 0
    },
    {
      id: 'usr_edric_vale',
      email: 'edric@kyron.dev',
      display_name: 'Edric Vale',
      username: 'edric-vale',
      bio: 'Computational video researcher and motion pipeline developer.',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      balance: 310.00,
      unlimited: 0
    },
    {
      id: 'usr_demo_buyer',
      email: 'demo@kyron.dev',
      display_name: 'Alex Vance',
      username: 'alexvance',
      bio: 'Senior AI Engineer exploring autonomous agent skills.',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      balance: 25.00,
      unlimited: 0
    },
    {
      id: 'usr_admin',
      email: 'admin@kyron.dev',
      display_name: 'KYRON Admin',
      username: 'kyronadmin',
      bio: 'KYRON platform verification and security operations team.',
      avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      balance: 9999.00,
      unlimited: 1
    },
    {
      id: 'usr_axiom_labs',
      email: 'contact@axiomlabs.ai',
      display_name: 'Axiom Labs',
      username: 'axiom-labs',
      bio: 'Autonomous multi-file codebase refactoring, AST analysis, and zero-breakage dependency migration engine studio.',
      avatar_url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150',
      balance: 12400.00,
      unlimited: 0
    }
  ];

  for (const c of creators) {
    insertProfile.run(
      c.id,
      c.email,
      passwordHash,
      c.display_name,
      c.username,
      c.bio,
      c.avatar_url,
      c.balance,
      c.unlimited,
      now
    );
  }

  // 2. Create Skills
  const insertSkill = db.prepare(`
    INSERT OR REPLACE INTO skills (
      id, name, slug, summary, description, category, tags, logo_url,
      pricing_type, price, subscription_price_monthly, compatibility_type,
      current_version, creator_id, security_status, status,
      install_count, view_count, net_votes, average_rating, review_count,
      package_tree, session_preview, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const skillsData = [
    {
      id: 'skl_geo_seo_suite',
      name: 'GEO-SEO Suite — AI Search Optimization',
      slug: 'geo-seo-suite-ai-search-optimization',
      summary: 'Full suite of 15+ GEO+SEO audit tools that scores your visibility across ChatGPT, Perplexity and Google AI Overviews 0-100 and ships client-ready reports.',
      description: `Your site is built for Google. AI search has different rules.

Only 11% of domains get cited by both ChatGPT and Google AI Overviews for the same query. Every AI search engine uses its own index, ranking logic and source preferences. A page ranking #1 on Google can be invisible to Perplexity. Meanwhile, traffic from AI answers already converts 4.4x better than traditional organic.

GEO-SEO Suite audits that gap and hands you the plan to close it.

### How the audit works
Give it a URL and your agent runs a parallel audit across six dimensions:
1. AI visibility and citability (25%): extractable passages, answer blocks, crawler access
2. Brand authority signals (20%): mentions on Reddit, YouTube, Wikipedia, LinkedIn
3. Content quality and E-E-A-T (20%): experience signals, original data, author credentials
4. Technical foundations (15%): SSR, Core Web Vitals, crawlability, security
5. Structured data (10%): JSON-LD schema, validation, rich result eligibility
6. Platform optimization (10%): Google AI Overviews, ChatGPT, Perplexity, Gemini, Copilot

### 15 playbooks included:
- \`/geo audit\`: full audit with 5 subagents running in parallel
- \`/geo quick\`: 60-second visibility snapshot
- \`/geo citability\`: scores passages against research on what LLMs cite
- \`/geo crawlers\`: checks whether robots.txt blocks AI crawlers
- \`/geo report-pdf\`: generates client-ready deliverable with color-coded score tables`,
      category: 'marketing-seo',
      tags: JSON.stringify(['seo', 'ai-search', 'marketing', 'reporting', 'geo', 'automation']),
      logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&h=96&fit=crop',
      pricing_type: 'paid',
      price: 19.99,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '1.1',
      creator_id: 'usr_juan_gabriel',
      security_status: 'pass',
      status: 'live',
      install_count: 26,
      view_count: 512,
      net_votes: 8,
      average_rating: 5.0,
      review_count: 1,
      package_tree: JSON.stringify({
        name: 'geo-seo-suite',
        filesCount: 57,
        foldersCount: 26,
        children: [
          { name: 'SKILL.md', type: 'file', size: '14.2 KB' },
          { name: 'agents', type: 'dir', children: [
            { name: 'citability_analyzer.md', type: 'file', size: '4.8 KB' },
            { name: 'crawler_auditor.md', type: 'file', size: '3.1 KB' },
            { name: 'brand_signals.md', type: 'file', size: '5.2 KB' }
          ]},
          { name: 'scripts', type: 'dir', children: [
            { name: 'score_engine.py', type: 'file', size: '8.4 KB' },
            { name: 'pdf_generator.py', type: 'file', size: '11.0 KB' }
          ]},
          { name: 'references', type: 'dir', children: [
            { name: 'quality_rater_guidelines.md', type: 'file', size: '9.6 KB' },
            { name: 'crawler_ip_ranges.json', type: 'file', size: '6.2 KB' }
          ]},
          { name: 'schema', type: 'dir', children: [
            { name: 'organization.jsonld', type: 'file', size: '2.1 KB' },
            { name: 'product.jsonld', type: 'file', size: '2.4 KB' }
          ]}
        ]
      }),
      session_preview: JSON.stringify({
        command: '/geo quick https://electron-srl.com',
        steps: [
          'Read context and target site structure',
          'Fetched robots.txt and HTTP header responses',
          'Evaluated LLM passage citability and structured JSON-LD schemas',
          'Generated composite readiness report'
        ],
        score: '28/100 — CRITICAL',
        summary: 'Live GEO audit of electron-srl.com. Established B2B manufacturer, but effectively invisible to AI search engines. Three blocking issues account for 82% of visibility loss.',
        table: [
          { category: 'AI citability & visibility', score: '18/100', weight: '25%', weighted: '4.5', status: 'CRITICAL' },
          { category: 'Brand authority signals', score: '15/100', weight: '20%', weighted: '3.0', status: 'CRITICAL' },
          { category: 'Content quality & E-E-A-T', score: '35/100', weight: '20%', weighted: '7.0', status: 'POOR' },
          { category: 'Technical foundations', score: '38/100', weight: '15%', weighted: '5.7', status: 'POOR' },
          { category: 'Structured data', score: '8/100', weight: '10%', weighted: '0.8', status: 'CRITICAL' },
          { category: 'Platform optimization', score: '35/100', weight: '10%', weighted: '3.5', status: 'POOR' }
        ],
        platforms: [
          { platform: 'Google AI Overviews', score: '25/100', gap: 'No structured data, no Q&A content' },
          { platform: 'ChatGPT Web Search', score: '18/100', gap: 'No Wikipedia/Wikidata entities, 403 on non-browser agents' },
          { platform: 'Perplexity AI', score: '20/100', gap: 'Zero community citations or original research' },
          { platform: 'Google Gemini', score: '12/100', gap: 'Missing sameAs knowledge graph linkages' }
        ],
        nextSteps: [
          'Run /geo audit for complete 50-page breakdown',
          'Run /geo report-pdf to build branded deliverable',
          'Run /geo proposal to output client services proposal'
        ]
      })
    },
    {
      id: 'skl_stock_breakout_picker',
      name: 'Stock Breakout Picker',
      slug: 'stock-breakout-picker',
      summary: 'Rank the strongest US and European stock breakouts using Minervini, CAN SLIM, and deep volume liquidity analysis.',
      description: `Turn raw market data into high-probability breakout candidates.
Built for equity traders and quantitative analysts who want disciplined, checklist-driven setups.

### Features
- Minervini Trend Template verification (Moving average alignment 200, 150, 50)
- CAN SLIM quarterly earnings growth filter
- Up/Down volume ratio computation
- Pivot point identification and risk/reward calculator`,
      category: 'trading-investing',
      tags: JSON.stringify(['trading', 'stocks', 'investing', 'finance', 'breakouts']),
      logo_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=96&h=96&fit=crop',
      pricing_type: 'paid',
      price: 10.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '1.0',
      creator_id: 'usr_fredrik_akerstrom',
      security_status: 'pass',
      status: 'live',
      install_count: 21,
      view_count: 340,
      net_votes: 13,
      average_rating: 5.0,
      review_count: 1,
      package_tree: JSON.stringify({
        name: 'stock-breakout-picker',
        filesCount: 18,
        foldersCount: 6,
        children: [
          { name: 'SKILL.md', type: 'file', size: '8.1 KB' },
          { name: 'scripts', type: 'dir', children: [
            { name: 'screener.py', type: 'file', size: '5.4 KB' },
            { name: 'vol_profile.py', type: 'file', size: '4.2 KB' }
          ]}
        ]
      }),
      session_preview: JSON.stringify({
        command: '/breakout scan US-TECH',
        steps: ['Loaded market breadth data', 'Screened 420 tech tickers', 'Verified 4 actionable setups'],
        score: '4 Candidates Identified',
        summary: '4 stocks displaying clean volatility contraction patterns (VCP) with volume drying up at the 10-day pivot.',
        table: [
          { category: 'Ticker NVDA', score: 'VCP 3T', weight: 'High', weighted: 'Pivot $142', status: 'READY' },
          { category: 'Ticker PLTR', score: 'Cup & Handle', weight: 'High', weighted: 'Pivot $44', status: 'READY' }
        ],
        platforms: [],
        nextSteps: ['Run /breakout chart TICKER to plot pivot levels']
      })
    },
    {
      id: 'skl_game_design_blueprint',
      name: 'Game Design Blueprint Architect',
      slug: 'game-design-blueprint-architect',
      summary: 'Transform any game idea into a production-ready game design blueprint with gameplay mechanics, feature planning, art direction, and MVP roadmap.',
      description: `Bridge the gap between vision and playable build.
Generates comprehensive Game Design Documents (GDD) with economic loops, combat formulas, and asset manifests ready for Unreal Engine or Unity.`,
      category: 'game-development',
      tags: JSON.stringify(['gaming', 'gamedev', 'design', 'unity', 'unreal']),
      logo_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=96&h=96&fit=crop',
      pricing_type: 'paid',
      price: 5.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '1.0',
      creator_id: 'usr_antara_chindarkar',
      security_status: 'pass',
      status: 'live',
      install_count: 15,
      view_count: 280,
      net_votes: 6,
      average_rating: 4.8,
      review_count: 2,
      package_tree: JSON.stringify({
        name: 'game-design-blueprint',
        filesCount: 12,
        foldersCount: 4,
        children: [
          { name: 'SKILL.md', type: 'file', size: '6.5 KB' },
          { name: 'templates', type: 'dir', children: [
            { name: 'gdd_template.md', type: 'file', size: '12.0 KB' }
          ]}
        ]
      }),
      session_preview: JSON.stringify({
        command: '/game blueprint "Roguelite Deckbuilder with Time Rewind"',
        steps: ['Synthesized core mechanic loop', 'Drafted 30 starting cards', 'Mapped balance curve'],
        score: 'Blueprint Complete',
        summary: 'Designed complete GDD covering Chrono-Deck mechanics, turn timeline resolution, and monetization bounds.',
        table: [],
        platforms: [],
        nextSteps: ['Export as Markdown or Unity package manifest']
      })
    },
    {
      id: 'skl_code_review_auditor',
      name: 'Code Review & Architecture Auditor',
      slug: 'code-review-architecture-auditor',
      summary: 'Perform senior-level code reviews that catch memory leaks, concurrency races, anti-patterns, and architectural regressions.',
      description: `Give your agent a senior staff engineer persona.
Audits pull requests, Git diffs, and local changes with surgical precision, recommending minimal, drop-in fixes.`,
      category: 'code-quality-review',
      tags: JSON.stringify(['code-review', 'architecture', 'refactoring', 'clean-code', 'free']),
      logo_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=96&h=96&fit=crop',
      pricing_type: 'free',
      price: 0.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '2.0',
      creator_id: 'usr_admin',
      security_status: 'pass',
      status: 'live',
      install_count: 420,
      view_count: 1890,
      net_votes: 45,
      average_rating: 5.0,
      review_count: 8,
      package_tree: JSON.stringify({
        name: 'code-review-auditor',
        filesCount: 14,
        foldersCount: 3,
        children: [
          { name: 'SKILL.md', type: 'file', size: '9.0 KB' },
          { name: 'checklists', type: 'dir', children: [
            { name: 'typescript.md', type: 'file', size: '4.1 KB' },
            { name: 'concurrency.md', type: 'file', size: '3.8 KB' }
          ]}
        ]
      }),
      session_preview: JSON.stringify({
        command: '/review diff HEAD~1',
        steps: ['Parsed git diff', 'Checked memory allocations', 'Verified error boundaries'],
        score: '1 Critical Race Condition Identified',
        summary: 'Found unhandled promise rejection in WebSocket reconnection handler leading to orphaned listeners.',
        table: [],
        platforms: [],
        nextSteps: ['Apply suggested diff chunk to connectionManager.ts']
      })
    },
    {
      id: 'skl_multi_agent_os',
      name: 'Multi-Agent Orchestrator OS',
      slug: 'multi-agent-orchestrator-os',
      summary: 'Orchestrate teams of specialized autonomous subagents with dynamic task routing, shared memory ledgers, and deterministic failover.',
      description: `Manage multi-agent workflows with hierarchical oversight.
Supports parallel worker spawning, dependency trees, and consensus voting.`,
      category: 'agents-orchestration',
      tags: JSON.stringify(['agents', 'orchestration', 'multi-agent', 'subagents', 'workflow']),
      logo_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=96&h=96&fit=crop',
      pricing_type: 'subscription',
      price: 15.00,
      subscription_price_monthly: 15.00,
      compatibility_type: 'universal',
      current_version: '1.2',
      creator_id: 'usr_admin',
      security_status: 'pass',
      status: 'live',
      install_count: 88,
      view_count: 940,
      net_votes: 24,
      average_rating: 4.9,
      review_count: 4,
      package_tree: JSON.stringify({
        name: 'multi-agent-orchestrator',
        filesCount: 22,
        foldersCount: 5,
        children: [
          { name: 'SKILL.md', type: 'file', size: '12.4 KB' },
          { name: 'core', type: 'dir', children: [
            { name: 'router.ts', type: 'file', size: '8.2 KB' },
            { name: 'ledger.ts', type: 'file', size: '6.1 KB' }
          ]}
        ]
      }),
      session_preview: JSON.stringify({
        command: '/orchestrate plan "Build and test full-stack Auth module"',
        steps: ['Created DAG task graph', 'Spawned backend worker', 'Spawned frontend worker', 'Reconciled contracts'],
        score: 'Task Complete in 3.4 min',
        summary: 'Parallel agent run completed across DB migrations, API endpoints, and client login UI.',
        table: [],
        platforms: [],
        nextSteps: ['Run /orchestrate verify to trigger integration tests']
      })
    },
    {
      id: 'skl_prompt_dataset_builder',
      name: 'Prompt Dataset Builder & Sanitizer',
      slug: 'prompt-dataset-builder-sanitizer',
      summary: 'Build and curate high-quality prompt datasets for fine-tuning and eval — deduped, labeled, and scored for diversity.',
      description: `Generate production-grade JSONL evaluation and fine-tuning datasets with automated deduplication and quality rating.`,
      category: 'prompt-skill-engineering',
      tags: JSON.stringify(['prompts', 'datasets', 'eval', 'finetuning', 'ai']),
      logo_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=96&h=96&fit=crop',
      pricing_type: 'paid',
      price: 9.90,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '1.0',
      creator_id: 'usr_edric_vale',
      security_status: 'pass',
      status: 'live',
      install_count: 162,
      view_count: 493,
      net_votes: 10,
      average_rating: 4.7,
      review_count: 3,
      package_tree: JSON.stringify({
        name: 'prompt-dataset-builder',
        filesCount: 16,
        foldersCount: 4,
        children: [
          { name: 'SKILL.md', type: 'file', size: '7.8 KB' }
        ]
      }),
      session_preview: JSON.stringify({
        command: '/dataset build --source raw_prompts.csv --output eval.jsonl',
        steps: ['Deduplicated 1,200 rows', 'Embedded semantic vectors', 'Filtered toxic samples'],
        score: '984 Curated Pairs',
        summary: 'Clean JSONL dataset produced with 0.94 semantic diversity metric.',
        table: [],
        platforms: [],
        nextSteps: ['Download eval.jsonl']
      })
    },
    {
      id: 'skl_api_contract_gen',
      name: 'Fast API Contract Generator & Validator',
      slug: 'fast-api-contract-generator-validator',
      summary: 'Automatically generate OpenAPI 3.1 specifications, TypeScript types, and mock servers directly from code routes.',
      description: `Eliminate API drift. Generates bidirectional TypeScript types and validation schemas from express/fastapi routes.`,
      category: 'apis-backend',
      tags: JSON.stringify(['api', 'openapi', 'typescript', 'contracts', 'free']),
      logo_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=96&h=96&fit=crop',
      pricing_type: 'free',
      price: 0.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '1.0',
      creator_id: 'usr_admin',
      security_status: 'pass',
      status: 'live',
      install_count: 110,
      view_count: 670,
      net_votes: 19,
      average_rating: 5.0,
      review_count: 2,
      package_tree: JSON.stringify({
        name: 'api-contract-gen',
        filesCount: 10,
        foldersCount: 2,
        children: [{ name: 'SKILL.md', type: 'file', size: '5.2 KB' }]
      }),
      session_preview: JSON.stringify({
        command: '/api generate ./routes',
        steps: ['Scanned 12 route files', 'Extracted input schemas', 'Emitted openapi.yaml'],
        score: 'OpenAPI 3.1 Spec Generated',
        summary: 'Ready-to-use types and documentation produced.',
        table: [],
        platforms: [],
        nextSteps: ['Import into Swagger UI or Postman']
      })
    },
    {
      id: 'skl_octocode_architect',
      name: 'OctoCode Architect',
      slug: 'octocode-architect',
      summary: 'Autonomous multi-file codebase refactoring, AST analysis, and zero-breakage dependency migration engine.',
      description: `Autonomous multi-file codebase refactoring, AST analysis, and zero-breakage dependency migration engine. Engineered for multi-agent code intelligence pipelines and high-assurance continuous refactoring.

### Architectural Capabilities
OctoCode Architect parses abstract syntax trees in memory to plan atomic multi-file refactor cascades. Unlike generic LLM coding agents, OctoCode performs deterministic graph traversal to predict dependency breakages prior to emitting synthetic patch operations.

### Key Features
- **Cross-Package AST Querying**: Queries full symbol graphs in Monorepos to resolve transitive import paths across yarn, pnpm, and cargo workspaces.
- **Deterministic Codemods**: Produces structural transforms rather than token stream replacements, eliminating syntax hallucinations.
- **Isolated Unit Test Verification**: Spins up ephemeral test execution environments to guarantee zero regressions before submitting diff proposals.
- **Direct MCP Tool Bindings**: Exposes native stdio and SSE interfaces conforming to Model Context Protocol specification 1.0.`,
      category: 'code-quality-review',
      tags: JSON.stringify(['ast', 'refactoring', 'mcp', 'typescript', 'architecture', 'codegen']),
      logo_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCANNRUwBLoBKNoeTQsn2bVBD7Yp3yoA4gbETMlVzy4nho85qQOOF7ctSDXNlIWXi_dp2dEaBemHlZXOK0c287zgJnT0wNuUPIt9ZusmPnvy5ahoEwxVYXoaTtF41YOLQEoNiZmO4adq4OKLpn9w34YrAgvRpHGSMONoLc1ZnrdKinCWWEhWZO-7jKdj8zlZhQpGk4KwJYs3Ma0oWKAwvN0Gj5Q9F7yOLfZ_k1p3eCz_uDqAcxJPA7b1r_OSAWhyeCSw',
      pricing_type: 'paid',
      price: 4.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '2.4.1',
      creator_id: 'usr_axiom_labs',
      security_status: 'pass',
      status: 'live',
      install_count: 12480,
      view_count: 48900,
      net_votes: 184,
      average_rating: 4.9,
      review_count: 42,
      package_tree: JSON.stringify({
        name: 'octocode-architect',
        filesCount: 38,
        foldersCount: 8,
        children: [
          { name: 'SKILL.md', type: 'file', size: '18.4 KB' },
          { name: 'src', type: 'dir', children: [
            { name: 'ast_engine.ts', type: 'file', size: '14.2 KB' },
            { name: 'graph_walker.ts', type: 'file', size: '9.8 KB' },
            { name: 'patch_synthesizer.ts', type: 'file', size: '12.0 KB' }
          ]},
          { name: 'rules', type: 'dir', children: [
            { name: 'ts_iron_session.json', type: 'file', size: '3.4 KB' },
            { name: 'react19_migration.json', type: 'file', size: '5.1 KB' }
          ]}
        ]
      }),
      session_preview: JSON.stringify({
        command: '/octocode refactor --target ./client/src',
        steps: [
          'Parsed TypeScript AST across 48 modules',
          'Identified 6 deprecated lifecycle patterns',
          'Generated atomic patch cascade with clean AST balance'
        ],
        score: 'Zero Regressions Verified',
        summary: 'Atomic codemod completed in 340ms. Updated imports and function signatures with zero broken callers.',
        table: [
          { category: 'AST Resolution', score: '99.98%', weight: 'Primary', weighted: '340ms', status: 'PASS' },
          { category: 'Sandbox Security', score: 'Tier 0', weight: 'Enclave', weighted: 'Clean', status: 'PASS' }
        ],
        platforms: [
          { platform: 'Claude Desktop', score: 'Native MCP', gap: 'Fully verified' },
          { platform: 'Cursor', score: 'Agent Rules', gap: 'Compatible' }
        ],
        nextSteps: ['Run /octocode commit to apply patches cleanly']
      })
    },
    {
      id: 'skl_sec_filing_synthesis',
      name: 'SEC Filing Financial Synthesis MCP',
      slug: 'sec-filing-financial-synthesis-mcp',
      summary: 'Extract, cross-reference, and synthesize balance sheet deltas, 10-K risk factors, and insider filings in real time.',
      description: `Institutional grade financial intelligence for autonomous agents. Ingests raw EDGAR filings and outputs structured metrics.`,
      category: 'trading-investing',
      tags: JSON.stringify(['sec', 'finance', 'edgar', 'mcp', 'trading', 'investing']),
      logo_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=96&h=96&fit=crop',
      pricing_type: 'paid',
      price: 12.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '3.0',
      creator_id: 'usr_fredrik_akerstrom',
      security_status: 'pass',
      status: 'live',
      install_count: 3200,
      view_count: 14200,
      net_votes: 92,
      average_rating: 4.95,
      review_count: 18,
      package_tree: JSON.stringify({
        name: 'sec-filing-synthesis',
        filesCount: 24,
        foldersCount: 5,
        children: [{ name: 'SKILL.md', type: 'file', size: '11.5 KB' }]
      }),
      session_preview: JSON.stringify({
        command: '/sec analyze NVDA 10-K',
        steps: ['Fetched EDGAR submission', 'Parsed revenue tables', 'Flagged supply concentration'],
        score: 'Synthesis Complete',
        summary: 'Extracted key metrics with provenance citations.',
        table: [],
        platforms: [],
        nextSteps: ['Export report']
      })
    },
    {
      id: 'skl_browserbase_computer_use',
      name: 'Browserbase Headless Computer Use',
      slug: 'browserbase-headless-computer-use',
      summary: 'Reliable headless browser control with anti-bot bypass, stealth fingerprinting, and session recording for agents.',
      description: `Give your AI agent eyes and hands on the web. Reliable cloud browser automation with full stealth sandboxing.`,
      category: 'workflow-automation',
      tags: JSON.stringify(['browser', 'automation', 'scraping', 'mcp', 'free']),
      logo_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=96&h=96&fit=crop',
      pricing_type: 'free',
      price: 0.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '1.4',
      creator_id: 'usr_admin',
      security_status: 'pass',
      status: 'live',
      install_count: 8900,
      view_count: 31000,
      net_votes: 142,
      average_rating: 4.88,
      review_count: 29,
      package_tree: JSON.stringify({
        name: 'browserbase-headless',
        filesCount: 16,
        foldersCount: 3,
        children: [{ name: 'SKILL.md', type: 'file', size: '8.2 KB' }]
      }),
      session_preview: JSON.stringify({
        command: '/browser navigate "https://example.com"',
        steps: ['Booted stealth context', 'Rendered DOM', 'Captured screenshot'],
        score: 'Session Active',
        summary: 'Stealth headless session started.',
        table: [],
        platforms: [],
        nextSteps: ['Send interaction actions']
      })
    },
    {
      id: 'skl_sentinel_security_auditor',
      name: 'Sentinel Security Auditor',
      slug: 'sentinel-security-auditor',
      summary: 'Deep static vulnerability inspection, dependency CVE audits, and zero-day threat heuristics for modern web & backend applications.',
      description: `Comprehensive automated security scanning for autonomous agents. Detects injection vulnerabilities, memory hazards, and exfiltration attempts.`,
      category: 'security',
      tags: JSON.stringify(['security', 'audit', 'cve', 'vulnerabilities', 'scanner', 'free']),
      logo_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=96&h=96&fit=crop',
      pricing_type: 'free',
      price: 0.00,
      subscription_price_monthly: null,
      compatibility_type: 'universal',
      current_version: '2.1',
      creator_id: 'usr_admin',
      security_status: 'pass',
      status: 'live',
      install_count: 6400,
      view_count: 24000,
      net_votes: 110,
      average_rating: 4.96,
      review_count: 24,
      package_tree: JSON.stringify({
        name: 'sentinel-security',
        filesCount: 20,
        foldersCount: 4,
        children: [{ name: 'SKILL.md', type: 'file', size: '10.4 KB' }]
      }),
      session_preview: JSON.stringify({
        command: '/sentinel scan ./src',
        steps: ['Loaded AST rules', 'Checked 120 AST nodes', 'Verified zero exfiltrations'],
        score: 'Tier 0 Passed',
        summary: 'Zero vulnerabilities found.',
        table: [],
        platforms: [],
        nextSteps: []
      })
    }
  ];

  for (const s of skillsData) {
    insertSkill.run(
      s.id,
      s.name,
      s.slug,
      s.summary,
      s.description,
      s.category,
      s.tags,
      s.logo_url,
      s.pricing_type,
      s.price,
      s.subscription_price_monthly,
      s.compatibility_type,
      s.current_version,
      s.creator_id,
      s.security_status,
      s.status,
      s.install_count,
      s.view_count,
      s.net_votes,
      s.average_rating,
      s.review_count,
      s.package_tree,
      s.session_preview,
      now
    );
  }

  // 3. Create Deal of the Month for GEO-SEO Suite
  const insertDeal = db.prepare(`
    INSERT OR REPLACE INTO skill_deals (id, skill_id, creator_id, discount_percent, expires_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const dealExpiry = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(); // 2 days from now
  insertDeal.run('deal_geo_seo_month', 'skl_geo_seo_suite', 'usr_juan_gabriel', 33, dealExpiry, 1);

  // 4. Create Sample Reviews
  const insertReview = db.prepare(`
    INSERT OR REPLACE INTO skill_reviews (id, skill_id, user_id, rating, comment, is_verified_purchase, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertReview.run(
    'rev_1',
    'skl_geo_seo_suite',
    'usr_demo_buyer',
    5,
    'This skill paid for itself on the first day. Audited an e-commerce client and exported the PDF report in 3 minutes. The client signed an SEO retainer immediately.',
    1,
    now
  );
  insertReview.run(
    'rev_2',
    'skl_stock_breakout_picker',
    'usr_demo_buyer',
    5,
    'The volume contraction screener identified PLTR before the 14% gap up. Absolutely top tier mathematical rigor.',
    1,
    now
  );

  // 5. Create Skill Package Content (SKILL.md)
  const insertPackage = db.prepare(`
    INSERT OR REPLACE INTO skill_packages (skill_id, version, skill_md_content, files_json, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertPackage.run(
    'skl_geo_seo_suite',
    '1.1',
    `---
name: geo-seo-suite
description: Comprehensive GEO and AI Search Optimization suite for AI Agents. Audits citability, brand authority, and structured data across ChatGPT, Google AI Overviews, and Perplexity.
metadata:
  version: "1.1"
  author: "Juan Gabriel Gomila Salas"
---

# GEO-SEO Suite

Use this skill when auditing website citability and visibility across AI search engines.

## Available Playbooks
- \`/geo audit <url>\`: Execute 5-agent parallel visibility analysis.
- \`/geo quick <url>\`: 60-second snapshot scoring E-E-A-T and passage citability.
- \`/geo report-pdf\`: Generate branded client-ready PDF deliverable.

## Citability Guidelines
1. Ensure answer passages are between 134 and 167 words.
2. Structure JSON-LD with valid schema.org types.
3. Validate crawler allowlists in robots.txt.
`,
    JSON.stringify({
      'SKILL.md': '# GEO-SEO Suite content',
      'scripts/score_engine.py': '# Python scoring engine',
      'schema/organization.jsonld': '{"@context": "https://schema.org"}'
    }),
    now
  );

  insertPackage.run(
    'skl_code_review_auditor',
    '2.0',
    `---
name: code-review-auditor
description: Senior-level automated code review and architectural analysis for pull requests and code changes.
metadata:
  version: "2.0"
---

# Code Review Auditor
Run /review diff to analyze.
`,
    JSON.stringify({
      'SKILL.md': '# Code Review Auditor'
    }),
    now
  );

  insertPackage.run(
    'skl_prompt_dataset_builder',
    '1.0',
    `---
name: prompt-dataset-builder
description: Build and curate high-quality prompt datasets for fine-tuning and eval.
metadata:
  version: "1.0"
---

# Prompt Dataset Builder
Deduplicate, score, and sanitize prompt datasets for LLM evaluation.
`,
    JSON.stringify({
      'SKILL.md': '# Prompt Dataset Builder',
      'scripts/dedupe.py': '# Python dedupe script'
    }),
    now
  );

  insertPackage.run(
    'skl_stock_breakout_picker',
    '1.0',
    `---
name: stock-breakout-picker
description: Rank the strongest stock breakouts using Minervini and CAN SLIM metrics.
metadata:
  version: "1.0"
---

# Stock Breakout Picker
Run /breakout scan to identify actionable setups.
`,
    JSON.stringify({
      'SKILL.md': '# Stock Breakout Picker'
    }),
    now
  );


  // 7. Seed 8-point Security Audit Logs
  const insertAudit = db.prepare(`
    INSERT OR REPLACE INTO security_audit_logs (id, skill_id, rule_name, status, details, scanned_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const auditRules = [
    { rule: 'RULE_FRONTMATTER', details: 'Valid YAML frontmatter with required name and description tags' },
    { rule: 'RULE_PROMPT_INJECTION', details: 'No adversarial prompt injection patterns or system override tokens' },
    { rule: 'RULE_DISK_MUTATION', details: 'No destructive disk mutation or root modification commands' },
    { rule: 'RULE_SECRET_EXFILTRATION', details: 'No credential exfiltration, raw API keys, or private tokens' },
    { rule: 'RULE_REVERSE_SHELL', details: 'No reverse TCP/UDP connection probes or socket hijacking' },
    { rule: 'RULE_TELEMETRY', details: 'No unauthorized phone-home endpoints or persistent probes' },
    { rule: 'RULE_CODE_OBFUSCATION', details: 'No hex, base64 payload eval, or obfuscated execution strings' },
    { rule: 'RULE_PACKAGE_INTEGRITY', details: 'Package checksums and directory hierarchy strictly verified' }
  ];
  for (const r of auditRules) {
    insertAudit.run('log_' + r.rule + '_geo', 'skl_geo_seo_suite', r.rule, 'pass', r.details, now);
    insertAudit.run('log_' + r.rule + '_octo', 'skl_octocode_architect', r.rule, 'pass', r.details, now);
  }

  insertPackage.run(
    'skl_octocode_architect',
    '2.4.1',
    `---
name: octocode-architect
description: Autonomous multi-file codebase refactoring, AST analysis, and zero-breakage dependency migration engine.
metadata:
  version: "2.4.1"
  author: "Axiom Labs"
  mcp_version: "1.0"
---

# OctoCode Architect v2.4.1

Autonomous multi-file codebase refactoring and AST analysis engine.

## Usage
\`\`\`bash
kyron connect octocode-architect
\`\`\`

## Commands
- \`/octocode refactor --target <path>\`: Plan and execute atomic AST transformations
- \`/octocode ast-query --symbol <name>\`: Query cross-package symbol references
- \`/octocode verify\`: Run isolated tests in sandbox
`,
    JSON.stringify({
      'SKILL.md': '# OctoCode Architect',
      'src/ast_engine.ts': '// AST Parser engine',
      'src/graph_walker.ts': '// Graph traversal engine',
      'rules/react19_migration.json': '{"rules": []}'
    }),
    now
  );

  console.log('Database seeded successfully!');
}

runSeed();

