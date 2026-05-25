import React, { useMemo, useEffect, useState } from 'react';
import { EventData } from '../types';
import { CalendarClock } from 'lucide-react';

interface Props {
  events: EventData[];
}

export function NextEventCounter({ events }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Update every minute (or even every second if you want seconds later)
    const timer = setInterval(() => setNow(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const nextEvent = useMemo(() => {
    const upcomingEvents = events
      .map(event => {
        const [year, month, day] = event.date.split('-').map(Number);
        const [hours, minutes] = event.startTime.split(':').map(Number);
        const eventDate = new Date(year, month - 1, day, hours, minutes);
        return { ...event, eventDate };
      })
      .filter(e => e.eventDate > now)
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

    return upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  }, [events, now]);

  const timeRemaining = useMemo(() => {
    if (!nextEvent) return null;
    const diff = nextEvent.eventDate.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);

    return { days, hours, minutes };
  }, [nextEvent, now]);

  if (!nextEvent) {
    return (
      <div className="w-full bg-white/60 backdrop-blur-md border border-slate-100 rounded-2xl p-5 mb-8 shadow-sm flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
          <CalendarClock size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-500">Próximo Evento</h3>
          <p className="text-sm text-slate-400">No hay próximos eventos programados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/80 backdrop-blur-xl border-l-[6px] border-l-brand-orange border-y border-r border-slate-100 rounded-2xl p-5 mb-8 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
      {/* Subtle background decoration */}
      <div className="absolute -right-12 -top-12 w-32 h-32 bg-brand-blue/5 rounded-full blur-2xl group-hover:bg-brand-blue/10 transition-colors pointer-events-none"></div>
      
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-full bg-brand-blue/5 flex items-center justify-center text-brand-blue shrink-0">
          <CalendarClock size={24} />
        </div>
        <div>
          <span className="text-xs font-bold text-brand-orange uppercase tracking-wider mb-1 block">Siguiente en Agenda</span>
          <h3 className="text-lg font-display font-bold text-brand-blue leading-tight truncate max-w-[200px] sm:max-w-xs">{nextEvent.eventName}</h3>
          <p className="text-sm font-medium text-slate-500 truncate max-w-[200px] sm:max-w-xs">{nextEvent.clientName}</p>
        </div>
      </div>

      <div className="relative z-10 bg-brand-blue px-5 py-3 rounded-xl shadow-sm self-start sm:self-auto border border-brand-blue/20 flex flex-col items-center sm:items-end w-max">
        <span className="text-[10px] font-bold text-brand-orange uppercase tracking-widest mb-1.5 opacity-90">Inicia en</span>
        {timeRemaining && (
          <div className="flex items-center gap-3 text-white font-display">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold leading-none">{timeRemaining.days.toString().padStart(2, '0')}</span>
              <span className="text-[10px] text-white/60 font-medium mt-1">DÍAS</span>
            </div>
            <span className="text-white/40 pb-3 font-mono">:</span>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold leading-none">{timeRemaining.hours.toString().padStart(2, '0')}</span>
              <span className="text-[10px] text-white/60 font-medium mt-1">HRS</span>
            </div>
            <span className="text-white/40 pb-3 font-mono">:</span>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold leading-none">{timeRemaining.minutes.toString().padStart(2, '0')}</span>
              <span className="text-[10px] text-white/60 font-medium mt-1">MIN</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
