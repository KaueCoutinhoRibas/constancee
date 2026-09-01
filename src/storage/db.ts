import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Habit, Task, UserProfile, UserSettings, WorkoutTemplate, WorkoutSession, Goal } from '../types';

export interface SyncMeta {
  key: string;
  updatedAt: string;
  deletedAt?: string | null;
}

interface AppDB extends DBSchema {
  habits: {
    key: string;
    value: Habit;
  };
  tasks: {
    key: string;
    value: Task;
  };
  profile: {
    key: string;
    value: UserProfile;
  };
  settings: {
    key: string;
    value: UserSettings & { id: string };
  };
  workoutTemplates: {
    key: string;
    value: WorkoutTemplate;
  };
  workoutSessions: {
    key: string;
    value: WorkoutSession;
  };
  goals: {
    key: string;
    value: Goal;
  };
  syncMeta: {
    key: string;
    value: SyncMeta;
  };
}

const DB_NAME = 'constancia-db';
const DB_VERSION = 5;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('habits')) {
          db.createObjectStore('habits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('workoutTemplates')) {
          db.createObjectStore('workoutTemplates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('workoutSessions')) {
          db.createObjectStore('workoutSessions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('goals')) {
          db.createObjectStore('goals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

const markLocalChange = async (store: string, id: string, deletedAt?: string, emitEvent = true) => {
  const db = await getDB();
  const updatedAt = deletedAt ?? new Date().toISOString();
  await db.put('syncMeta', { key: `${store}:${id}`, updatedAt, ...(deletedAt ? { deletedAt } : {}) });
  if (emitEvent) window.dispatchEvent(new CustomEvent('constancia-local-data-changed'));
};

export interface BackupData {
  version: 1;
  exportedAt: string;
  data: {
    habits: Habit[];
    tasks: Task[];
    profile: UserProfile[];
    settings: (UserSettings & { id: string })[];
    workoutTemplates: WorkoutTemplate[];
    workoutSessions: WorkoutSession[];
    goals: Goal[];
  };
}

export const StorageService = {
  // === HÁBITOS ===
  async getHabits(): Promise<Habit[]> {
    const db = await getDB();
    return db.getAll('habits');
  },

  async saveHabit(habit: Habit, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.put('habits', habit);
    await markLocalChange('habits', habit.id, undefined, options?.emitSync !== false);
  },

  async deleteHabitPermanently(habitId: string, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.delete('habits', habitId);
    await markLocalChange('habits', habitId, new Date().toISOString(), options?.emitSync !== false);
  },

  // === TAREFAS ===
  async getTasks(): Promise<Task[]> {
    const db = await getDB();
    return db.getAll('tasks');
  },

  async saveTask(task: Task, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.put('tasks', task);
    await markLocalChange('tasks', task.id, task.updatedAt, options?.emitSync !== false);
  },

  async deleteTaskPermanently(taskId: string, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.delete('tasks', taskId);
    await markLocalChange('tasks', taskId, new Date().toISOString(), options?.emitSync !== false);
  },

  // === TREINOS ===
  async getWorkoutTemplates(): Promise<WorkoutTemplate[]> {
    const db = await getDB();
    return db.getAll('workoutTemplates');
  },

  async saveWorkoutTemplate(template: WorkoutTemplate, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.put('workoutTemplates', template);
    await markLocalChange('workoutTemplates', template.id, undefined, options?.emitSync !== false);
  },

  async deleteWorkoutTemplate(templateId: string, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.delete('workoutTemplates', templateId);
    await markLocalChange('workoutTemplates', templateId, new Date().toISOString(), options?.emitSync !== false);
  },

  async getWorkoutSessions(): Promise<WorkoutSession[]> {
    const db = await getDB();
    return db.getAll('workoutSessions');
  },

  async saveWorkoutSession(session: WorkoutSession, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.put('workoutSessions', session);
    await markLocalChange('workoutSessions', session.id, session.updatedAt, options?.emitSync !== false);
  },

  // === METAS ===
  async getGoals(): Promise<Goal[]> {
    const db = await getDB();
    const goals = await db.getAll('goals');
    return goals.map((goal) => ({ ...goal, progress: typeof goal.progress === 'number' ? goal.progress : 0 }));
  },

  async saveGoal(goal: Goal, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.put('goals', goal);
    await markLocalChange('goals', goal.id, undefined, options?.emitSync !== false);
  },

  async deleteGoalPermanently(goalId: string, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.delete('goals', goalId);
    await markLocalChange('goals', goalId, new Date().toISOString(), options?.emitSync !== false);
  },

  // === CONFIGURAÇÕES ===
  async getSettings(): Promise<UserSettings | undefined> {
    const db = await getDB();
    const settings = await db.get('settings', 'main_settings');
    if (!settings) return undefined;
    const { id: _id, ...value } = settings;
    return value;
  },

  async saveSettings(settings: UserSettings, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.put('settings', { ...settings, id: 'main_settings' });
    await markLocalChange('user_settings', 'main_settings', undefined, options?.emitSync !== false);
  },

  // === PERFIL ===
  async getProfile(): Promise<UserProfile | undefined> {
    const db = await getDB();
    return db.get('profile', 'main_profile');
  },

  async saveProfile(profile: UserProfile, options?: { emitSync?: boolean }): Promise<void> {
    const db = await getDB();
    await db.put('profile', { ...profile, id: 'main_profile' });
    await markLocalChange('profiles', 'main_profile', undefined, options?.emitSync !== false);
  },

  async getSyncMeta(key: string): Promise<SyncMeta | undefined> {
    const db = await getDB();
    return db.get('syncMeta', key);
  },

  async setSyncMeta(meta: SyncMeta): Promise<void> {
    const db = await getDB();
    await db.put('syncMeta', meta);
  },

  async getAllSyncMeta(): Promise<SyncMeta[]> {
    const db = await getDB();
    return db.getAll('syncMeta');
  },

  async clearAllData(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['habits', 'tasks', 'profile', 'settings', 'workoutTemplates', 'workoutSessions', 'goals', 'syncMeta'], 'readwrite');
    await Promise.all([
      tx.objectStore('habits').clear(),
      tx.objectStore('tasks').clear(),
      tx.objectStore('profile').clear(),
      tx.objectStore('settings').clear(),
      tx.objectStore('workoutTemplates').clear(),
      tx.objectStore('workoutSessions').clear(),
      tx.objectStore('goals').clear(),
      tx.objectStore('syncMeta').clear(),
    ]);
    await tx.done;
  },

  async exportBackup(): Promise<BackupData> {
    const db = await getDB();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        habits: await db.getAll('habits'),
        tasks: await db.getAll('tasks'),
        profile: await db.getAll('profile'),
        settings: await db.getAll('settings'),
        workoutTemplates: await db.getAll('workoutTemplates'),
        workoutSessions: await db.getAll('workoutSessions'),
        goals: await db.getAll('goals'),
      },
    };
  },

  async importBackup(backup: BackupData): Promise<void> {
    if (!backup || backup.version !== 1 || !backup.data) {
      throw new Error('Backup inválido');
    }
    const db = await getDB();
    const tx = db.transaction(['habits', 'tasks', 'profile', 'settings', 'workoutTemplates', 'workoutSessions', 'goals', 'syncMeta'], 'readwrite');
    await Promise.all([
      tx.objectStore('habits').clear(),
      tx.objectStore('tasks').clear(),
      tx.objectStore('profile').clear(),
      tx.objectStore('settings').clear(),
      tx.objectStore('workoutTemplates').clear(),
      tx.objectStore('workoutSessions').clear(),
      tx.objectStore('goals').clear(),
      tx.objectStore('syncMeta').clear(),
    ]);
    for (const item of backup.data.habits ?? []) await tx.objectStore('habits').put(item);
    for (const item of backup.data.tasks ?? []) await tx.objectStore('tasks').put(item);
    for (const item of backup.data.profile ?? []) await tx.objectStore('profile').put(item);
    for (const item of backup.data.settings ?? []) await tx.objectStore('settings').put(item);
    for (const item of backup.data.workoutTemplates ?? []) await tx.objectStore('workoutTemplates').put(item);
    for (const item of backup.data.workoutSessions ?? []) await tx.objectStore('workoutSessions').put(item);
    for (const item of backup.data.goals ?? []) await tx.objectStore('goals').put(item);
    await tx.done;
    const now = new Date().toISOString();
    const importedMeta: SyncMeta[] = [
      ...(backup.data.habits ?? []).map((item) => ({ key: `habits:${item.id}`, updatedAt: now })),
      ...(backup.data.tasks ?? []).map((item) => ({ key: `tasks:${item.id}`, updatedAt: now })),
      ...(backup.data.workoutTemplates ?? []).map((item) => ({ key: `workoutTemplates:${item.id}`, updatedAt: now })),
      ...(backup.data.workoutSessions ?? []).map((item) => ({ key: `workoutSessions:${item.id}`, updatedAt: now })),
      ...(backup.data.goals ?? []).map((item) => ({ key: `goals:${item.id}`, updatedAt: now })),
      ...(backup.data.profile ?? []).map(() => ({ key: 'profiles:main_profile', updatedAt: now })),
      ...(backup.data.settings ?? []).map(() => ({ key: 'user_settings:main_settings', updatedAt: now })),
    ];
    const metaDb = await getDB();
    const metaTx = metaDb.transaction('syncMeta', 'readwrite');
    for (const meta of importedMeta) await metaTx.store.put(meta);
    await metaTx.done;
    window.dispatchEvent(new CustomEvent('constancia-local-data-changed'));
  },
};