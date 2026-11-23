import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext.tsx';
import { api } from '../utils/api.ts';
import { Skill, UserPurchase } from '../types.ts';

export type InstallationStatus = 'idle' | 'installing' | 'installed' | 'error';

interface InstalledSkillsContextType {
  installedSkillIds: Set<string>;
  isSkillInstalled: (skillId?: string, slug?: string) => boolean;
  isSkillInstalling: (skillId?: string, slug?: string) => boolean;
  getSkillError: (skillId?: string, slug?: string) => string | null;
  getInstallationStatus: (skillId?: string, slug?: string, serverInstalled?: boolean) => InstallationStatus;
  installSkill: (
    skill: { id: string; slug: string; name: string; pricing_type?: string; price?: number },
    targetAgent?: string
  ) => Promise<{ success: boolean; message: string; download_url?: string }>;
  markSkillInstalled: (skillId: string, slug?: string) => void;
  refreshLibrary: () => Promise<void>;
  isLoading: boolean;
}

const InstalledSkillsContext = createContext<InstalledSkillsContextType | undefined>(undefined);

export function InstalledSkillsProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const [installedSkillIds, setInstalledSkillIds] = useState<Set<string>>(new Set());
  const [installingSkillIds, setInstallingSkillIds] = useState<Set<string>>(new Set());
  const [skillErrors, setSkillErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch verified user library from database whenever authenticated user changes
  const refreshLibrary = useCallback(async () => {
    if (!user) {
      setInstalledSkillIds(new Set());
      setSkillErrors({});
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.getMyLibrary();
      const purchases: UserPurchase[] = res.purchases || res.library || [];
      const idSet = new Set<string>();

      for (const p of purchases) {
        if (p.skill_id) idSet.add(p.skill_id);
        if (p.skill_slug) idSet.add(p.skill_slug);
        if ((p as any).slug) idSet.add((p as any).slug);
      }

      setInstalledSkillIds(idSet);
    } catch (err) {
      console.warn('Failed to load user skill library:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  const markSkillInstalled = useCallback((skillId: string, slug?: string) => {
    setInstalledSkillIds(prev => {
      const next = new Set(prev);
      if (skillId) next.add(skillId);
      if (slug) next.add(slug);
      return next;
    });
    setSkillErrors(prev => {
      const next = { ...prev };
      if (skillId) delete next[skillId];
      if (slug) delete next[slug];
      return next;
    });
  }, []);

  const isSkillInstalled = useCallback((skillId?: string, slug?: string): boolean => {
    if (!skillId && !slug) return false;
    return (skillId ? installedSkillIds.has(skillId) : false) || (slug ? installedSkillIds.has(slug) : false);
  }, [installedSkillIds]);

  const isSkillInstalling = useCallback((skillId?: string, slug?: string): boolean => {
    if (!skillId && !slug) return false;
    return (skillId ? installingSkillIds.has(skillId) : false) || (slug ? installingSkillIds.has(slug) : false);
  }, [installingSkillIds]);

  const getSkillError = useCallback((skillId?: string, slug?: string): string | null => {
    if (skillId && skillErrors[skillId]) return skillErrors[skillId];
    if (slug && skillErrors[slug]) return skillErrors[slug];
    return null;
  }, [skillErrors]);

  const getInstallationStatus = useCallback((
    skillId?: string,
    slug?: string,
    serverInstalled?: boolean
  ): InstallationStatus => {
    if (isSkillInstalling(skillId, slug)) return 'installing';
    if (isSkillInstalled(skillId, slug) || serverInstalled) return 'installed';
    if (getSkillError(skillId, slug)) return 'error';
    return 'idle';
  }, [isSkillInstalling, isSkillInstalled, getSkillError]);

  /**
   * Unified Skill Installation Action
   * 1. Validates auth & prevents concurrent clicks
   * 2. Calls backend unified installation endpoint
   * 3. Validates response
   * 4. Triggers genuine package download of verified ZIP
   * 5. Updates shared state across Marketplace cards & details pages
   */
  const installSkill = useCallback(async (
    skill: { id: string; slug: string; name: string; pricing_type?: string; price?: number },
    targetAgent: string = 'generic'
  ): Promise<{ success: boolean; message: string; download_url?: string }> => {
    const key = skill.id;

    // Prevent duplicate in-flight installation requests
    if (installingSkillIds.has(key)) {
      return { success: false, message: 'Installation already in progress' };
    }

    // Set installing state
    setInstallingSkillIds(prev => new Set(prev).add(key));
    setSkillErrors(prev => {
      const next = { ...prev };
      delete next[key];
      delete next[skill.slug];
      return next;
    });

    try {
      // 1. Invoke unified backend installation endpoint
      const res = await api.installSkill(skill.id, { targetAgent });

      if (!res.success && res.status !== 'installed' && res.status !== 'already_installed') {
        throw new Error(res.message || 'Installation could not be confirmed by the server.');
      }

      // 2. Mark installed in shared context immediately
      markSkillInstalled(skill.id, skill.slug);

      // 3. Trigger genuine browser download of verified package (.zip)
      const downloadUrl = res.package?.download_url || api.getZipDownloadUrl(skill.slug);
      try {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `${skill.slug}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (dlErr) {
        console.warn('Direct package download trigger notice:', dlErr);
      }

      // 4. Refresh user credits if paid
      if (skill.pricing_type === 'paid' && Number(skill.price || 0) > 0) {
        await refreshUser().catch(() => {});
      }

      return {
        success: true,
        message: res.message || `Skill "${skill.name}" successfully installed!`,
        download_url: downloadUrl
      };
    } catch (err: any) {
      const message = err.message || 'Skill installation failed. Please retry.';
      setSkillErrors(prev => ({
        ...prev,
        [key]: message,
        [skill.slug]: message
      }));
      throw err;
    } finally {
      setInstallingSkillIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [installingSkillIds, markSkillInstalled, refreshUser]);

  const value = {
    installedSkillIds,
    isSkillInstalled,
    isSkillInstalling,
    getSkillError,
    getInstallationStatus,
    installSkill,
    markSkillInstalled,
    refreshLibrary,
    isLoading
  };

  return (
    <InstalledSkillsContext.Provider value={value}>
      {children}
    </InstalledSkillsContext.Provider>
  );
}

export function useInstalledSkills() {
  const context = useContext(InstalledSkillsContext);
  if (!context) {
    throw new Error('useInstalledSkills must be used within an InstalledSkillsProvider');
  }
  return context;
}
