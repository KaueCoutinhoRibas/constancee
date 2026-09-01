import React, { useEffect, useMemo, useState } from 'react';
import type { DayOfWeek, Exercise, ExerciseLog, WorkoutSession, WorkoutTemplate, WorkoutSetResult } from '../types';
import { StorageService } from '../storage/db';
import { addDays, formatDateToYYYYMMDD, getDayOfWeekFromYYYYMMDD, getTodayString, parseYYYYMMDD } from '../utils/dateUtils';
import { Check, ChevronLeft, ChevronRight, Edit2, GripVertical, History, Play, Plus, RotateCcw, Trash2, X, Dumbbell, Moon } from 'lucide-react';

const weekLabels: { short: string; full: string }[] = [
  { short: 'DOM', full: 'Domingo' },
  { short: 'SEG', full: 'Segunda' },
  { short: 'TER', full: 'Terça' },
  { short: 'QUA', full: 'Quarta' },
  { short: 'QUI', full: 'Quinta' },
  { short: 'SEX', full: 'Sexta' },
  { short: 'SÁB', full: 'Sábado' },
];

const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getWeekStart = (dateStr: string) => {
  const date = parseYYYYMMDD(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatDateToYYYYMMDD(date);
};

const formatDate = (dateStr: string) =>
  parseYYYYMMDD(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');

const formatLongDate = (dateStr: string) =>
  parseYYYYMMDD(dateStr).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

interface TemplateModalProps {
  template: WorkoutTemplate;
  onClose: () => void;
  onSave: (template: WorkoutTemplate) => Promise<void>;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ template, onClose, onSave }) => {
  const [name, setName] = useState(template.name);
  const [isRestDay, setIsRestDay] = useState(template.isRestDay);
  const [exercises, setExercises] = useState<Exercise[]>(template.exercises);
  const [exerciseDraft, setExerciseDraft] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);

  const saveTemplate = async () => {
    if (!isRestDay && !name.trim()) return;
    setSaving(true);
    await onSave({ ...template, name: isRestDay ? 'Descanso' : name.trim(), isRestDay, exercises: isRestDay ? [] : exercises });
    setSaving(false);
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= exercises.length) return;
    const copy = [...exercises];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setExercises(copy);
  };

  const deleteExercise = (id: string) => {
    if (window.confirm('Remover este exercício da ficha? O histórico continuará preservado.')) {
      setExercises((items) => items.filter((item) => item.id !== id));
    }
  };

  return (
    <ModalShell title={`Editar ${weekLabels[template.dayOfWeek].full}`} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Nome do treino</span>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={isRestDay} placeholder="Ex: Costas + Bíceps" className="input-base disabled:opacity-50" />
        </label>

        <button type="button" onClick={() => setIsRestDay((v) => !v)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isRestDay ? 'bg-brand/10 border-brand/40' : 'bg-[#18181b] border-surface-border'}`}>
          <span className="flex items-center gap-2 text-sm text-gray-200"><Moon size={17} className={isRestDay ? 'text-brand' : 'text-gray-400'} /> Dia de descanso</span>
          <span className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isRestDay ? 'bg-brand' : 'bg-gray-700'}`}><span className={`block w-4 h-4 rounded-full bg-white transition-transform ${isRestDay ? 'translate-x-5' : ''}`} /></span>
        </button>

        {!isRestDay && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Exercícios</span>
              <button type="button" onClick={() => setExerciseDraft({ id: makeId('exercise'), name: '', weight: 0, sets: 3, repsRange: '8–10' })} className="text-xs font-semibold text-brand flex items-center gap-1"><Plus size={14} /> Adicionar</button>
            </div>
            {exercises.length === 0 ? (
              <div className="border border-dashed border-surface-border rounded-xl p-5 text-center text-xs text-gray-500">Nenhum exercício adicionado.</div>
            ) : exercises.map((exercise, index) => (
              <div key={exercise.id} className="bg-[#18181b] border border-surface-border rounded-xl p-3 flex items-center gap-2">
                <GripVertical size={16} className="text-gray-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-200 truncate">{exercise.name}</p>
                  <p className="text-xs text-gray-500">{exercise.weight} kg · {exercise.sets} séries · {exercise.repsRange} reps</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={() => moveExercise(index, -1)} className="p-1.5 text-gray-500 disabled:opacity-20 hover:text-white" title="Subir"><ChevronLeft size={15} className="rotate-90" /></button>
                  <button type="button" disabled={index === exercises.length - 1} onClick={() => moveExercise(index, 1)} className="p-1.5 text-gray-500 disabled:opacity-20 hover:text-white" title="Descer"><ChevronRight size={15} className="rotate-90" /></button>
                  <button type="button" onClick={() => setExerciseDraft(exercise)} className="p-1.5 text-gray-500 hover:text-white" title="Editar"><Edit2 size={15} /></button>
                  <button type="button" onClick={() => deleteExercise(exercise.id)} className="p-1.5 text-gray-500 hover:text-red-400" title="Remover"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="button-secondary">Cancelar</button>
          <button type="button" disabled={saving} onClick={saveTemplate} className="button-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>

      {exerciseDraft && (
        <ExerciseModal
          exercise={exerciseDraft}
          onClose={() => setExerciseDraft(null)}
          onSave={(exercise) => {
            setExercises((items) => items.some((item) => item.id === exercise.id) ? items.map((item) => item.id === exercise.id ? exercise : item) : [...items, exercise]);
            setExerciseDraft(null);
          }}
        />
      )}
    </ModalShell>
  );
};

const ExerciseModal: React.FC<{ exercise: Exercise; onClose: () => void; onSave: (exercise: Exercise) => void }> = ({ exercise, onClose, onSave }) => {
  const [name, setName] = useState(exercise.name);
  const [weight, setWeight] = useState(String(exercise.weight || ''));
  const [sets, setSets] = useState(String(exercise.sets || 3));
  const [repsRange, setRepsRange] = useState(exercise.repsRange || '8–10');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || Number(sets) < 1) return;
    onSave({ id: exercise.id, name: name.trim(), weight: Math.max(0, Number(weight) || 0), sets: Math.max(1, Number(sets) || 1), repsRange: repsRange.trim() || '8–10' });
  };

  return (
    <ModalShell title={exercise.name ? 'Editar exercício' : 'Novo exercício'} onClose={onClose} nested>
      <form onSubmit={submit} className="space-y-4">
        <label className="block"><span className="label-base">Nome</span><input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Puxada Alta" className="input-base" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="label-base">Peso (kg)</span><input type="number" min="0" step="0.5" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="60" className="input-base" /></label>
          <label><span className="label-base">Séries</span><input type="number" min="1" max="20" value={sets} onChange={(e) => setSets(e.target.value)} className="input-base" /></label>
        </div>
        <label><span className="label-base">Repetições</span><input required value={repsRange} onChange={(e) => setRepsRange(e.target.value)} placeholder="8–10" className="input-base" /></label>
        <div className="pt-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="button-secondary">Cancelar</button><button type="submit" className="button-primary">Salvar</button></div>
      </form>
    </ModalShell>
  );
};

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; nested?: boolean }> = ({ title, onClose, children, nested }) => (
  <div data-swipe-ignore="true" className={`fixed inset-0 ${nested ? 'z-[70]' : 'z-50'} flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150`}>
    <div className="bg-[#121215] border border-surface-border w-full max-w-md rounded-2xl p-5 shadow-2xl max-h-[88vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-5"><h2 className="text-lg font-bold text-gray-100">{title}</h2><button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg"><X size={20} /></button></div>
      {children}
    </div>
  </div>
);

