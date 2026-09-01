import type { Goal, Habit, Task, UserSettings, WorkoutSession, WorkoutTemplate } from '../types';
import { supabase } from '../lib/supabase';
import { StorageService, type SyncMeta } from '../storage/db';

type SyncStore = 'habits' | 'tasks' | 'workout_templates' | 'workout_sessions' | 'goals';
type LocalStore = 'habits' | 'tasks' | 'workoutTemplates' | 'workoutSessions' | 'goals';
type RemoteRow = { id: string; payload: Record<string, unknown>; updated_at: string; deleted_at: string | null };
type SyncResult = { synced: boolean; reason?: string };

const storePairs: Array<{ remote: SyncStore; local: LocalStore }> = [
  { remote: 'habits', local: 'habits' },
  { remote: 'tasks', local: 'tasks' },
  { remote: 'workout_templates', local: 'workoutTemplates' },
  { remote: 'workout_sessions', local: 'workoutSessions' },
  { remote: 'goals', local: 'goals' },
];
let syncing = false;
let queued = false;
const metaKey = (table: SyncStore, id: string) => `${table}:${id}`;
const timestampOf = (value: unknown, fallback: string) => typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback;

const getLocalStore = async (store: LocalStore) => {
  switch (store) {
    case 'habits': return StorageService.getHabits();
    case 'tasks': return StorageService.getTasks();
    case 'workoutTemplates': return StorageService.getWorkoutTemplates();
    case 'workoutSessions': return StorageService.getWorkoutSessions();
    case 'goals': return StorageService.getGoals();
  }
};

const saveLocal = async (store: LocalStore, value: unknown) => {
  switch (store) {
    case 'habits': await StorageService.saveHabit(value as Habit, { emitSync: false }); break;
    case 'tasks': await StorageService.saveTask(value as Task, { emitSync: false }); break;
    case 'workoutTemplates': await StorageService.saveWorkoutTemplate(value as WorkoutTemplate, { emitSync: false }); break;
    case 'workoutSessions': await StorageService.saveWorkoutSession(value as WorkoutSession, { emitSync: false }); break;
    case 'goals': await StorageService.saveGoal(value as Goal, { emitSync: false }); break;
  }
};

const deleteLocal = async (store: LocalStore, id: string) => {
  switch (store) {
    case 'habits': await StorageService.deleteHabitPermanently(id, { emitSync: false }); break;
    case 'tasks': await StorageService.deleteTaskPermanently(id, { emitSync: false }); break;
    case 'workoutTemplates': await StorageService.deleteWorkoutTemplate(id, { emitSync: false }); break;
    case 'workoutSessions': break;
    case 'goals': await StorageService.deleteGoalPermanently(id, { emitSync: false }); break;
  }
};

const fetchRemoteRows = async (table: SyncStore): Promise<RemoteRow[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('id,payload,updated_at,deleted_at');
  if (error) throw error;
  return (data ?? []) as RemoteRow[];
};

const pushRemoteRow = async (table: SyncStore, userId: string, id: string, payload: Record<string, unknown> | null, meta: SyncMeta) => {
  if (!supabase) return;
  const { data, error } = await supabase.from(table).upsert({
    user_id: userId,
    id,
    payload: payload ?? {},
    updated_at: meta.updatedAt,
    deleted_at: meta.deletedAt ?? null,
  }, { onConflict: 'user_id,id' }).select('updated_at').single();
  if (error) throw error;
  await StorageService.setSyncMeta({ key: metaKey(table, id), updatedAt: data?.updated_at ?? meta.updatedAt, ...(meta.deletedAt ? { deletedAt: meta.deletedAt } : {}) });
};

