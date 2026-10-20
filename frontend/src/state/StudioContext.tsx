// SPDX-License-Identifier: MIT
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { studioClient } from '../data/client';
import type { Account, Project, Settings } from '../domain/types';

interface StudioState { account: Account | null; settings: Settings | null; projects: Project[]; loading: boolean; error: string; refresh: () => Promise<void>; signIn: (id?: string) => Promise<void>; signOut: () => Promise<void>; }
const Context = createContext<StudioState | null>(null);
export function StudioProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const user = await studioClient.getSession();
      if (!user) { setAccount(null); setProjects([]); setSettings(null); return; }
      const [preferences, work] = await Promise.all([studioClient.getSettings(), studioClient.listProjects()]);
      const current = await studioClient.getSession();
      if (current?.id !== user.id) return;
      setAccount(user); setSettings(preferences); setProjects(work); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open browser storage.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const signIn = useCallback(async (id?: string) => { setLoading(true); setAccount(null); setSettings(null); setProjects([]); await studioClient.signInDemo(id); await refresh(); }, [refresh]);
  const signOut = useCallback(async () => { await studioClient.signOut(); setAccount(null); setSettings(null); setProjects([]); }, []);
  return <Context.Provider value={{ account, settings, projects, loading, error, refresh, signIn, signOut }}>{children}</Context.Provider>;
}
export function useStudio() { const value = useContext(Context); if (!value) throw new Error('StudioProvider is missing'); return value; }
