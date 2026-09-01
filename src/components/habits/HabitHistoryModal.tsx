import React, { useState } from 'react';
import type { Habit } from '../../types';
import { getTodayString, formatDateToYYYYMMDD, getDayOfWeekFromYYYYMMDD } from '../../utils/dateUtils';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface HabitHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
}

export const HabitHistoryModal: React.FC<HabitHistoryModalProps> = ({
  isOpen,
  onClose,
  habits,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(getTodayString());

  if (!isOpen) return null;

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const habitsForSelectedDate = habits.filter((h) => {
    if (selectedDateStr < h.startDate) return false;
    if (h.frequency === 'daily') return true;
    if (h.frequency === 'specific_days' && h.daysOfWeek) {
      const dow = getDayOfWeekFromYYYYMMDD(selectedDateStr);
      return h.daysOfWeek.includes(dow as any);
    }
    return true;
  });

  return (
    <div data-swipe-ignore="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-md bg-[#121215] border border-surface-border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl transition-all max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-surface-border/50 shrink-0">
          <h2 className="text-base font-semibold text-gray-100">Histórico de Hábitos</h2>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo com Rolagem Própria */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Mês e Navegação */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-200 uppercase tracking-wide">
              {monthNames[month]} {year}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-[#18181b] border border-surface-border text-gray-400 hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-[#18181b] border border-surface-border text-gray-400 hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Grade do Calendário */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-gray-500 py-1">
                {d}
              </span>
            ))}

            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = formatDateToYYYYMMDD(new Date(year, month, dayNum));
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === getTodayString();
              const completedCount = habits.filter((h) => h.completedDates.includes(dateStr)).length;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-9 rounded-lg flex flex-col items-center justify-center text-xs relative transition-all ${
                    isSelected
                      ? 'bg-brand text-white font-bold ring-2 ring-brand/40'
                      : isToday
                      ? 'bg-brand/20 text-brand font-semibold border border-brand/30'
                      : 'bg-[#18181b]/60 text-gray-300 hover:bg-[#18181b]'
                  }`}
                >
                  <span>{dayNum}</span>
                  {completedCount > 0 && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Resumo do Dia Selecionado */}
          <div className="bg-[#18181b] rounded-xl p-3 border border-surface-border/50">
            <div className="text-[11px] font-medium text-gray-400 mb-2 uppercase tracking-wide">
              {selectedDateStr === getTodayString() ? 'Hoje' : selectedDateStr}
            </div>

            {habitsForSelectedDate.length === 0 ? (
              <p className="text-xs text-gray-500 py-1">Nenhum hábito programado para este dia.</p>
            ) : (
              <div className="space-y-1.5">
                {habitsForSelectedDate.map((habit) => {
                  const isCompleted = habit.completedDates.includes(selectedDateStr);
                  return (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-[#121215]/60 border border-surface-border/30"
                    >
                      <span className={isCompleted ? 'text-gray-400 line-through' : 'text-gray-200'}>
                        {habit.title}
                      </span>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <Check size={12} /> Concluído
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500">Pendente</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};