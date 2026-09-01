import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Goal } from '../../types';

interface GoalFormModalProps {
  goal?: Goal | null;
  onClose: () => void;
  onSave: (goal: Goal) => Promise<void> | void;
}

const makeId = () => `goal_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const imageToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();
      image.onload = () => {
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(source); return; }
        const sx = (image.naturalWidth - size) / 2;
        const sy = (image.naturalHeight - size) / 2;
        ctx.drawImage(image, sx, sy, size, size, 0, 0, 720, 720);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.onerror = () => resolve(source);
      image.src = source;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const GoalFormModal: React.FC<GoalFormModalProps> = ({ goal, onClose, onSave }) => {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [imageUrl, setImageUrl] = useState(goal?.imageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(goal?.title ?? '');
    setDescription(goal?.description ?? '');
    setTargetDate(goal?.targetDate ?? '');
    setProgress(goal?.progress ?? 0);
    setImageUrl(goal?.imageUrl ?? '');
  }, [goal]);

  const handleImage = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 12 * 1024 * 1024) {
      window.alert('Escolha uma imagem de até 12 MB.');
      return;
    }
    try {
      setImageUrl(await imageToDataUrl(file));
    } catch {
      window.alert('Não foi possível carregar a imagem.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    setSaving(true);
    try {
      await onSave({
        id: goal?.id ?? makeId(),
        title: clean,
        description: description.trim() || undefined,
        status: goal?.status ?? 'active',
        imageUrl: imageUrl || undefined,
        targetDate: targetDate || undefined,
        progress: Math.min(100, Math.max(0, progress)),
        createdAt: goal?.createdAt ?? new Date().toISOString(),
      });
      onClose();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      window.alert('Não foi possível salvar a meta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-swipe-ignore="true" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-md bg-surface-card border border-surface-border rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-100">{goal ? 'Editar meta' : 'Nova meta'}</h2>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-xl hover:bg-surface-hover"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label-base">Nome</label><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" placeholder="Ex.: Economizar R$ 5.000" required /></div>
          <div><label className="label-base">Descrição <span className="normal-case font-normal text-gray-600">(opcional)</span></label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-base min-h-20 resize-none" placeholder="O que você quer alcançar?" /></div>
          <div>
            <label className="label-base">Imagem <span className="normal-case font-normal text-gray-600">(opcional)</span></label>
            <button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-xl border border-dashed border-surface-border bg-[#18181b] hover:bg-surface-hover transition-colors overflow-hidden aspect-square max-h-64 flex items-center justify-center">
              {imageUrl ? <img src={imageUrl} alt="Imagem da meta" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center justify-center gap-2 text-gray-500 text-xs"><ImagePlus size={22} />Adicionar imagem</span>}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleImage(e.target.files?.[0])} />
            {imageUrl && <button type="button" onClick={() => setImageUrl('')} className="text-xs text-gray-500 hover:text-white mt-1.5">Remover imagem</button>}
          </div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label-base">Prazo <span className="normal-case font-normal text-gray-600">(opcional)</span></label><input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="input-base" /></div><div><label className="label-base">Progresso</label><div className="flex items-center gap-2"><input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="input-base" /><span className="text-sm text-gray-500">%</span></div></div></div>
          <div className="pt-1 flex justify-end gap-2"><button type="button" onClick={onClose} className="button-secondary">Cancelar</button><button disabled={saving || !title.trim()} type="submit" className="button-primary disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar meta'}</button></div>
        </form>
      </div>
    </div>
  );
};
