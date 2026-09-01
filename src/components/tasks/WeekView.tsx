import React from 'react';
import type { Task } from '../../types';

interface WeekViewProps {
  weekDays: { dateStr: string; dayName: string; dayNumber: string; isToday: boolean }[];
  selectedDate: string;
  tasks: Task[];
  onSelectDate: (dateStr: string) => void;
  onDropTaskOnDate: (taskId: string, targetDate: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  weekDays,
  selectedDate,
  tasks,
  onSelectDate,
  onDropTaskOnDate,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDropTaskOnDate(taskId, targetDate);
      onSelectDate(targetDate); // <- Altera visualmente a visualização para o dia de destino na hora
    }
  };

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekDays.map((day) => {
        const dayTasks = tasks.filter((t) => t.date === day.dateStr);
        const count = dayTasks.length;
        const isSelected = day.dateStr === selectedDate;

        return (
          <div
            key={day.dateStr}
            onClick={() => onSelectDate(day.dateStr)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day.dateStr)}
            className={`flex flex-col items-center justify-between py-3 px-1 rounded-2xl border transition-all cursor-pointer ${
              isSelected
                ? 'bg-brand/15 border-brand text-white shadow-lg'
                : day.isToday
                ? 'bg-[#18181b] border-brand/40 text-gray-200'
                : 'bg-[#121215] border-surface-border text-gray-400 hover:border-gray-700'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">{day.dayName}</span>
            <span className="text-base font-extrabold my-1">{day.dayNumber}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                count > 0 ? 'bg-brand/20 text-brand-light' : 'text-gray-600'
              }`}
            >
              {count} {count === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
        );
      })}
    </div>
  );
};