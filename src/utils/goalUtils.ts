import type { Goal, Habit, Task, WorkoutSession } from '../types';

export type GoalSource = 'manual' | 'workouts' | 'habits' | 'tasks';

export const goalSourceLabel = (source?: GoalSource) => {
  if (source === 'workouts') return 'Treinos';
  if (source === 'habits') return 'Hábito';
  if (source === 'tasks') return 'Tarefas';
  return 'Manual';
};

export const calculateGoalProgress = (
  goal: Goal,
  data: { habits: Habit[]; tasks: Task[]; sessions: WorkoutSession[] },
) => {
  if ((goal.trackingSource ?? 'manual') === 'manual') return Math.min(100, Math.max(0, goal.progress ?? 0));
  const target = Number(goal.targetValue) || 0;
  if (target <= 0) return 0;
  const since = goal.createdAt;
  let current = 0;
  if (goal.trackingSource === 'workouts') {
    current = data.sessions.filter((s) => s.status === 'completed' && s.startedAt >= since).length;
  } else if (goal.trackingSource === 'tasks') {
    current = data.tasks.filter((t) => t.completed && (t.updatedAt ?? t.createdAt) >= since).length;
  } else if (goal.trackingSource === 'habits') {
    const habit = data.habits.find((h) => h.id === goal.linkedHabitId);
    if (habit) {
      current = habit.completedDates.filter((date) => `${date}T23:59:59.999Z` >= since).length;
    }
  }
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
};

export const goalCurrentValue = (goal: Goal, progress: number) => {
  if ((goal.trackingSource ?? 'manual') === 'manual') return goal.currentValue ?? Math.round((progress / 100) * (goal.targetValue ?? 100));
  return Math.round(((goal.targetValue ?? 0) * progress) / 100);
};

export const goalUnit = (goal: Goal) => goal.unit || '';
