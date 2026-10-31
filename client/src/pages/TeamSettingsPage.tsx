import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { SideNav } from '../components/SideNav.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { TeamMember } from '../types.ts';
import { validateAvatarFile, validateFullName, validatePassword, validateUsername } from '../utils/authHelpers.ts';
import { 
  User, 
  Users, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Key, 
  ShieldCheck, 
  Sparkles,
  Mail
} from 'lucide-react';

export function TeamSettingsPage() {
  const { navigate } = useRouter();
  const { user, authUser, updateProfile, uploadAvatar, updatePassword } = useAuth();
  const emailVerified = Boolean(authUser?.email_confirmed_at);
  const memberSince = user?.created_at && !Number.isNaN(Date.parse(user.created_at))
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;
  const [activeSection, setActiveSection] = useState<'profile' | 'team'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || user.display_name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  // Team state
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'dev' | 'agent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Developer' | 'Autonomous Agent' | 'Viewer'>('Developer');

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'm1',
      name: user?.display_name || 'Alex Rivera',
      email: user?.email || 'alex.rivera@axiomlabs.dev',
      role: (user?.role === 'admin' ? 'Admin' : 'Owner') as any,
      type: 'human',
      security: 'Supabase Zero-Knowledge Auth',
      status: 'Active',
      last_active: 'Just now'
    },
    {
      id: 'm2',
      name: 'OctoCode Architect',
      email: 'agent:kyron.octocode.01',
      role: 'Autonomous Agent',
      type: 'agent',
      security: 'Tier 0 Ephemeral Key',
      status: 'Active',
      last_active: '2 mins ago'
    },
    {
      id: 'm3',
      name: 'Elena Rostova',
      email: 'elena.r@axiomlabs.dev',
      role: 'Developer',
      type: 'human',
      security: 'Hardware 2FA',
      status: 'Active',
      last_active: '14 mins ago'
    },
    {
      id: 'm4',
      name: 'Sentinel Security Bot',
      email: 'agent:kyron.sentinel.sec',
      role: 'Autonomous Agent',
      type: 'agent',
      security: 'mTLS Strict Auth',
      status: 'Active',
      last_active: '1 hour ago'
    }
  ]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = '';
      const invalid = validateAvatarFile(file);
      if (invalid) {
        setStatusMessage(null);
        setErrorMessage(invalid);
        return;
      }
      setErrorMessage(null);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setStatusMessage(null);
    const normalizedUsername = username.trim().toLowerCase();
    const invalid = validateFullName(fullName) || validateUsername(normalizedUsername) || (bio.length > 500 ? 'Keep your bio to 500 characters or fewer.' : null);
    if (invalid) {
      setErrorMessage(invalid);
      return;
    }
    setSaving(true);
    setErrorMessage(null);

    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(avatarFile);
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
      }

      await updateProfile({
        full_name: fullName.trim(),
        display_name: fullName.trim(),
        username: normalizedUsername,
        bio: bio.trim()
      });

      setStatusMessage('Your profile has been saved.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalidPassword = validatePassword(newPassword);
    if (invalidPassword) {
      setErrorMessage(invalidPassword);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await updatePassword(newPassword);
      setStatusMessage('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newM: TeamMember = {
      id: `m_${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      type: inviteRole === 'Autonomous Agent' ? 'agent' : 'human',
      security: 'Pending Invite',
      status: 'Invited',
      last_active: 'Never'
    };

    setMembers([...members, newM]);
    setInviteModalOpen(false);
    setInviteEmail('');
  };

  const filteredMembers = members.filter(m => {
    if (roleFilter === 'admin' && m.role !== 'Admin') return false;
    if (roleFilter === 'dev' && m.role !== 'Developer') return false;
    if (roleFilter === 'agent' && m.role !== 'Autonomous Agent') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-bg-canvas text-text-primary antialiased font-body-md">
      <div className="flex flex-col lg:flex-row flex-1 w-full max-w-[1440px] mx-auto">
        <SideNav activeTab="settings" />

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 md:px-margin py-8 flex flex-col gap-8">
            
            {/* Breadcrumb Header */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-label-sm font-code-sm text-text-tertiary">
                <span>WORKSPACE</span>
                <span>/</span>
                <span>SETTINGS</span>
                <span>/</span>
                <span className="text-primary-container font-semibold uppercase">
                  {activeSection === 'profile' ? 'ACCOUNT & PROFILE' : 'TEAM & ACCESS'}
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border-subtle">
                <div className="flex flex-col gap-1 max-w-2xl">
                  <h1 className="text-headline-lg font-headline-lg text-text-primary tracking-tight">
                    Settings & Preferences
                  </h1>
                  <p className="text-body-md font-body-md text-text-secondary">
                    Manage your personal profile, credentials, storage, and workspace access roles.
                  </p>
                </div>

                {/* Section Toggle */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-border-subtle shadow-xs">
                  <button
                    onClick={() => setActiveSection('profile')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeSection === 'profile'
                        ? 'bg-[#171717] text-white shadow-xs'
                        : 'text-[#737373] hover:text-[#171717]'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Account & Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveSection('team')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeSection === 'team'
                        ? 'bg-[#171717] text-white shadow-xs'
                        : 'text-[#737373] hover:text-[#171717]'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Team & Collaborators</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Status alerts */}
            {statusMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SECTION 1: PROFILE MANAGEMENT */}
            {activeSection === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Avatar & Identity Card */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 shadow-xs flex flex-col items-center text-center space-y-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-[#FFF4EB] border-2 border-[#E8E8E6] flex items-center justify-center shadow-inner">
                        {avatarPreview || avatarUrl ? (
                          <img 
                            src={avatarPreview || avatarUrl} 
                            alt={fullName} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="font-mono text-xl font-bold text-[#F97316]">
                            {fullName ? fullName.slice(0, 2).toUpperCase() : 'KY'}
                          </span>
                        )}
                      </div>
                      <label 
                        htmlFor="avatar-file-input"
                        className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-[11px] font-medium"
                      >
                        <Upload className="w-5 h-5 mb-0.5" />
                        <span>Upload</span>
                      </label>
                      <input 
                        id="avatar-file-input"
                        type="file" 
                        accept="image/png,image/jpeg,image/webp,image/gif" 
                        onChange={handleAvatarSelect}
                        className="hidden" 
                      />
                    </div>

                    <div className="space-y-1">
                      <h2 className="font-bold text-base text-[#171717]">{fullName || 'KYRON Engineer'}</h2>
                      <p className="font-mono text-xs text-[#737373]">@{username || 'user'}</p>
                      <div className="pt-2 flex items-center justify-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#FFF4EB] border border-[#F97316]/20 text-[#F97316] rounded-full text-[11px] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          <span className="capitalize">{user?.role || 'User'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="w-full pt-4 border-t border-[#E8E8E6] grid grid-cols-2 gap-2 text-left text-xs">
                      <div className="p-2.5 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6]">
                        <span className="text-[10px] text-[#737373] uppercase font-mono block">Credits</span>
                        <span className="font-mono font-bold text-[#F97316] text-sm">
                          ${(user?.credit_balance ?? 10).toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#FAFAF9] border border-[#E8E8E6]">
                        <span className="text-[10px] text-[#737373] uppercase font-mono block">Security</span>
                        {emailVerified ? (
                          <span className="font-semibold text-emerald-600 text-xs flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified
                          </span>
                        ) : (
                          <span className="font-semibold text-amber-600 text-xs flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Unverified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FAFAF9] border border-[#E8E8E6] rounded-2xl p-5 text-xs text-[#737373] space-y-2">
                    <span className="font-mono font-semibold text-[#171717] text-[11px] uppercase block">
                      Supabase Storage Integrated
                    </span>
                    <p className="leading-relaxed">
                      Avatars are hosted directly within the protected Supabase storage bucket (<code className="font-mono text-[#F97316]">avatars</code>) with public CDN distribution.
                    </p>
                  </div>
                </div>

                {/* Right: Profile Edit Form & Password */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Account Information Form */}
                  <form onSubmit={handleProfileSave} className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="border-b border-[#E8E8E6] pb-4">
                      <h2 className="text-base font-bold text-[#171717]">Personal Information</h2>
                      <p className="text-xs text-[#737373] mt-0.5">
                        Update your public profile displayed across the agent marketplace and creator studio.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#171717]">Full / Display Name</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Dr. Elena Vance"
                          className="w-full h-10 px-3.5 bg-white border border-[#E8E8E6] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#171717]">Username</label>
                        <div className="relative">
                          <span className="text-xs font-mono absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]">@</span>
                          <input
                            type="text"
                            required
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="elenavance"
                            className="w-full h-10 pl-8 pr-3.5 bg-white border border-[#E8E8E6] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#171717] transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#171717]">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                        <input
                          type="email"
                          disabled
                          value={user?.email || ''}
                          className="w-full h-10 pl-9 pr-24 bg-[#FAFAF9] border border-[#E8E8E6] rounded-lg text-xs text-[#737373] font-mono cursor-not-allowed"
                        />
                        {emailVerified && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                            Verified
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#A3A3A3] block">
                        Your sign-in email can’t be changed here.{memberSince ? ` Member since ${memberSince}.` : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#171717]">Bio & Specialization</label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Lead AI systems architect specializing in AST transpilation, autonomous agents, and MCP integrations."
                        className="w-full p-3 bg-white border border-[#E8E8E6] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#171717] transition-colors resize-none"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 h-10 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-lg transition-colors active:scale-[0.99] disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>

                  {/* Password & Security Section */}
                  <form onSubmit={handlePasswordChange} className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                    <div className="border-b border-[#E8E8E6] pb-4">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#F97316]" />
                        <h2 className="text-base font-bold text-[#171717]">Security & Password</h2>
                      </div>
                      <p className="text-xs text-[#737373] mt-0.5">
                        Update your master password for Supabase Auth and authenticated runtime credentials.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#171717]">New Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••••••"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-[#E8E8E6] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#171717] transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#171717]">Confirm New Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full h-10 px-3.5 bg-white border border-[#E8E8E6] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#171717] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 h-10 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors active:scale-[0.99] disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Update Password</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SECTION 2: TEAM & ACCESS (Preserved Architecture) */}
            {activeSection === 'team' && (
              <>
                {/* Metrics */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-secondary mb-3">
                      <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Allocated Seats</span>
                      <span className="material-symbols-outlined text-text-tertiary text-[20px]">group</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-headline-md font-headline-md text-text-primary">
                        {members.length} <span className="text-body-md font-normal text-text-secondary">/ 20 Used</span>
                      </div>
                      <span className="font-code-sm text-label-sm text-status-success font-medium">16 Seats Available</span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-primary-container h-full rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>

                  <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-secondary mb-3">
                      <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Autonomous Workflows</span>
                      <span className="material-symbols-outlined text-primary-container text-[20px]">smart_toy</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-headline-md font-headline-md text-text-primary">
                        6 <span className="text-body-md font-normal text-text-secondary">Autonomous Runtimes</span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-code-sm text-label-sm text-status-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
                        All Healthy
                      </span>
                    </div>
                    <div className="text-body-sm font-body-sm text-text-secondary mt-3">
                      Continuous background static code auditing active
                    </div>
                  </div>

                  <div className="bg-bg-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-secondary mb-3">
                      <span className="text-label-sm font-label-sm uppercase tracking-wider font-semibold">Governance Protocol</span>
                      <span className="material-symbols-outlined text-text-tertiary text-[20px]">verified_user</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-headline-md font-headline-md text-text-primary font-medium">
                        Supabase RLS Active
                      </div>
                      <span className="font-code-sm text-label-sm bg-accent-tint text-primary-container px-2 py-0.5 rounded border border-primary-container/20">
                        STRICT
                      </span>
                    </div>
                    <div className="text-body-sm font-body-sm text-text-secondary mt-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-status-success">check_circle</span>
                      Hardware 2FA & mTLS forced for agent runtimes
                    </div>
                  </div>
                </section>

                {/* Members Directory */}
                <section className="bg-bg-canvas border border-border-subtle rounded-xl overflow-hidden flex flex-col shadow-xs">
                  <div className="p-4 sm:p-5 border-b border-border-subtle flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-bg-surface/50">
                    <div className="relative w-full lg:w-96">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-[18px]">search</span>
                      <input 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or role..."
                        className="w-full h-9 pl-9 pr-4 bg-bg-canvas border border-border-subtle rounded-lg text-body-sm font-body-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-text-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 text-body-sm">
                      <span className="text-label-sm font-label-sm text-text-tertiary uppercase mr-2 font-semibold">Filter:</span>
                      <button 
                        onClick={() => setRoleFilter('all')}
                        className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                          roleFilter === 'all' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                        }`}
                      >
                        All Roles <span className="ml-1 text-label-sm font-code-sm opacity-70">{members.length}</span>
                      </button>
                      <button 
                        onClick={() => setRoleFilter('admin')}
                        className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                          roleFilter === 'admin' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                        }`}
                      >
                        Admins
                      </button>
                      <button 
                        onClick={() => setRoleFilter('dev')}
                        className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                          roleFilter === 'dev' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                        }`}
                      >
                        Developers
                      </button>
                      <button 
                        onClick={() => setRoleFilter('agent')}
                        className={`px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors ${
                          roleFilter === 'agent' ? 'bg-text-primary text-white' : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface'
                        }`}
                      >
                        Autonomous Agents
                      </button>
                    </div>
                  </div>

                  {/* Members Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-body-sm">
                      <thead>
                        <tr className="border-b border-border-subtle bg-bg-surface text-label-sm font-label-sm text-text-tertiary uppercase tracking-wider font-semibold">
                          <th className="py-3 px-5">Member / Entity</th>
                          <th className="py-3 px-4">Security / Permissions</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Last Active</th>
                          <th className="py-3 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle font-body-sm">
                        {filteredMembers.map(m => (
                          <tr key={m.id} className="hover:bg-bg-surface/50 transition-colors">
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-surface-container border border-border-strong flex items-center justify-center font-code-sm text-body-sm font-semibold text-text-primary shrink-0">
                                  {m.type === 'agent' ? '🤖' : m.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-text-primary font-headline-md text-body-md truncate">{m.name}</span>
                                  <span className="font-code-sm text-xs text-text-tertiary truncate">{m.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 font-code-sm text-xs text-text-secondary">
                              {m.security}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm border ${
                                m.role === 'Admin' || m.role === 'Owner' ? 'bg-primary-container/10 text-primary-container border-primary-container/20 font-bold' :
                                m.role === 'Autonomous Agent' ? 'bg-accent-tint text-primary border-primary-container/20' : 'bg-bg-surface text-text-secondary border-border-subtle'
                              }`}>
                                {m.role}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-code-sm text-xs text-text-tertiary">
                              {m.last_active}
                            </td>
                            <td className="py-4 px-5 text-right font-sans">
                              <button 
                                onClick={() => setMembers(members.filter(item => item.id !== m.id))}
                                className="text-text-tertiary hover:text-status-error text-xs"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

          </main>
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-text-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleInvite} className="bg-bg-canvas border border-border-strong rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-headline-md font-semibold text-text-primary text-body-lg">Invite Workspace Collaborator</h3>
              <button type="button" onClick={() => setInviteModalOpen(false)} className="text-text-tertiary hover:text-text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-1">Email or Agent Identifier</label>
                <input 
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="collaborator@enterprise.io"
                  className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-body-sm font-medium text-text-primary mb-1">Workspace Role</label>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full h-9 px-3 bg-bg-surface border border-border-subtle rounded text-body-sm text-text-primary"
                >
                  <option value="Developer">Developer (Execute & Deploy Skills)</option>
                  <option value="Admin">Admin (Full Cluster & Billing Access)</option>
                  <option value="Autonomous Agent">Autonomous Agent (Machine Role via mTLS)</option>
                  <option value="Viewer">Viewer (Read-Only Access)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setInviteModalOpen(false)}
                className="px-3.5 py-2 bg-bg-surface border border-border-subtle text-text-secondary rounded text-body-sm"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-primary-container hover:bg-accent-hover text-white rounded text-body-sm font-medium transition-colors"
              >
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
