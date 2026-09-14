import type { NotificationPreferences } from '../types';
import { StorageService } from '../storage/db';
import { getTodayString, getDayOfWeekFromYYYYMMDD } from '../utils/dateUtils';
import { isHabitScheduledForDate } from '../utils/streakUtils';

const SENT_KEY = 'constancia-notifications-sent';
const defaults: NotificationPreferences = { habits:true,tasks:true,workouts:true,goals:true,habitsTime:'20:00',workoutsTime:'18:00',goalsTime:'20:00' };

export const getNotificationPreferences = (p?: NotificationPreferences): NotificationPreferences => ({ ...defaults, ...(p || {}) });
const allowed = () => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
const sent = (): Record<string,number> => { try { return JSON.parse(localStorage.getItem(SENT_KEY) || '{}'); } catch { return {}; } };
const show = (title:string, body:string, key:string) => {
  if (!allowed()) return;
  const data=sent(); if(data[key]) return;
  new Notification(title,{body,icon:'/pwa-192x192.png',badge:'/pwa-192x192.png'});
  data[key]=Date.now(); localStorage.setItem(SENT_KEY,JSON.stringify(data));
};
const matches=(time:string,now:Date) => { const [h,m]=time.split(':').map(Number); return Number.isFinite(h)&&Number.isFinite(m)&&h===now.getHours()&&m===now.getMinutes(); };

export const checkNotifications = async () => {
  if (!allowed()) return;
  const settings=await StorageService.getSettings(); if(!settings?.notifications) return;
  const p=getNotificationPreferences(settings.notificationPreferences), now=new Date(), today=getTodayString();
  const [habits,tasks,templates,goals]=await Promise.all([StorageService.getHabits(),StorageService.getTasks(),StorageService.getWorkoutTemplates(),StorageService.getGoals()]);
  if(p.habits && matches(p.habitsTime,now)){
    const pending=habits.filter(h=>!h.archived&&isHabitScheduledForDate(h,today)&&!h.completedDates.includes(today));
    if(pending.length) show('Constância — hábitos',pending.length===1?'Você ainda tem 1 hábito pendente hoje.':`Você ainda tem ${pending.length} hábitos pendentes hoje.`,`habits:${today}`);
  }
  if(p.tasks){
    const current=now.getHours()*60+now.getMinutes();
    tasks.filter(t=>t.date===today&&!t.completed&&t.time).forEach(t=>{
      const [h,m]=t.time!.split(':').map(Number), target=h*60+m;
      if(target-current===30) show('Constância — tarefa',`“${t.title}” está marcada para ${t.time}.`,`task:${t.id}:${today}`);
    });
  }
  if(p.workouts && matches(p.workoutsTime,now)){
    const template=templates.find(t=>t.dayOfWeek===getDayOfWeekFromYYYYMMDD(today));
    if(template&&!template.isRestDay) show('Constância — treino',`Hoje tem ${template.name||'treino'}. Bora manter a constância!`,`workout:${today}`);
  }
  if(p.goals && now.getDay()===0 && matches(p.goalsTime,now)){
    const count=goals.filter(g=>g.status==='active').length;
    if(count) show('Constância — metas',`Você tem ${count} ${count===1?'meta ativa':'metas ativas'} para acompanhar.`,`goals:${today}`);
  }
};
let timer:number|null=null;
export const startNotificationScheduler=()=>{ if(timer!==null||typeof window==='undefined')return()=>{}; void checkNotifications(); timer=window.setInterval(()=>void checkNotifications(),30000); const onVisibility=()=>{if(document.visibilityState==='visible')void checkNotifications();}; document.addEventListener('visibilitychange',onVisibility); return()=>{if(timer!==null)clearInterval(timer);timer=null;document.removeEventListener('visibilitychange',onVisibility);}; };
