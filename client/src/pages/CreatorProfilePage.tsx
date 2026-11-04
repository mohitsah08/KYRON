import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';

interface CreatorProfilePageProps {
  username?: string;
}

export function CreatorProfilePage({ username }: CreatorProfilePageProps) {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'skills' | 'about'>('skills');

  const isOwnProfile = user && (!username || user.username === username);
  const creatorHandle = isOwnProfile ? (user.username || 'creator') : (username || 'creator');
  const creatorDisplayName = isOwnProfile 
    ? (user.full_name || user.display_name || user.username || 'Creator') 
    : (username ? username.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Verified Creator');
  const creatorBio = isOwnProfile 
    ? (user.bio || 'AI agent creator publishing standalone SKILL.md and ZIP packages on the KYRON Marketplace.') 
    : 'Independent AI skill creator publishing verified packages for coding agents.';
  const creatorAvatar = isOwnProfile ? user.avatar_url : null;
  const creatorWebsite = isOwnProfile ? (user as any).website_url : null;

  useEffect(() => {
    let cancelled = false;
    async function loadCreatorSkills() {
      try {
        setLoading(true);
        const res = await api.getSkills({ creator: creatorHandle });
        if (!cancelled) {
          setSkills(res.skills || []);
        }
      } catch (err) {
        console.error('Failed to load creator skills:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCreatorSkills();
    return () => { cancelled = true; };
  }, [creatorHandle]);

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 md:px-10 py-8 md:py-10">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-code-sm font-code-sm text-text-tertiary">
          <button onClick={() => navigate('/marketplace')} className="hover:text-text-primary transition-colors">
            Marketplace
          </button>
          <span>/</span>
          <span className="text-text-secondary">Creators</span>
          <span>/</span>
          <span className="text-text-primary font-medium">{creatorDisplayName}</span>
        </div>

        {/* Creator Header Banner */}
        <section className="bg-bg-canvas border border-border-subtle rounded-xl p-6 md:p-8 relative mb-10 shadow-xs">
          <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 pb-6 border-b border-border-subtle">
            
            {/* Identity */}
            <div className="flex items-start gap-5">
              <div className="relative w-20 h-20 rounded-xl bg-bg-surface border border-border-subtle p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                {creatorAvatar ? (
                  <img 
                    alt={creatorDisplayName} 
                    className="w-full h-full object-cover rounded-lg" 
                    src={creatorAvatar}
                  />
                ) : (
                  <span className="font-mono text-2xl font-bold text-primary-container">
                    {creatorDisplayName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="absolute -bottom-1 -right-1 bg-status-success w-3.5 h-3.5 rounded-full border-2 border-bg-canvas" title="Verified Creator"></span>
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight font-semibold">
                    {creatorDisplayName}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-tint text-primary-container border border-primary-container/20 text-label-sm font-label-sm">
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    {isOwnProfile ? 'Your Storefront' : 'Verified Creator'}
                  </span>
                  <span className="text-code-sm font-code-sm text-text-secondary bg-bg-surface px-2 py-0.5 rounded border border-border-subtle">
                    @{creatorHandle}
                  </span>
                </div>
                <p className="text-body-md font-body-md text-text-secondary max-w-2xl leading-relaxed">
                  {creatorBio}
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 shrink-0 self-start lg:self-auto">
              {isOwnProfile ? (
                <>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-border-subtle bg-bg-surface text-text-primary hover:border-border-strong font-body-md font-medium transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-text-secondary">edit</span>
                    <span>Edit Profile</span>
                  </button>
                  <button 
                    onClick={() => navigate('/creator-studio')}
                    className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-primary-container text-white hover:bg-accent-hover font-body-md font-medium transition-colors active:scale-[0.99] shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">palette</span>
                    <span>Manage in Creator Studio</span>
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => navigate('/creators')}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-lg border border-border-subtle bg-bg-surface text-text-primary font-body-md hover:border-border-strong hover:bg-bg-canvas transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-text-secondary">school</span>
                  <span>Creator Hub</span>
                </button>
              )}
            </div>
          </div>

          {/* Metadata Rail */}
          <div className="pt-5 flex flex-wrap items-center gap-y-3 gap-x-6 text-body-sm font-body-sm text-text-secondary">
            {creatorWebsite && (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-text-tertiary">link</span>
                <a href={creatorWebsite} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-code-sm text-code-sm">
                  {creatorWebsite.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-text-tertiary">deployed_code</span>
              <span className="font-medium text-text-primary">{skills.length} Published Skills</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-text-tertiary">verified</span>
              <span>Standalone SKILL.md & ZIP Compatible</span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-code-sm font-code-sm text-status-success">
              <span className="w-2 h-2 rounded-full bg-status-success"></span>
              <span>Verified Agent Compatibility</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="border-b border-border-subtle mb-8">
          <div className="flex gap-8 -mb-px">
            <button 
              onClick={() => setActiveTab('skills')}
              className={`flex items-center gap-2 pb-3.5 font-headline-md text-headline-md border-b-2 transition-colors ${
                activeTab === 'skills'
                  ? 'border-primary-container text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>Published Skills</span>
              <span className="px-2 py-0.5 text-label-sm font-label-sm rounded-full bg-bg-surface text-text-secondary border border-border-subtle">
                {skills.length}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2 pb-3.5 text-body-md font-body-md border-b-2 transition-colors ${
                activeTab === 'about'
                  ? 'border-primary-container text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>About Creator</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Published Skills */}
        {activeTab === 'skills' && (
          <div>
            {loading ? (
              <div className="py-16 text-center text-text-secondary">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p>Loading creator skills...</p>
              </div>
            ) : skills.length === 0 ? (
              <div className="bg-bg-canvas border border-border-subtle rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-border-subtle flex items-center justify-center mx-auto mb-4 text-primary">
                  <span className="material-symbols-outlined text-[32px]">folder_open</span>
                </div>
                <h3 className="font-headline-md text-text-primary text-xl font-semibold mb-2">No Published Skills Yet</h3>
                <p className="text-body-sm text-text-secondary leading-relaxed mb-6">
                  {isOwnProfile 
                    ? "You haven't published any skills to the marketplace yet. Open Creator Studio to create, validate, and publish your first AI skill."
                    : `${creatorDisplayName} has not published any live listings on the KYRON Marketplace yet.`
                  }
                </p>
                {isOwnProfile ? (
                  <button
                    onClick={() => navigate('/creator-studio')}
                    className="px-5 py-2.5 bg-primary-container hover:bg-accent-hover text-white rounded-lg text-body-sm font-medium transition-all shadow-xs"
                  >
                    Create Your First Skill
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/marketplace')}
                    className="px-5 py-2.5 bg-bg-surface hover:bg-bg-canvas border border-border-subtle text-text-primary rounded-lg text-body-sm font-medium transition-all"
                  >
                    Browse Marketplace
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {skills.map(skill => (
                  <article 
                    key={skill.id}
                    className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all duration-150 flex flex-col justify-between group shadow-xs"
                  >
                    <div>
                      {/* Top Metadata Rail */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle text-code-sm font-code-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-bg-surface text-text-secondary border border-border-subtle">{skill.category || 'Agent Skill'}</span>
                          <span className="text-text-tertiary">v{skill.current_version || '1.0.0'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-text-primary font-medium">
                          <span className="material-symbols-outlined text-[15px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span>{Number(skill.average_rating || 5.0).toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Title & Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-headline-md font-headline-md text-text-primary group-hover:text-primary transition-colors font-medium">
                          {skill.name}
                        </h3>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-label-sm font-label-sm bg-accent-tint text-primary-container border border-primary-container/20 shrink-0">
                          {skill.pricing_type === 'paid' ? `$${skill.price}` : 'Free'}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className="text-body-sm font-body-sm text-text-secondary line-clamp-2 mb-4 leading-relaxed">
                        {skill.summary}
                      </p>
                    </div>

                    {/* Bottom Rail */}
                    <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                      <div className="text-code-sm font-code-sm text-text-secondary">
                        {skill.install_count || 0} downloads
                      </div>
                      <button 
                        onClick={() => navigate(`/skills/${skill.slug}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-canvas text-body-sm font-body-sm text-text-primary hover:border-border-strong hover:bg-bg-surface transition-colors active:scale-[0.99]"
                      >
                        <span>View Details</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: About */}
        {activeTab === 'about' && (
          <div className="bg-bg-canvas border border-border-subtle rounded-xl p-8 space-y-6 max-w-3xl shadow-xs">
            <h3 className="font-headline-md font-semibold text-text-primary text-headline-md">
              About {creatorDisplayName}
            </h3>
            <p className="text-body-md text-text-secondary leading-relaxed">
              {creatorBio}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border-subtle font-code-sm text-xs">
              <div className="p-4 bg-bg-surface border border-border-subtle rounded-lg">
                <span className="text-text-tertiary uppercase text-[10px] block mb-1">COMPATIBILITY</span>
                <span className="text-text-primary font-medium">Claude Code • Cursor • Codex • Antigravity</span>
              </div>
              <div className="p-4 bg-bg-surface border border-border-subtle rounded-lg">
                <span className="text-text-tertiary uppercase text-[10px] block mb-1">VERIFICATION</span>
                <span className="text-text-primary font-medium">Automated 8-Point Static Inspection</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
