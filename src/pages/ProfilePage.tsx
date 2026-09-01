import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArchiveRestore,
  Bell,
  CalendarDays,
  Camera,
  ChevronRight,
  Download,
  Edit3,
  HardDrive,
  Moon,
  Sun,
  Upload,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import type { Habit, Task, UserProfile, UserSettings, WorkoutSession, WorkoutTemplate } from '../types';
import { StorageService, type BackupData } from '../storage/db';
import { getTodayString, addDays, getDayOfWeekFromYYYYMMDD } from '../utils/dateUtils';
import { isHabitScheduledForDate } from '../utils/streakUtils';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PROFILE_ID = 'main_profile';
const DEFAULT_PROFILE: UserProfile = {
  id: PROFILE_ID,
  name: 'Atleta / Estudante',
  bio: 'Atleta / Estudante',
  createdAt: new Date().toISOString(),
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  notifications: false,
  compactView: false,
};

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

interface DayScore {
  date: string;
  score: number | null;
  tasksDone: number;
  tasksTotal: number;
  habitsDone: number;
  habitsTotal: number;
  workoutDone: boolean;
  workoutScheduled: boolean;
}

const getDayScore = (
  date: string,
  habits: Habit[],
  tasks: Task[],
  templates: WorkoutTemplate[],
  sessions: WorkoutSession[],
): DayScore => {
  const dayOfWeek = getDayOfWeekFromYYYYMMDD(date);
  const dayTasks = tasks.filter((task) => task.date === date);
  const scheduledHabits = habits.filter((habit) => !habit.archived && isHabitScheduledForDate(habit, date));
  const completedHabits = scheduledHabits.filter((habit) => habit.completedDates.includes(date));
  const template = templates.find((item) => item.dayOfWeek === dayOfWeek);
  const scheduledWorkout = Boolean(template && !template.isRestDay);
  const completedWorkout = sessions.some(
    (session) => session.date === date && session.status === 'completed' && (!template || session.workoutTemplateId === template.id),
  );

  const components: number[] = [];
  if (dayTasks.length) components.push((dayTasks.filter((task) => task.completed).length / dayTasks.length) * 100);
  if (scheduledHabits.length) components.push((completedHabits.length / scheduledHabits.length) * 100);
  if (scheduledWorkout) components.push(completedWorkout ? 100 : 0);

  return {
    date,
    score: components.length ? Math.round(components.reduce((sum, value) => sum + value, 0) / components.length) : null,
    tasksDone: dayTasks.filter((task) => task.completed).length,
    tasksTotal: dayTasks.length,
    habitsDone: completedHabits.length,
    habitsTotal: scheduledHabits.length,
    workoutDone: completedWorkout,
    workoutScheduled: scheduledWorkout,
  };
};

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [savedProfile, savedSettings, savedHabits, savedTasks, savedTemplates, savedSessions] = await Promise.all([
        StorageService.getProfile(),
        StorageService.getSettings(),
        StorageService.getHabits(),
        StorageService.getTasks(),
        StorageService.getWorkoutTemplates(),
        StorageService.getWorkoutSessions(),
      ]);
      const nextProfile = savedProfile ?? DEFAULT_PROFILE;
      setProfile(nextProfile);
      setProfileName(nextProfile.name);
      setProfileBio(nextProfile.bio ?? '');
      setSettings(savedSettings ?? DEFAULT_SETTINGS);
      setHabits(savedHabits);
      setTasks(savedTasks);
      setTemplates(savedTemplates);
      setSessions(savedSessions);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        setAccountEmail(data.user?.email ?? '');
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', settings.theme === 'light');
    document.body.classList.toggle('theme-light', settings.theme === 'light');
    // O App controla o tema globalmente; este efeito apenas mantém a tela correta enquanto o perfil está aberto.
  }, [settings.theme]);

  const today = getTodayString();
  const firstActivityDate = settings.firstUseDate ?? today;

  const calendarDays = useMemo(() => {
    const start = addDays(today, -27);
    return Array.from({ length: 28 }, (_, index) => addDays(start, index));
  }, [today]);

  const scores = useMemo(
    () => calendarDays.map((date) => getDayScore(date, habits, tasks, templates, sessions)),
    [calendarDays, habits, tasks, templates, sessions],
  );

  const overallConsistency = useMemo(() => {
    const values = scores.filter((item) => item.score !== null).map((item) => item.score as number);
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  }, [scores]);

  const latestStats = useMemo(() => {
    const todayScore = scores.find((item) => item.date === today);
    return {
      tasks: todayScore?.tasksTotal ? Math.round((todayScore.tasksDone / todayScore.tasksTotal) * 100) : 0,
      habits: todayScore?.habitsTotal ? Math.round((todayScore.habitsDone / todayScore.habitsTotal) * 100) : 0,
      workouts: todayScore?.workoutScheduled ? (todayScore.workoutDone ? 100 : 0) : 0,
    };
  }, [scores, today]);

  const saveProfile = async () => {
    const next: UserProfile = {
      ...profile,
      id: PROFILE_ID,
      name: profileName.trim() || DEFAULT_PROFILE.name,
      bio: profileBio.trim() || undefined,
    };
    await StorageService.saveProfile(next);
    setProfile(next);
    setEditingProfile(false);
  };

  const changeAvatar = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 3 * 1024 * 1024) {
      window.alert('Escolha uma imagem de até 3 MB.');
      return;
    }
    const avatarUrl = await toDataUrl(file);
    const next = { ...profile, id: PROFILE_ID, avatarUrl };
    await StorageService.saveProfile(next);
    setProfile(next);
  };

  const updateSettings = async (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await StorageService.saveSettings(next);
    window.dispatchEvent(new CustomEvent('constancia-settings-changed', { detail: { theme: next.theme } }));
  };

  const exportBackup = async () => {
    const backup = await StorageService.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `constancia-backup-${getTodayString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Backup exportado.');
    setTimeout(() => setMessage(''), 2500);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const backup = JSON.parse(raw) as BackupData;
      const confirmed = window.confirm('Importar este backup substituirá os dados locais atuais. Deseja continuar?');
      if (!confirmed) return;
      await StorageService.importBackup(backup);
      await load();
      setMessage('Backup importado com sucesso.');
      setTimeout(() => setMessage(''), 2500);
    } catch (error) {
      console.error(error);
      window.alert('Esse arquivo não parece ser um backup válido do Constância.');
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const scoreClass = (score: number | null, date: string) => {
    if (date < firstActivityDate) return 'bg-surface-hover';
    if (score === null) return 'bg-surface-hover';
    if (score >= 75) return 'bg-brand';
    if (score >= 40) return 'bg-brand-hover opacity-70';
    if (score > 0) return 'bg-orange-500/70';
    return 'bg-red-500/60';
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-500">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Perfil</h1>
          <p className="text-xs text-gray-500 mt-0.5">Sua evolução e preferências</p>
        </div>
        <button onClick={() => setEditingProfile(true)} className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-surface-hover" title="Editar perfil">
          <Edit3 size={17} />
        </button>
      </div>

      <section className="bg-surface-card border border-surface-border rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <button onClick={() => avatarInputRef.current?.click()} className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden bg-brand-subtle border border-brand-border flex items-center justify-center text-brand group" title="Alterar foto de perfil">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" /> : <UserIcon size={28} />}
            <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Camera size={18} /></span>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void changeAvatar(e.target.files?.[0])} />
          <div className="min-w-0">
            <h2 className="font-bold text-gray-100 truncate">{profile.name}</h2>
            <p className="text-xs text-gray-400 truncate">{profile.bio || 'Atleta / Estudante'}</p>
          </div>
        </div>
      </section>

      {editingProfile && (
        <section className="bg-surface-card border border-surface-border rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-gray-100">Editar perfil</h3>
          <label><span className="label-base">Nome</span><input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="input-base" placeholder="Seu nome" /></label>
          <label><span className="label-base">Descrição</span><input value={profileBio} onChange={(e) => setProfileBio(e.target.value)} className="input-base" placeholder="Ex.: Atleta / Estudante" /></label>
          <div className="flex justify-end gap-2"><button onClick={() => setEditingProfile(false)} className="button-secondary">Cancelar</button><button onClick={() => void saveProfile()} className="button-primary">Salvar</button></div>
        </section>
      )}

      <section className="bg-surface-card border border-surface-border rounded-2xl p-4">
        <div className="flex items-end justify-between mb-4">
          <div><p className="text-xs font-semibold text-gray-400">Sua constância</p><p className="text-3xl font-bold text-gray-100 mt-1">{overallConsistency}%</p></div>
          <div className="text-right"><p className="text-[10px] uppercase tracking-wider text-gray-600">Hoje</p><p className="text-sm font-semibold text-brand">{scores.find((item) => item.date === today)?.score ?? 0}%</p></div>
        </div>
        <div className="space-y-2.5">
          <ProgressStat label="Tarefas" value={latestStats.tasks} />
          <ProgressStat label="Hábitos" value={latestStats.habits} />
          <ProgressStat label="Treino" value={latestStats.workouts} />
        </div>
      </section>

      <section className="bg-surface-card border border-surface-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div><h3 className="text-xs font-semibold text-gray-300">Calendário de Constância</h3><p className="text-[10px] text-gray-600 mt-1">Últimos 28 dias</p></div>
          <CalendarDays size={17} className="text-gray-500" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {scores.map((day) => (
            <button key={day.date} title={`${formatDate(day.date)}${day.score === null ? ' · Sem atividade' : ` · ${day.score}%`}`} className={`aspect-square rounded-[4px] ${scoreClass(day.score, day.date)} transition-transform hover:scale-110`} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[9px] text-gray-600"><span>Menos</span><span className="w-2.5 h-2.5 rounded-sm bg-surface-hover" /><span className="w-2.5 h-2.5 rounded-sm bg-orange-500/70" /><span className="w-2.5 h-2.5 rounded-sm bg-brand-hover opacity-70" /><span className="w-2.5 h-2.5 rounded-sm bg-brand" /><span>Mais</span></div>
      </section>

      <section className="space-y-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Configurações</h3>
        <div className="bg-surface-card border border-surface-border rounded-2xl divide-y divide-surface-border overflow-hidden">
          <button onClick={() => setSettingsOpen((value) => !value)} className="w-full p-3.5 flex items-center justify-between text-sm text-gray-300 hover:bg-surface-hover transition-colors">
            <div className="flex items-center gap-3"><Sun size={18} className="text-gray-400" /><span>Tema</span></div>
            <div className="flex items-center gap-2 text-xs text-gray-500">{settings.theme === 'dark' ? 'Escuro' : 'Claro'}<ChevronRight size={15} className={settingsOpen ? 'rotate-90 transition-transform' : 'transition-transform'} /></div>
          </button>
          {settingsOpen && <div className="p-3 bg-surface-bg/50 flex gap-2"><button onClick={() => void updateSettings({ theme: 'dark' })} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold ${settings.theme === 'dark' ? 'bg-brand text-white' : 'bg-surface-hover text-gray-400'}`}><Moon size={14} className="inline mr-1.5" />Escuro</button><button onClick={() => void updateSettings({ theme: 'light' })} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold ${settings.theme === 'light' ? 'bg-brand text-white' : 'bg-surface-hover text-gray-400'}`}><Sun size={14} className="inline mr-1.5" />Claro</button></div>}

          <button onClick={() => void updateSettings({ notifications: !settings.notifications })} className="w-full p-3.5 flex items-center justify-between text-sm text-gray-300 hover:bg-surface-hover transition-colors"><div className="flex items-center gap-3"><Bell size={18} className="text-gray-400" /><span>Notificações</span></div><div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${settings.notifications ? 'bg-brand' : 'bg-surface-muted'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.notifications ? 'translate-x-4' : ''}`} /></div></button>

          <button onClick={() => setBackupOpen((value) => !value)} className="w-full p-3.5 flex items-center justify-between text-sm text-gray-300 hover:bg-surface-hover transition-colors"><div className="flex items-center gap-3"><HardDrive size={18} className="text-gray-400" /><span>Backup & Restauração</span></div><ChevronRight size={15} className={backupOpen ? 'rotate-90 transition-transform text-gray-500' : 'text-gray-500'} /></button>
          {backupOpen && <div className="p-3 bg-surface-bg/50 space-y-2"><button onClick={() => void exportBackup()} className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-hover text-xs text-gray-300 hover:text-white"><span className="flex items-center gap-2"><Download size={15} />Exportar backup</span><span className="text-[10px] text-gray-600">.json</span></button><button onClick={() => backupInputRef.current?.click()} className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-hover text-xs text-gray-300 hover:text-white"><span className="flex items-center gap-2"><Upload size={15} />Importar backup</span><span className="text-[10px] text-gray-600">.json</span></button><input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void importBackup(e.target.files?.[0])} /></div>}

          <div className="p-3.5 flex items-center justify-between text-sm text-gray-300"><div className="flex items-center gap-3"><ArchiveRestore size={18} className="text-gray-400" /><span>Sincronização</span></div><span className="text-[10px] text-gray-600">Próxima etapa</span></div>
        </div>
      </section>

      {isSupabaseConfigured && supabase && (
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Conta</h3>
          <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
            <div className="p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-300">Conta conectada</p>
                <p className="text-[10px] text-gray-600 truncate mt-0.5">{accountEmail || 'Conta autenticada'}</p>
              </div>
              <button
                onClick={async () => {
                  const confirmed = window.confirm('Deseja sair da sua conta?');
                  if (!confirmed) return;
                  if (!supabase) {
                     return;
                        }
                  const { error } = await supabase.auth.signOut();
                  if (error) {
                    window.alert('Não foi possível sair da conta.');
                    return;
                  }
                  setMessage('Você saiu da conta.');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-hover text-xs font-semibold text-gray-300 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} />
                Sair
              </button>
            </div>
          </div>
        </section>
      )}

      {message && <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-semibold shadow-xl">{message}</div>}
    </div>
  );
};

const ProgressStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div><div className="flex justify-between text-[10px] text-gray-500 mb-1"><span>{label}</span><span>{value}%</span></div><div className="h-1.5 rounded-full bg-surface-hover overflow-hidden"><div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${value}%` }} /></div></div>
);
