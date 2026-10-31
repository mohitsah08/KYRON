// Full list of 32 categories discovered in Agensi audit
export interface CategoryItem {
  slug: string;
  name: string;
  domain: 'business' | 'developer';
}

export const CATEGORIES: CategoryItem[] = [
  // Business
  { slug: 'trading-investing', name: 'Trading & Investing', domain: 'business' },
  { slug: 'writing-content', name: 'Writing & Content', domain: 'business' },
  { slug: 'marketing-seo', name: 'Marketing & SEO', domain: 'business' },
  { slug: 'digital-products', name: 'Digital Products', domain: 'business' },
  { slug: 'business-operations', name: 'Business & Operations', domain: 'business' },
  { slug: 'branding-design', name: 'Branding & Design', domain: 'business' },
  { slug: 'workflow-automation', name: 'Workflow Automation', domain: 'business' },
  { slug: 'productivity', name: 'Productivity', domain: 'business' },
  { slug: 'sales-lead-gen', name: 'Sales & Lead Gen', domain: 'business' },
  { slug: 'ecommerce', name: 'E-commerce', domain: 'business' },
  { slug: 'social-media', name: 'Social Media', domain: 'business' },
  { slug: 'finance-accounting', name: 'Finance & Accounting', domain: 'business' },
  { slug: 'image-video', name: 'Image & Video', domain: 'business' },
  { slug: 'research-analysis', name: 'Research & Analysis', domain: 'business' },
  { slug: 'education-learning', name: 'Education & Learning', domain: 'business' },
  { slug: 'hr-recruiting', name: 'HR & Recruiting', domain: 'business' },
  { slug: 'game-development', name: 'Game Development', domain: 'business' },
  { slug: 'legal-compliance', name: 'Legal & Compliance', domain: 'business' },
  { slug: 'translation-localization', name: 'Translation & Localization', domain: 'business' },
  // Developer
  { slug: 'agents-orchestration', name: 'Agents & Orchestration', domain: 'developer' },
  { slug: 'frontend-web-apps', name: 'Frontend & Web Apps', domain: 'developer' },
  { slug: 'code-quality-review', name: 'Code Quality & Review', domain: 'developer' },
  { slug: 'testing-debugging', name: 'Testing & Debugging', domain: 'developer' },
  { slug: 'security', name: 'Security', domain: 'developer' },
  { slug: 'technical-documentation', name: 'Technical Documentation', domain: 'developer' },
  { slug: 'devops-cloud', name: 'DevOps & Cloud', domain: 'developer' },
  { slug: 'prompt-skill-engineering', name: 'Prompt & Skill Engineering', domain: 'developer' },
  { slug: 'llm-ops', name: 'LLM Ops', domain: 'developer' },
  { slug: 'apis-backend', name: 'APIs & Backend', domain: 'developer' },
  { slug: 'data-databases', name: 'Data & Databases', domain: 'developer' },
  { slug: 'mobile-development', name: 'Mobile Development', domain: 'developer' },
  { slug: 'web3-crypto', name: 'Web3 & Crypto', domain: 'developer' }
];
