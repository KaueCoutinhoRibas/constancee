import React,{useEffect,useState} from 'react';
import { ChevronRight, Target } from 'lucide-react';
import type { Goal } from '../../types';
import { StorageService } from '../../storage/db';

export const GoalsSummary:React.FC<{onOpen?:()=>void}> = ({onOpen}) => {
 const [goals,setGoals]=useState<Goal[]>([]);
 useEffect(()=>{StorageService.getGoals().then(data=>setGoals(data.filter(g=>g.status==='active').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,3))).catch(()=>{}); const fn=()=>{StorageService.getGoals().then(data=>setGoals(data.filter(g=>g.status==='active').slice(0,3))).catch(()=>{})};window.addEventListener('constancia-local-data-changed',fn);return()=>window.removeEventListener('constancia-local-data-changed',fn)},[]);
 if(!goals.length)return null;
 return <section className="space-y-2.5"><div className="flex items-center justify-between px-1"><div><h2 className="text-sm font-semibold text-gray-100">Suas metas</h2><p className="text-[11px] text-gray-600 mt-0.5">Continue avançando</p></div>{onOpen&&<button onClick={onOpen} className="text-xs text-brand flex items-center gap-0.5">Ver todas<ChevronRight size={14}/></button>}</div><div className="space-y-2">{goals.map(g=><div key={g.id} onClick={onOpen} className="bg-surface-card border border-surface-border rounded-2xl p-3.5 cursor-pointer"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0"><Target size={17}/></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><span className="text-sm font-medium text-gray-200 truncate">{g.title}</span><span className="text-[11px] text-gray-500">{g.progress}%</span></div><div className="h-1.5 bg-surface-hover rounded-full overflow-hidden mt-2"><div className="h-full bg-brand rounded-full" style={{width:`${g.progress}%`}}/></div></div></div></div>)}</div></section>;
};
