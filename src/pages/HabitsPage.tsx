import React, { useState, useEffect, useMemo } from 'react';
import type { Habit } from '../types';
import { StorageService } from '../storage/db';
import {
  addDays,
  getTodayString,
  parseYYYYMMDD,
} from '../utils/dateUtils';
import {
  isHabitScheduledForDate,
  calculateStreaks,
} from '../utils/streakUtils';
import { HabitFormModal } from '../components/habits/HabitFormModal';
import { HabitHistoryModal } from '../components/habits/HabitHistoryModal';
import {
  Plus,
  Check,
  Flame,
  Trophy,
  Calendar,
  Edit2,
  Sparkles,
} from 'lucide-react';

const getTimesPerDay = (habit: Habit) =>
  Math.max(1, habit.timesPerDay || 1);

const getCompletionCount = (
  habit: Habit,
  date: string
) => {
  // Compatibilidade com hábitos antigos:
  // completedDates representa uma conclusão.
  const storedCount =
    habit.completionCounts?.[date];

  if (typeof storedCount === 'number') {
    return Math.max(0, storedCount);
  }

  return habit.completedDates.includes(date) ? 1 : 0;
};

const isHabitCompletedForDate = (
  habit: Habit,
  date: string
) =>
  getCompletionCount(habit, date) >=
  getTimesPerDay(habit);

