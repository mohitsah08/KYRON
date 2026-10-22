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
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Skills
  async getSkills(params: {
    category?: string;
    sort?: string;
    filter?: string;
    q?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ skills: Skill[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', params.category);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.filter) searchParams.set('filter', params.filter);
    if (params.q) searchParams.set('q', params.q);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.offset) searchParams.set('offset', String(params.offset));
    return request(`/api/skills?${searchParams.toString()}`);
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

  // Creator
  async publishSkill(payload: {
    name: string;
    slug: string;
    summary: string;
    description: string;
    category: string;
    tags: string[];
    pricing_type: 'free' | 'paid';
    price?: number;
    skill_md_content: string;
    files?: Record<string, string>;
  }): Promise<{
    success: boolean;
    skill_id: string;
    slug: string;
    security_status: string;
    audit_report: Array<{ rule_name: string; status: 'pass' | 'fail'; details: string }>;
  }> {
    return request('/api/creator/publish', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getCreatorAnalytics(): Promise<{ analytics: CreatorAnalytics }> {
    return request('/api/creator/analytics');
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

  // MCP JSON-RPC
  async callMcp(method: string, params: any = {}): Promise<any> {
    return request('/api/mcp', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });
  }
};
