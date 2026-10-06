import React, { useMemo, useState } from 'react';
import { EventData, getRoomForEvent } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt, ChevronRight, ChevronDown, ChevronUp, CalendarClock, AlertCircle, Coins } from 'lucide-react';
import { User } from 'firebase/auth';

interface Props {
  events: EventData[];
  currentUser: User | null;
  usersProfile?: Record<string, { color?: string; displayName?: string; email?: string }>;
  onSelectEvent: (event: EventData) => void;
}

interface PaymentReminderItem {
  event: EventData;
  diffDays: number;
  totalCost: number;
  totalPaid: number;
  remainingBalance: number;
  statusBadge: string;
  statusColorClass: string;
  contextMessage: string;
  formattedDate: string;
  formattedTime: string;
}

export function PendingPaymentsNotice({ events, currentUser, usersProfile = {}, onSelectEvent }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derived state: calculate pending payments purely in memory from existing events
  const pendingPaymentReminders = useMemo(() => {
    if (!currentUser) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reminders: PaymentReminderItem[] = [];

    for (const event of events) {
      // 1. Only commercial reservations (respecting legacy documents without itemType)
      if (event.itemType && event.itemType !== 'reserva') {
        continue;
      }

      // 2. Filter strictly by reservation creator (createdBy matches current user UID or fallback name)
      const matchesUid = !!(event.createdBy && event.createdBy === currentUser.uid);
      let matchesCreatorName = false;

      if (!matchesUid && !event.createdBy && event.createdBy_Name) {
        const creatorName = event.createdBy_Name.trim().toLowerCase();
        const currentDisplayName = (currentUser.displayName || '').trim().toLowerCase();
        const currentEmail = (currentUser.email || '').trim().toLowerCase();
        const profileDisplayName = (usersProfile[currentUser.uid]?.displayName || '').trim().toLowerCase();

        if (currentDisplayName && creatorName === currentDisplayName) matchesCreatorName = true;
        else if (currentEmail && creatorName === currentEmail) matchesCreatorName = true;
        else if (profileDisplayName && creatorName === profileDisplayName) matchesCreatorName = true;
      }

      if (!matchesUid && !matchesCreatorName) {
        continue;
      }

      // 3. Valid date check
      if (!event.date || !event.date.includes('-')) {
        continue;
      }

      // 4. Financial evaluation: Must have totalCost, must have partial payment (Abono), and must have real pending balance
      const totalCost = Number(event.totalCost) || 0;
      if (totalCost <= 0) {
        continue;
      }

      const depositUSD = Number(event.depositUSD) || 0;
      const rawRate = Number(event.exchangeRate);
      const rate = (rawRate && !isNaN(rawRate) && rawRate > 0) ? rawRate : 1;
      const depositBSInUSD = event.depositBS ? (Number(event.depositBS) / rate) : 0;
      const totalPaid = depositUSD + depositBSInUSD;
      const remainingBalance = Math.max(0, totalCost - totalPaid);

      // Must be an Abono (> 0 paid) with real pending balance (> $0.01)
      if (totalPaid <= 0 || remainingBalance <= 0.01) {
        continue;
      }

      // 5. Temporal evaluation
      const [year, month, day] = event.date.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        continue;
      }

      const eventDate = new Date(year, month - 1, day, 0, 0, 0);
      const diffMs = eventDate.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Rule: Do not show as priority alert if more than 7 days in the future
      if (diffDays > 7) {
        continue;
      }

      // Pretty date formatting
      let formattedDate = '';
      try {
        formattedDate = format(eventDate, "d 'de' MMMM", { locale: es });
      } catch {
        formattedDate = event.date;
      }

      // 12-hour formatted start time
      let formattedTime = event.startTime || '';
      if (event.startTime && event.startTime.includes(':')) {
        const [h, m] = event.startTime.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        formattedTime = `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
      }

      // Determine smart status & message based on temporal context
      let statusBadge = 'Pago pendiente';
      let statusColorClass = 'bg-blue-50 text-blue-900 border-blue-200';
      let contextMessage = `El evento es el ${formattedDate}. Recuerda verificar si ya se completó el pago restante.`;

      if (diffDays < 0) {
        statusBadge = 'Pago pendiente de actualizar';
        statusColorClass = 'bg-rose-100 text-rose-800 border-rose-200';
        contextMessage = `La fecha del evento ya pasó (${formattedDate}) y aún figura saldo pendiente. Revisa si ya fue cancelado.`;
      } else if (diffDays === 0) {
        statusBadge = 'Revisar pago hoy';
        statusColorClass = 'bg-amber-500 text-white border-amber-600 font-bold';
        contextMessage = `El evento es hoy. Verifica si el cliente completó el saldo para actualizar a Pagado total.`;
      } else if (diffDays >= 1 && diffDays <= 2) {
        statusBadge = 'Revisar pago';
        statusColorClass = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
        contextMessage = `El evento es muy próximo (${formattedDate}). Recuerda verificar si ya se recibió el saldo restante.`;
      } else if (diffDays >= 3 && diffDays <= 7) {
        statusBadge = 'Pago pendiente';
        statusColorClass = 'bg-blue-50 text-blue-900 border-blue-200';
        contextMessage = `Evento en ${diffDays} días (${formattedDate}). Tiene un abono registrado con saldo pendiente.`;
      }

      reminders.push({
        event,
        diffDays,
        totalCost,
        totalPaid,
        remainingBalance,
        statusBadge,
        statusColorClass,
        contextMessage,
        formattedDate,
        formattedTime
      });
    }

    // Sort order: Past and today first (most urgent), then upcoming chronologically
    reminders.sort((a, b) => {
      if (a.event.date !== b.event.date) {
        return a.event.date.localeCompare(b.event.date);
      }
      return (a.event.startTime || '').localeCompare(b.event.startTime || '');
    });

    return reminders;
  }, [events, currentUser, usersProfile]);

  // If no pending payment reminders exist for current user, render nothing
  if (pendingPaymentReminders.length === 0) {
    return null;
  }

  const totalCount = pendingPaymentReminders.length;
  const displayedItems = isExpanded ? pendingPaymentReminders : pendingPaymentReminders.slice(0, 3);
  const remainingCount = totalCount - 3;
  const hasUrgent = pendingPaymentReminders.some(item => item.diffDays <= 2);

  return (
    <section 
      aria-label="Pagos por revisar"
      className={`w-full bg-white/95 backdrop-blur-sm border rounded-2xl p-4 sm:p-5 mb-5 shadow-xs transition-all ${
        hasUrgent ? 'border-emerald-300 shadow-emerald-500/5' : 'border-emerald-200/90'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-emerald-100/70">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Coins size={18} className="text-emerald-700" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>Pagos por revisar</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {totalCount}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {totalCount === 1 
                ? '1 reserva registrada por ti tiene saldo pendiente' 
                : `${totalCount} reservas registradas por ti tienen saldo pendiente`}
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

      {/* List of Payment Reminders */}
      <div className="divide-y divide-slate-100 pt-1">
        {displayedItems.map(({ event, statusBadge, statusColorClass, contextMessage, formattedDate, formattedTime, diffDays, remainingBalance, totalPaid, totalCost }) => {
          const room = getRoomForEvent(event);
          const isUrgent = diffDays <= 0;

          return (
            <div
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className="py-3 sm:py-3.5 first:pt-2 last:pb-1 group hover:bg-emerald-50/40 -mx-2 px-2.5 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
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
                  <h4 className="text-sm font-bold text-brand-blue group-hover:text-emerald-700 transition-colors truncate">
                    {event.eventName}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md border ${statusColorClass}`}>
                    {statusBadge}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                    Pendiente: ${remainingBalance.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <CalendarClock size={13} className="text-brand-orange/80" />
                    <span>{formattedDate}</span>
                    {formattedTime && (
                      <>
                        <span>·</span>
                        <span>{formattedTime}</span>
                      </>
                    )}
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="truncate">{room?.name || 'Salón'}</span>
                  {event.clientName && (
                    <>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600 truncate">Cliente: {event.clientName}</span>
                    </>
                  )}
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    Abonado: ${totalPaid.toFixed(2)} de ${totalCost.toFixed(2)}
                  </span>
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
                <div className="min-h-[38px] px-3 py-1.5 rounded-lg bg-emerald-100/70 group-hover:bg-emerald-600 group-hover:text-white text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs">
                  <span>Ver reserva</span>
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
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-emerald-50 inline-flex items-center gap-1"
          >
            <span>+ {remainingCount} reserva{remainingCount > 1 ? 's' : ''} más con saldo pendiente</span>
            <ChevronDown size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
