export type TabType = 'habits' | 'tasks' | 'workouts' | 'goals' | 'profile';

export type FrequencyType = 'daily' | 'specific_days';

// 0: Domingo, 1: Segunda, ..., 6: Sábado (padrão JS Date.getDay())
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Habit {
  id: string;
  title: string;
  category?: string;
  frequency: FrequencyType;
  daysOfWeek?: DayOfWeek[];
  startDate: string;
  archived: boolean;
  streak: number;
  bestStreak: number;
  completedDates: string[];

  timesPerDay: number;
  completionCounts?: Record<string, number>;

  note?: string;

  createdAt: string;
}

export type TaskPriority = 'normal' | 'important' | 'urgent';

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD local
  time?: string; // HH:mm opcional
  priority: TaskPriority;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Exercise {
  id: string;
  name: string;
  weight: number;
  sets: number;
  repsRange: string;
}

export interface WorkoutTemplate {
  id: string;
  dayOfWeek: DayOfWeek;
  name: string;
  isRestDay: boolean;
  exercises: Exercise[];
}

export interface WorkoutSetResult {
  setNumber: number;
  weight: number;
  reps: number;
}

export interface ExerciseLog {
  exerciseId: string;
  setsCompleted: WorkoutSetResult[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  workoutTemplateId: string;
  status: 'in_progress' | 'completed';
  startedAt: string;
  updatedAt: string;
  completedExercises: ExerciseLog[];
}

export interface Goal {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  imageUrl?: string;
  description?: string;
  progress: number;
  targetDate?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  notifications: boolean;
  compactView: boolean;
  /** Primeiro dia em que o Constância foi utilizado. */
  firstUseDate?: string;
}