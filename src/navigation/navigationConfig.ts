import type { TabType } from '../types';
import { CheckCircle2, ListTodo, Dumbbell, Target, User } from 'lucide-react';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: typeof CheckCircle2;
}

export const TABS: TabConfig[] = [
  { id: 'habits', label: 'Hábitos', icon: CheckCircle2 },
  { id: 'tasks', label: 'Tarefas', icon: ListTodo },
  { id: 'workouts', label: 'Treinos', icon: Dumbbell },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'profile', label: 'Perfil', icon: User },
];