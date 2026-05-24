import React, { useMemo } from 'react';
import { EventData, ROOMS } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

interface CalendarGridProps {
  events: EventData[];
  usersConfig: Record<string, string>;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

export function CalendarGrid({ events, usersConfig, selectedDateStr, onSelectDate, currentDate, setCurrentDate }: CalendarGridProps) {
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  
  const formattedMonth = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const totalDailyCapacity = useMemo(() => ROOMS.reduce((acc, r) => acc + r.capacity, 0), []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col p-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue border border-brand-blue/20">
            <CalendarIcon size={18} />
          </div>
          <h2 className="text-xl font-display font-semibold text-brand-blue capitalize">{formattedMonth}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2.5 rounded-full hover:bg-slate-50 text-brand-blue transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2.5 rounded-full hover:bg-slate-50 text-brand-blue transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-4 gap-x-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dayName => (
          <div key={dayName} className="text-center text-xs font-medium text-slate-400 mb-2">
            {dayName}
          </div>
        ))}
        
        {blanks.map((_, index) => (
          <div key={`blank-${index}`} className="min-h-[48px] flex items-center justify-center opacity-0" />
        ))}
        
        {days.map(dayNum => {
          const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const dayEventsList = events.filter(e => e.date === dateString);
          const isToday = new Date().toISOString().split('T')[0] === dateString;
          const isSelected = selectedDateStr === dateString;

          const totalAttendees = dayEventsList.reduce((acc, e) => acc + (e.attendees || 0), 0);
          const showWarning = totalAttendees >= totalDailyCapacity * 0.8;

          // Deduplicate users for dots
          const dotColors = Array.from(new Set(dayEventsList.map(e => usersConfig[e.createdBy] || ROOMS.find(r => r.id === e.roomId)?.dotColor || '#182865'))).slice(0, 4);

          return (
            <button 
              key={dayNum} 
              onClick={() => onSelectDate(dateString)}
              className={`flex flex-col items-center justify-start min-h-[56px] min-w-[48px] rounded-xl transition-all focus:outline-none py-1 group relative ${showWarning && !isSelected ? 'bg-orange-50/50' : ''}`}
            >
              {showWarning && (
                <div className="absolute top-0 right-0 -mr-1 -mt-1 text-brand-orange bg-white rounded-full">
                  <AlertTriangle size={12} strokeWidth={3} className="fill-brand-orange/20" />
                </div>
              )}
              <div className={`w-9 h-9 flex justify-center items-center rounded-full text-sm font-medium transition-colors mb-1.5
                ${isSelected ? 'bg-brand-blue text-white shadow-sm' : 
                  isToday ? 'bg-brand-orange/10 text-brand-orange' : 'text-slate-700 group-hover:bg-slate-50'}`
              }>
                {dayNum}
              </div>
              
              <div className="flex justify-center gap-1 min-h-[6px]">
                {dotColors.map((color, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
