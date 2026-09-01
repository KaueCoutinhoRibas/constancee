import React, { useState, useEffect } from 'react';
import type { Task, TaskPriority } from '../../types';
import { getTodayString } from '../../utils/dateUtils';
import { X, Trash2, Clock3 } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  editingTask: Task | null;
  initialDate?: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingTask,
  initialDate,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDate(editingTask.date);
      setTime(editingTask.time || '');
      setPriority(editingTask.priority);
    } else {
      setTitle('');
      setDate(initialDate || getTodayString());
      setTime('');
      setPriority('normal');
    }
    setShowConfirmDelete(false);
  }, [editingTask, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      date,
      time: time || undefined,
      priority,
    });
    onClose();
  };

  const handleDelete = () => {
    if (editingTask && onDelete) {
      onDelete(editingTask.id);
      onClose();
    }
  };

  return (
    <div data-swipe-ignore="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121215] border border-surface-border w-full max-w-md rounded-2xl p-5 space-y-5 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-100">
            {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Nome da Tarefa *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Entregar trabalho de Java"
              className="w-full bg-[#18181b] border border-surface-border rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 truncate">
                Data *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#18181b] border border-surface-border rounded-xl px- py-2.5 text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 truncate">
                Horário (Opcional)
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#18181b] border border-surface-border rounded-xl px- py-2.5 text-xs sm:text-sm text-gray-100 focus:outline-none focus:border-brand transition-colors"
                />
                {time && (
                  <button type="button" onClick={() => setTime('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-500 hover:text-white" title="Remover horário">
                    <X size={14} />
                  </button>
                )}
              </div>
              {time && <p className="mt-1 text-[10px] text-gray-600 flex items-center gap-1"><Clock3 size={11} /> Toque no X para remover</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
              Prioridade
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'important', 'urgent'] as TaskPriority[]).map((p) => {
                const labels = { normal: 'Normal', important: 'Importante', urgent: 'Urgente' };
                const isSelected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      isSelected
                        ? p === 'urgent'
                          ? 'bg-red-500/10 border-red-500/50 text-red-400'
                          : p === 'important'
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                          : 'bg-brand/10 border-brand/50 text-brand'
                        : 'bg-[#18181b] border-surface-border text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {editingTask && onDelete ? (
              showConfirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-2 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
                  >
                    Excluir?
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  title="Excluir tarefa"
                >
                  <Trash2 size={18} />
                </button>
              )
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-xl transition-all shadow-md active:scale-95"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};