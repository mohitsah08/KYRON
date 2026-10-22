export interface Profile {
  id: string;
  email: string;
  display_name: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  credit_balance: number;
  is_unlimited_credit_user: number;
  created_at: string;
}

export interface SkillDeal {
  id: string;
  discount_percent: number;
  expires_at: string;
  is_active: number;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  tags: string[];
  logo_url?: string;
  pricing_type: 'free' | 'paid' | 'subscription';
  price: number;
  subscription_price_monthly?: number;
  compatibility_type: string;
  current_version: string;
  creator_id: string;
  security_status: 'pass' | 'fail' | 'pending';
  status: 'live' | 'draft' | 'rejected';
  install_count: number;
  view_count: number;
  net_votes: number;
  average_rating: number;
  review_count: number;
  package_tree?: any;
  session_preview?: any;
  created_at: string;
  // Joins
  creator_name?: string;
  creator_username?: string;
  creator_avatar?: string;
  deal?: SkillDeal | null;
  deal_discount_percent?: number;
  user_vote?: number;
  is_saved?: boolean;
}

export interface SecurityAuditRule {
  rule_name: string;
  status: 'pass' | 'fail';
  details: string;
}

export interface SkillReview {
  id: string;
  skill_id: string;
  user_id: string;
  rating: number;
  comment: string;
  is_verified_purchase: number;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface CategoryCount {
  name: string;
  slug: string;
  domain?: string;
  count: number;
}

export interface UserPurchase {
  id: string;
  user_id: string;
  skill_id: string;
  amount_paid: number;
  license_key: string;
  purchased_at: string;
  skill_name: string;
  skill_slug: string;
  skill_summary: string;
  skill_category: string;
  current_version: string;
  pricing_type: string;
  price: number;
}

export interface CreatorAnalytics {
  total_earnings: number;
  gross_sales: number;
  platform_fee: number;
  total_installs: number;
  total_reviews: number;
  average_rating: number;
  skills: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    install_count: number;
    gross_revenue: number;
    creator_earnings: number;
  }>;
}

// Projects & Deliverables Types
export interface ProjectMilestone {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'pending';
  date: string;
  description?: string;
}

export interface ProjectDeliverable {
  id: string;
  filename: string;
  path: string;
  size: string;
  lines_diff?: string;
  type: 'code' | 'doc' | 'report' | 'schema';
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: 'active' | 'in_review' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  budget_credits: number;
  assigned_skills: string[];
  milestones: ProjectMilestone[];
  deliverables: ProjectDeliverable[];
  team_avatars: string[];
  created_at: string;
  updated_at: string;
}

// Workspace & Team Management Types
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer' | 'Viewer';
  avatar: string;
  two_factor: boolean;
  joined_at: string;
  last_active: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'Admin' | 'Developer' | 'Viewer';
  invited_by: string;
  created_at: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_preview: string;
  created_at: string;
  last_used: string;
  status: 'active' | 'revoked';
}

// AI Chat & Execution Types
export interface ToolInvocation {
  tool: string;
  args: Record<string, any>;
  output: any;
  duration_ms: number;
  status: 'running' | 'success' | 'failed';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tool_calls?: ToolInvocation[];
}

// Admin Trust & Security Types
export interface SecuritySubmission {
  id: string;
  name: string;
  slug: string;
  creator: string;
  version: string;
  submitted_at: string;
  threat_level: 'Clean' | 'Low Risk' | 'Flagged' | 'High Risk';
  ast_status: 'pass' | 'fail' | 'review';
  rules_passed: number;
  total_rules: number;
  quarantined: boolean;
  findings: string[];
}
