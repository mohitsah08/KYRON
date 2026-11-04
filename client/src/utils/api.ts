import { Skill, SkillDeal, CategoryCount, Profile, SecurityAuditRule, SkillReview, UserPurchase, CreatorAnalytics } from '../types.ts';

const TOKEN_KEY = 'kyron_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error: any = new Error(data.error || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.code = data.code;
    error.action = data.action;
    error.next_eligible_at = data.next_eligible_at;
    error.retry_after_seconds = data.retry_after_seconds;
    throw error;
  }

  return data as T;
}

export const api = {
  // Skills
  async getSkills(params: {
    category?: string;
    sort?: string;
    filter?: string;
    pricing_type?: string;
    q?: string;
    limit?: number;
    offset?: number;
    creator?: string;
  } = {}): Promise<{ skills: Skill[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.sort) searchParams.set('sort', params.sort);
    const filterVal = params.pricing_type || params.filter;
    if (filterVal && filterVal !== 'all') {
      searchParams.set('pricing_type', filterVal);
      searchParams.set('filter', filterVal);
    }
    if (params.q) searchParams.set('q', params.q);
    if (params.creator) searchParams.set('creator', params.creator);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    const data = await request<{ skills: Skill[]; total?: number; count?: number }>(`/api/skills?${searchParams.toString()}`);
    return {
      skills: data.skills || [],
      total: typeof data.total === 'number' ? data.total : (typeof data.count === 'number' ? data.count : (data.skills ? data.skills.length : 0))
    };
  },

  async getCategories(): Promise<{ categories: CategoryCount[]; total_skills: number }> {
    return request('/api/skills/categories');
  },

  async getDeals(): Promise<{ deals: Array<{ deal_id: string; discount_percent: number; expires_at: string; skill: Skill }> }> {
    return request('/api/skills/deals');
  },

  async getSkillBySlug(slug: string): Promise<{
    skill: Skill;
    creator: Profile;
    deal: SkillDeal | null;
    security_audit: SecurityAuditRule[];
    reviews: SkillReview[];
    user_vote: number;
    is_saved: boolean;
    is_purchased?: boolean;
    purchase?: UserPurchase | null;
  }> {
    return request(`/api/skills/${slug}`);
  },

  async getSkillPackage(slug: string): Promise<{
    skill_id: string;
    name: string;
    slug: string;
    version: string;
    skill_md_content: string;
    files: Record<string, string>;
  }> {
    return request(`/api/skills/${slug}/package`);
  },

  // Votes & Saves
  async voteSkill(skillId: string, voteType: 1 | -1 | 0): Promise<{ net_votes: number; user_vote: number }> {
    return request(`/api/skills/${skillId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote_type: voteType })
    });
  },

  async toggleSaveSkill(skillId: string, saved: boolean): Promise<{ saved: boolean }> {
    return request(`/api/skills/${skillId}/save`, {
      method: 'POST',
      body: JSON.stringify({ saved })
    });
  },

  async saveSkill(skillId: string): Promise<{ success?: boolean; saved: boolean; is_saved: boolean }> {
    const res = await this.toggleSaveSkill(skillId, true);
    return { ...res, is_saved: res.saved };
  },

  // Reviews
  async submitReview(skillId: string, rating: number, comment: string): Promise<{ success: boolean; review: SkillReview; average_rating: number; review_count: number }> {
    return request(`/api/skills/${skillId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
  },

  // Purchases & Credits
  async installFreeSkill(skillId: string): Promise<{ success: boolean; message: string; purchase: UserPurchase }> {
    return request('/api/purchases/free', {
      method: 'POST',
      body: JSON.stringify({ skill_id: skillId })
    });
  },

  async buySkillWithCredits(skillId: string): Promise<{
    success: boolean;
    message: string;
    purchase: UserPurchase;
    remaining_balance: number;
  }> {
    return request('/api/purchases/credit', {
      method: 'POST',
      body: JSON.stringify({ skill_id: skillId })
    });
  },

  async purchaseWithCredit(skillId: string): Promise<{
    success: boolean;
    message: string;
    purchase: UserPurchase;
    remaining_balance: number;
  }> {
    return this.buySkillWithCredits(skillId);
  },

  async topupCredits(amount: number): Promise<{
    success: boolean;
    message: string;
    new_balance: number;
    transaction_id: string;
  }> {
    return request('/api/credits/topup', {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  },

  async getMyLibrary(): Promise<{ purchases: UserPurchase[] }> {
    return request('/api/purchases/library');
  },

  // Downloads & Installation Prompts
  getMarkdownDownloadUrl(slug: string): string {
    return `/api/skills/${slug}/download/markdown`;
  },

  getZipDownloadUrl(slug: string): string {
    return `/api/skills/${slug}/download/zip`;
  },

  getPromptDownloadUrl(slug: string, agent: string): string {
    return `/api/skills/${slug}/prompt?agent=${encodeURIComponent(agent)}&download=1`;
  },

  async getSkillPrompt(slug: string, agent: string = 'generic'): Promise<{
    skill_id: string;
    skill_name: string;
    slug: string;
    agent: string;
    prompt: string;
    install_path: string;
    has_supporting_files: boolean;
    file_count: number;
  }> {
    return request(`/api/skills/${slug}/prompt?agent=${encodeURIComponent(agent)}`);
  },

  // Creator Studio Management
  async getCreatorSkills(): Promise<{ skills: Skill[]; count: number }> {
    return request('/api/creator/skills');
  },

  async getCreatorSkill(id: string): Promise<{ skill: Skill; package: { version: string; skill_md_content: string; files: Record<string, string> } }> {
    return request(`/api/creator/skills/${id}`);
  },

  async validatePackage(payload: {
    type: 'zip' | 'markdown' | 'plain_md' | 'skill_md';
    content?: string;
    base64?: string;
    files?: Array<{ name: string; content: string }>;
    filename?: string;
    nameHint?: string;
  }): Promise<{
    valid: boolean;
    converted?: boolean;
    skillName?: string;
    description?: string;
    version?: string;
    license?: string;
    skill_md_content?: string;
    extracted_frontmatter?: any;
    extracted_instructions?: string;
    files?: Array<{ name: string; content: string }>;
    files_count?: number;
    warnings: string[];
    errors?: string[];
    security_scan?: any;
  }> {
    return request('/api/creator/validate-package', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateSkill(id: string, payload: any): Promise<{ success: boolean; message: string }> {
    return request(`/api/creator/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async toggleUnpublish(id: string): Promise<{ success: boolean; status: 'draft' | 'live'; message: string }> {
    return request(`/api/creator/skills/${id}/unpublish`, {
      method: 'POST'
    });
  },

  async publishSkill(payload: {
    name: string;
    slug?: string;
    summary: string;
    description: string;
    category: string;
    tags: string[];
    pricing_type: 'free' | 'paid';
    price?: number;
    version?: string;
    license?: string;
    compatibility?: string;
    compatibility_type?: string;
    skill_md_content?: string;
    instructions?: string;
    status?: string;
    files?: Array<{ name?: string; path?: string; content: string }>;
    supporting_files?: Array<{ name?: string; path?: string; content: string }>;
    is_draft?: boolean;
  }): Promise<{
    success: boolean;
    skill_id: string;
    slug: string;
    security_status: string;
    status: string;
    audit_report: Array<{ rule_name: string; status: 'pass' | 'fail'; details: string }>;
  }> {
    return request('/api/creator/publish', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getCreatorAnalytics(): Promise<{ analytics: CreatorAnalytics; funnel?: any }> {
    return request('/api/creator/analytics');
  },

  async getCreatorOverview(): Promise<{
    metrics: {
      total_skills: number;
      draft_count: number;
      submitted_count: number;
      approved_count: number;
      published_count: number;
      rejected_count: number;
      paused_count: number;
      total_views: number;
      total_downloads: number;
      gross_revenue: number;
      net_earnings: number;
    };
    recent_skills: Skill[];
    recent_submissions: any[];
  }> {
    return request('/api/creator/overview');
  },

  async submitSkillForReview(id: string): Promise<{ success: boolean; submission_id: string; status: string; message: string }> {
    return request(`/api/creator/skills/${id}/submit`, { method: 'POST' });
  },

  async publishApprovedSkill(id: string): Promise<{ success: boolean; status: string; message: string }> {
    return request(`/api/creator/skills/${id}/publish`, { method: 'POST' });
  },

  async pauseSkill(id: string): Promise<{ success: boolean; status: string; message: string }> {
    return request(`/api/creator/skills/${id}/pause`, { method: 'POST' });
  },

  async resumeSkill(id: string): Promise<{ success: boolean; status: string; message: string }> {
    return request(`/api/creator/skills/${id}/resume`, { method: 'POST' });
  },

  async deleteSkill(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/creator/skills/${id}`, { method: 'DELETE' });
  },

  async getCreatorSubmissions(): Promise<{ submissions: any[] }> {
    return request('/api/creator/submissions');
  },

  async getSkillVersions(id: string): Promise<{ versions: any[] }> {
    return request(`/api/creator/skills/${id}/versions`);
  },

  async createSkillVersion(id: string, payload: { version_number: string; changelog?: string; file_manifest?: any }): Promise<{ success: boolean; version_id: string; version_number: string }> {
    return request(`/api/creator/skills/${id}/versions`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getCreatorProfile(): Promise<{ profile: any }> {
    return request('/api/creator/profile');
  },

  async updateCreatorProfile(payload: { display_name?: string; bio?: string; website_url?: string; avatar_url?: string; onboarding_completed?: boolean }): Promise<{ success: boolean; profile: any }> {
    return request('/api/creator/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getAdminSubmissions(): Promise<{ submissions: any[] }> {
    return request('/api/creator/admin/submissions');
  },

  async reviewSubmission(id: string, action: 'approve' | 'reject', feedback?: string): Promise<{ success: boolean; status: string; message: string }> {
    return request(`/api/creator/admin/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, feedback })
    });
  },

  // Auth
  async login(email: string, password: string): Promise<{ user: Profile; token: string }> {
    const res = await request<{ user: Profile; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(res.token);
    return res;
  },

  async register(payload: { email: string; password: string; display_name: string; username: string }): Promise<{ user: Profile; token: string }> {
    const res = await request<{ user: Profile; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setAuthToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: Profile }> {
    return request('/api/auth/me');
  },

  async getOAuthProviders(): Promise<{ google: boolean; github: boolean }> {
    return request('/api/auth/oauth/providers');
  },

  async updateProfile(updates: Partial<Profile>): Promise<{ user: Profile }> {
    return request('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async checkUsername(username: string, currentUserId?: string): Promise<{ available: boolean; reason?: string }> {
    const params = new URLSearchParams({ username });
    if (currentUserId) params.set('current_user_id', currentUserId);
    return request(`/api/auth/check-username?${params.toString()}`);
  },

  async updateCreatorProfileFull(payload: any): Promise<{ success: boolean; user: Profile }> {
    return request('/api/auth/creator-profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async updateRoleProfile(payload: any): Promise<{ success: boolean; user: Profile }> {
    return request('/api/auth/role-profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async changeEmail(newEmail: string): Promise<{ success: boolean; email: string; message: string }> {
    return request('/api/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ new_email: newEmail })
    });
  },

  async updatePhone(phone: string): Promise<{ success: boolean; phone: string }> {
    return request('/api/auth/phone', {
      method: 'PUT',
      body: JSON.stringify({ phone })
    });
  },

  async getConnectedAccounts(): Promise<{ accounts: any[] }> {
    return request('/api/auth/connected-accounts');
  },

  async disconnectAccount(provider: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/auth/connected-accounts/${provider}`, {
      method: 'DELETE'
    });
  },

  async getSecurityActivity(): Promise<{ activity: any[]; sessions: any[] }> {
    return request('/api/auth/security/activity');
  },

  async logoutAllSessions(): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/security/logout-all', {
      method: 'POST'
    });
  },

  async exportPersonalData(): Promise<any> {
    return request('/api/auth/export-data', {
      method: 'POST'
    });
  },

  async deactivateAccount(): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/deactivate', {
      method: 'POST'
    });
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/account', {
      method: 'DELETE'
    });
  },

  async getBillingSummary(): Promise<{
    credit_balance: number;
    is_unlimited_credit_user: boolean;
    total_spent: number;
    total_purchases: number;
    plan: string;
    invoices: any[];
    purchases: any[];
  }> {
    return request('/api/purchases/billing-summary');
  },

  // Auth Email Rate Limiting & Dispatch
  async sendVerificationEmail(email: string): Promise<{ success: boolean; message: string; remaining: number }> {
    return request('/api/auth/send-verification-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async sendPasswordResetLink(email: string): Promise<{ success: boolean; message: string; remaining: number }> {
    return request('/api/auth/send-password-reset-link', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string; remaining: number }> {
    return request('/api/auth/send-password-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async verifyPasswordResetOtp(payload: { email: string; otp: string; new_password: string }): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/verify-password-reset-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getEmailRateLimitStatus(email: string, action: string): Promise<{
    action: string;
    allowed: boolean;
    remaining: number;
    limit: number;
    total_attempts_in_window: number;
    next_eligible_at: string | null;
    retry_after_seconds: number;
  }> {
    const query = new URLSearchParams({ email, action }).toString();
    return request(`/api/auth/rate-limit-status?${query}`);
  },

  async preSignupRateLimitCheck(email: string): Promise<{ allowed: boolean; remaining: number; attempt_id?: string }> {
    return request('/api/auth/pre-signup-check', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async callMcp(method: string, params: any = {}): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method,
      params
    };
    return request('/mcp', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
