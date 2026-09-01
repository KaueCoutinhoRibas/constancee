import React, { useState, useEffect, useMemo } from 'react';
import type { Task } from '../types';
import { StorageService } from '../storage/db';
import { getTodayString } from '../utils/dateUtils';
import { TaskFormModal } from '../components/tasks/TaskFormModal';
import { TaskItem } from '../components/tasks/TaskItem';
import { WeekView } from '../components/tasks/WeekView';
import { Plus, Sparkles, Calendar, CheckCircle2 } from 'lucide-react';

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const todayStr = getTodayString();

  // Carregar tarefas do IndexedDB
  const loadTasks = async () => {
    try {
      const data = await StorageService.getTasks();
      setTasks(data);
    } catch (err) {
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  // Datas da semana atual
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay; // Ajustar para começar na segunda

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const days = [];
    const dayNames = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        dateStr,
        dayName: dayNames[i],
        dayNumber: day,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [todayStr]);

  // Data exibida no topo
  const formattedHeaderDate = useMemo(() => {
    const dateParts = selectedDate.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);

    const dateObj = new Date(year, month, day);

    const dayName = dateObj
      .toLocaleDateString('pt-BR', { weekday: 'long' })
      .toUpperCase();
    const monthName = dateObj
      .toLocaleDateString('pt-BR', { month: 'long' })
      .toUpperCase();

    return {
      dayName,
      formattedStr: `${day} DE ${monthName}`,
    };
  }, [selectedDate]);

  // Filtrar tarefas do dia selecionado
  const activeDateTasks = useMemo(() => {
    const filtered = tasks.filter((t) => t.date === selectedDate);

    // Ordenação: 1. Horário, 2. Prioridade (urgente > important > normal), 3. Não concluídas antes
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;

      const priorityOrder = { urgent: 0, important: 1, normal: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks, selectedDate]);

  // Progresso do Dia
  const completedCount = activeDateTasks.filter((t) => t.completed).length;
  const totalCount = activeDateTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle Conclusão
  const handleToggleTask = async (id: string) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, completed: !t.completed, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    setTasks(updated);

    const target = updated.find((t) => t.id === id);
    if (target) {
      await StorageService.saveTask(target);
    }
  };

  // Criar ou Editar Tarefa
  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      const updated: Task = {
        ...editingTask,
        title: taskData.title || editingTask.title,
        date: taskData.date || editingTask.date,
        time: taskData.time,
        priority: taskData.priority || editingTask.priority,
        updatedAt: new Date().toISOString(),
      };

      setTasks(tasks.map((t) => (t.id === editingTask.id ? updated : t)));
      await StorageService.saveTask(updated);
    } else {
      const newTask: Task = {
        id: `task_${Date.now()}`,
        title: taskData.title || '',
        date: taskData.date || selectedDate,
        time: taskData.time,
        priority: taskData.priority || 'normal',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTasks([...tasks, newTask]);
      await StorageService.saveTask(newTask);
    }

    setEditingTask(null);
  };

  // Excluir Tarefa
  const handleDeleteTask = async (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
    await StorageService.deleteTaskPermanently(taskId);
  };

  // Drag and Drop (Mover tarefa entre dias)
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDropTaskOnDate = async (taskId: string, targetDate: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, date: targetDate, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    setTasks(updated);

    const target = updated.find((t) => t.id === taskId);
    if (target) {
      await StorageService.saveTask(target);
    }
  };

  return (
    <div className="space-y-6 pb-6 max-w-md mx-auto">
      {/* Cabeçalho Nivelado */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100 tracking-tight leading-tight">
            Tarefas
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Organize seu dia a dia</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Visão HOJE / SEMANA */}
          <div className="flex bg-[#18181b] border border-surface-border rounded-xl p-1 gap-1">
            <button
              onClick={() => {
                setViewMode('today');
                setSelectedDate(todayStr);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'today'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Semana
            </button>
          </div>

          {/* Botão de Adicionar (Manter o padrão idêntico) */}
          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="w-10 h-10 rounded-full bg-brand hover:bg-brand/90 text-white flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
            title="Adicionar Tarefa"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Visualização da Semana */}
      {viewMode === 'week' && (
        <WeekView
          weekDays={weekDays}
          selectedDate={selectedDate}
          tasks={tasks}
          onSelectDate={(d) => setSelectedDate(d)}
          onDropTaskOnDate={handleDropTaskOnDate}
        />
      )}

      {/* Título do Dia Selecionado */}
      <div className="bg-[#121215] border border-surface-border/80 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="text-brand" size={20} />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
              {formattedHeaderDate.dayName}
            </span>
            <h2 className="text-sm font-bold text-gray-100">
              {formattedHeaderDate.formattedStr}
            </h2>
          </div>
        </div>

        <span className="text-xs text-gray-400">
          {totalCount} {totalCount === 1 ? 'tarefa' : 'tarefas'}
        </span>
      </div>

      {/* Card de Progresso */}
      <div className="bg-[#121215] border border-surface-border rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Progresso do Dia
          </span>
          <span className="text-xs font-bold text-brand">{progressPercent}%</span>
        </div>

        <div className="w-full h-2.5 bg-[#18181b] rounded-full overflow-hidden border border-surface-border/50">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-300 font-medium">
            {completedCount} de {totalCount} {totalCount === 1 ? 'tarefa concluída' : 'tarefas concluídas'}
          </span>

          {totalCount > 0 && completedCount === totalCount && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold animate-in fade-in">
              <Sparkles size={13} /> Tudo feito!
            </span>
          )}
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-8 text-xs text-gray-500">Carregando tarefas...</div>
        ) : activeDateTasks.length === 0 ? (
          <div className="bg-[#121215] border border-surface-border/60 rounded-2xl p-8 text-center space-y-2">
            <CheckCircle2 size={28} className="mx-auto text-gray-600 mb-1" />
            <p className="text-sm font-medium text-gray-300">Nenhuma tarefa para este dia</p>
            <p className="text-xs text-gray-500">
              Clique no botão + acima para adicionar uma nova tarefa.
            </p>
          </div>
        ) : (
          activeDateTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={handleToggleTask}
              onEdit={(t) => {
                setEditingTask(t);
                setIsModalOpen(true);
              }}
              onDragStart={handleDragStart}
            />
          ))
        )}
      </div>

      {/* Modal Formulário */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        editingTask={editingTask}
        initialDate={selectedDate}
      />
    </div>
  );
};