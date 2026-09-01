import React from 'react';
import type { Task } from '../../types';
import { Check, Clock, AlertCircle, Edit2 } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onEdit,
  onDragStart,
}) => {
  const priorityBadges = {
    normal: null,
    important: (
      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
        Importante
      </span>
    ),
    urgent: (
      <span className="flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
        <AlertCircle size={12} />
        Urgente
      </span>
    ),
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${
        task.completed
          ? 'bg-brand/5 border-brand/20 text-gray-400 opacity-75'
          : 'bg-[#121215] border-surface-border hover:border-surface-border/80 text-gray-100'
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        {/* Botão Check */}
        <button
          onClick={() => onToggle(task.id)}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${
            task.completed
              ? 'bg-brand text-white shadow-md shadow-brand/30 scale-105'
              : 'border-2 border-gray-500 hover:border-brand text-transparent'
          }`}
        >
          <Check size={14} strokeWidth={3} className={task.completed ? 'block animate-in zoom-in-50 duration-150' : 'hidden'} />
        </button>

        {/* Título e Horário */}
        <div className="flex flex-col min-w-0" onClick={() => onToggle(task.id)}>
          <span
            className={`text-sm font-medium cursor-pointer truncate transition-all ${
              task.completed ? 'line-through text-gray-500' : 'text-gray-200'
            }`}
          >
            {task.title}
          </span>
          {task.time && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <Clock size={12} />
              <span>{task.time}</span>
            </div>
          )}
        </div>
      </div>

      {/* Prioridade e Ação */}
      <div className="flex items-center gap-3 shrink-0">
        {priorityBadges[task.priority]}

        <button
          onClick={() => onEdit(task)}
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors"
          title="Editar tarefa"
        >
          <Edit2 size={15} />
        </button>
      </div>
    </div>
  );
};