const syncDomainStore = async (table: SyncStore, localStore: LocalStore, userId: string, bootstrap: boolean) => {
  const [local, remote, metaList] = await Promise.all([getLocalStore(localStore), fetchRemoteRows(table), StorageService.getAllSyncMeta()]);
  const localMap = new Map((local as Array<{ id: string }>).map((item) => [item.id, item]));
  const remoteMap = new Map(remote.map((row) => [row.id, row]));
  const metaMap = new Map(metaList.filter((item) => item.key.startsWith(`${table}:`)).map((item) => [item.key, item]));

  if (bootstrap && remote.length === 0) {
    for (const item of local as unknown as Array<{ id: string; [key: string]: unknown }>) {
      const key = metaKey(table, item.id);
      const meta = metaMap.get(key) ?? { key, updatedAt: timestampOf(item.updatedAt ?? item.createdAt, new Date().toISOString()) };
      await pushRemoteRow(table, userId, item.id, item as Record<string, unknown>, meta);
    }
    return;
  }

  const allKeys: string[] = [...localMap.keys(), ...remoteMap.keys(), ...metaMap.keys()];
  const ids = new Set<string>(allKeys.map((key) => key.includes(':') ? key.slice(key.indexOf(':') + 1) : key));
  for (const id of ids) {
    const localItem = localMap.get(id) as Record<string, unknown> | undefined;
    const remoteItem = remoteMap.get(id);
    const key = metaKey(table, id);
    const existingMeta = metaMap.get(key);
    const localTimestamp = existingMeta?.updatedAt ?? timestampOf(localItem?.updatedAt ?? localItem?.createdAt, new Date().toISOString());
    const localMeta: SyncMeta = existingMeta ?? { key, updatedAt: localTimestamp };
    const remoteTimestamp = remoteItem?.updated_at ?? '';

    if (!remoteItem) {
      if (localItem) await pushRemoteRow(table, userId, id, localItem, localMeta);
      continue;
    }
    if (remoteItem.deleted_at) {
      if (localMeta.updatedAt > remoteTimestamp && !localMeta.deletedAt && localItem) await pushRemoteRow(table, userId, id, localItem, localMeta);
      else if (remoteTimestamp >= localMeta.updatedAt) {
        if (localItem) await deleteLocal(localStore, id);
        await StorageService.setSyncMeta({ key, updatedAt: remoteTimestamp, deletedAt: remoteItem.deleted_at });
      }
      continue;
    }
    if (localMeta.deletedAt) {
      if (localMeta.updatedAt > remoteTimestamp) await pushRemoteRow(table, userId, id, null, localMeta);
      else { await saveLocal(localStore, remoteItem.payload); await StorageService.setSyncMeta({ key, updatedAt: remoteTimestamp }); }
      continue;
    }
    if (!localItem) { await saveLocal(localStore, remoteItem.payload); await StorageService.setSyncMeta({ key, updatedAt: remoteTimestamp }); continue; }
    if (localMeta.updatedAt > remoteTimestamp) await pushRemoteRow(table, userId, id, localItem, localMeta);
    else { await saveLocal(localStore, remoteItem.payload); await StorageService.setSyncMeta({ key, updatedAt: remoteTimestamp }); }
  }
};

const syncProfile = async (userId: string, bootstrap: boolean) => {
  if (!supabase) return;
  const [{ data: remoteProfile, error: profileError }, localProfile, localMeta] = await Promise.all([
    supabase.from('profiles').select('user_id,name,bio,avatar_url,created_at,updated_at').eq('user_id', userId).maybeSingle(),
    StorageService.getProfile(),
    StorageService.getSyncMeta('profiles:main_profile'),
  ]);
  if (profileError) throw profileError;
  const remoteUpdated = remoteProfile?.updated_at ?? '';
  const localUpdated = localMeta?.updatedAt ?? timestampOf(localProfile?.createdAt, new Date().toISOString());
  if (!remoteProfile) {
    if (!localProfile) return;
    const { data, error } = await supabase.from('profiles').upsert({ user_id: userId, name: localProfile.name, bio: localProfile.bio ?? null, avatar_url: localProfile.avatarUrl ?? null, created_at: localProfile.createdAt }, { onConflict: 'user_id' }).select('updated_at').single();
    if (error) throw error;
    await StorageService.setSyncMeta({ key: 'profiles:main_profile', updatedAt: data?.updated_at ?? localUpdated });
    return;
  }
  if (bootstrap || remoteUpdated >= localUpdated) {
    await StorageService.saveProfile({ id: 'main_profile', name: remoteProfile.name, bio: remoteProfile.bio ?? undefined, avatarUrl: remoteProfile.avatar_url ?? undefined, createdAt: remoteProfile.created_at }, { emitSync: false });
    await StorageService.setSyncMeta({ key: 'profiles:main_profile', updatedAt: remoteUpdated });
    return;
  }
  if (localProfile) {
    const { data, error } = await supabase.from('profiles').upsert({ user_id: userId, name: localProfile.name, bio: localProfile.bio ?? null, avatar_url: localProfile.avatarUrl ?? null, created_at: localProfile.createdAt }, { onConflict: 'user_id' }).select('updated_at').single();
    if (error) throw error;
    await StorageService.setSyncMeta({ key: 'profiles:main_profile', updatedAt: data?.updated_at ?? localUpdated });
  }
};

