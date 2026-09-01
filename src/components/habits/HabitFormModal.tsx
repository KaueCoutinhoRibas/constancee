import React, { useState, useEffect, useRef } from 'react';
import type { Habit, FrequencyType, DayOfWeek } from '../../types';
import { getTodayString } from '../../utils/dateUtils';
import { X, Calendar, AlertCircle, Check } from 'lucide-react';

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
  onArchive?: (habitId: string) => void;
  onDelete?: (habitId: string) => void;
  editingHabit?: Habit | null;
}

const DAYS: { id: DayOfWeek; label: string }[] = [
  { id: 1, label: 'SEG' },
  { id: 2, label: 'TER' },
  { id: 3, label: 'QUA' },
  { id: 4, label: 'QUI' },
  { id: 5, label: 'SEX' },
  { id: 6, label: 'SÁB' },
  { id: 0, label: 'DOM' },
];

export const HabitFormModal: React.FC<HabitFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onArchive,
  onDelete,
  editingHabit,
}) => {
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('daily');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([
    1, 2, 3, 4, 5, 6, 0,
  ]);
  const [startDate, setStartDate] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [timesPerDay, setTimesPerDay] = useState(1);

  const [
    viewportState,
    setViewportState,
  ] = useState<{ height: number; offsetTop: number } | null>(null);

  const modalContentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (editingHabit) {
      setTitle(editingHabit.title);
      setFrequency(editingHabit.frequency);
      setSelectedDays(
        editingHabit.daysOfWeek || [1, 2, 3, 4, 5, 6, 0]
      );
      setStartDate(editingHabit.startDate || getTodayString());
      setNote(editingHabit.note || '');
      setTimesPerDay(
        Math.max(1, Math.min(10, editingHabit.timesPerDay || 1))
      );
    } else {
      setTitle('');
      setFrequency('daily');
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
      setStartDate(getTodayString());
      setNote('');
      setTimesPerDay(1);
    }

    setError('');
    setShowConfirmDelete(false);
  }, [editingHabit, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const viewport = window.visualViewport;

    const keepFocusedFieldVisible = () => {
      const active = document.activeElement;

      if (
        !(active instanceof HTMLElement) ||
        !modalContentRef.current?.contains(active)
      ) {
        return;
      }

      window.requestAnimationFrame(() => {
        active.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'smooth',
        });
      });
    };

    const update = () => {
      setViewportState({
        height: viewport?.height ?? window.innerHeight,
        offsetTop: viewport?.offsetTop ?? 0,
      });

      keepFocusedFieldVisible();
    };

    update();

    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    const firstFocusTimer = window.setTimeout(
      keepFocusedFieldVisible,
      350
    );

    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.clearTimeout(firstFocusTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDay = (dayId: DayOfWeek) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length === 1) return;

      setSelectedDays(
        selectedDays.filter((d) => d !== dayId)
      );
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Por favor, digite o nome do hábito.');
      return;
    }

    onSave({
      title: title.trim(),
      frequency,
      daysOfWeek:
        frequency === 'specific_days'
          ? selectedDays
          : [1, 2, 3, 4, 5, 6, 0],
      startDate,
      note: note.trim() || undefined,
      timesPerDay: Math.max(
        1,
        Math.min(10, Number(timesPerDay) || 1)
      ),
    });

    onClose();
  };

  return (
    <div
      data-swipe-ignore="true"
      className="fixed left-0 right-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm transition-opacity"
      style={{
        top: viewportState
          ? `${viewportState.offsetTop}px`
          : 0,
        height: viewportState
          ? `${viewportState.height}px`
          : '100dvh',
        paddingBottom:
          'max(0px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        ref={modalContentRef}
        className="w-full max-w-md bg-[#121215] border border-surface-border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl transition-all overflow-y-auto overscroll-contain"
        style={{
          maxHeight: viewportState
            ? `${Math.max(
                220,
                viewportState.height - 12
              )}px`
            : 'calc(100dvh - 12px)',
          paddingBottom:
            'max(1.5rem, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-surface-border/50">
          <h2 className="text-base font-semibold text-gray-100">
            {editingHabit ? 'Editar Hábito' : 'Novo Hábito'}
          </h2>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome */}
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Nome do Hábito
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);

                if (error) {
                  setError('');
                }
              }}
              placeholder="Ex: Beber água, Ler 20 minutos..."
              className="w-full block bg-[#18181b] border border-surface-border rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-gray-600 box-border"
              autoFocus
              ref={titleInputRef}
              onFocus={() => {
                window.setTimeout(() => {
                  titleInputRef.current?.scrollIntoView({
                    block: 'center',
                    inline: 'nearest',
                    behavior: 'smooth',
                  });
                }, 350);
              }}
            />
          </div>

          {/* Frequência */}
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Frequência
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFrequency('daily')}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
                  frequency === 'daily'
                    ? 'bg-brand/15 text-brand border border-brand/40 font-semibold'
                    : 'bg-[#18181b] text-gray-400 border border-surface-border hover:text-gray-200'
                }`}
              >
                Todos os dias
              </button>

              <button
                type="button"
                onClick={() =>
                  setFrequency('specific_days')
                }
                className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
                  frequency === 'specific_days'
                    ? 'bg-brand/15 text-brand border border-brand/40 font-semibold'
                    : 'bg-[#18181b] text-gray-400 border border-surface-border hover:text-gray-200'
                }`}
              >
                Dias específicos
              </button>
            </div>
          </div>

          {/* Dias específicos */}
          {frequency === 'specific_days' && (
            <div className="w-full animate-in fade-in duration-150">
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Selecione os dias
              </label>

              <div className="flex justify-between gap-1">
                {DAYS.map((d) => {
                  const isSelected =
                    selectedDays.includes(d.id);

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'bg-brand text-white shadow-sm shadow-brand/30'
                          : 'bg-[#18181b] text-gray-500 border border-surface-border hover:text-gray-300'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vezes por dia */}
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Vezes por dia
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setTimesPerDay(
                    Math.max(1, timesPerDay - 1)
                  )
                }
                className="w-11 h-11 rounded-xl bg-[#18181b] border border-surface-border text-gray-300 hover:text-white hover:border-brand/40 text-lg"
              >
                −
              </button>

              <div className="flex-1 h-11 rounded-xl bg-[#18181b] border border-surface-border flex items-center justify-center text-sm font-semibold text-gray-100">
                {timesPerDay}
              </div>

              <button
                type="button"
                onClick={() =>
                  setTimesPerDay(
                    Math.min(10, timesPerDay + 1)
                  )
                }
                className="w-11 h-11 rounded-xl bg-[#18181b] border border-surface-border text-gray-300 hover:text-white hover:border-brand/40 text-lg"
              >
                +
              </button>
            </div>

            <p className="text-[11px] text-gray-600 mt-1.5">
              Ex.: 2 significa que você precisa concluir
              este hábito duas vezes no dia.
            </p>
          </div>

          {/* Nota */}
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Nota{' '}
              <span className="normal-case font-normal text-gray-600">
                (opcional)
              </span>
            </label>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Alguma observação sobre este hábito..."
              rows={2}
              className="w-full block bg-[#18181b] border border-surface-border rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-brand transition-colors placeholder:text-gray-600 box-border resize-none"
            />
          </div>

          {/* Data de início */}
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} />
              Data de Início
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) =>
                setStartDate(e.target.value)
              }
              className="w-full block bg-[#18181b] border border-surface-border rounded-xl px-4 py-2.5 text-gray-200 text-sm focus:outline-none focus:border-brand transition-colors box-border text-center appearance-none"
            />
          </div>

          {/* Salvar / ações */}
          <div className="pt-2 flex flex-col items-end gap-3">
            <button
              type="submit"
              className="w-12 h-12 rounded-full bg-brand hover:bg-brand/90 text-white flex items-center justify-center transition-all shadow-lg shadow-brand/30 active:scale-95"
              title="Salvar Hábito"
            >
              <Check size={22} strokeWidth={2.5} />
            </button>

            {editingHabit && onArchive && (
              <div className="flex gap-2 w-full pt-3 border-t border-surface-border/40">
                <button
                  type="button"
                  onClick={() => {
                    onArchive(editingHabit.id);
                    onClose();
                  }}
                  className="flex-1 bg-[#18181b] hover:bg-amber-500/10 hover:text-amber-400 border border-surface-border text-gray-400 py-2.5 rounded-xl text-xs font-medium transition-colors"
                >
                  Arquivar Hábito
                </button>

                {onDelete && !showConfirmDelete && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmDelete(true)
                    }
                    className="px-4 bg-[#18181b] hover:bg-red-500/10 hover:text-red-400 border border-surface-border text-gray-500 py-2.5 rounded-xl text-xs font-medium transition-colors"
                  >
                    Excluir
                  </button>
                )}

                {onDelete && showConfirmDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(editingHabit.id);
                      onClose();
                    }}
                    className="px-4 bg-red-500/20 text-red-400 border border-red-500/30 py-2.5 rounded-xl text-xs font-semibold transition-colors animate-in fade-in"
                  >
                    Confirmar?
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};