export const HabitsPage: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] =
    useState(false);
  const [editingHabit, setEditingHabit] =
    useState<Habit | null>(null);

  const today = getTodayString();

  const loadHabits = async () => {
    try {
      const data = await StorageService.getHabits();

      const updated = data.map((habit) => {
        const normalized: Habit = {
          ...habit,
          timesPerDay: Math.max(
            1,
            habit.timesPerDay || 1
          ),
          completionCounts:
            habit.completionCounts || {},
        };

        // Migração de hábitos antigos:
        // se completedDates possui uma data, considera 1 conclusão.
        normalized.completedDates.forEach((date) => {
          if (
            normalized.completionCounts &&
            normalized.completionCounts[date] === undefined
          ) {
            normalized.completionCounts[date] = 1;
          }
        });

        const { streak, bestStreak } =
          calculateStreaks(normalized);

        return {
          ...normalized,
          streak,
          bestStreak,
        };
      });

      setHabits(updated);
    } catch (err) {
      console.error(
        'Erro ao carregar hábitos:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const todaysHabits = useMemo(() => {
    return habits.filter(
      (habit) =>
        !habit.archived &&
        isHabitScheduledForDate(habit, today)
    );
  }, [habits, today]);

  const upcomingHabitGroups = useMemo(() => {
    const candidates = habits.filter(
      (habit) =>
        !habit.archived &&
        habit.frequency === 'specific_days' &&
        (habit.daysOfWeek?.length ?? 0) > 0
    );

    const groups: {
      date: string;
      habits: Habit[];
      label: string;
    }[] = [];

    for (let offset = 1; offset <= 7; offset += 1) {
      const date = addDays(today, offset);

      const scheduled = candidates.filter(
        (habit) =>
          date >= habit.startDate &&
          isHabitScheduledForDate(habit, date)
      );

      if (scheduled.length > 0) {
        groups.push({
          date,
          habits: scheduled,
          label: new Intl.DateTimeFormat(
            'pt-BR',
            {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            }
          ).format(parseYYYYMMDD(date)),
        });
      }
    }

    return groups;
  }, [habits, today]);

  const completedTodayCount = useMemo(() => {
    return todaysHabits.filter((habit) =>
      isHabitCompletedForDate(habit, today)
    ).length;
  }, [todaysHabits, today]);

  const totalTodayCount = todaysHabits.length;

  const progressPercent =
    totalTodayCount > 0
      ? Math.round(
          (completedTodayCount /
            totalTodayCount) *
            100
        )
      : 0;

  const handleToggleHabit = async (
    habitId: string,
    date: string = today
  ) => {
    const updatedHabits = habits.map((habit) => {
      if (habit.id !== habitId) {
        return habit;
      }

      const timesPerDay =
        getTimesPerDay(habit);

      const currentCount =
        getCompletionCount(habit, date);

      // 0 -> 1 -> 2 -> ... -> 0
      const nextCount =
        currentCount >= timesPerDay
          ? 0
          : currentCount + 1;

      const newCompletionCounts = {
        ...(habit.completionCounts || {}),
        [date]: nextCount,
      };

      const newCompletedDates =
        [...habit.completedDates];

      const existingDateIndex =
        newCompletedDates.indexOf(date);

      if (nextCount >= timesPerDay) {
        if (existingDateIndex === -1) {
          newCompletedDates.push(date);
        }
      } else if (existingDateIndex !== -1) {
        newCompletedDates.splice(
          existingDateIndex,
          1
        );
      }

      const tempHabit: Habit = {
        ...habit,
        completedDates: newCompletedDates,
        completionCounts:
          newCompletionCounts,
      };

      const { streak, bestStreak } =
        calculateStreaks(tempHabit);

      return {
        ...tempHabit,
        streak,
        bestStreak,
      };
    });

    setHabits(updatedHabits);

    const targetHabit = updatedHabits.find(
      (habit) => habit.id === habitId
    );

    if (targetHabit) {
      await StorageService.saveHabit(targetHabit);
    }
  };

  const handleSaveHabit = async (
    habitData: Partial<Habit>
  ) => {
    if (editingHabit) {
      const updated: Habit = {
        ...editingHabit,
        title:
          habitData.title ||
          editingHabit.title,
        frequency:
          habitData.frequency ||
          editingHabit.frequency,
        daysOfWeek:
          habitData.daysOfWeek ||
          editingHabit.daysOfWeek,
        startDate:
          habitData.startDate ||
          editingHabit.startDate,
        note:
          habitData.note ??
          editingHabit.note,
        timesPerDay: Math.max(
          1,
          habitData.timesPerDay ||
            editingHabit.timesPerDay ||
            1
        ),
        completionCounts:
          editingHabit.completionCounts ||
          {},
      };

      const { streak, bestStreak } =
        calculateStreaks(updated);

      const finalHabit = {
        ...updated,
        streak,
        bestStreak,
      };

      setHabits(
        habits.map((habit) =>
          habit.id === editingHabit.id
            ? finalHabit
            : habit
        )
      );

      await StorageService.saveHabit(
        finalHabit
      );
    } else {
      const newHabit: Habit = {
        id: `habit_${Date.now()}`,
        title: habitData.title || '',
        frequency:
          habitData.frequency || 'daily',
        daysOfWeek:
          habitData.daysOfWeek || [
            1, 2, 3, 4, 5, 6, 0,
          ],
        startDate:
          habitData.startDate || today,
        archived: false,
        streak: 0,
        bestStreak: 0,
        completedDates: [],
        completionCounts: {},
        timesPerDay: Math.max(
          1,
          habitData.timesPerDay || 1
        ),
        note: habitData.note,
        createdAt:
          new Date().toISOString(),
      };

      const { streak, bestStreak } =
        calculateStreaks(newHabit);

      const finalHabit = {
        ...newHabit,
        streak,
        bestStreak,
      };

      setHabits([
        ...habits,
        finalHabit,
      ]);

      await StorageService.saveHabit(
        finalHabit
      );
    }

    setEditingHabit(null);
  };

  const handleArchiveHabit = async (
    habitId: string
  ) => {
    const updated = habits.map((habit) =>
      habit.id === habitId
        ? { ...habit, archived: true }
        : habit
    );

    setHabits(updated);

    const target = updated.find(
      (habit) => habit.id === habitId
    );

    if (target) {
      await StorageService.saveHabit(
        target
      );
    }
  };

  const handleDeleteHabit = async (
    habitId: string
  ) => {
    setHabits(
      habits.filter(
        (habit) => habit.id !== habitId
      )
    );

    await StorageService.deleteHabitPermanently(
      habitId
    );
  };

  const renderCompletion = (
    habit: Habit,
    date: string
  ) => {
    const timesPerDay =
      getTimesPerDay(habit);

    const count = Math.min(
      getCompletionCount(habit, date),
      timesPerDay
    );

    const completed =
      count >= timesPerDay;

    if (timesPerDay === 1) {
      return (
        <button
          onClick={() =>
            void handleToggleHabit(
              habit.id,
              date
            )
          }
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
            completed
              ? 'bg-brand text-white shadow-md shadow-brand/30 scale-105'
              : 'border-2 border-gray-500 hover:border-brand text-transparent'
          }`}
          title={
            completed
              ? 'Desmarcar hábito'
              : 'Marcar como concluído'
          }
        >
          <Check
            size={14}
            strokeWidth={3}
            className={
              completed
                ? 'block'
                : 'hidden'
            }
          />
        </button>
      );
    }

    return (
      <button
        onClick={() =>
          void handleToggleHabit(
            habit.id,
            date
          )
        }
        className={`min-w-[48px] h-8 px-2 rounded-xl flex items-center justify-center text-[11px] font-bold transition-all duration-200 shrink-0 border ${
          completed
            ? 'bg-brand text-white border-brand shadow-md shadow-brand/20'
            : count > 0
              ? 'bg-brand/10 text-brand border-brand/40'
              : 'bg-[#18181b] text-gray-400 border-surface-border hover:border-brand/50'
        }`}
        title="Registrar uma vez"
      >
        {count}/{timesPerDay}
      </button>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Cabeçalho */}
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight leading-tight">
            Hábitos
          </h1>

          <p className="text-xs text-gray-400 mt-0.5">
            Desenvolva constância diariamente
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setIsHistoryOpen(true)
            }
            className="p-2.5 rounded-xl bg-[#18181b] border border-surface-border text-gray-300 hover:text-white hover:border-brand/40 transition-all"
            title="Ver Histórico"
          >
            <Calendar size={18} />
          </button>

          <button
            onClick={() => {
              setEditingHabit(null);
              setIsFormOpen(true);
            }}
            className="w-10 h-10 rounded-full bg-brand hover:bg-brand/90 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
            title="Adicionar hábito"
          >
            <Plus
              size={20}
              strokeWidth={2.5}
            />
          </button>
        </div>
      </div>

      {/* Progresso */}
      <div className="bg-[#121215] border border-surface-border rounded-2xl p-4 space-y-3">
        <div className="page-header flex justify-between items-start">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Progresso de Hoje
          </span>

          <span className="text-xs font-bold text-brand">
            {progressPercent}%
          </span>
        </div>

        <div className="w-full h-2.5 bg-[#18181b] rounded-full overflow-hidden border border-surface-border/50">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
            }}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-300 font-medium">
            {completedTodayCount} de{' '}
            {totalTodayCount}{' '}
            {totalTodayCount === 1
              ? 'hábito concluído'
              : 'hábitos concluídos'}
          </span>

          {totalTodayCount > 0 &&
            completedTodayCount ===
              totalTodayCount && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold animate-in fade-in">
                <Sparkles size={13} />
                Tudo feito!
              </span>
            )}
        </div>
      </div>

      {/* HOJE */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
          HOJE
        </h2>

        {loading ? (
          <div className="text-center py-8 text-xs text-gray-500">
            Carregando hábitos...
          </div>
        ) : todaysHabits.length === 0 ? (
          <div className="bg-[#121215] border border-surface-border/60 rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm font-medium text-gray-300">
              Nenhum hábito para hoje
            </p>

            <p className="text-xs text-gray-500">
              Clique em "+" acima para começar sua
              rotina.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todaysHabits.map((habit) => {
              const completed =
                isHabitCompletedForDate(
                  habit,
                  today
                );

              return (
                <div
                  key={habit.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                    completed
                      ? 'bg-brand/5 border-brand/20 text-gray-400'
                      : 'bg-[#121215] border-surface-border hover:border-surface-border/80 text-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {renderCompletion(
                      habit,
                      today
                    )}

                    <div className="min-w-0">
                      <span
                        className={`text-sm font-medium truncate block ${
                          completed
                            ? 'line-through text-gray-500'
                            : 'text-gray-200'
                        }`}
                      >
                        {habit.title}
                      </span>

                      {habit.note && (
                        <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                          {habit.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {habit.streak > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <Flame
                          size={12}
                          className="fill-amber-400"
                        />
                        <span>
                          {habit.streak}d
                        </span>
                      </div>
                    )}

                    {habit.bestStreak > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded-lg border border-yellow-500/20">
                        <Trophy
                          size={11}
                          className="text-yellow-400"
                        />
                        <span>
                          {habit.bestStreak}d
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setEditingHabit(habit);
                        setIsFormOpen(true);
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors"
                      title="Editar Hábito"
                    >
                      <Edit2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Próximos hábitos */}
      {upcomingHabitGroups.length > 0 && (
        <div className="space-y-3 pt-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            PRÓXIMOS HÁBITOS
          </h2>

          <div className="space-y-4">
            {upcomingHabitGroups.map(
              (group) => (
                <section
                  key={group.date}
                  className="space-y-2"
                >
                  <h3 className="text-[11px] font-semibold text-gray-500 px-1 capitalize">
                    {group.label}
                  </h3>

                  <div className="space-y-2.5">
                    {group.habits.map(
                      (habit) => {
                        const completed =
                          isHabitCompletedForDate(
                            habit,
                            group.date
                          );

                        return (
                          <div
                            key={`${group.date}-${habit.id}`}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
                              completed
                                ? 'bg-brand/5 border-brand/20 text-gray-400'
                                : 'bg-[#121215] border-surface-border text-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                              {renderCompletion(
                                habit,
                                group.date
                              )}

                              <div className="min-w-0">
                                <span
                                  className={`text-sm font-medium truncate block ${
                                    completed
                                      ? 'line-through text-gray-500'
                                      : 'text-gray-200'
                                  }`}
                                >
                                  {habit.title}
                                </span>

                                {habit.note && (
                                  <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                                    {habit.note}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setEditingHabit(
                                  habit
                                );
                                setIsFormOpen(
                                  true
                                );
                              }}
                              className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors shrink-0"
                              title="Editar Hábito"
                            >
                              <Edit2 size={15} />
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </section>
              )
            )}
          </div>
        </div>
      )}

      <HabitFormModal
        isOpen={isFormOpen}
        onClose={() =>
          setIsFormOpen(false)
        }
        onSave={handleSaveHabit}
        onArchive={handleArchiveHabit}
        onDelete={handleDeleteHabit}
        editingHabit={editingHabit}
      />

      <HabitHistoryModal
        isOpen={isHistoryOpen}
        onClose={() =>
          setIsHistoryOpen(false)
        }
        habits={habits}
      />
    </div>
  );
};