const syncSettings = async (userId: string, bootstrap: boolean) => {
  if (!supabase) return;
  const [{ data: remoteSettings, error }, localSettings, localMeta] = await Promise.all([
    supabase.from('user_settings').select('payload,updated_at').eq('user_id', userId).maybeSingle(),
    StorageService.getSettings(),
    StorageService.getSyncMeta('user_settings:main_settings'),
  ]);
  if (error) throw error;
  const remoteUpdated = remoteSettings?.updated_at ?? '';
  const localUpdated = localMeta?.updatedAt ?? new Date().toISOString();
  if (!remoteSettings) {
    if (!localSettings) return;
    const { data, error: upsertError } = await supabase.from('user_settings').upsert({ user_id: userId, payload: localSettings }, { onConflict: 'user_id' }).select('updated_at').single();
    if (upsertError) throw upsertError;
    await StorageService.setSyncMeta({ key: 'user_settings:main_settings', updatedAt: data?.updated_at ?? localUpdated });
    return;
  }
  if (bootstrap || remoteUpdated >= localUpdated) {
    await StorageService.saveSettings(remoteSettings.payload as UserSettings, { emitSync: false });
    await StorageService.setSyncMeta({ key: 'user_settings:main_settings', updatedAt: remoteUpdated });
    return;
  }
  if (localSettings) {
    const { data, error: upsertError } = await supabase.from('user_settings').upsert({ user_id: userId, payload: localSettings }, { onConflict: 'user_id' }).select('updated_at').single();
    if (upsertError) throw upsertError;
    await StorageService.setSyncMeta({ key: 'user_settings:main_settings', updatedAt: data?.updated_at ?? localUpdated });
  }
};

const performSync = async (): Promise<SyncResult> => {
  if (!supabase) return { synced: false, reason: 'supabase_not_configured' };
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { synced: false, reason: 'not_authenticated' };
  const userId = userData.user.id;
  const owner = await StorageService.getSyncMeta('__owner__');
  const ownerChanged = Boolean(owner?.updatedAt && owner.updatedAt !== userId);
  if (ownerChanged) await StorageService.clearAllData();
  const bootstrap = !owner || ownerChanged;
  await Promise.all(storePairs.map(({ remote, local }) => syncDomainStore(remote, local, userId, bootstrap)));
  await syncProfile(userId, bootstrap);
  await syncSettings(userId, bootstrap);
  await StorageService.setSyncMeta({ key: '__owner__', updatedAt: userId });
  await StorageService.setSyncMeta({ key: '__initialized__', updatedAt: new Date().toISOString() });
  return { synced: true, reason: bootstrap ? 'bootstrap' : 'incremental' };
};

export const SyncService = {
  async sync(): Promise<SyncResult> {
    if (syncing) { queued = true; return { synced: false, reason: 'already_syncing' }; }
    syncing = true;
    try { return await performSync(); }
    finally {
      syncing = false;
      if (queued) { queued = false; void this.sync(); }
    }
  },
};
