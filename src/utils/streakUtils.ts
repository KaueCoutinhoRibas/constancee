import type { Habit } from '../types';
import { getTodayString, subtractDays, getDayOfWeekFromYYYYMMDD } from './dateUtils';

/**
 * Verifica se um determinado hábito estava programado para ocorrer em uma data específica.
 */
export function isHabitScheduledForDate(habit: Habit, dateStr: string): boolean {
  if (dateStr < habit.startDate) {
    return false;
  }

  if (habit.frequency === 'daily') {
    return true;
  }

  if (habit.frequency === 'specific_days' && habit.daysOfWeek) {
    const dayOfWeek = getDayOfWeekFromYYYYMMDD(dateStr);
    return habit.daysOfWeek.includes(dayOfWeek as any);
  }

  return true;
}

/**
 * Calcula a sequência atual e a melhor sequência de um hábito.
 */
export function calculateStreaks(habit: Habit): { streak: number; bestStreak: number } {
  const today = getTodayString();
  const completedSet = new Set(habit.completedDates);

  // Se o hábito começou no futuro, streak é 0
  if (habit.startDate > today) {
    return { streak: 0, bestStreak: habit.bestStreak || 0 };
  }

  // 1. Calcular Sequência Atual
  let currentStreak = 0;
  let cursor = today;

  // Se hoje o hábito estava programado mas ainda NÃO foi concluído, 
  // começamos a checar a partir de ontem para não quebrar a sequência prematurely durante o dia atual.
  const isScheduledToday = isHabitScheduledForDate(habit, today);
  const isCompletedToday = completedSet.has(today);

  if (isScheduledToday && !isCompletedToday) {
    cursor = subtractDays(today, 1);
  }

  while (cursor >= habit.startDate) {
    if (isHabitScheduledForDate(habit, cursor)) {
      if (completedSet.has(cursor)) {
        currentStreak++;
      } else {
        // Encontrou um dia em que o hábito devia ter sido feito, mas não foi. Quebrou a sequência.
        break;
      }
    }
    cursor = subtractDays(cursor, 1);
  }

  // 2. Calcular Melhor Sequência Histórica
  let bestStreak = habit.bestStreak || 0;
  let tempStreak = 0;

  let scanCursor = habit.startDate;
  while (scanCursor <= today) {
    if (isHabitScheduledForDate(habit, scanCursor)) {
      if (completedSet.has(scanCursor)) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }
    scanCursor = subtractDays(scanCursor, -1); // avança 1 dia
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return {
    streak: currentStreak,
    bestStreak
  };
}