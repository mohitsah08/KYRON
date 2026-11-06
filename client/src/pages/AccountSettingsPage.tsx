import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { api } from '../utils/api.ts';
import { TeamMember, ConnectedAccount, LoginActivityItem, ActiveSessionItem } from '../types.ts';
import { validateEmail, validatePassword } from '../utils/authHelpers.ts';
import {
  User,
  Shield,
  Sliders,
  Eye,
  CreditCard,
  Users,
  Mail,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  Smartphone,
  Globe,
  Trash2,
  Download,
  LogOut,
  Plus,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Receipt,
  FileText,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';

function formatCooldown(seconds: number): string {
  if (seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function AccountSettingsPage() {
  const { query, navigate } = useRouter();
  const {
    user,
    authUser,
    refreshUser,
    updateProfile,
    updatePassword,
    resetPassword,
    logout,
    setIsCreditModalOpen
  } = useAuth();

  // Active section tab
  const tabParam = query.get('tab') as 'account' | 'security' | 'preferences' | 'privacy' | 'billing' | 'team' | null;
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'preferences' | 'privacy' | 'billing' | 'team'>(tabParam || 'account');

  // Sync tab with URL query parameter
  useEffect(() => {
    if (tabParam && ['account', 'security', 'preferences', 'privacy', 'billing', 'team'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Global notification feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ==========================================
  // SECTION 1: ACCOUNT INFORMATION STATE
  // ==========================================
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const [phone, setPhone] = useState(user?.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [loadingConnected, setLoadingConnected] = useState(false);

  // ==========================================
  // SECTION 2: SECURITY STATE
  // ==========================================
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmailCooldown, setResetEmailCooldown] = useState(0);

  useEffect(() => {
    if (resetEmailCooldown <= 0) return;
    const t = setTimeout(() => setResetEmailCooldown(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resetEmailCooldown]);

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [activity, setActivity] = useState<LoginActivityItem[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // ==========================================
  // SECTION 3: PREFERENCES STATE
  // ==========================================
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState(user?.language || 'en');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [notifications, setNotifications] = useState({
    email_security: true, // Cannot be disabled
    email_product: user?.notification_preferences?.email_product ?? true,
    email_marketing: user?.notification_preferences?.email_marketing ?? false,
    in_app: user?.notification_preferences?.in_app ?? true,
    new_ratings: user?.notification_preferences?.new_ratings ?? true,
    skill_sales: user?.notification_preferences?.skill_sales ?? true
  });
  const [savingPreferences, setSavingPreferences] = useState(false);

  // ==========================================
  // SECTION 4: PRIVACY STATE
  // ==========================================
  const [visibility, setVisibility] = useState<'public' | 'private'>(user?.profile_visibility || 'public');
  const [discoverable, setDiscoverable] = useState(user?.discoverability ?? true);
  const [messaging, setMessaging] = useState<'anyone' | 'verified' | 'none'>(user?.messaging_preference || 'anyone');
  const [exportingData, setExportingData] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // ==========================================
  // SECTION 5: BILLING & INVOICES STATE
  // ==========================================
  const [billingData, setBillingData] = useState<{
    credit_balance: number;
    is_unlimited_credit_user: boolean;
    total_spent: number;
    total_purchases: number;
    plan: string;
    invoices: any[];
  } | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // ==========================================
  // SECTION 6: TEAM & WORKSPACE STATE
  // ==========================================
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'm1',
      name: user?.display_name || 'Account Owner',
      email: user?.email || '',
      role: (user?.role === 'admin' ? 'Admin' : 'Owner') as any,
      type: 'human',
      security: 'Hardware / Passkey 2FA',
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
      last_active: '5 mins ago'
    },
    {
      id: 'm3',
      name: 'Sentinel Security Bot',
      email: 'agent:kyron.sentinel.sec',
      role: 'Autonomous Agent',
      type: 'agent',
      security: 'mTLS Strict Auth',
      status: 'Active',
      last_active: '1 hour ago'
    }
  ]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Developer' | 'Viewer'>('Developer');

  // Load connected accounts & security activity
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoadingConnected(true);
        const accs = await api.getConnectedAccounts();
        if (!cancelled) setConnectedAccounts(accs.accounts || []);
      } catch (err) {
        console.warn('Could not fetch connected accounts:', err);
      } finally {
        if (!cancelled) setLoadingConnected(false);
      }

      try {
        setLoadingSecurity(true);
        const sec = await api.getSecurityActivity();
        if (!cancelled) {
          setSessions(sec.sessions || []);
          setActivity(sec.activity || []);
        }
      } catch (err) {
        console.warn('Could not fetch security activity:', err);
      } finally {
        if (!cancelled) setLoadingSecurity(false);
      }

      try {
        setLoadingBilling(true);
        const bill = await api.getBillingSummary();
        if (!cancelled) setBillingData(bill);
      } catch (err) {
        console.warn('Could not fetch billing summary:', err);
      } finally {
        if (!cancelled) setLoadingBilling(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Sync user values
  useEffect(() => {
    if (user) {
      setPhone(user.phone || '');
      setTheme(user.theme_preference || 'system');
      setLanguage(user.language || 'en');
      setTimezone(user.timezone || 'UTC');
      setVisibility(user.profile_visibility || 'public');
      setDiscoverable(user.discoverability ?? true);
      setMessaging(user.messaging_preference || 'anyone');
      if (user.notification_preferences) {
        setNotifications({
          email_security: true,
          email_product: user.notification_preferences.email_product ?? true,
          email_marketing: user.notification_preferences.email_marketing ?? false,
          in_app: user.notification_preferences.in_app ?? true,
          new_ratings: user.notification_preferences.new_ratings ?? true,
          skill_sales: user.notification_preferences.skill_sales ?? true
        });
      }
    }
  }, [user]);

  // Handle Email Change
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(newEmail);
    if (err) {
      setFeedback({ type: 'error', message: err });
      return;
    }

    try {
      setChangingEmail(true);
      await api.changeEmail(newEmail);
      await refreshUser();
      setEmailModalOpen(false);
      setNewEmail('');
      setFeedback({ type: 'success', message: 'Email address updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update email.' });
    } finally {
      setChangingEmail(false);
    }
  };

  // Handle Phone Update
  const handleUpdatePhone = async () => {
    try {
      setSavingPhone(true);
      await api.updatePhone(phone);
      await refreshUser();
      setFeedback({ type: 'success', message: 'Phone number updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update phone number.' });
    } finally {
      setSavingPhone(false);
    }
  };

  // Handle Disconnect Provider
  const handleDisconnectProvider = async (provider: string) => {
    try {
      await api.disconnectAccount(provider);
      const accs = await api.getConnectedAccounts();
      setConnectedAccounts(accs.accounts || []);
      setFeedback({ type: 'success', message: `Disconnected ${provider} account.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to disconnect account.' });
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passErr = validatePassword(newPassword);
    if (passErr) {
      setFeedback({ type: 'error', message: passErr });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    try {
      setUpdatingPass(true);
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Password updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update password.' });
    } finally {
      setUpdatingPass(false);
    }
  };

  // Handle Reset Password Email
  const handleSendResetEmail = async () => {
    if (!user?.email || resetEmailCooldown > 0) return;
    try {
      await resetPassword(user.email);
      setResetEmailSent(true);
      setResetEmailCooldown(60);
      setFeedback({ type: 'success', message: `Password reset link sent to ${user.email}` });
    } catch (err: any) {
      if (err.retryAfterSeconds) {
        setResetEmailCooldown(err.retryAfterSeconds);
      }
      setFeedback({ type: 'error', message: err.message || 'Failed to send reset link.' });
    }
  };

  // Handle Logout All Sessions
  const handleLogoutAllSessions = async () => {
    try {
      setLoggingOutAll(true);
      await api.logoutAllSessions();
      const sec = await api.getSecurityActivity();
      setSessions(sec.sessions || []);
      setFeedback({ type: 'success', message: 'Signed out of all other active sessions.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to sign out of other sessions.' });
    } finally {
      setLoggingOutAll(false);
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = async () => {
    try {
      setSavingPreferences(true);
      await api.updateProfile({
        theme_preference: theme,
        language,
        timezone,
        notification_preferences: notifications
      });
      await refreshUser();
      setFeedback({ type: 'success', message: 'Preferences updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save preferences.' });
    } finally {
      setSavingPreferences(false);
    }
  };

  // Handle Save Privacy
  const handleSavePrivacy = async () => {
    try {
      await api.updateProfile({
        profile_visibility: visibility,
        discoverability: discoverable,
        messaging_preference: messaging
      });
      await refreshUser();
      setFeedback({ type: 'success', message: 'Privacy settings updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save privacy settings.' });
    }
  };

  // Handle Export Personal Data
  const handleExportData = async () => {
    try {
      setExportingData(true);
      const data = await api.exportPersonalData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyron-account-data-${user?.username || 'user'}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Personal account data exported successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to export data.' });
    } finally {
      setExportingData(false);
    }
  };

  // Handle Deactivate Account
  const handleDeactivateAccount = async () => {
    try {
      setDeactivating(true);
      await api.deactivateAccount();
      setDeactivateModalOpen(false);
      await logout();
      navigate('/login?status=deactivated');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to deactivate account.' });
    } finally {
      setDeactivating(false);
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput !== user?.username) {
      setFeedback({ type: 'error', message: 'Please type your username exactly to confirm deletion.' });
      return;
    }

    try {
      setDeletingAccount(true);
      await api.deleteAccount();
      setDeleteModalOpen(false);
      await logout();
      navigate('/signup?status=deleted');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete account.' });
    } finally {
      setDeletingAccount(false);
    }
  };

  // Navigation Items
  const navItems = [
    { id: 'account', label: 'Account Information', icon: User, desc: 'Email, phone, login methods' },
    { id: 'security', label: 'Security & Access', icon: Shield, desc: 'Password, sessions, 2FA' },
    { id: 'preferences', label: 'Preferences', icon: Sliders, desc: 'Theme, language, alerts' },
    { id: 'privacy', label: 'Privacy & Data', icon: Eye, desc: 'Visibility, download archive' },
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard, desc: 'Credits, purchase receipts' },
    { id: 'team', label: 'Team & Workspace', icon: Users, desc: 'Manage organization access' },
  ];

  const emailVerified = Boolean(authUser?.email_confirmed_at) || Boolean(user?.email_verified);
  const memberSince = user?.created_at && !Number.isNaN(Date.parse(user.created_at))
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recent Member';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#171717] pb-24">
      {/* Toast Alert */}
      {feedback && (
        <div className="fixed top-20 right-6 z-50 max-w-md animate-fade-in">
          <div className={`p-4 rounded-xl border shadow-lg flex items-start gap-3 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm font-medium">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="text-[#737373] hover:text-[#171717]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#737373] mb-1">
              <button onClick={() => navigate('/profile')} className="hover:text-[#171717]">Profile</button>
              <span>/</span>
              <span className="text-[#171717] font-semibold">Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
              Account & Settings Hub
            </h1>
            <p className="text-sm text-[#737373] mt-0.5">
              Manage your credentials, security posture, notifications, billing, and team permissions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 rounded-xl bg-white border border-[#D4D4D0] hover:border-[#171717] text-xs font-semibold text-[#171717] transition-all shadow-xs"
            >
              Back to My Profile
            </button>
          </div>
        </div>

        {/* Content Layout: Left Nav + Right Pane */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar Navigation */}
          <div className="lg:col-span-4 space-y-1 bg-white border border-[#E8E8E6] rounded-2xl p-2.5 shadow-xs">
            {navItems.map(item => {
              const Icon = item.icon;
              const isCurrent = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all ${
                    isCurrent
                      ? 'bg-orange-50/70 border border-orange-200/80 text-[#F97316] font-semibold'
                      : 'hover:bg-[#F8F8F7] text-[#525252] hover:text-[#171717]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isCurrent ? 'bg-orange-500 text-white shadow-xs' : 'bg-[#F4F4F5] text-[#737373]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm ${isCurrent ? 'font-bold text-[#171717]' : 'font-medium'}`}>{item.label}</div>
                      <div className="text-[11px] text-[#737373] truncate">{item.desc}</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isCurrent ? 'text-[#F97316] translate-x-0.5' : 'text-[#D4D4D0]'}`} />
                </button>
              );
            })}
          </div>

          {/* Right Content Pane */}
          <div className="lg:col-span-8 space-y-6">

            {/* TAB 1: ACCOUNT INFORMATION */}
            {activeTab === 'account' && (
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-[#171717]">Account Information</h2>
                  <p className="text-xs text-[#737373]">Primary account identifiers and authentication channels.</p>
                </div>

                {/* Email Address Section */}
                <div className="p-5 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E6] flex items-center justify-center text-[#F97316] shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-[#737373] uppercase font-mono tracking-wider">Registered Email</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-[#171717]">{user?.email}</span>
                        {emailVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                            Pending Verification
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setEmailModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg border border-[#D4D4D0] hover:border-[#171717] text-xs font-semibold text-[#171717] bg-white transition-all shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    Change Email
                  </button>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#171717]">Phone Number</label>
                  <div className="flex gap-3">
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="flex-1 max-w-sm px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                    />
                    <button
                      onClick={handleUpdatePhone}
                      disabled={savingPhone}
                      className="px-4 py-2 rounded-xl bg-[#F8F8F7] hover:bg-[#F0F0EF] border border-[#D4D4D0] text-xs font-semibold text-[#171717] transition-colors"
                    >
                      {savingPhone ? 'Saving...' : 'Save Phone'}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#737373]">Used for urgent security notifications and account verification.</p>
                </div>

                {/* Connected Login Providers */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#171717]">Connected Sign-in Providers</h3>
                  
                  <div className="space-y-3">
                    {/* Google */}
                    <div className="p-4 rounded-xl border border-[#EDEDEB] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center font-bold text-sm text-zinc-800">
                          G
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#171717]">Google OAuth</div>
                          <div className="text-xs text-[#737373]">
                            {connectedAccounts.some(a => a.provider === 'google') ? 'Connected to your KYRON account' : 'Not linked'}
                          </div>
                        </div>
                      </div>

                      {connectedAccounts.some(a => a.provider === 'google') ? (
                        <button
                          onClick={() => handleDisconnectProvider('google')}
                          className="text-xs font-medium text-rose-600 hover:underline"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <span className="text-xs text-[#A3A3A3]">Ready to link via sign-in</span>
                      )}
                    </div>

                    {/* GitHub */}
                    <div className="p-4 rounded-xl border border-[#EDEDEB] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm">
                          GH
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#171717]">GitHub OAuth</div>
                          <div className="text-xs text-[#737373]">
                            {connectedAccounts.some(a => a.provider === 'github') ? 'Connected to your KYRON account' : 'Not linked'}
                          </div>
                        </div>
                      </div>

                      {connectedAccounts.some(a => a.provider === 'github') ? (
                        <button
                          onClick={() => handleDisconnectProvider('github')}
                          className="text-xs font-medium text-rose-600 hover:underline"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <span className="text-xs text-[#A3A3A3]">Ready to link via sign-in</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Metadata Cards */}
                <div className="pt-6 border-t border-[#EDEDEB] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#F8F8F7] border border-[#EDEDEB]">
                    <div className="text-[#737373] mb-1">Account Unique ID</div>
                    <div className="font-mono font-medium text-[#171717] select-all truncate">{user?.id}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F8F7] border border-[#EDEDEB]">
                    <div className="text-[#737373] mb-1">Account Created</div>
                    <div className="font-semibold text-[#171717]">{memberSince}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SECURITY & ACCESS */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Management */}
                <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#171717]">Password & Credentials</h2>
                    <p className="text-xs text-[#737373]">Update your account password or request a secure recovery link.</p>
                  </div>

                  <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={updatingPass || !newPassword}
                        className="px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {updatingPass ? 'Updating...' : 'Update Password'}
                      </button>

                      <button
                        type="button"
                        onClick={handleSendResetEmail}
                        disabled={resetEmailCooldown > 0}
                        className="text-xs text-[#737373] hover:text-[#171717] font-medium underline disabled:opacity-50 disabled:no-underline"
                      >
                        {resetEmailCooldown > 0
                          ? `Resend available in ${formatCooldown(resetEmailCooldown)}`
                          : 'Send Reset Link to Email'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Two-Factor Authentication (2FA) */}
                <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#F97316] shrink-0">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#171717]">Two-Factor Authentication (2FA)</div>
                        <p className="text-xs text-[#737373] mt-0.5 leading-relaxed max-w-lg">
                          Protect your marketplace credits and published creator packages with an authenticator app (Google Authenticator, 1Password, or Authy).
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShow2FAModal(true)}
                      className="px-4 py-2 rounded-xl border border-[#D4D4D0] hover:border-[#171717] text-xs font-semibold text-[#171717] bg-white transition-all shadow-xs self-start sm:self-auto shrink-0"
                    >
                      {twoFactorEnabled ? 'Manage 2FA' : 'Configure 2FA'}
                    </button>
                  </div>
                </div>

                {/* Active Sessions & Device Management */}
                <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#171717]">Active Sessions & Devices</h3>
                      <p className="text-xs text-[#737373]">Devices currently authenticated to your KYRON workspace.</p>
                    </div>

                    <button
                      onClick={handleLogoutAllSessions}
                      disabled={loggingOutAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{loggingOutAll ? 'Signing out...' : 'Sign Out Other Sessions'}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sessions.map((sess, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-[#EDEDEB] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-[#737373]" />
                          <div>
                            <div className="font-semibold text-[#171717] flex items-center gap-2">
                              <span>{sess.device_name || 'Browser Session'}</span>
                              {sess.is_current && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#A3A3A3] font-mono mt-0.5">
                              IP: {sess.ip_address} • Last active: {sess.last_active ? new Date(sess.last_active).toLocaleTimeString() : 'Just now'}
                            </div>
                          </div>
                        </div>

                        {!sess.is_current && (
                          <span className="text-[11px] text-[#737373]">Active</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Login Activity */}
                <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-[#171717]">Recent Login Activity</h3>
                  <div className="divide-y divide-[#F4F4F5] text-xs">
                    {activity.slice(0, 5).map((act, i) => (
                      <div key={i} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#171717]">{act.device_type}</div>
                          <div className="text-[11px] text-[#737373]">{act.location || 'Verified Client'} • IP: {act.ip_address}</div>
                        </div>
                        <div className="text-[11px] text-[#A3A3A3] font-mono">
                          {new Date(act.logged_in_at).toLocaleDateString()} {new Date(act.logged_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Danger Zone: Account Deletion */}
                <div className="bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-rose-950">Danger Zone: Delete Account</h3>
                      <p className="text-xs text-rose-800/80 leading-relaxed max-w-lg mt-1">
                        Permanently delete your user profile, credit balances, skill purchases, and storefront. This action cannot be reversed.
                      </p>
                    </div>

                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PREFERENCES */}
            {activeTab === 'preferences' && (
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-[#171717]">Interface & Notification Preferences</h2>
                  <p className="text-xs text-[#737373]">Customize themes, regional standards, and notification channels.</p>
                </div>

                {/* Theme Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[#171717]">Appearance Theme</label>
                  <div className="grid grid-cols-3 gap-3 max-w-md">
                    {[
                      { id: 'light', label: 'Light' },
                      { id: 'dark', label: 'Dark' },
                      { id: 'system', label: 'System Default' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id as any)}
                        className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                          theme === t.id
                            ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-500 text-[#F97316] shadow-xs'
                            : 'bg-[#FAFAFA] dark:bg-[#1A1A1A] border-[#EDEDEB] dark:border-[#2E2E2E] text-[#525252] dark:text-[#A3A3A3] hover:border-[#D4D4D0] dark:hover:border-[#404040]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language & Timezone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#171717] mb-1">Language</label>
                    <select
                      value={language}
                      onChange={e => setLanguage(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden bg-white"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                      <option value="de">Deutsch</option>
                      <option value="fr">Français</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#171717] mb-1">Time Zone</label>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden bg-white"
                    >
                      <option value="UTC">UTC (Universal)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                    </select>
                  </div>
                </div>

                {/* Granular Notifications */}
                <div className="space-y-4 pt-4 border-t border-[#EDEDEB]">
                  <h3 className="text-sm font-bold text-[#171717]">Email & In-App Notifications</h3>

                  <div className="space-y-3">
                    {/* Security - Non-disableable */}
                    <div className="p-4 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-[#F97316]" />
                          <span>Security & Account Alerts</span>
                        </div>
                        <div className="text-[11px] text-[#737373]">Mandatory password changes, new device logins, and payout verifications.</div>
                      </div>
                      <span className="text-[11px] font-bold text-[#A3A3A3]">Always On</span>
                    </div>

                    {/* Product Announcements */}
                    <div className="p-4 rounded-xl border border-[#EDEDEB] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#171717]">Product & Platform Announcements</div>
                        <div className="text-[11px] text-[#737373]">New marketplace capabilities, agent protocols, and major updates.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.email_product}
                        onChange={e => setNotifications({ ...notifications, email_product: e.target.checked })}
                        className="w-4 h-4 accent-[#F97316] rounded cursor-pointer"
                      />
                    </div>

                    {/* Marketing & Newsletter */}
                    <div className="p-4 rounded-xl border border-[#EDEDEB] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#171717]">Marketing & Featured Creator Digests</div>
                        <div className="text-[11px] text-[#737373]">Weekly curations of top AI skills and creator community spotlights.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.email_marketing}
                        onChange={e => setNotifications({ ...notifications, email_marketing: e.target.checked })}
                        className="w-4 h-4 accent-[#F97316] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EDEDEB]">
                  <button
                    onClick={handleSavePreferences}
                    disabled={savingPreferences}
                    className="px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    {savingPreferences ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: PRIVACY & DATA */}
            {activeTab === 'privacy' && (
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-[#171717]">Privacy & Personal Data Controls</h2>
                  <p className="text-xs text-[#737373]">Control profile visibility, messaging permissions, and request data archives.</p>
                </div>

                {/* Profile Visibility */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[#171717]">Profile Visibility</label>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        visibility === 'public'
                          ? 'bg-orange-50 border-orange-300 text-[#F97316] shadow-xs'
                          : 'bg-[#FAFAFA] border-[#EDEDEB] text-[#525252]'
                      }`}
                    >
                      Public (Visible to All)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('private')}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        visibility === 'private'
                          ? 'bg-orange-50 border-orange-300 text-[#F97316] shadow-xs'
                          : 'bg-[#FAFAFA] border-[#EDEDEB] text-[#525252]'
                      }`}
                    >
                      Private (Only You)
                    </button>
                  </div>
                </div>

                {/* Discoverability */}
                <div className="p-4 rounded-xl border border-[#EDEDEB] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#171717]">Search Engine & Directory Discoverability</div>
                    <div className="text-[11px] text-[#737373]">Allow search engines and KYRON creators directory to index your public profile.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={discoverable}
                    onChange={e => setDiscoverable(e.target.checked)}
                    className="w-4 h-4 accent-[#F97316] rounded cursor-pointer"
                  />
                </div>

                {/* Messaging Preferences */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#171717]">Who can message you</label>
                  <select
                    value={messaging}
                    onChange={e => setMessaging(e.target.value as any)}
                    className="max-w-md w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] bg-white outline-hidden"
                  >
                    <option value="anyone">Anyone on KYRON</option>
                    <option value="verified">Verified Creators & Buyers only</option>
                    <option value="none">No one (Disables in-app messaging)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSavePrivacy}
                    className="px-4 py-2 rounded-xl bg-[#F97316] text-white text-xs font-bold"
                  >
                    Update Privacy Settings
                  </button>
                </div>

                {/* Data Download / Archive */}
                <div className="pt-6 border-t border-[#EDEDEB] space-y-4">
                  <h3 className="text-sm font-bold text-[#171717]">Download Account Data (GDPR Compliance)</h3>
                  <p className="text-xs text-[#737373] leading-relaxed max-w-xl">
                    Export a copy of all personal information, published creator skills, transactions, and session activity stored in KYRON.
                  </p>
                  <button
                    onClick={handleExportData}
                    disabled={exportingData}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D4D4D0] hover:border-[#171717] bg-white text-xs font-semibold text-[#171717] transition-all shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{exportingData ? 'Generating archive...' : 'Download Personal Data (JSON)'}</span>
                  </button>
                </div>

                {/* Deactivate Account */}
                <div className="pt-6 border-t border-[#EDEDEB] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#171717]">Temporarily Deactivate Account</div>
                    <div className="text-[11px] text-[#737373]">Hide your profile and listings without deleting historical purchases.</div>
                  </div>
                  <button
                    onClick={() => setDeactivateModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Deactivate
                  </button>
                </div>

                {/* Legal Policy Links */}
                <div className="pt-4 border-t border-[#EDEDEB] flex items-center gap-6 text-xs text-[#737373]">
                  <a href="/privacy" className="hover:text-[#171717] underline">Privacy Policy</a>
                  <a href="/terms" className="hover:text-[#171717] underline">Terms of Service</a>
                </div>
              </div>
            )}

            {/* TAB 5: BILLING & INVOICES */}
            {activeTab === 'billing' && (
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
                <div>
                  <h2 className="text-lg font-bold text-[#171717]">Billing, Credits & Invoices</h2>
                  <p className="text-xs text-[#737373]">Inspect your KYRON credit balance, payment receipts, and purchase history.</p>
                </div>

                {/* Credit Balance Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <div className="text-xs uppercase tracking-wider font-mono opacity-80">Platform Balance</div>
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
                      ${user?.credit_balance?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs opacity-90 mt-1">
                      Plan: {billingData?.plan || (user?.is_unlimited_credit_user ? 'KYRON Enterprise' : 'KYRON Pay-As-You-Go')}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCreditModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#F97316] font-bold text-xs hover:bg-orange-50 transition-colors shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Top Up Credits</span>
                  </button>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-[#171717]">Active Payment Channel</h3>
                  <div className="p-4 rounded-xl border border-[#EDEDEB] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[#F97316]" />
                      <div>
                        <div className="font-semibold text-[#171717]">KYRON Platform Balance</div>
                        <div className="text-[11px] text-[#737373]">Direct 1-Click deduction for paid skills and agent execution credits</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">Default</span>
                  </div>
                </div>

                {/* Invoices & Purchase Receipts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#171717]">Purchase Invoices & Receipts</h3>
                    <span className="text-xs text-[#737373]">
                      Total Spent: ${billingData?.total_spent?.toFixed(2) || '0.00'}
                    </span>
                  </div>

                  {loadingBilling ? (
                    <div className="py-8 text-center text-xs text-[#737373]">Loading billing history...</div>
                  ) : billingData?.invoices && billingData.invoices.length > 0 ? (
                    <div className="border border-[#EDEDEB] rounded-xl overflow-hidden divide-y divide-[#EDEDEB] text-xs">
                      {billingData.invoices.map((inv, idx) => (
                        <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAFA] transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#171717]">{inv.id}</span>
                              <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-[10px] font-mono text-[#525252]">
                                {inv.payment_method}
                              </span>
                            </div>
                            <div className="font-medium text-[#171717]">{inv.skill_name}</div>
                            <div className="text-[11px] text-[#737373]">
                              Date: {new Date(inv.date).toLocaleDateString()} • Creator: {inv.creator_name}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 sm:justify-end">
                            <div className="font-mono font-bold text-sm text-[#171717]">
                              {inv.amount > 0 ? `$${inv.amount.toFixed(2)}` : 'FREE'}
                            </div>

                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#D4D4D0] hover:border-[#171717] text-[11px] font-semibold text-[#171717] bg-white"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>View Receipt</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-[#D4D4D0] rounded-xl text-xs text-[#737373]">
                      No purchases or invoices recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: TEAM & WORKSPACE (Preserved from TeamSettingsPage) */}
            {activeTab === 'team' && (
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#171717]">Team & Workspace Access</h2>
                    <p className="text-xs text-[#737373]">Manage team members, developers, and autonomous agent service principals.</p>
                  </div>

                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F97316] text-white text-xs font-bold hover:bg-[#EA580C] shadow-xs self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Invite Member</span>
                  </button>
                </div>

                {/* Team Members List */}
                <div className="border border-[#EDEDEB] rounded-xl overflow-hidden divide-y divide-[#EDEDEB] text-xs">
                  {members.map(member => (
                    <div key={member.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-orange-100 text-[#F97316] flex items-center justify-center font-bold">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#171717] flex items-center gap-2">
                            <span>{member.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-[10px] font-mono text-[#525252]">
                              {member.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#737373]">{member.email} • {member.security}</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#A3A3A3]">
                        {member.last_active}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* CHANGE EMAIL MODAL */}
      {/* ======================================================== */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E8E6] shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#171717]">Change Registered Email</h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-[#737373] hover:text-[#171717]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="new.email@company.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D4D4D0] text-xs font-semibold text-[#737373]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingEmail || !newEmail}
                  className="px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold disabled:opacity-50"
                >
                  {changingEmail ? 'Updating...' : 'Save New Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2FA CONFIGURATION MODAL */}
      {/* ======================================================== */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E8E6] shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#171717]">Two-Factor Authentication Setup</h3>
              <button onClick={() => setShow2FAModal(false)} className="text-[#737373] hover:text-[#171717]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#525252] leading-relaxed">
              Scan this QR key in your authenticator app (Google Authenticator, Authy, or 1Password) to enable TOTP secondary verification.
            </p>

            <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-xl text-center space-y-2">
              <div className="font-mono text-xs font-bold text-zinc-900 select-all p-2 bg-white rounded border">
                KYRON-MFA-9821-X489-A712
              </div>
              <div className="text-[11px] text-zinc-500">Security Key for Manual Setup</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setTwoFactorEnabled(!twoFactorEnabled);
                  setShow2FAModal(false);
                  setFeedback({ type: 'success', message: twoFactorEnabled ? '2FA disabled.' : 'Two-factor authentication successfully configured!' });
                }}
                className="px-4 py-2 rounded-xl bg-[#F97316] text-white text-xs font-bold"
              >
                {twoFactorEnabled ? 'Disable 2FA' : 'Confirm 2FA Enabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* INVOICE DETAIL RECEIPT MODAL */}
      {/* ======================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E8E8E6] shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#EDEDEB] pb-4">
              <div>
                <span className="text-xs uppercase font-mono text-[#737373]">Receipt / Invoice</span>
                <h3 className="text-lg font-bold text-[#171717]">{selectedInvoice.id}</h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-[#737373] hover:text-[#171717]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-[#F4F4F5]">
                <span className="text-[#737373]">Purchased Item</span>
                <span className="font-semibold text-[#171717]">{selectedInvoice.skill_name}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#F4F4F5]">
                <span className="text-[#737373]">Creator / Publisher</span>
                <span className="text-[#171717]">{selectedInvoice.creator_name}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#F4F4F5]">
                <span className="text-[#737373]">Date of Acquisition</span>
                <span className="text-[#171717]">{new Date(selectedInvoice.date).toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#F4F4F5]">
                <span className="text-[#737373]">Payment Channel</span>
                <span className="font-mono text-[#171717]">{selectedInvoice.payment_method}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-[#F4F4F5]">
                <span className="text-[#737373]">License Key</span>
                <span className="font-mono font-bold text-[#F97316] select-all">{selectedInvoice.license_key}</span>
              </div>

              <div className="flex justify-between py-2 text-sm font-bold pt-3">
                <span>Total Amount</span>
                <span className="font-mono text-[#171717]">
                  {selectedInvoice.amount > 0 ? `$${selectedInvoice.amount.toFixed(2)} USD` : 'FREE (1-Click)'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-[#F8F8F7] hover:bg-[#F0F0EF] border border-[#D4D4D0] text-xs font-semibold text-[#171717]"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DEACTIVATE ACCOUNT CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {deactivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-300 shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-zinc-900">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold">Temporarily Deactivate Account?</h3>
            </div>
            <p className="text-xs text-[#525252] leading-relaxed">
              Your profile, storefront, and marketplace listings will be hidden from public view. You can reactivate your account at any time by signing in again.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeactivateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateAccount}
                disabled={deactivating}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold"
              >
                {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PERMANENT DELETE ACCOUNT MODAL */}
      {/* ======================================================== */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-rose-300 shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-950">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Permanently Delete Account</h3>
            </div>

            <p className="text-xs text-[#525252] leading-relaxed">
              This action cannot be undone. All your purchased licenses, credit balances, published skills, and profile data will be permanently wiped.
            </p>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-[#171717]">
                Type your username <span className="font-mono text-rose-600 select-all">@{user?.username}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={e => setDeleteConfirmationInput(e.target.value)}
                placeholder={user?.username}
                className="w-full px-3.5 py-2 rounded-xl border border-rose-300 focus:border-rose-600 text-sm font-mono text-[#171717] outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#D4D4D0] text-xs font-semibold text-[#525252]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmationInput !== user?.username}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TEAM INVITE MODAL */}
      {/* ======================================================== */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E8E6] shadow-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#171717]">Invite Workspace Member</h3>
              <button onClick={() => setInviteModalOpen(false)} className="text-[#737373] hover:text-[#171717]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="collaborator@company.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] bg-white outline-hidden"
                >
                  <option value="Admin">Admin (Full Workspace Access)</option>
                  <option value="Developer">Developer (Deploy & Execute Skills)</option>
                  <option value="Viewer">Viewer (Read-only)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#D4D4D0] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (inviteEmail) {
                    setMembers([
                      ...members,
                      {
                        id: 'm_' + Date.now(),
                        name: inviteEmail.split('@')[0],
                        email: inviteEmail,
                        role: inviteRole as any,
                        type: 'human',
                        security: 'Pending Invite',
                        status: 'Invited',
                        last_active: 'Just now'
                      }
                    ]);
                    setInviteEmail('');
                    setInviteModalOpen(false);
                    setFeedback({ type: 'success', message: `Invitation sent to ${inviteEmail}` });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#F97316] text-white text-xs font-bold"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

