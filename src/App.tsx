import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { TabType } from './types';
import { TABS } from './navigation/navigationConfig';
import { Navbar } from './components/layout/Navbar';
import { HabitsPage } from './pages/HabitsPage';
import { TasksPage } from './pages/TasksPage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { GoalsPage } from './pages/GoalsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { useSwipe } from './hooks/useSwipe';
import { StorageService } from './storage/db';
import { getTodayString } from './utils/dateUtils';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { SyncService } from './sync/syncService';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('habits');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    const applySettings = (theme?: 'dark' | 'light') => {
      document.documentElement.classList.toggle('theme-light', theme === 'light');
      document.body.classList.toggle('theme-light', theme === 'light');
    };

    StorageService.getSettings().then(async (settings) => {
      const current = settings ?? { theme: 'dark' as const, notifications: false, compactView: false };
      if (!current.firstUseDate) {
        current.firstUseDate = getTodayString();
        await StorageService.saveSettings(current);
      }
      applySettings(current.theme);
    }).catch(() => applySettings('dark'));

    const handler = (event: Event) => {
      const theme = (event as CustomEvent<{ theme?: 'dark' | 'light' }>).detail?.theme;
      applySettings(theme ?? 'dark');
    };
    window.addEventListener('constancia-settings-changed', handler);
    return () => window.removeEventListener('constancia-settings-changed', handler);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthLoading(false);
    }).catch(() => {
      if (active) setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const sync = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      void SyncService.sync().catch((error) => {
        console.error('Sincronização do Constância falhou:', error);
      });
    };

    const handleLocalChange = () => sync();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') sync();
    };

    sync();
    window.addEventListener('constancia-local-data-changed', handleLocalChange);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = window.setInterval(sync, 60_000);

    return () => {
      window.removeEventListener('constancia-local-data-changed', handleLocalChange);
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, [session?.user.id]);

  const currentIndex = TABS.findIndex((t) => t.id === activeTab);

  const goToNextTab = () => {
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
    }
  };

  const goToPrevTab = () => {
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
    }
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNextTab,
    onSwipeRight: goToPrevTab,
    minSwipeDistance: 40,
  });

  if (isSupabaseConfigured && authLoading) {
    return (
      <div className="min-h-screen bg-surface-bg text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto rounded-xl bg-brand-subtle border border-brand-border animate-pulse" />
          <p className="text-xs text-gray-500 mt-3">Carregando sua conta...</p>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <AuthPage onAuthenticated={() => setAuthLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-surface-bg text-gray-100 flex flex-col">
      <main
        {...swipeHandlers}
        className="app-main flex-1 max-w-md w-full mx-auto px-4 pb-24 touch-pan-y overflow-y-auto overscroll-x-none"
      >
        <div className="transition-opacity duration-150 ease-in-out">
          {activeTab === 'habits' && <HabitsPage />}
          {activeTab === 'tasks' && <TasksPage />}
          {activeTab === 'workouts' && <WorkoutsPage />}
          {activeTab === 'goals' && <GoalsPage />}
          {activeTab === 'profile' && <ProfilePage />}
        </div>
      </main>

      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;
