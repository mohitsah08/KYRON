import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { Skill, CreatorPortfolioItem, SocialLinks } from '../types.ts';
import { SkillCard } from '../components/SkillCard.tsx';
import { initialsFor, validateUsername, validateFullName } from '../utils/authHelpers.ts';
import {
  User,
  Camera,
  MapPin,
  Globe,
  Calendar,
  Share2,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Briefcase,
  Layers,
  Building,
  Plus,
  Trash2,
  X,
  Save,
  Check,
  Eye,
  Store,
  Shield,
  HelpCircle
} from 'lucide-react';

export function MyProfilePage() {
  const { navigate } = useRouter();
  const { user, refreshUser, updateProfile, uploadAvatar, uploadCoverImage } = useAuth();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'overview' | 'professional' | 'creator' | 'library'>('overview');

  // Creator skills loaded from marketplace
  const [publishedSkills, setPublishedSkills] = useState<Skill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTab, setEditTab] = useState<'basic' | 'role' | 'creator' | 'social'>('basic');

  // Form fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phone, setPhone] = useState('');
  
  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // Role info
  const [roleType, setRoleType] = useState<'individual' | 'agency_owner' | 'agency_member' | 'client'>('individual');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [skillsExpertise, setSkillsExpertise] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState('');

  // Agency fields
  const [agencyName, setAgencyName] = useState('');
  const [agencyWebsite, setAgencyWebsite] = useState('');
  const [agencyDescription, setAgencyDescription] = useState('');
  const [agencyTeamSize, setAgencyTeamSize] = useState('');
  const [agencyDesignation, setAgencyDesignation] = useState('');

  // Client fields
  const [companyName, setCompanyName] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');

  // Creator Mode fields
  const [creatorModeEnabled, setCreatorModeEnabled] = useState(false);
  const [creatorDisplayName, setCreatorDisplayName] = useState('');
  const [creatorHeadline, setCreatorHeadline] = useState('');
  const [creatorBio, setCreatorBio] = useState('');
  const [creatorSkills, setCreatorSkills] = useState<string[]>([]);
  const [newCreatorSkillInput, setNewCreatorSkillInput] = useState('');

  // Form UX state
  const [usernameStatus, setUsernameStatus] = useState<{ checking: boolean; available?: boolean; reason?: string }>({ checking: false });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState<'avatar' | 'cover' | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state from auth user
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || (user.display_name?.split(' ')[0] || ''));
      setLastName(user.last_name || (user.display_name?.split(' ').slice(1).join(' ') || ''));
      setDisplayName(user.display_name || user.full_name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setWebsiteUrl(user.website_url || '');
      setPhone(user.phone || '');
      setSocialLinks(user.social_links || {});

      setRoleType((user.role_type as any) || 'individual');
      setProfessionalTitle(user.professional_title || '');
      setSkillsExpertise(user.skills_expertise || []);
      setYearsExperience(user.years_experience || 0);
      setServicesOffered(user.services_offered || []);

      setAgencyName(user.agency_name || '');
      setAgencyWebsite(user.agency_website || '');
      setAgencyDescription(user.agency_description || '');
      setAgencyTeamSize(user.agency_team_size || '');
      setAgencyDesignation(user.agency_designation || '');

      setCompanyName(user.company_name || '');
      setCompanyIndustry(user.company_industry || '');
      setCompanySize(user.company_size || '');

      setCreatorModeEnabled(Boolean(user.creator_mode_enabled));
      setCreatorDisplayName(user.creator_display_name || user.display_name || '');
      setCreatorHeadline(user.creator_headline || user.professional_title || '');
      setCreatorBio(user.creator_bio || user.bio || '');
      setCreatorSkills(user.creator_skills || []);
    }
  }, [user]);

  // Load published marketplace skills
  useEffect(() => {
    let cancelled = false;
    async function loadSkills() {
      if (!user?.username) return;
      try {
        setLoadingSkills(true);
        const res = await api.getSkills({ creator: user.username });
        if (!cancelled) {
          setPublishedSkills(res.skills || []);
        }
      } catch (err) {
        console.warn('Failed to load published skills:', err);
      } finally {
        if (!cancelled) setLoadingSkills(false);
      }
    }
    loadSkills();
    return () => { cancelled = true; };
  }, [user?.username]);

  // Debounced username availability check
  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameStatus({ checking: false, available: true });
      return;
    }

    const formatErr = validateUsername(username);
    if (formatErr) {
      setUsernameStatus({ checking: false, available: false, reason: formatErr });
      return;
    }

    setUsernameStatus({ checking: true });
    const timer = setTimeout(async () => {
      try {
        const res = await api.checkUsername(username, user?.id);
        setUsernameStatus({ checking: false, available: res.available, reason: res.reason });
      } catch {
        setUsernameStatus({ checking: false });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, user?.username, user?.id]);

  // Handle Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage('avatar');
      setFeedback(null);
      await uploadAvatar(file);
      await refreshUser();
      setFeedback({ type: 'success', message: 'Profile photo updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to upload profile photo.' });
    } finally {
      setUploadingImage(null);
    }
  };

  // Handle Remove Avatar
  const handleRemoveAvatar = async () => {
    try {
      setUploadingImage('avatar');
      await updateProfile({ avatar_url: '' });
      await refreshUser();
      setFeedback({ type: 'success', message: 'Profile photo removed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove photo.' });
    } finally {
      setUploadingImage(null);
    }
  };

  // Handle Cover Upload
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage('cover');
      setFeedback(null);
      await uploadCoverImage(file);
      await refreshUser();
      setFeedback({ type: 'success', message: 'Cover image updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to upload cover image.' });
    } finally {
      setUploadingImage(null);
    }
  };

  // Handle Remove Cover
  const handleRemoveCover = async () => {
    try {
      setUploadingImage('cover');
      await updateProfile({ cover_image_url: '' });
      await refreshUser();
      setFeedback({ type: 'success', message: 'Cover image removed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove cover image.' });
    } finally {
      setUploadingImage(null);
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Validation
    const computedDisplayName = displayName.trim() || `${firstName} ${lastName}`.trim() || user?.display_name || 'KYRON User';
    const nameErr = validateFullName(computedDisplayName);
    if (nameErr) {
      setFeedback({ type: 'error', message: nameErr });
      setSaving(false);
      return;
    }

    if (usernameStatus.available === false) {
      setFeedback({ type: 'error', message: usernameStatus.reason || 'Please pick an available username.' });
      setSaving(false);
      return;
    }

    try {
      // 1. Update core profile
      await api.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: computedDisplayName,
        full_name: computedDisplayName,
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        location: location.trim(),
        website_url: websiteUrl.trim(),
        phone: phone.trim(),
        social_links: socialLinks,
      });

      // 2. Update role profile
      await api.updateRoleProfile({
        role_type: roleType,
        professional_title: professionalTitle.trim(),
        skills_expertise: skillsExpertise,
        years_experience: Number(yearsExperience) || 0,
        services_offered: servicesOffered,
        agency_name: agencyName.trim(),
        agency_website: agencyWebsite.trim(),
        agency_description: agencyDescription.trim(),
        agency_team_size: agencyTeamSize.trim(),
        agency_designation: agencyDesignation.trim(),
        company_name: companyName.trim(),
        company_industry: companyIndustry.trim(),
        company_size: companySize.trim()
      });

      // 3. Update creator details
      await api.updateCreatorProfileFull({
        creator_mode_enabled: creatorModeEnabled,
        creator_display_name: creatorDisplayName.trim() || computedDisplayName,
        creator_headline: creatorHeadline.trim() || professionalTitle.trim(),
        creator_bio: creatorBio.trim() || bio.trim(),
        creator_skills: creatorSkills
      });

      await refreshUser();
      setIsEditModalOpen(false);
      setFeedback({ type: 'success', message: 'Profile saved successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  // Copy Profile Link
  const handleShareProfile = () => {
    const url = `${window.location.origin}/creators/${user?.username || ''}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const memberSince = user?.created_at && !Number.isNaN(Date.parse(user.created_at))
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : 'Recent Member';

  const userInitial = initialsFor(user?.display_name || user?.full_name || 'K');

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#171717] pb-16">
      {/* Toast Notification */}
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
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Profile Card Container with Cover Banner */}
        <div className="bg-white border border-[#E8E8E6] rounded-2xl overflow-hidden shadow-xs mb-8">
          
          {/* Cover Image Banner */}
          <div className="relative h-48 sm:h-64 lg:h-72 w-full bg-gradient-to-r from-orange-400 via-amber-500 to-rose-500 overflow-hidden group">
            {user?.cover_image_url ? (
              <img 
                src={user.cover_image_url} 
                alt="Profile Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30 pattern-dots" />
            )}

            {/* Cover Action Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium backdrop-blur transition-all shadow-sm">
                <Camera className="w-3.5 h-3.5" />
                <span>{user?.cover_image_url ? 'Change Cover' : 'Upload Cover'}</span>
                <input 
                  type="file" 
                  accept="image/png,image/jpeg,image/webp" 
                  className="hidden" 
                  onChange={handleCoverChange}
                  disabled={uploadingImage === 'cover'}
                />
              </label>

              {user?.cover_image_url && (
                <button
                  onClick={handleRemoveCover}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white text-xs backdrop-blur transition-all shadow-sm"
                  title="Remove cover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Profile Header Main Info Bar */}
          <div className="px-6 sm:px-8 pb-8 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20 mb-6">
              
              {/* Avatar + Main Identity */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                {/* Profile Photo */}
                <div className="relative group shrink-0">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-white p-1.5 shadow-md border border-[#EDEDEB] overflow-hidden">
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.display_name} 
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-3xl sm:text-4xl">
                        {userInitial}
                      </div>
                    )}
                  </div>

                  {/* Avatar Upload / Edit Overlay */}
                  <label 
                    className="absolute bottom-2 right-2 p-2 rounded-xl bg-[#F97316] text-white hover:bg-[#EA580C] shadow-md cursor-pointer transition-transform hover:scale-105"
                    title="Change profile photo"
                  >
                    <Camera className="w-4 h-4" />
                    <input 
                      type="file" 
                      accept="image/png,image/jpeg,image/webp" 
                      className="hidden" 
                      onChange={handleAvatarChange}
                      disabled={uploadingImage === 'avatar'}
                    />
                  </label>

                  {user?.avatar_url && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-rose-600 hover:bg-rose-50 shadow-xs border border-rose-200 text-xs transition-all"
                      title="Remove profile photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Name & Titles */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
                      {user?.display_name || 'KYRON Creator'}
                    </h1>
                    {user?.creator_verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-orange-50 border border-orange-200/60 text-[#F97316] text-xs font-semibold">
                        <Shield className="w-3.5 h-3.5 fill-[#F97316]/20" />
                        Verified
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-[#525252] font-mono text-xs font-medium">
                      @{user?.username || 'user'}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-[#737373] max-w-xl">
                    {user?.professional_title || (user?.role_type === 'agency_owner' ? 'Agency Founder' : 'AI Engineer & Agent Designer')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#D4D4D0] hover:border-[#171717] text-[#171717] text-sm font-medium transition-all shadow-xs"
                >
                  <Edit3 className="w-4 h-4 text-[#737373]" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => navigate(`/creators/${user?.username || ''}`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#D4D4D0] hover:border-[#171717] text-[#171717] text-sm font-medium transition-all shadow-xs"
                >
                  <Eye className="w-4 h-4 text-[#737373]" />
                  <span>Preview Public</span>
                </button>

                <button
                  onClick={handleShareProfile}
                  className="p-2.5 rounded-xl bg-white border border-[#D4D4D0] hover:border-[#171717] text-[#525252] hover:text-[#171717] transition-all shadow-xs"
                  title="Copy Profile Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bio Paragraph */}
            {user?.bio ? (
              <p className="text-sm text-[#404040] leading-relaxed max-w-3xl mb-6">
                {user.bio}
              </p>
            ) : (
              <div className="mb-6 p-4 rounded-xl bg-orange-50/50 border border-orange-100 flex items-center justify-between gap-4">
                <div className="text-xs text-orange-900">
                  <span className="font-semibold">Add a bio to your profile</span> — help clients, collaborators, and users learn about your skills and workflow expertise.
                </div>
                <button 
                  onClick={() => { setIsEditModalOpen(true); setEditTab('basic'); }}
                  className="text-xs font-semibold text-[#EA580C] hover:underline shrink-0"
                >
                  Write bio
                </button>
              </div>
            )}

            {/* Metadata Bar (Location, Website, Social, Joined) */}
            <div className="pt-4 border-t border-[#EDEDEB] flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-[#737373]">
              {user?.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#A3A3A3]" />
                  <span>{user.location}</span>
                </div>
              )}

              {user?.website_url && (
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#A3A3A3]" />
                  <a 
                    href={user.website_url.startsWith('http') ? user.website_url : `https://${user.website_url}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#F97316] hover:underline font-mono"
                  >
                    {user.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              {user?.social_links?.github && (
                <a 
                  href={`https://github.com/${user.social_links.github.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#171717] flex items-center gap-1 transition-colors"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3 text-[#A3A3A3]" />
                </a>
              )}

              {user?.social_links?.linkedin && (
                <a 
                  href={user.social_links.linkedin.startsWith('http') ? user.social_links.linkedin : `https://linkedin.com/in/${user.social_links.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#171717] flex items-center gap-1 transition-colors"
                >
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3 text-[#A3A3A3]" />
                </a>
              )}

              {user?.social_links?.twitter && (
                <a 
                  href={`https://x.com/${user.social_links.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#171717] flex items-center gap-1 transition-colors"
                >
                  <span>X / Twitter</span>
                  <ExternalLink className="w-3 h-3 text-[#A3A3A3]" />
                </a>
              )}

              <div className="flex items-center gap-1.5 ml-auto text-[#A3A3A3]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Member since {memberSince}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-[#E8E8E6] mb-8">
          <div className="flex gap-2 sm:gap-6 -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-[#F97316] text-[#171717]'
                  : 'border-transparent text-[#737373] hover:text-[#171717]'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('professional')}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'professional'
                  ? 'border-[#F97316] text-[#171717]'
                  : 'border-transparent text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Role & Expertise</span>
              <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-[10px] text-zinc-600 font-mono capitalize">
                {user?.role_type || 'individual'}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('creator')}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'creator'
                  ? 'border-[#F97316] text-[#171717]'
                  : 'border-transparent text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Creator Storefront</span>
              {user?.creator_mode_enabled && (
                <span className="px-1.5 py-0.2 rounded bg-orange-100 text-[10px] text-[#F97316] font-bold">
                  ACTIVE
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'library'
                  ? 'border-[#F97316] text-[#171717]'
                  : 'border-transparent text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Published Skills</span>
              <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 text-[10px] text-zinc-600 font-mono">
                {publishedSkills.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:block">
            <button
              onClick={() => navigate('/settings')}
              className="text-xs font-semibold text-[#737373] hover:text-[#171717] transition-colors"
            >
              Account & Security Settings →
            </button>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Main profile narrative */}
            <div className="lg:col-span-2 space-y-6">
              {/* About card */}
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 shadow-xs">
                <h2 className="text-base font-bold text-[#171717] mb-3">About</h2>
                <p className="text-sm text-[#525252] leading-relaxed whitespace-pre-wrap">
                  {user?.bio || 'No public biography provided yet. Edit your profile to share your background with clients and the community.'}
                </p>
              </div>

              {/* Skills & Specialization Tags */}
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#171717]">Skills & Expertise</h2>
                  <button 
                    onClick={() => { setIsEditModalOpen(true); setEditTab('role'); }}
                    className="text-xs text-[#F97316] hover:underline font-medium"
                  >
                    Add Skills
                  </button>
                </div>

                {user?.skills_expertise && user.skills_expertise.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.skills_expertise.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-lg bg-[#F8F8F7] border border-[#E8E8E6] text-xs font-medium text-[#171717]">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#A3A3A3]">No skills added yet.</p>
                )}
              </div>

              {/* Services Offered */}
              {user?.services_offered && user.services_offered.length > 0 && (
                <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 shadow-xs">
                  <h2 className="text-base font-bold text-[#171717] mb-4">Services Offered</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {user.services_offered.map((srv, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E8E8E6] flex items-center gap-2.5 text-xs font-medium text-[#171717]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{srv}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Quick stats & verified identity */}
            <div className="space-y-6">
              {/* Account Quick Card */}
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#171717]">Account Verification</h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-[#F4F4F5]">
                    <span className="text-[#737373]">Email Address</span>
                    <span className="font-mono text-[#171717]">{user?.email}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-[#F4F4F5]">
                    <span className="text-[#737373]">Account Type</span>
                    <span className="font-semibold capitalize text-[#171717]">{user?.role_type || 'Individual'}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-[#F4F4F5]">
                    <span className="text-[#737373]">Creator Mode</span>
                    <span className={`font-semibold ${user?.creator_mode_enabled ? 'text-emerald-600' : 'text-[#737373]'}`}>
                      {user?.creator_mode_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#737373]">Platform Credits</span>
                    <span className="font-mono font-bold text-[#F97316]">${user?.credit_balance?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/settings')}
                  className="w-full py-2.5 rounded-xl bg-[#F8F8F7] hover:bg-[#F0F0EF] text-xs font-semibold text-[#171717] border border-[#E8E8E6] transition-colors"
                >
                  Manage Account Details
                </button>
              </div>

              {/* Creator Mode Banner Card */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/70 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-orange-950">Creator Studio</h4>
                    <p className="text-[11px] text-orange-800">Publish AI skills for agents</p>
                  </div>
                </div>
                <p className="text-xs text-orange-900/80 leading-relaxed mb-4">
                  Turn your agent workflows, prompts, and code packages into verified marketplace skills with 70% revenue share.
                </p>
                <button
                  onClick={() => navigate('/creator-studio')}
                  className="w-full py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  Open Creator Studio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Professional & Role Info */}
        {activeTab === 'professional' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#171717]">Professional Identity</h2>
                  <p className="text-xs text-[#737373]">Customize your profile for clients, teams, and talent agencies.</p>
                </div>
                <button
                  onClick={() => { setIsEditModalOpen(true); setEditTab('role'); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4D4D0] hover:border-[#171717] text-xs font-semibold text-[#171717]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Details</span>
                </button>
              </div>

              {/* Role Type Banner */}
              <div className="p-4 rounded-xl bg-[#F8F8F7] border border-[#E8E8E6] mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E8E8E6] flex items-center justify-center text-[#171717]">
                    {user?.role_type === 'agency_owner' ? <Building className="w-5 h-5 text-indigo-600" /> : <Briefcase className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div>
                    <div className="text-xs text-[#737373] uppercase font-mono tracking-wider">Active Profile Role</div>
                    <div className="text-sm font-bold text-[#171717] capitalize">
                      {user?.role_type === 'agency_owner' ? 'Agency Owner' : (user?.role_type === 'agency_member' ? 'Agency Member' : (user?.role_type === 'client' ? 'Client' : 'Individual Freelancer / Engineer'))}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#737373]">
                  {user?.years_experience ? `${user.years_experience} Years Experience` : 'Experience not specified'}
                </div>
              </div>

              {/* Role Specific Content */}
              {user?.role_type === 'agency_owner' ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#171717]">Agency Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA]">
                      <div className="text-xs text-[#737373] mb-1">Agency Name</div>
                      <div className="text-sm font-semibold text-[#171717]">{user.agency_name || 'Not set'}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA]">
                      <div className="text-xs text-[#737373] mb-1">Team Size</div>
                      <div className="text-sm font-semibold text-[#171717]">{user.agency_team_size || 'Not set'}</div>
                    </div>
                  </div>
                  {user.agency_description && (
                    <div className="p-4 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA]">
                      <div className="text-xs text-[#737373] mb-1">Agency Overview</div>
                      <div className="text-sm text-[#404040] leading-relaxed">{user.agency_description}</div>
                    </div>
                  )}
                </div>
              ) : user?.role_type === 'client' ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-[#171717]">Client / Company Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA]">
                      <div className="text-xs text-[#737373] mb-1">Company Name</div>
                      <div className="text-sm font-semibold text-[#171717]">{user.company_name || 'Not set'}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA]">
                      <div className="text-xs text-[#737373] mb-1">Industry</div>
                      <div className="text-sm font-semibold text-[#171717]">{user.company_industry || 'Not set'}</div>
                    </div>
                    <div className="p-4 rounded-xl border border-[#EDEDEB] bg-[#FAFAFA]">
                      <div className="text-xs text-[#737373] mb-1">Company Size</div>
                      <div className="text-sm font-semibold text-[#171717]">{user.company_size || 'Not set'}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-[#171717] mb-2">Primary Specialization</h3>
                    <p className="text-sm text-[#525252]">{user?.professional_title || 'AI Agent Specialist & Workflow Developer'}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#171717] mb-3">Skills & Toolsets</h3>
                    <div className="flex flex-wrap gap-2">
                      {user?.skills_expertise && user.skills_expertise.length > 0 ? (
                        user.skills_expertise.map((s, i) => (
                          <span key={i} className="px-3 py-1 rounded-lg bg-orange-50 border border-orange-200 text-xs font-medium text-orange-950">
                            {s}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-[#737373]">No skills recorded. Click 'Update Details' to add your competencies.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Creator Storefront */}
        {activeTab === 'creator' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#E8E8E6] rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-[#171717]">Marketplace Storefront</h2>
                  <p className="text-xs text-[#737373]">Your public creator profile where buyers discover and install your published skills.</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/creators/${user?.username || ''}`)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#D4D4D0] hover:border-[#171717] text-xs font-semibold text-[#171717]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Public Storefront</span>
                  </button>

                  <button
                    onClick={() => navigate('/creator-studio')}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Publish Skill</span>
                  </button>
                </div>
              </div>

              {/* Creator Mode Switch State */}
              <div className="p-4 rounded-xl border border-orange-200/60 bg-orange-50/50 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-[#F97316]" />
                  <div>
                    <div className="text-sm font-bold text-[#171717]">Creator Mode {user?.creator_mode_enabled ? 'is Active' : 'is Inactive'}</div>
                    <div className="text-xs text-[#737373]">
                      {user?.creator_mode_enabled 
                        ? 'Your storefront is discoverable in the KYRON marketplace.' 
                        : 'Enable Creator Mode to open your storefront and publish agent tools.'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const next = !user?.creator_mode_enabled;
                    await api.updateCreatorProfileFull({ creator_mode_enabled: next });
                    await refreshUser();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    user?.creator_mode_enabled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-zinc-800 text-white hover:bg-black'
                  }`}
                >
                  {user?.creator_mode_enabled ? 'Active (Turn Off)' : 'Activate Creator Mode'}
                </button>
              </div>

              {/* Published Skills Grid */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#171717]">Published Marketplace Skills ({publishedSkills.length})</h3>

                {loadingSkills ? (
                  <div className="py-12 text-center text-xs text-[#737373]">Loading your skills...</div>
                ) : publishedSkills.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-[#D4D4D0] rounded-xl">
                    <p className="text-sm font-medium text-[#171717] mb-1">No published skills yet</p>
                    <p className="text-xs text-[#737373] mb-4">Create your first skill package in Creator Studio and monetize your agent automations.</p>
                    <button
                      onClick={() => navigate('/creator-studio')}
                      className="px-4 py-2 bg-[#F97316] text-white rounded-lg text-xs font-semibold"
                    >
                      Open Creator Studio
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publishedSkills.map(skill => (
                      <SkillCard key={skill.id} skill={skill} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Published Skills Catalog */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Published Skills ({publishedSkills.length})</h2>
                <p className="text-xs text-[#737373]">Manage your active marketplace listings.</p>
              </div>
              <button
                onClick={() => navigate('/creator-studio')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Skill</span>
              </button>
            </div>

            {loadingSkills ? (
              <div className="py-12 text-center text-xs text-[#737373]">Loading listings...</div>
            ) : publishedSkills.length === 0 ? (
              <div className="bg-white border border-[#E8E8E6] rounded-2xl p-12 text-center max-w-md mx-auto">
                <Store className="w-12 h-12 text-[#F97316] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#171717] mb-1">No skills published yet</h3>
                <p className="text-xs text-[#737373] mb-4">Start publishing your agent tools, prompt recipes, and ZIP packages.</p>
                <button
                  onClick={() => navigate('/creator-studio')}
                  className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-xs font-semibold"
                >
                  Create Skill in Studio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedSkills.map(skill => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* EDIT PROFILE MODAL (Agensi.io / Upwork Reference Design) */}
      {/* ======================================================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white border border-[#E8E8E6] rounded-2xl shadow-2xl my-8 overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#EDEDEB] flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4 text-[#F97316]" />
                <h3 className="text-base font-bold text-[#171717]">Edit Profile</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#E8E8E6] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-Tab Navigator */}
            <div className="flex border-b border-[#EDEDEB] bg-white px-6 gap-6 text-xs font-semibold">
              <button
                onClick={() => setEditTab('basic')}
                className={`py-3 border-b-2 transition-colors ${
                  editTab === 'basic' ? 'border-[#F97316] text-[#171717]' : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                Basic Identity
              </button>

              <button
                onClick={() => setEditTab('role')}
                className={`py-3 border-b-2 transition-colors ${
                  editTab === 'role' ? 'border-[#F97316] text-[#171717]' : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                Role & Expertise
              </button>

              <button
                onClick={() => setEditTab('creator')}
                className={`py-3 border-b-2 transition-colors ${
                  editTab === 'creator' ? 'border-[#F97316] text-[#171717]' : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                Creator Storefront
              </button>

              <button
                onClick={() => setEditTab('social')}
                className={`py-3 border-b-2 transition-colors ${
                  editTab === 'social' ? 'border-[#F97316] text-[#171717]' : 'border-transparent text-[#737373] hover:text-[#171717]'
                }`}
              >
                Social & Contact
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveProfile}>
              <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
                
                {/* TAB 1: BASIC IDENTITY */}
                {editTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="Ada"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] text-sm text-[#171717] outline-hidden transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="Lovelace"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] text-sm text-[#171717] outline-hidden transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Display Name (Public)</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Ada Lovelace"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] text-sm text-[#171717] outline-hidden transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#171717]">Username</label>
                        {usernameStatus.checking && <span className="text-[11px] text-[#737373]">Checking availability...</span>}
                        {!usernameStatus.checking && usernameStatus.available && (
                          <span className="text-[11px] text-emerald-600 font-medium">Username available</span>
                        )}
                        {!usernameStatus.checking && usernameStatus.available === false && (
                          <span className="text-[11px] text-rose-600 font-medium">{usernameStatus.reason}</span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-mono text-[#A3A3A3]">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="adalovelace"
                          className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] text-sm font-mono text-[#171717] outline-hidden transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-[#A3A3A3] mt-1">3–24 lowercase letters, numbers, or underscores.</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#171717]">Bio</label>
                        <span className="text-[10px] text-[#A3A3A3] font-mono">{bio.length}/500</span>
                      </div>
                      <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value.slice(0, 500))}
                        rows={4}
                        placeholder="Tell clients and developers about your agent workflows, systems architecture, and engineering interests..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] text-sm text-[#171717] outline-hidden transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          placeholder="San Francisco, CA"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] text-sm text-[#171717] outline-hidden transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Website URL</label>
                        <input
                          type="text"
                          value={websiteUrl}
                          onChange={e => setWebsiteUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] text-sm text-[#171717] outline-hidden transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ROLE & EXPERTISE */}
                {editTab === 'role' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-2">Account Type / Role</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'individual', label: 'Freelancer' },
                          { id: 'agency_owner', label: 'Agency Owner' },
                          { id: 'agency_member', label: 'Agency Member' },
                          { id: 'client', label: 'Client / Buyer' }
                        ].map(item => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setRoleType(item.id as any)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                              roleType === item.id
                                ? 'bg-orange-50 border-orange-300 text-[#F97316] shadow-xs'
                                : 'bg-[#FAFAFA] border-[#EDEDEB] text-[#525252] hover:border-[#D4D4D0]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Professional Title / Headline</label>
                      <input
                        type="text"
                        value={professionalTitle}
                        onChange={e => setProfessionalTitle(e.target.value)}
                        placeholder="Senior AI Agent Architect & Python Specialist"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Years of Experience</label>
                        <input
                          type="number"
                          value={yearsExperience || 0}
                          onChange={e => setYearsExperience(Number(e.target.value))}
                          min="0"
                          max="50"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Skills tags input */}
                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Skills & Toolsets</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newSkillInput}
                          onChange={e => setNewSkillInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newSkillInput.trim() && !skillsExpertise.includes(newSkillInput.trim())) {
                                setSkillsExpertise([...skillsExpertise, newSkillInput.trim()]);
                                setNewSkillInput('');
                              }
                            }
                          }}
                          placeholder="e.g. LangChain, Claude MCP, Vector Databases (Press Enter)"
                          className="flex-1 px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSkillInput.trim() && !skillsExpertise.includes(newSkillInput.trim())) {
                              setSkillsExpertise([...skillsExpertise, newSkillInput.trim()]);
                              setNewSkillInput('');
                            }
                          }}
                          className="px-3 py-2 bg-[#F8F8F7] border border-[#D4D4D0] rounded-xl text-xs font-semibold text-[#171717]"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {skillsExpertise.map((sk, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-xs text-[#171717]">
                            <span>{sk}</span>
                            <button
                              type="button"
                              onClick={() => setSkillsExpertise(skillsExpertise.filter((_, idx) => idx !== i))}
                              className="text-zinc-400 hover:text-zinc-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Agency Owner Fields */}
                    {roleType === 'agency_owner' && (
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
                        <h4 className="text-xs font-bold text-zinc-900 uppercase">Agency Setup</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Agency Name</label>
                            <input
                              type="text"
                              value={agencyName}
                              onChange={e => setAgencyName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Team Size</label>
                            <input
                              type="text"
                              value={agencyTeamSize}
                              onChange={e => setAgencyTeamSize(e.target.value)}
                              placeholder="e.g. 5–10 engineers"
                              className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Agency Description</label>
                          <textarea
                            value={agencyDescription}
                            onChange={e => setAgencyDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: CREATOR STOREFRONT */}
                {editTab === 'creator' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-orange-950">Enable Creator Mode</div>
                        <div className="text-xs text-orange-800">Allows you to have a public storefront and publish verified skills.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={creatorModeEnabled}
                        onChange={e => setCreatorModeEnabled(e.target.checked)}
                        className="w-5 h-5 accent-[#F97316] rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Creator Storefront Name</label>
                      <input
                        type="text"
                        value={creatorDisplayName}
                        onChange={e => setCreatorDisplayName(e.target.value)}
                        placeholder="Axiom Labs Studio"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Storefront Headline</label>
                      <input
                        type="text"
                        value={creatorHeadline}
                        onChange={e => setCreatorHeadline(e.target.value)}
                        placeholder="High-throughput autonomous tools for Claude and Codex"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Creator Bio</label>
                      <textarea
                        value={creatorBio}
                        onChange={e => setCreatorBio(e.target.value)}
                        rows={3}
                        placeholder="Describe what kind of agent tools and skills your studio builds..."
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: SOCIAL & CONTACT */}
                {editTab === 'social' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#171717] mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+1 (555) 234-5678"
                        className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">LinkedIn Handle / URL</label>
                        <input
                          type="text"
                          value={socialLinks.linkedin || ''}
                          onChange={e => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                          placeholder="linkedin.com/in/username"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">GitHub Username</label>
                        <input
                          type="text"
                          value={socialLinks.github || ''}
                          onChange={e => setSocialLinks({ ...socialLinks, github: e.target.value })}
                          placeholder="octocat"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">X / Twitter Handle</label>
                        <input
                          type="text"
                          value={socialLinks.twitter || ''}
                          onChange={e => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                          placeholder="@username"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#171717] mb-1">Discord Tag / Server</label>
                        <input
                          type="text"
                          value={socialLinks.discord || ''}
                          onChange={e => setSocialLinks({ ...socialLinks, discord: e.target.value })}
                          placeholder="username#1234 or invite"
                          className="w-full px-3.5 py-2 rounded-xl border border-[#D4D4D0] focus:border-[#F97316] text-sm text-[#171717] outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer Controls */}
              <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#EDEDEB] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D4D4D0] bg-white hover:bg-[#F4F4F5] text-xs font-semibold text-[#525252] transition-colors"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving || usernameStatus.available === false}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

