import React, { useMemo, useState } from 'react';
import { EventData, getRoomForEvent } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookmarkCheck, ChevronRight, ChevronDown, ChevronUp, AlertCircle, CalendarClock } from 'lucide-react';

interface Props {
  events: EventData[];
  onSelectEvent: (event: EventData) => void;
}

interface PreReservationItem {
  event: EventData;
  diffDays: number;
  statusBadge: string;
  statusColorClass: string;
  contextMessage: string;
  formattedDate: string;
  formattedTime: string;
}

export function PendingPreReservationsNotice({ events, onSelectEvent }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derived state: calculate pending pre-reservations purely in memory from existing events
  const pendingPreReservations = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const preReservations = events.filter(e => (!e.itemType || e.itemType === 'reserva') && e.reservationStatus === 'Pre-reserva');
    if (preReservations.length === 0) return [];

    const items: PreReservationItem[] = preReservations.map(event => {
      // Parse event date (YYYY-MM-DD)
      const [year, month, day] = event.date.split('-').map(Number);
      const eventDate = new Date(year, month - 1, day, 0, 0, 0);
      const diffMs = eventDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Pretty date formatting
      let formattedDate = '';
      try {
        formattedDate = format(eventDate, "d 'de' MMMM", { locale: es });
      } catch {
        formattedDate = event.date;
      }

      // 12-hour formatted start time
      let formattedTime = event.startTime;
      if (event.startTime && event.startTime.includes(':')) {
        const [h, m] = event.startTime.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        formattedTime = `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
      }

      // Determine smart status & message based on days difference
      let statusBadge = 'Pre-reserva pendiente';
      let statusColorClass = 'bg-amber-100 text-amber-900 border-amber-200';
      let contextMessage = `Tienes una pre-reserva pendiente para el ${formattedDate}.`;

      if (diffDays < 0) {
        statusBadge = 'Pre-reserva vencida';
        statusColorClass = 'bg-rose-100 text-rose-800 border-rose-200';
        contextMessage = 'La fecha del evento ya pasó y la reserva continúa como pre-reserva. Revisa su estado.';
      } else if (diffDays === 0) {
        statusBadge = 'Pre-reserva para hoy';
        statusColorClass = 'bg-amber-500 text-white border-amber-600 font-bold';
        contextMessage = 'El evento es hoy. Revisa si esta pre-reserva ya debe convertirse en una reserva confirmada.';
      } else if (diffDays >= 1 && diffDays <= 2) {
        statusBadge = 'Pre-reserva por confirmar';
        statusColorClass = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
        contextMessage = 'El evento es próximo. Revisa si esta pre-reserva ya debe convertirse en una reserva confirmada.';
      } else if (diffDays >= 3 && diffDays <= 7) {
        statusBadge = 'Pre-reserva próxima';
        statusColorClass = 'bg-amber-50 text-amber-800 border-amber-200';
        contextMessage = 'Esta pre-reserva se acerca. Si ya fue concretada, puedes confirmarla.';
      }

      return {
        event,
        diffDays,
        statusBadge,
        statusColorClass,
        contextMessage,
        formattedDate,
        formattedTime
      };
    });

    // Sort: nearest event date first -> furthest
    items.sort((a, b) => {
      if (a.event.date !== b.event.date) {
        return a.event.date.localeCompare(b.event.date);
      }
      return (a.event.startTime || '').localeCompare(b.event.startTime || '');
    });

    return items;
  }, [events]);

  // If no pre-reservations exist, render nothing (no intrusive space)
  if (pendingPreReservations.length === 0) {
    return null;
  }

  const totalCount = pendingPreReservations.length;
  const displayedItems = isExpanded ? pendingPreReservations : pendingPreReservations.slice(0, 3);
  const remainingCount = totalCount - 3;
  const hasUrgent = pendingPreReservations.some(item => item.diffDays <= 2);

  return (
    <section 
      aria-label="Pre-reservas pendientes de confirmación"
      className={`w-full bg-white/95 backdrop-blur-sm border rounded-2xl p-4 sm:p-5 mb-6 shadow-xs transition-all ${
        hasUrgent ? 'border-amber-300 shadow-amber-500/5' : 'border-amber-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-amber-100/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <BookmarkCheck size={18} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>🟡</span>
                <span>{totalCount === 1 ? 'Pre-reserva pendiente' : 'Pre-reservas pendientes'}</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {totalCount === 1 
                ? 'Tienes 1 pre-reserva que requiere seguimiento' 
                : `Tienes ${totalCount} pre-reservas próximas en agenda`}
            </p>
          </div>
        </div>

        {totalCount > 3 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-brand-blue hover:text-brand-orange flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
          >
            <span>{isExpanded ? 'Ver menos' : `Ver todas (${totalCount})`}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* List of Pre-reservations */}
      <div className="divide-y divide-slate-100 pt-1">
        {displayedItems.map(({ event, statusBadge, statusColorClass, contextMessage, formattedDate, formattedTime, diffDays }) => {
          const room = getRoomForEvent(event);
          const isUrgent = diffDays === 0;

          return (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className="py-3 sm:py-3.5 first:pt-2 last:pb-1 group hover:bg-amber-50/40 -mx-2 px-2.5 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectEvent(event);
                }
              }}
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-brand-blue group-hover:text-brand-orange transition-colors truncate">
                    {event.eventName}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border ${statusColorClass}`}>
                    {statusBadge}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <CalendarClock size={13} className="text-brand-orange/80" />
                    <span>{formattedDate}</span>
                    <span>·</span>
                    <span>{formattedTime}</span>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="truncate">{room?.name || 'Salón'}</span>
                  {event.clientName && (
                    <>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600 truncate">Cliente: {event.clientName}</span>
                    </>
                  )}
                </div>

                <p className={`text-[11px] font-medium leading-tight ${
                  isUrgent ? 'text-amber-900 font-semibold' : 'text-slate-500'
                }`}>
                  {diffDays < 0 && <AlertCircle size={12} className="inline mr-1 text-rose-500" />}
                  {contextMessage}
                </p>
              </div>

              {/* Action button / link */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0">
                <span className="sm:hidden text-[11px] text-slate-400 font-medium">
                  Toca para revisar
                </span>
                <div className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-100/70 group-hover:bg-brand-orange group-hover:text-white text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs">
                  <span>Ver pre-reserva</span>
                  <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer if more than 3 and not expanded */}
      {!isExpanded && remainingCount > 0 && (
        <div className="pt-2.5 mt-1 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-xs font-bold text-amber-800 hover:text-brand-orange transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-amber-50 inline-flex items-center gap-1"
          >
            <span>+ {remainingCount} pre-reserva{remainingCount > 1 ? 's' : ''} más</span>
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