interface SessionModalProps {
  session: WorkoutSession;
  template: WorkoutTemplate;
  previousSessions: WorkoutSession[];
  onClose: () => void;
  onSave: (session: WorkoutSession) => Promise<void>;
  onFinish: (session: WorkoutSession) => Promise<void>;
}

const SessionModal: React.FC<SessionModalProps> = ({ session, template, previousSessions, onClose, onSave, onFinish }) => {
  const [draft, setDraft] = useState<WorkoutSession>(session);
  const [saving, setSaving] = useState(false);

  const lastForExercise = (exerciseId: string): ExerciseLog | undefined => {
    const found = previousSessions
      .filter((item) => item.id !== draft.id && item.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((item) => item.completedExercises)
      .find((log) => log.exerciseId === exerciseId);
    return found;
  };

  const getLog = (exerciseId: string) => draft.completedExercises.find((log) => log.exerciseId === exerciseId);

  const updateSet = (exerciseId: string, setNumber: number, field: 'weight' | 'reps', value: string) => {
    const numeric = value === '' ? 0 : Math.max(0, Number(value));
    setDraft((current) => {
      const logs = [...current.completedExercises];
      let log = logs.find((item) => item.exerciseId === exerciseId);
      if (!log) {
        log = { exerciseId, setsCompleted: [] };
        logs.push(log);
      }
      const index = logs.indexOf(log);
      const sets = [...log.setsCompleted];
      const existing = sets.find((item) => item.setNumber === setNumber);
      const nextSet: WorkoutSetResult = existing ? { ...existing, [field]: numeric } : { setNumber, weight: field === 'weight' ? numeric : 0, reps: field === 'reps' ? numeric : 0 };
      const setIndex = sets.findIndex((item) => item.setNumber === setNumber);
      if (setIndex >= 0) sets[setIndex] = nextSet; else sets.push(nextSet);
      sets.sort((a, b) => a.setNumber - b.setNumber);
      logs[index] = { ...log, setsCompleted: sets };
      return { ...current, completedExercises: logs, updatedAt: new Date().toISOString() };
    });
  };

  const persist = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };

  const finish = async () => {
    setSaving(true);
    await onFinish({ ...draft, status: 'completed', updatedAt: new Date().toISOString() });
    setSaving(false);
  };

  return (
    <div data-swipe-ignore="true" className="fixed inset-0 z-[60] bg-[#0D0E12] overflow-y-auto animate-in fade-in duration-150">
      <div className="max-w-md mx-auto px-4 pt-5 pb-8 min-h-screen">
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white rounded-xl"><ChevronLeft size={21} /></button>
          <div className="text-center"><p className="text-[10px] uppercase tracking-widest text-brand font-bold">Treino em andamento</p><h2 className="text-lg font-bold text-gray-100">{template.name}</h2></div>
          <button onClick={persist} disabled={saving} className="text-xs font-semibold text-brand">{saving ? '...' : 'Salvar'}</button>
        </div>

        <div className="text-center mb-5"><p className="text-xs text-gray-500">{formatLongDate(draft.date)}</p></div>

        <div className="space-y-4">
          {template.exercises.map((exercise) => {
            const log = getLog(exercise.id);
            const last = lastForExercise(exercise.id);
            return (
              <div key={exercise.id} className="bg-[#121215] border border-surface-border rounded-2xl p-4 space-y-3">
                <div className="flex justify-between gap-3"><div><h3 className="text-sm font-bold text-gray-100">{exercise.name}</h3><p className="text-xs text-gray-500">Padrão: {exercise.weight} kg · {exercise.sets} × {exercise.repsRange}</p></div><Dumbbell size={18} className="text-brand shrink-0" /></div>
                {last && <div className="rounded-xl bg-[#18181b] border border-surface-border px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Último treino</p><p className="text-xs text-gray-300">{last.setsCompleted.filter((s) => s.weight || s.reps).map((s) => `${s.weight} kg × ${s.reps}`).join(' · ') || 'Sem séries registradas'}</p></div>}
                <div className="space-y-2">
                  {Array.from({ length: exercise.sets }, (_, i) => {
                    const setNumber = i + 1;
                    const result = log?.setsCompleted.find((s) => s.setNumber === setNumber);
                    return <div key={setNumber} className="grid grid-cols-[42px_1fr_1fr] gap-2 items-center"><span className="text-xs text-gray-500">Série {setNumber}</span><input type="number" min="0" step="0.5" inputMode="decimal" value={result?.weight ? result.weight : ''} onChange={(e) => updateSet(exercise.id, setNumber, 'weight', e.target.value)} placeholder={`${exercise.weight}`} className="input-base text-center" aria-label={`Peso série ${setNumber}`} /><input type="number" min="0" step="1" inputMode="numeric" value={result?.reps ? result.reps : ''} onChange={(e) => updateSet(exercise.id, setNumber, 'reps', e.target.value)} placeholder={exercise.repsRange} className="input-base text-center" aria-label={`Repetições série ${setNumber}`} /></div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={finish} disabled={saving} className="w-full mt-5 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold transition-all active:scale-[0.99]">{saving ? 'Salvando...' : 'Finalizar treino'}</button>
      </div>
    </div>
  );
};

export const WorkoutsPage: React.FC = () => {
  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [templateData, sessionData] = await Promise.all([StorageService.getWorkoutTemplates(), StorageService.getWorkoutSessions()]);
      setTemplates(templateData);
      setSessions(sessionData);
    } catch (error) {
      console.error('Erro ao carregar treinos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const weekStart = getWeekStart(selectedDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dayOfWeek = getDayOfWeekFromYYYYMMDD(date) as DayOfWeek;
    return { date, dayOfWeek };
  }), [weekStart]);

  const templateByDay = useMemo(() => new Map(templates.map((template) => [template.dayOfWeek, template])), [templates]);
  const selectedDay = getDayOfWeekFromYYYYMMDD(selectedDate) as DayOfWeek;
  const selectedTemplate = templateByDay.get(selectedDay);
  const inProgress = sessions.find((item) => item.date === selectedDate && item.status === 'in_progress' && (!selectedTemplate || item.workoutTemplateId === selectedTemplate.id));
  const completedToday = sessions.find((item) => item.date === selectedDate && item.status === 'completed' && (!selectedTemplate || item.workoutTemplateId === selectedTemplate.id));

  const ensureTemplate = (dayOfWeek: DayOfWeek): WorkoutTemplate => templateByDay.get(dayOfWeek) || {
    id: makeId('workout'), dayOfWeek, name: '', isRestDay: false, exercises: [],
  };

  const saveTemplate = async (template: WorkoutTemplate) => {
    await StorageService.saveWorkoutTemplate(template);
    setTemplates((current) => current.some((item) => item.id === template.id) ? current.map((item) => item.id === template.id ? template : item) : [...current, template]);
    setEditingTemplate(null);
  };

  const startWorkout = async () => {
    if (!selectedTemplate || selectedTemplate.isRestDay) return;
    const existing = sessions.find((item) => item.date === selectedDate && item.workoutTemplateId === selectedTemplate.id && item.status === 'in_progress');
    if (existing) { setSession(existing); return; }
    const newSession: WorkoutSession = {
      id: makeId('session'), date: selectedDate, workoutTemplateId: selectedTemplate.id, status: 'in_progress', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedExercises: [],
    };
    await StorageService.saveWorkoutSession(newSession);
    setSessions((current) => [...current, newSession]);
    setSession(newSession);
  };

  const saveSession = async (updated: WorkoutSession) => {
    await StorageService.saveWorkoutSession(updated);
    setSessions((current) => current.some((item) => item.id === updated.id) ? current.map((item) => item.id === updated.id ? updated : item) : [...current, updated]);
    setSession(updated);
  };

  const finishSession = async (updated: WorkoutSession) => {
    await StorageService.saveWorkoutSession(updated);
    setSessions((current) => current.some((item) => item.id === updated.id) ? current.map((item) => item.id === updated.id ? updated : item) : [...current, updated]);
    setSession(null);
  };

  const previousSessions = sessions.filter((item) => item.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5 pb-6">
      <div className="page-header flex justify-between items-start pt-1">
        <div><h1 className="text-xl font-bold text-gray-100 tracking-tight">Treinos</h1><p className="text-xs text-gray-400 mt-0.5">Sua rotina semanal de exercícios</p></div>
        <button onClick={() => setEditingTemplate(ensureTemplate(selectedDay))} className="w-10 h-10 rounded-full bg-brand hover:bg-brand/90 text-white flex items-center justify-center transition-all shadow-md active:scale-95" title="Editar treino"><Edit2 size={17} /></button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 text-gray-500 hover:text-white"><ChevronLeft size={18} /></button>
        <div className="text-center min-w-0"><p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Semana</p><p className="text-xs text-gray-300">{formatDate(weekDays[0].date)} — {formatDate(weekDays[6].date)}</p></div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 text-gray-500 hover:text-white"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map(({ date, dayOfWeek }) => {
          const template = templateByDay.get(dayOfWeek);
          const isSelected = date === selectedDate;
          const isToday = date === today;
          return <button key={date} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center py-3 px-1 rounded-2xl border transition-all ${isSelected ? 'bg-brand/15 border-brand text-white shadow-lg' : isToday ? 'bg-[#18181b] border-brand/40 text-gray-200' : 'bg-[#121215] border-surface-border text-gray-400 hover:border-gray-700'}`}><span className="text-[9px] font-bold tracking-wider">{weekLabels[dayOfWeek].short}</span><span className="text-base font-extrabold my-1">{parseYYYYMMDD(date).getDate()}</span><span className={`text-[9px] font-semibold truncate max-w-full ${template?.isRestDay ? 'text-gray-600' : template ? 'text-brand' : 'text-gray-600'}`}>{template?.isRestDay ? 'Descanso' : template ? `${template.exercises.length} ex.` : 'Configurar'}</span></button>;
        })}
      </div>

      {loading ? <div className="text-center py-10 text-xs text-gray-500">Carregando treinos...</div> : (
        <>
          <div className="bg-[#121215] border border-surface-border rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] uppercase tracking-widest text-brand font-bold">{weekLabels[selectedDay].full} · {formatDate(selectedDate)}</p><h2 className="text-lg font-bold text-gray-100 mt-1">{selectedTemplate?.name || 'Nenhum treino configurado'}</h2></div>
              {selectedTemplate?.isRestDay && <Moon size={20} className="text-gray-500" />}
            </div>

            {!selectedTemplate ? (
              <div className="border border-dashed border-surface-border rounded-xl p-6 text-center"><p className="text-sm text-gray-300">Configure o treino deste dia.</p><button onClick={() => setEditingTemplate(ensureTemplate(selectedDay))} className="mt-3 text-xs font-semibold text-brand hover:text-white">+ Criar treino</button></div>
            ) : selectedTemplate.isRestDay ? (
              <div className="py-5 text-center"><Moon size={28} className="mx-auto text-gray-600 mb-2" /><p className="text-sm font-semibold text-gray-300">Dia de descanso</p><p className="text-xs text-gray-500 mt-1">Recupere-se. O próximo treino espera por você.</p></div>
            ) : selectedTemplate.exercises.length === 0 ? (
              <div className="border border-dashed border-surface-border rounded-xl p-6 text-center"><p className="text-sm text-gray-300">Nenhum exercício nesta ficha.</p><button onClick={() => setEditingTemplate(selectedTemplate)} className="mt-3 text-xs font-semibold text-brand">Adicionar exercício</button></div>
            ) : (
              <div className="space-y-2.5">{selectedTemplate.exercises.map((exercise, index) => <div key={exercise.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#18181b] border border-surface-border"><span className="text-[10px] text-gray-600 font-bold w-4">{index + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-200 truncate">{exercise.name}</p><p className="text-xs text-gray-500">{exercise.weight} kg · {exercise.sets} séries · {exercise.repsRange} reps</p></div></div>)}</div>
            )}

            {selectedTemplate && !selectedTemplate.isRestDay && selectedTemplate.exercises.length > 0 && (
              <div className="pt-1">
                {inProgress ? <button onClick={() => setSession(inProgress)} className="w-full py-3 rounded-xl bg-brand/15 border border-brand/30 text-brand text-sm font-bold flex items-center justify-center gap-2"><RotateCcw size={17} /> Continuar treino</button> : <button onClick={startWorkout} className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"><Play size={17} fill="currentColor" /> {completedToday ? 'Treinar novamente' : 'Iniciar treino'}</button>}
              </div>
            )}
          </div>

          {completedToday && <div className="flex items-center gap-2 text-xs text-emerald-400 px-1"><Check size={15} /> Treino concluído hoje.</div>}

          <button onClick={() => setEditingTemplate(ensureTemplate(selectedDay))} className="w-full text-xs font-semibold text-gray-500 hover:text-gray-200 py-2 flex items-center justify-center gap-1.5"><Edit2 size={14} /> Editar ficha deste dia</button>
        </>
      )}

      <div className="bg-[#121215] border border-surface-border rounded-2xl p-4 flex items-center gap-3"><History size={18} className="text-brand" /><div><p className="text-xs font-semibold text-gray-300">Histórico preservado</p><p className="text-[11px] text-gray-500">{sessions.filter((s) => s.status === 'completed').length} sessão(ões) concluída(s).</p></div></div>

      {editingTemplate && <TemplateModal template={editingTemplate} onClose={() => setEditingTemplate(null)} onSave={saveTemplate} />}
      {session && selectedTemplate && <SessionModal session={session} template={selectedTemplate} previousSessions={previousSessions} onClose={() => setSession(null)} onSave={saveSession} onFinish={finishSession} />}
    </div>
  );
};
