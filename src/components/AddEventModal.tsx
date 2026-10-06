import React, { useState, FormEvent, useEffect, useRef, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Clock, Users, User, UserCheck, Layout, Tags, Trash2, CalendarHeart, MessageCircle, Plus, Info, HelpCircle, RotateCcw, CalendarDays, CheckCircle2, BookmarkCheck, DollarSign, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { EVENT_TYPES, ROOMS, EventData, EventType, RoomLayout, getRoomForEvent, AgendaItemType } from '../types';

interface Props {
  onClose: () => void;
  selectedDateStr: string;
  editingEvent?: EventData | null;
  initialItemType?: AgendaItemType;
  usersProfile?: Record<string, { color?: string; displayName?: string; email?: string }>;
}

export function formatClientName(value: string): string {
  if (!value) return '';

  // Prevent consecutive duplicate spaces without removing trailing spaces while typing
  const cleanSpaces = value.replace(/  +/g, ' ');

  return cleanSpaces
    .split(' ')
    .map(word => {
      if (!word) return '';

      // Preserve words with intentional mixed casing where a lowercase letter is followed later by an uppercase letter
      // Examples: iPhone, McDonald's, e-Commerce, FedEx, eBay
      if (/[a-zñáéíóúü].*[A-ZÑÁÉÍÓÚÜ]/.test(word)) {
        return word;
      }

      // Preserve acronyms with dots (e.g. C.A., S.A., S.R.L.)
      if (/^[A-ZÑÁÉÍÓÚÜ](\.[A-ZÑÁÉÍÓÚÜ])+\.?$/.test(word)) {
        return word;
      }

      // Handle hyphenated words (e.g. Jean-Luc, Gomez-Navarro)
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => {
            if (!part) return '';
            if (/[a-zñáéíóúü].*[A-ZÑÁÉÍÓÚÜ]/.test(part)) return part;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('-');
      }

      // Standard capitalization: First letter uppercase, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function AddEventModal({ onClose, selectedDateStr, editingEvent, initialItemType, usersProfile }: Props) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSetup, setShowSetup] = useState(window.innerWidth >= 768);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Small delay to ensure the DOM is painted and CSS transition is triggered
    const frame = requestAnimationFrame(() => {
      setIsOpen(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };
  
  const [itemType, setItemType] = useState<AgendaItemType>(() => {
    if (editingEvent) return editingEvent.itemType || 'reserva';
    return initialItemType || 'reserva';
  });
  const [assignedTo, setAssignedTo] = useState(editingEvent?.assignedTo ?? '');
  const [isReminderCompleted, setIsReminderCompleted] = useState(editingEvent?.isCompleted ?? false);
  
  const [eventName, setEventName] = useState(editingEvent?.eventName ?? '');
  const [clientName, setClientName] = useState(() => formatClientName(editingEvent?.clientName ?? ''));
  const [clientPhone, setClientPhone] = useState(editingEvent?.clientPhone ?? '');
  const [type, setType] = useState<EventType | ''>(editingEvent?.type ?? '');
  const [customType, setCustomType] = useState('');
  const [roomId, setRoomId] = useState(() => {
    if (!editingEvent) return '';
    const r = getRoomForEvent(editingEvent);
    return r ? r.id : (editingEvent.roomId || '');
  });
  const [modalFloorFilter, setModalFloorFilter] = useState<'Todos' | 'Planta Baja' | 'Mezzanina'>('Todos');
  const [attendees, setAttendees] = useState<number | ''>(editingEvent?.attendees ?? '');
  const [date, setDate] = useState(editingEvent?.date ?? '');
  const [isMultiDateMode, setIsMultiDateMode] = useState(false);
  const [additionalDates, setAdditionalDates] = useState<string[]>([]);
  const [customDateSchedules, setCustomDateSchedules] = useState<Record<string, { startTime: string; endTime: string }>>({});
  const [editingScheduleDate, setEditingScheduleDate] = useState<string | null>(null);
  const [customDateInput, setCustomDateInput] = useState('');
  const [startTime, setStartTime] = useState(editingEvent?.startTime ?? '');
  const [endTime, setEndTime] = useState(editingEvent?.endTime ?? '');
  const [reservationStatus, setReservationStatus] = useState<'Confirmada' | 'Pre-reserva'>(
    editingEvent?.reservationStatus ?? 'Confirmada'
  );
  const [salesRep, setSalesRep] = useState<string>(() => {
    // 1. When editing an existing reservation, ALWAYS preserve its original advisor attribution!
    if (editingEvent) {
      if (editingEvent.salesRep && editingEvent.salesRep.trim() !== '') {
        const clean = editingEvent.salesRep.trim();
        const norm = clean.toLowerCase();
        if (norm === 'laura' || norm === 'laura gomez') return 'Laura';
        if (norm === 'yoanelis' || norm === 'yoanelis suarez') return 'Yoanelis';
        if (norm === 'juan' || norm === 'juan medina') return 'Juan';
        if (norm === 'directo' || norm === 'directo / coworking' || norm === 'otro') return 'Directo';
        return clean;
      }
      
      // If legacy event without explicit salesRep, resolve from creator UID / email / name
      const creatorUid = editingEvent.createdBy;
      const creatorProfile = creatorUid && usersProfile ? usersProfile[creatorUid] : undefined;
      const creatorEmail = (creatorProfile?.email || '').toLowerCase().trim();
      const creatorUsername = creatorEmail.split('@')[0];
      const creatorName = (creatorProfile?.displayName || editingEvent.createdBy_Name || '').trim().toLowerCase();

      if (creatorEmail === 'jumesco@gmail.com' || creatorUsername === 'juan' || creatorUsername.startsWith('juan.') || creatorUsername.startsWith('juan_') || creatorName === 'juan' || creatorName === 'juan medina') {
        return 'Juan';
      }
      if (creatorUsername === 'laura' || creatorUsername.startsWith('laura.') || creatorUsername.startsWith('laura_') || creatorName === 'laura' || creatorName === 'laura gomez') {
        return 'Laura';
      }
      if (creatorUsername === 'yoanelis' || creatorUsername.startsWith('yoanelis.') || creatorUsername.startsWith('yoanelis_') || creatorName === 'yoanelis' || creatorName === 'yoanelis suarez') {
        return 'Yoanelis';
      }
      return 'Directo';
    }

    // 2. When creating a NEW reservation, default to the active session user
    const email = (auth?.currentUser?.email || '').toLowerCase().trim();
    const username = email.split('@')[0];
    const name = (auth?.currentUser?.displayName || '').toLowerCase().trim();
    if (email === 'jumesco@gmail.com' || username === 'juan' || username.startsWith('juan.') || username.startsWith('juan_') || name === 'juan' || name === 'juan medina') return 'Juan';
    if (username === 'laura' || username.startsWith('laura.') || username.startsWith('laura_') || name === 'laura' || name === 'laura gomez') return 'Laura';
    if (username === 'yoanelis' || username.startsWith('yoanelis.') || username.startsWith('yoanelis_') || name === 'yoanelis' || name === 'yoanelis suarez') return 'Yoanelis';
    return 'Directo';
  });
  const [isConfirmingReservation, setIsConfirmingReservation] = useState(false);

  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(editingEvent?.date ?? selectedDateStr ?? '');
  const [rescheduleStartTime, setRescheduleStartTime] = useState(editingEvent?.startTime ?? '09:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState(editingEvent?.endTime ?? '18:00');
  const [rescheduling, setRescheduling] = useState(false);

  const getPreReservaAgeText = (createdAt?: number) => {
    if (!createdAt) return null;
    const now = Date.now();
    const diffMs = Math.max(0, now - createdAt);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays <= 0) {
      if (diffHours <= 0) return 'Pre-reserva registrada hoy';
      return `Pre-reserva registrada hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    }
    if (diffDays === 1) return 'Pre-reserva registrada hace 1 día';
    return `Pre-reserva registrada hace ${diffDays} días`;
  };

  const handleConfirmReservation = async () => {
    if (!editingEvent || !db || isConfirmingReservation) return;

    setIsConfirmingReservation(true);
    try {
      await updateDoc(doc(db, 'events', editingEvent.id), {
        reservationStatus: 'Confirmada'
      });
      setReservationStatus('Confirmada');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Reserva confirmada',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('Error confirming reservation:', err);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo confirmar la reserva. Intenta nuevamente.',
        icon: 'error',
        confirmButtonColor: '#182865'
      });
    } finally {
      setIsConfirmingReservation(false);
    }
  };

  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showUnsavedWarningModal, setShowUnsavedWarningModal] = useState(false);
  const [showMarkPaidConfirmModal, setShowMarkPaidConfirmModal] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const handleExecuteMarkAsPaid = async () => {
    if (!editingEvent || !db || isMarkingPaid) return;
    const newUSD = Number((parsedUSD + remainingBalance).toFixed(2));
    setIsMarkingPaid(true);
    setShowMarkPaidConfirmModal(false);
    try {
      await updateDoc(doc(db, 'events', editingEvent.id), {
        depositUSD: newUSD
      });
      setDepositUSD(newUSD);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Reserva marcada como Pagada Total',
        showConfirmButton: false,
        timer: 2000
      });
    } catch (err) {
      console.error('Error al marcar pagado total:', err);
      Swal.fire({
        title: 'Error',
        text: 'No se pudo actualizar el pago. Intenta nuevamente.',
        icon: 'error',
        confirmButtonColor: '#182865'
      });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const formatDatePretty = (dStr?: string) => {
    if (!dStr) return '';
    try {
      const [y, m, d] = dStr.split('-').map(Number);
      if (!y || !m || !d) return dStr;
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      return format(dt, "d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return dStr;
    }
  };

  const getScheduleForDate = (d: string) => {
    if (customDateSchedules[d]) {
      return customDateSchedules[d];
    }
    return { startTime, endTime };
  };

  const handleSetCustomSchedule = (d: string, newStart: string, newEnd: string) => {
    setCustomDateSchedules(prev => ({
      ...prev,
      [d]: { startTime: newStart, endTime: newEnd }
    }));
  };

  const handleResetCustomSchedule = (d: string) => {
    setCustomDateSchedules(prev => {
      const copy = { ...prev };
      delete copy[d];
      return copy;
    });
  };

  const handleAddCustomDate = () => {
    if (!customDateInput) return;
    if (customDateInput !== date && !additionalDates.includes(customDateInput)) {
      setAdditionalDates(prev => [...prev, customDateInput].sort());
      setCustomDateInput('');
    }
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setAdditionalDates(prev => prev.filter(d => d !== dateToRemove));
    setCustomDateSchedules(prev => {
      const copy = { ...prev };
      delete copy[dateToRemove];
      return copy;
    });
    if (editingScheduleDate === dateToRemove) {
      setEditingScheduleDate(null);
    }
  };

  const handleAddWeeklyDate = (weeksAhead: number) => {
    if (!date) return;
    const baseDateObj = new Date(`${date}T12:00:00`);
    baseDateObj.setDate(baseDateObj.getDate() + (weeksAhead * 7));
    const yyyy = baseDateObj.getFullYear();
    const mm = String(baseDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(baseDateObj.getDate()).padStart(2, '0');
    const formattedStr = `${yyyy}-${mm}-${dd}`;
    if (formattedStr !== date && !additionalDates.includes(formattedStr)) {
      setAdditionalDates(prev => [...prev, formattedStr].sort());
    }
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const original = input.value;
    const cursor = input.selectionStart;
    const formatted = formatClientName(original);

    setClientName(formatted);

    // If spaces were collapsed, keep cursor at appropriate spot
    if (cursor !== null && original.length !== formatted.length) {
      const diff = original.length - formatted.length;
      const newPos = Math.max(0, cursor - diff);
      requestAnimationFrame(() => {
        input.setSelectionRange(newPos, newPos);
      });
    }
  };
  const [roomLayout, setRoomLayout] = useState<RoomLayout | ''>(() => {
    const layout = editingEvent?.roomLayout as string | undefined;
    if (!layout) return '';
    if (layout === 'School') return 'Escuela';
    if (layout === 'Theater') return 'Auditorio';
    if (layout === 'U-Shape') return 'Mesa en U';
    if (layout === 'Boardroom') return 'Directorio';
    return layout as RoomLayout;
  });
  const [customRoomLayout, setCustomRoomLayout] = useState('');
  const [notes, setNotes] = useState(editingEvent?.notes ?? '');
  const [resources, setResources] = useState({
    water: editingEvent?.resources?.water ?? false,
    coffee: editingEvent?.resources?.coffee ?? false,
    napkins: editingEvent?.resources?.napkins ?? false,
    tv: editingEvent?.resources?.tv ?? false,
  });

  // --- FINANZAS / PAGOS ---
  const [totalCost, setTotalCost] = useState<number | ''>(editingEvent?.totalCost ?? '');
  const [depositUSD, setDepositUSD] = useState<number | ''>(editingEvent?.depositUSD ?? '');
  const [depositBS, setDepositBS] = useState<number | ''>(editingEvent?.depositBS ?? '');
  const [exchangeRate, setExchangeRate] = useState<number | ''>(editingEvent?.exchangeRate ?? '');
  const [isTrustedClient, setIsTrustedClient] = useState<boolean>(editingEvent?.isTrustedClient ?? false);

  const parsedTotalCost = Number(totalCost) || 0;
  const parsedUSD = Number(depositUSD) || 0;
  const parsedBS = Number(depositBS) || 0;
  const parsedRate = Number(exchangeRate) || 1;

  const isCostValid = totalCost !== '' && parsedTotalCost > 0;
  const isRateValid = parsedBS > 0 ? (exchangeRate !== '' && parsedRate > 0) : true;

  const totalDepositUSD = parsedUSD + (parsedBS / parsedRate);
  const remainingBalance = parsedTotalCost - totalDepositUSD;

  // The 20% rule
  const minRequiredDeposit = parsedTotalCost * 0.20;
  const hasMet20Percent = totalDepositUSD >= minRequiredDeposit;
  const showTrustedToggle = parsedTotalCost > 0 && !hasMet20Percent;
  
  // Bug fix: If trusted client is checked, bypass the 20% requirement.
  const isFormValidFinancially = isCostValid && isRateValid && (hasMet20Percent || isTrustedClient);

  // Snapshot initial values for unsaved changes detection
  const initialStateRef = useRef({
    itemType: editingEvent ? (editingEvent.itemType || 'reserva') : (initialItemType || 'reserva'),
    eventName: editingEvent?.eventName ?? '',
    clientName: formatClientName(editingEvent?.clientName ?? ''),
    clientPhone: editingEvent?.clientPhone ?? '',
    type: editingEvent?.type ?? '',
    roomId: editingEvent ? (getRoomForEvent(editingEvent)?.id || editingEvent.roomId || '') : '',
    attendees: editingEvent?.attendees ?? '',
    date: editingEvent?.date ?? '',
    startTime: editingEvent?.startTime ?? '',
    endTime: editingEvent?.endTime ?? '',
    roomLayout: editingEvent?.roomLayout ?? '',
    resources: editingEvent?.resources ? { ...editingEvent.resources } : { tv: false },
    notes: editingEvent?.notes ?? '',
    totalCost: editingEvent?.totalCost !== undefined && editingEvent?.totalCost !== null ? editingEvent.totalCost : '',
    depositUSD: editingEvent?.depositUSD !== undefined && editingEvent?.depositUSD !== null ? editingEvent.depositUSD : '',
    depositBS: editingEvent?.depositBS !== undefined && editingEvent?.depositBS !== null ? editingEvent.depositBS : '',
    exchangeRate: editingEvent?.exchangeRate !== undefined && editingEvent?.exchangeRate !== null ? editingEvent.exchangeRate : '',
    isTrustedClient: Boolean(editingEvent?.isTrustedClient),
    reservationStatus: editingEvent?.reservationStatus ?? 'Confirmada',
    salesRep: editingEvent?.salesRep ?? '',
    assignedTo: editingEvent?.assignedTo ?? '',
    isReminderCompleted: Boolean(editingEvent?.isCompleted)
  });

  const isDirty = useMemo(() => {
    const init = initialStateRef.current;
    if (!editingEvent) {
      if (eventName.trim() !== '') return true;
      if (clientName.trim() !== '') return true;
      if (clientPhone.trim() !== '') return true;
      if (notes.trim() !== '') return true;
      if (assignedTo.trim() !== '') return true;
      if (salesRep.trim() !== '') return true;
      if (attendees !== '' && attendees !== 0) return true;
      if (totalCost !== '' && totalCost !== 0) return true;
      if (depositUSD !== '' && depositUSD !== 0) return true;
      if (depositBS !== '' && depositBS !== 0) return true;
      if (additionalDates.length > 0) return true;
      if (customType.trim() !== '') return true;
      if (customRoomLayout.trim() !== '') return true;
      if (resources.tv !== false) return true;
      return false;
    }

    if (itemType !== init.itemType) return true;
    if (eventName.trim() !== init.eventName.trim()) return true;
    if (date !== init.date) return true;
    if (startTime !== init.startTime) return true;
    if (notes.trim() !== init.notes.trim()) return true;

    if (itemType === 'recordatorio') {
      if (assignedTo.trim() !== init.assignedTo.trim()) return true;
      if (Boolean(isReminderCompleted) !== Boolean(init.isReminderCompleted)) return true;
      return false;
    }

    if (itemType === 'reunion') {
      if (endTime !== init.endTime) return true;
      if ((roomId || '') !== (init.roomId || '')) return true;
      if (String(attendees) !== String(init.attendees)) return true;
      if (clientName.trim() !== init.clientName.trim()) return true;
      if (clientPhone.trim() !== init.clientPhone.trim()) return true;
      return false;
    }

    // Reserva
    if (endTime !== init.endTime) return true;
    if (clientName.trim() !== init.clientName.trim()) return true;
    if (clientPhone.trim() !== init.clientPhone.trim()) return true;
    if (type !== init.type) return true;
    if (customType.trim() !== '') return true;
    if ((roomId || '') !== (init.roomId || '')) return true;
    if (String(attendees) !== String(init.attendees)) return true;
    if (roomLayout !== init.roomLayout) return true;
    if (customRoomLayout.trim() !== '') return true;
    if (reservationStatus !== init.reservationStatus) return true;
    if ((salesRep || '') !== (init.salesRep || '')) return true;
    if (Boolean(isTrustedClient) !== Boolean(init.isTrustedClient)) return true;

    const curTotal = totalCost === '' ? 0 : Number(totalCost);
    const initTotal = init.totalCost === '' ? 0 : Number(init.totalCost);
    if (curTotal !== initTotal) return true;

    const curUSD = depositUSD === '' ? 0 : Number(depositUSD);
    const initUSD = init.depositUSD === '' ? 0 : Number(init.depositUSD);
    if (curUSD !== initUSD) return true;

    const curBS = depositBS === '' ? 0 : Number(depositBS);
    const initBS = init.depositBS === '' ? 0 : Number(init.depositBS);
    if (curBS !== initBS) return true;

    const curRate = exchangeRate === '' ? 0 : Number(exchangeRate);
    const initRate = init.exchangeRate === '' ? 0 : Number(init.exchangeRate);
    if (curRate !== initRate) return true;

    if (Boolean(resources.tv) !== Boolean(init.resources.tv)) return true;

    return false;
  }, [
    editingEvent, itemType, eventName, clientName, clientPhone, type, customType,
    roomId, attendees, date, startTime, endTime, roomLayout, customRoomLayout,
    resources, notes, totalCost, depositUSD, depositBS, exchangeRate, isTrustedClient,
    reservationStatus, salesRep, assignedTo, isReminderCompleted, additionalDates
  ]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedWarningModal(true);
    } else {
      handleClose();
    }
  };

  // Action: Generate ICS File
  const generateICS = () => {
    if (!date || !startTime || !endTime || !eventName) return;
    const startObj = new Date(`${date}T${startTime}:00`);
    const endObj = new Date(`${date}T${endTime}:00`);
    
    const formatDateObj = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const roomName = ROOMS.find(r => r.id === roomId)?.name || 'Zona Coworking';

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Zona Coworking//Agenda//ES
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${eventName} - ${clientName}
DTSTART:${formatDateObj(startObj)}
DTEND:${formatDateObj(endObj)}
LOCATION:${roomName}
DESCRIPTION:${notes || 'Reserva confirmada en Zona Coworking. Tipo: ' + (type === 'Otros' ? customType : type)}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reserva_${eventName.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action: Send WhatsApp Report
  const sendWhatsApp = () => {
    if (!date || !startTime || !endTime || !eventName || !roomId) return;
    const roomName = ROOMS.find(r => r.id === roomId)?.name || 'Espacio';
    const formattedDate = format(new Date(`${date}T12:00:00`), 'EEEE, d \'de\' MMMM', { locale: es });
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    const finalType = type === 'Otros' ? customType : type;
    const statusLabel = reservationStatus === 'Pre-reserva' ? '🟡 Pre-reserva Pendiente' : '⚡ Confirmado y Sincronizado';

    const message = `📊 *REPORTES ZONA COWORKING* 📊\n📅 *Fecha:* ${capitalizedDate}\n\n🚪 *Espacio:* ${roomName}\n👥 *Evento:* ${eventName} (${finalType})\n👥 *Asistencia Planeada:* ${attendees} personas\n⏰ *Horario:* ${startTime} - ${endTime}\n\n🛠️ *Servicios y Notas Extra:*\n${notes || (resources.water || resources.coffee || resources.tv ? 'Incluye recursos logísticos estándar.' : 'Ninguna nota especial.')}\n\n*Estado:* ${statusLabel}.`;
    
    const encodedUri = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedUri}`, '_blank');
  };
  
  const checkCollisionsForDates = async (datesToCheck: string[]): Promise<string[] | null> => {
    if (itemType === 'recordatorio') return null;
    if (itemType === 'reunion' && (!roomId || roomId === 'none' || !roomId.trim())) return null;
    if (!roomId || roomId === 'none' || !roomId.trim()) return null;

    if (!db) return null;
    const eventsRef = collection(db, 'events');
    const conflicts: string[] = [];

    for (const d of datesToCheck) {
      const { startTime: dStart, endTime: dEnd } = getScheduleForDate(d);
      if (!dStart || !dEnd) continue;

      const q = query(eventsRef, where('date', '==', d));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        if (editingEvent && docSnap.id === editingEvent.id) return;

        const existing = docSnap.data() as EventData;
        if (existing.itemType === 'recordatorio') return;

        const existingRoom = getRoomForEvent(existing);
        if (existingRoom && existingRoom.id === roomId) {
          if (existing.startTime && existing.endTime && dStart < existing.endTime && dEnd > existing.startTime) {
            const formattedDate = format(new Date(`${d}T12:00:00`), 'EEEE d/MM/yyyy', { locale: es });
            const isReunion = existing.itemType === 'reunion';
            const isPre = existing.reservationStatus === 'Pre-reserva';
            const statusLabel = isReunion ? 'Reunión de equipo' : (isPre ? 'Pre-reserva pendiente' : 'Ocupado por');
            conflicts.push(`${formattedDate} (${dStart} - ${dEnd}) (${statusLabel}: "${existing.eventName}")`);
          }
        }
      });
    }

    return conflicts.length > 0 ? conflicts : null;
  };

  const checkCollisionsForReschedule = async (targetDate: string, targetStart: string, targetEnd: string): Promise<string[] | null> => {
    if (!db || !editingEvent) return null;
    if (itemType === 'recordatorio') return null;
    if (itemType === 'reunion' && (!roomId || roomId === 'none' || !roomId.trim())) return null;
    if (!roomId || roomId === 'none' || !roomId.trim()) return null;

    const eventsRef = collection(db, 'events');
    const conflicts: string[] = [];

    const q = query(eventsRef, where('date', '==', targetDate));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((docSnap) => {
      if (docSnap.id === editingEvent.id) return;

      const existing = docSnap.data() as EventData;
      if (existing.itemType === 'recordatorio') return;

      const existingRoom = getRoomForEvent(existing);
      if (existingRoom && existingRoom.id === roomId) {
        if (existing.startTime && existing.endTime && targetStart < existing.endTime && targetEnd > existing.startTime) {
          const formattedDate = format(new Date(`${targetDate}T12:00:00`), 'EEEE d/MM/yyyy', { locale: es });
          const isReunion = existing.itemType === 'reunion';
          const isPre = existing.reservationStatus === 'Pre-reserva';
          const statusLabel = isReunion ? 'Reunión de equipo' : (isPre ? 'Pre-reserva pendiente' : 'Ocupado por');
          conflicts.push(`${formattedDate} (${targetStart} - ${targetEnd}) (${statusLabel}: "${existing.eventName}")`);
        }
      }
    });

    return conflicts.length > 0 ? conflicts : null;
  };

  const handleExecuteReschedule = async () => {
    if (!editingEvent || !db) return;

    if (!rescheduleDate) {
      Swal.fire({
        title: 'Fecha Requerida',
        text: 'Por favor selecciona la nueva fecha para reprogramar el evento.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return;
    }

    if (!rescheduleStartTime || !rescheduleEndTime) {
      Swal.fire({
        title: 'Horario Requerido',
        text: 'Por favor especifica la hora de inicio y fin para la nueva fecha.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return;
    }

    if (rescheduleStartTime >= rescheduleEndTime) {
      Swal.fire({
        title: 'Horario Inválido',
        text: 'La hora de fin debe ser posterior a la hora de inicio.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return;
    }

    setRescheduling(true);
    try {
      const conflicts = await checkCollisionsForReschedule(rescheduleDate, rescheduleStartTime, rescheduleEndTime);
      if (conflicts && conflicts.length > 0) {
        Swal.fire({
          title: 'Conflicto de Horario Detectado',
          html: `
            <div class="text-left text-sm text-slate-700">
              <p class="mb-2 font-medium">El salón ${ROOMS.find(r => r.id === roomId)?.name || ''} ya está ocupado en la nueva fecha:</p>
              <ul class="list-disc pl-5 text-red-600 font-bold space-y-1 font-sans">
                ${conflicts.map(c => `<li>${c}</li>`).join('')}
              </ul>
            </div>
          `,
          icon: 'error',
          confirmButtonColor: '#182865'
        });
        setRescheduling(false);
        return;
      }

      const formatDateObj = (dStr: string) => {
        try {
          const [y, m, d] = dStr.split('-').map(Number);
          const dt = new Date(y, m - 1, d, 12, 0, 0);
          return format(dt, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
        } catch {
          return dStr;
        }
      };

      const currentFormatted = formatDateObj(editingEvent.date);
      const newFormatted = formatDateObj(rescheduleDate);
      const origDate = editingEvent.originalDate || editingEvent.date;

      const confirmResult = await Swal.fire({
        title: '¿Reprogramar este evento?',
        html: `
          <div class="text-left text-sm space-y-3 font-sans">
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Fecha Actual</span>
              <p class="font-bold text-slate-800 capitalize">${currentFormatted}</p>
              <p class="text-xs text-slate-500 font-medium">${editingEvent.startTime} - ${editingEvent.endTime}</p>
            </div>
            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span class="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-0.5">Nueva Fecha Reagendada 🔄</span>
              <p class="font-bold text-amber-900 capitalize">${newFormatted}</p>
              <p class="text-xs text-amber-700 font-medium">${rescheduleStartTime} - ${rescheduleEndTime}</p>
            </div>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Se conservará la fecha original (${formatDateObj(origDate)}) como historial.
            </p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, Reprogramar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#FF9305',
        cancelButtonColor: '#182865',
        customClass: {
          popup: 'rounded-3xl',
          confirmButton: 'rounded-xl font-bold px-5 py-2.5',
          cancelButton: 'rounded-xl font-bold px-5 py-2.5'
        }
      });

      if (!confirmResult.isConfirmed) {
        setRescheduling(false);
        return;
      }

      await updateDoc(doc(db, 'events', editingEvent.id), {
        date: rescheduleDate,
        startTime: rescheduleStartTime,
        endTime: rescheduleEndTime,
        isRescheduled: true,
        originalDate: origDate,
        rescheduledAt: Date.now()
      });

      Swal.fire({
        title: '¡Evento Reprogramado!',
        text: `La reserva fue trasladada exitosamente al ${newFormatted}.`,
        icon: 'success',
        confirmButtonColor: '#182865'
      });

      handleClose();
    } catch (err) {
      console.error('Error al reprogramar:', err);
      Swal.fire({
        title: 'Error de Reprogramación',
        text: 'No fue posible reprogramar la reserva. Por favor intenta de nuevo.',
        icon: 'error',
        confirmButtonColor: '#182865'
      });
    } finally {
      setRescheduling(false);
    }
  };

  const validateForm = (): boolean => {
    if (itemType === 'recordatorio') {
      if (!eventName.trim() || !date) {
        Swal.fire({
          title: 'Campos Requeridos',
          text: 'Por favor ingresa el título del recordatorio y la fecha.',
          icon: 'warning',
          confirmButtonColor: '#182865'
        });
        return false;
      }
      return true;
    }

    if (itemType === 'reunion') {
      if (!eventName.trim() || !date || !startTime || !endTime) {
        Swal.fire({
          title: 'Formulario Incompleto',
          text: 'Por favor completa el título de la reunión, fecha, hora de inicio y fin.',
          icon: 'warning',
          confirmButtonColor: '#182865'
        });
        return false;
      }

      if (startTime >= endTime) {
        Swal.fire({
          title: 'Horario Inválido',
          text: 'La hora de fin debe ser posterior a la hora de inicio.',
          icon: 'warning',
          confirmButtonColor: '#182865'
        });
        return false;
      }
      return true;
    }

    if (!eventName.trim() || !clientName.trim() || !type || !roomId || attendees === '' || !date || !startTime || !endTime || !roomLayout) {
      Swal.fire({
        title: 'Formulario Incompleto',
        text: 'Por favor completa todos los campos obligatorios, incluyendo la distribución del espacio.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return false;
    }

    if (type === 'Otros' && !customType.trim()) {
      Swal.fire({
        title: 'Especificar Tipo',
        text: 'Por favor especifica el tipo de evento.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return false;
    }

    if (roomLayout === 'Otro' && !customRoomLayout.trim()) {
      Swal.fire({
        title: 'Especificar Distribución',
        text: 'Por favor especifica la distribución del espacio.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return false;
    }
    
    if (Number(attendees) < 1) {
      Swal.fire({
        title: 'Asistencia Inválida',
        text: 'El número de asistentes debe ser al menos 1.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return false;
    }

    if (parsedTotalCost > 0) {
      if (!isRateValid) {
        Swal.fire({
          title: 'Tasa Requerida',
          text: 'Debes ingresar una tasa de cambio válida si has registrado un abono en Bolívares.',
          icon: 'warning',
          confirmButtonColor: '#182865'
        });
        return false;
      }

      if (!hasMet20Percent && !isTrustedClient) {
        Swal.fire({
          title: 'Abono Insuficiente',
          text: `Se requiere un abono mínimo del 20% ($${minRequiredDeposit.toFixed(2)}) para agendar, o puedes marcarlo como Cliente de Confianza.`,
          icon: 'warning',
          confirmButtonColor: '#FF9305'
        });
        return false;
      }
    }

    return true;
  };

  const executeSave = async () => {
    if (!auth?.currentUser || !db || loading) return;

    if (itemType === 'recordatorio') {
      setLoading(true);
      try {
        const payload: Partial<EventData> = {
          itemType: 'recordatorio',
          eventName: eventName.trim(),
          date,
          startTime: startTime || '',
          endTime: '',
          roomId: '',
          notes: notes?.trim() || '',
          assignedTo: assignedTo?.trim() || '',
          createdBy: editingEvent ? editingEvent.createdBy : auth.currentUser.uid,
          createdBy_Name: editingEvent ? (editingEvent.createdBy_Name || auth.currentUser.displayName || 'Staff') : (auth.currentUser.displayName ?? auth.currentUser.email ?? 'Staff'),
          createdAt: editingEvent?.createdAt ?? Date.now(),
          isCompleted: isReminderCompleted,
          completedAt: isReminderCompleted ? (editingEvent?.completedAt ?? Date.now()) : null
        };

        if (editingEvent) {
          await updateDoc(doc(db, 'events', editingEvent.id), payload);
        } else {
          await addDoc(collection(db, 'events'), payload);
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: editingEvent ? 'Recordatorio actualizado' : 'Recordatorio guardado',
          showConfirmButton: false,
          timer: 2000
        });

        handleClose();
      } catch (err) {
        console.error(err);
        Swal.fire({ title: 'Error', text: 'Error al guardar el recordatorio', icon: 'error', confirmButtonColor: '#182865' });
      } finally {
        setLoading(false);
        setShowSaveConfirmModal(false);
      }
      return;
    }

    if (itemType === 'reunion') {
      setLoading(true);
      try {
        if (roomId && roomId !== 'none' && roomId.trim() !== '') {
          const conflicts = await checkCollisionsForDates([date]);
          if (conflicts && conflicts.length > 0) {
            Swal.fire({
              title: 'Conflicto de Horario Detectado',
              html: `
                <div class="text-left text-sm text-slate-700">
                  <p class="mb-2 font-medium">El salón seleccionado ya está ocupado en este horario:</p>
                  <ul class="list-disc pl-5 text-red-600 font-bold space-y-1">
                    ${conflicts.map(c => `<li>${c}</li>`).join('')}
                  </ul>
                </div>
              `,
              icon: 'error',
              confirmButtonColor: '#182865'
            });
            setLoading(false);
            setShowSaveConfirmModal(false);
            return;
          }
        }

        const payload: Partial<EventData> = {
          itemType: 'reunion',
          eventName: eventName.trim(),
          date,
          startTime,
          endTime,
          roomId: (roomId && roomId !== 'none') ? roomId : '',
          attendees: attendees ? Number(attendees) : 0,
          clientName: clientName ? formatClientName(clientName).trim() : '',
          clientPhone: clientPhone?.trim() || '',
          notes: notes?.trim() || '',
          createdBy: editingEvent ? editingEvent.createdBy : auth.currentUser.uid,
          createdBy_Name: editingEvent ? (editingEvent.createdBy_Name || auth.currentUser.displayName || 'Staff') : (auth.currentUser.displayName ?? auth.currentUser.email ?? 'Staff'),
          createdAt: editingEvent?.createdAt ?? Date.now()
        };

        if (editingEvent) {
          await updateDoc(doc(db, 'events', editingEvent.id), payload);
        } else {
          await addDoc(collection(db, 'events'), payload);
        }

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: editingEvent ? 'Reunión actualizada' : 'Reunión agendada',
          showConfirmButton: false,
          timer: 2000
        });

        handleClose();
      } catch (err) {
        console.error(err);
        Swal.fire({ title: 'Error', text: 'Error al guardar la reunión', icon: 'error', confirmButtonColor: '#182865' });
      } finally {
        setLoading(false);
        setShowSaveConfirmModal(false);
      }
      return;
    }

    // Reserva
    const targetDates = (!editingEvent && isMultiDateMode && additionalDates.length > 0)
      ? Array.from(new Set([date, ...additionalDates])).sort()
      : [date];

    setLoading(true);
    try {
      const conflicts = await checkCollisionsForDates(targetDates);
      if (conflicts && conflicts.length > 0) {
        Swal.fire({
          title: 'Conflicto de Horario Detectado',
          html: `
            <div class="text-left text-sm text-slate-700">
              <p class="mb-2 font-medium">El espacio ya está ocupado en la(s) siguiente(s) fecha(s):</p>
              <ul class="list-disc pl-5 text-red-600 font-bold space-y-1">
                ${conflicts.map(c => `<li>${c}</li>`).join('')}
              </ul>
            </div>
          `,
          icon: 'error',
          confirmButtonColor: '#182865'
        });
        setLoading(false);
        setShowSaveConfirmModal(false);
        return;
      }

      const basePayload: Omit<EventData, 'id'> = {
        itemType: 'reserva',
        eventName,
        clientName: formatClientName(clientName).trim(),
        clientPhone,
        type: (type === 'Otros' && customType ? customType : type) as EventType,
        roomId,
        attendees: Number(attendees),
        date,
        startTime,
        endTime,
        roomLayout: (roomLayout === 'Otro' && customRoomLayout ? customRoomLayout : roomLayout) as RoomLayout,
        resources,
        notes,
        totalCost: parsedTotalCost,
        depositUSD: parsedUSD,
        depositBS: parsedBS,
        exchangeRate: parsedRate,
        isTrustedClient,
        reservationStatus,
        salesRep: salesRep || (editingEvent?.salesRep ?? 'Directo'),
        createdBy: editingEvent ? editingEvent.createdBy : auth.currentUser.uid,
        createdBy_Name: editingEvent ? (editingEvent.createdBy_Name || auth.currentUser.displayName || 'Staff') : (auth.currentUser.displayName ?? auth.currentUser.email ?? 'Staff'),
        createdAt: editingEvent?.createdAt ?? Date.now()
      };
      
      if (editingEvent) {
        const { startTime: dStart, endTime: dEnd } = getScheduleForDate(date);
        await updateDoc(doc(db, 'events', editingEvent.id), {
          ...basePayload,
          startTime: dStart,
          endTime: dEnd
        });
      } else {
        for (const singleDate of targetDates) {
          const { startTime: dStart, endTime: dEnd } = getScheduleForDate(singleDate);
          await addDoc(collection(db, 'events'), {
            ...basePayload,
            date: singleDate,
            startTime: dStart,
            endTime: dEnd
          });
        }
      }
      
      if (editingEvent) {
        handleClose();
      } else {
        if (targetDates.length > 1) {
          Swal.fire({
            title: '¡Reservas Creadas con Éxito!',
            text: `Se agendaron correctamente ${targetDates.length} reservas para el evento.`,
            icon: 'success',
            confirmButtonColor: '#182865'
          });
          handleClose();
        } else {
          Swal.fire({
            title: 'Reserva Exitosa',
            text: '¿Deseas compartir o agendar esto ahora?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'Sincronizar ICS',
            cancelButtonText: 'WhatsApp',
            showCloseButton: true,
            confirmButtonColor: '#182865',
            cancelButtonColor: '#25D366'
          }).then((result) => {
            if (result.isConfirmed) generateICS();
            else if (result.dismiss === Swal.DismissReason.cancel) sendWhatsApp();
            handleClose();
          });
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'Error al guardar la reserva', icon: 'error', confirmButtonColor: '#182865' });
    } finally {
      setLoading(false);
      setShowSaveConfirmModal(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !db) return;

    if (!validateForm()) return;

    if (editingEvent) {
      if (!isDirty) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Sin cambios que guardar',
          showConfirmButton: false,
          timer: 2000
        });
        handleClose();
        return;
      }
      setShowSaveConfirmModal(true);
    } else {
      executeSave();
    }
  };

  const handleSaveFromWarning = () => {
    setShowUnsavedWarningModal(false);
    if (!validateForm()) return;
    executeSave();
  };

  const handleDelete = async () => {
    if (!editingEvent || !db) return;
    
    const itemNoun = itemType === 'recordatorio' ? 'el recordatorio' : itemType === 'reunion' ? 'la reunión' : 'la reserva';
    const result = await Swal.fire({
      title: `¿Eliminar ${itemNoun}?`,
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#FF9305',
      cancelButtonColor: '#182865',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'rounded-3xl', confirmButton: 'rounded-xl font-bold px-6 py-3', cancelButton: 'rounded-xl font-bold px-6 py-3' }
    });

    if (result.isConfirmed) {
      setDeleting(true);
      try {
        await deleteDoc(doc(db, 'events', editingEvent.id));
        handleClose();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1)} eliminada correctamente`, showConfirmButton: false, timer: 3000 });
      } catch (err) {
        console.error(err);
        Swal.fire({ title: 'Error', text: `Hubo un problema al eliminar ${itemNoun}.`, icon: 'error', confirmButtonColor: '#182865' });
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <>
      <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh] transition-transform duration-300 ease-out`}
        style={{ transform: (isOpen && !isClosing) ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 sticky top-0 bg-white z-10 font-sans">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-brand-blue leading-tight">
                {editingEvent 
                  ? (itemType === 'recordatorio' ? 'Editar Recordatorio' : itemType === 'reunion' ? 'Editar Reunión' : 'Editar Reserva')
                  : (itemType === 'recordatorio' ? 'Nuevo Recordatorio' : itemType === 'reunion' ? 'Nueva Reunión' : 'Nueva Reserva')}
              </h2>
              {editingEvent && (
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  itemType === 'recordatorio' 
                    ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                    : itemType === 'reunion' 
                    ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                    : 'bg-blue-100 text-blue-900 border border-blue-200'
                }`}>
                  {itemType === 'recordatorio' ? '📌 Recordatorio' : itemType === 'reunion' ? '👥 Reunión' : '📅 Reserva'}
                </span>
              )}
            </div>
            {editingEvent?.createdAt && (
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Creada el {format(new Date(editingEvent.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingEvent && (
              <button 
                type="button" 
                onClick={handleDelete} 
                disabled={deleting}
                className="p-2 sm:p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 border border-red-100 bg-red-50/20 sm:border-transparent sm:bg-transparent"
                title={`Eliminar ${itemType === 'recordatorio' ? 'Recordatorio' : itemType === 'reunion' ? 'Reunión' : 'Reserva'}`}
              >
                <Trash2 size={18} />
                <span className="text-xs font-bold sm:hidden pr-1">Eliminar</span>
              </button>
            )}
            <button onClick={handleRequestClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 minimal-scrollbar pb-8 relative">
          <form id="reservation-form" onSubmit={handleSubmit} className="space-y-6">
            
            {!editingEvent && (
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5 font-sans">
                <button
                  type="button"
                  onClick={() => setItemType('reserva')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    itemType === 'reserva'
                      ? 'bg-white text-brand-blue shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>Reserva</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemType('reunion')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    itemType === 'reunion'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  <span>Reunión</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemType('recordatorio')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    itemType === 'recordatorio'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Recordatorio</span>
                </button>
              </div>
            )}

            {editingEvent && itemType === 'reserva' && (
              <div className="flex flex-wrap gap-2 mb-2 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                {reservationStatus === 'Pre-reserva' && (
                  <button 
                    type="button" 
                    onClick={handleConfirmReservation} 
                    disabled={isConfirmingReservation}
                    className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-700/20 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} /> Confirmar reserva
                  </button>
                )}
                {remainingBalance > 0.01 && (parsedUSD > 0 || parsedBS > 0 || isTrustedClient || (editingEvent.depositUSD && Number(editingEvent.depositUSD) > 0) || (editingEvent.depositBS && Number(editingEvent.depositBS) > 0)) && (
                  <button 
                    type="button" 
                    onClick={() => setShowMarkPaidConfirmModal(true)} 
                    disabled={isMarkingPaid}
                    className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-700/20 active:scale-95 cursor-pointer disabled:opacity-50"
                    title={`Marcar pagado total (${remainingBalance.toFixed(2)}$ pendiente)`}
                  >
                    <DollarSign size={16} /> Marcar como pagado
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setIsRescheduleMode(!isRescheduleMode)} 
                  className={`flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                    isRescheduleMode 
                      ? 'bg-amber-500 text-white shadow-amber-500/20' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <RotateCcw size={16} /> {isRescheduleMode ? 'Volver a Edición' : 'Reprogramar Evento'}
                </button>
                <button type="button" onClick={generateICS} className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors shadow-sm shadow-blue-900/10">
                  <CalendarHeart size={16} /> Sincronizar Calendario
                </button>
                <button type="button" onClick={sendWhatsApp} className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1EBE5D] transition-colors shadow-sm shadow-green-600/20">
                  <MessageCircle size={16} /> Enviar Reporte
                </button>
              </div>
            )}

            {editingEvent && itemType === 'reunion' && (
              <div className="flex flex-wrap gap-2 mb-2 p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <button type="button" onClick={generateICS} className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-purple-700 text-white rounded-xl text-sm font-semibold hover:bg-purple-800 transition-colors shadow-sm">
                  <CalendarHeart size={16} /> Sincronizar Calendario
                </button>
                <button type="button" onClick={sendWhatsApp} className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1EBE5D] transition-colors shadow-sm shadow-green-600/20">
                  <MessageCircle size={16} /> Compartir por WhatsApp
                </button>
              </div>
            )}

            {editingEvent && reservationStatus === 'Pre-reserva' && !isRescheduleMode && (
              <div className="p-3.5 sm:p-4 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2 text-xs font-sans shadow-2xs mb-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">🟡</span>
                      <span className="font-bold text-amber-950 text-sm">
                        Pre-reserva
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/90 font-medium">
                      Si ya fue confirmada por el cliente, puedes convertirla en una reserva.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmReservation}
                    disabled={isConfirmingReservation}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    <span>{isConfirmingReservation ? 'Confirmando...' : 'Confirmar reserva'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Acceso rápido a Marcar como pagado cuando hay abono y saldo pendiente */}
            {editingEvent && itemType === 'reserva' && remainingBalance > 0.01 && (parsedUSD > 0 || parsedBS > 0 || isTrustedClient || (editingEvent.depositUSD && Number(editingEvent.depositUSD) > 0) || (editingEvent.depositBS && Number(editingEvent.depositBS) > 0)) && !isRescheduleMode && (
              <div className="p-3.5 sm:p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-2 text-xs font-sans shadow-2xs mb-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={16} className="text-emerald-700" />
                      <span className="font-bold text-emerald-950 text-sm">
                        Abono · Pendiente ${remainingBalance.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900/90 font-medium">
                      Total: ${parsedTotalCost.toFixed(2)} · Abonado: ${(parsedUSD + (parsedRate > 0 ? parsedBS / parsedRate : 0)).toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMarkPaidConfirmModal(true)}
                    disabled={isMarkingPaid}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    <span>{isMarkingPaid ? 'Procesando...' : 'Marcar como pagado'}</span>
                  </button>
                </div>
              </div>
            )}

            {editingEvent?.isRescheduled && !isRescheduleMode && (
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-2 text-xs font-sans shadow-2xs mb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
                      <RotateCcw size={14} />
                    </div>
                    <span className="font-extrabold text-amber-950 text-xs sm:text-sm">
                      Reserva Reprogramada 🔄
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
                    Reprogramada
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/60">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="text-[10px] font-extrabold text-amber-800/80 uppercase tracking-wider block">
                      Fecha Original
                    </span>
                    <p className="font-extrabold text-slate-800 text-xs sm:text-sm capitalize mt-0.5">
                      {formatDatePretty(editingEvent.originalDate || editingEvent.date)}
                    </p>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    <span className="text-[10px] font-extrabold text-amber-800/80 uppercase tracking-wider block">
                      Nueva Fecha Efectiva
                    </span>
                    <p className="font-extrabold text-amber-900 text-xs sm:text-sm capitalize mt-0.5">
                      {formatDatePretty(editingEvent.date)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isRescheduleMode ? (
              <div className="space-y-6 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5 rounded-2xl border border-amber-200/80 animate-in fade-in duration-200 font-sans">
                <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <RotateCcw size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">Reprogramar Fecha de Reserva</h3>
                      <p className="text-xs text-slate-500 font-medium">Reagenda el evento sin modificar salón, cliente ni información financiera</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
                    Acción Directa
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-amber-200/60 shadow-2xs text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Evento & Cliente</span>
                    <p className="font-bold text-brand-blue text-sm truncate">{eventName}</p>
                    <p className="text-slate-500 font-medium truncate">{clientName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold uppercase text-[10px] block">Espacio Asignado</span>
                    <p className="font-bold text-slate-800 text-sm">{ROOMS.find(r => r.id === roomId)?.name || 'Salón'}</p>
                    {editingEvent?.isRescheduled && (
                      <p className="text-amber-700 font-bold text-[11px] mt-0.5">
                        🔄 Reprogramada previa (Orig: {editingEvent.originalDate})
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 bg-white p-4.5 rounded-xl border border-amber-200/60 shadow-2xs">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <CalendarIcon size={15} className="text-amber-600" />
                      Nueva Fecha Efectiva
                    </label>
                    <input 
                      type="date" 
                      value={rescheduleDate} 
                      onChange={e => setRescheduleDate(e.target.value)}
                      className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-base" 
                    />
                    <p className="text-[11px] text-slate-400 font-medium">
                      Fecha registrada actualmente: <strong className="text-slate-700">{editingEvent?.date}</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <Clock size={15} className="text-amber-600" />
                        Nueva Hora Inicio
                      </label>
                      <input 
                        type="time" 
                        value={rescheduleStartTime} 
                        onChange={e => setRescheduleStartTime(e.target.value)}
                        className="w-full px-3 py-2.5 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-sm" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <Clock size={15} className="text-amber-600" />
                        Nueva Hora Fin
                      </label>
                      <input 
                        type="time" 
                        value={rescheduleEndTime} 
                        onChange={e => setRescheduleEndTime(e.target.value)}
                        className="w-full px-3 py-2.5 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-sm" 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsRescheduleMode(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleExecuteReschedule}
                    disabled={rescheduling}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm shadow-amber-500/20 flex items-center gap-2 min-h-[44px]"
                  >
                    {rescheduling ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                    ) : (
                      <RotateCcw size={15} />
                    )}
                    <span>Confirmar Reprogramación</span>
                  </button>
                </div>
              </div>
            ) : itemType === 'recordatorio' ? (
              <div className="space-y-5 font-sans">
                {/* Título */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Título o Descripción del Recordatorio</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-sm"
                    placeholder="Ej. Sacar el pollo de la nevera, Comprar marcadores..."
                  />
                </div>

                {/* Fecha y Hora opcional */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <CalendarIcon size={16} className="text-amber-600" />
                      <span>Fecha</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <Clock size={16} className="text-amber-600" />
                        <span>Hora Puntual</span>
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-sm"
                    />
                  </div>
                </div>

                {/* Responsable */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <User size={16} className="text-amber-600" />
                      <span>Responsable</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-sm"
                    placeholder="Ej. Yoanelis, Juan, Laura..."
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Yoanelis', 'Juan', 'Laura', 'Equipo'].map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setAssignedTo(name)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          assignedTo === name
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instrucciones / Detalles / Notas */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                    <span>Instrucciones o Notas Extra</span>
                    <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium text-slate-800 text-sm resize-none"
                    placeholder="Detalles contextuales (ej. 'Está en la cocina', 'Revisar antes de las 5pm')..."
                  />
                  <p className="text-[11px] text-slate-400">
                    ℹ️ Este recordatorio no ocupará salones ni afectará las métricas de reservas.
                  </p>
                </div>

                {/* Estado completado */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isReminderCompleted}
                      onChange={e => setIsReminderCompleted(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>Marcar recordatorio como completado</span>
                  </label>
                  {isReminderCompleted && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Completado
                    </span>
                  )}
                </div>
              </div>
            ) : itemType === 'reunion' ? (
              <div className="space-y-5 font-sans">
                {/* Título de la reunión */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <span>Título o Motivo de la Reunión</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                    placeholder="Ej. Reunión de equipo, Alineación mensual, Visita de prospecto..."
                  />
                </div>

                {/* Fecha y Horario */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <CalendarIcon size={16} className="text-purple-600" />
                      <span>Fecha</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock size={16} className="text-purple-600" />
                      <span>Hora Inicio</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock size={16} className="text-purple-600" />
                      <span>Hora Fin</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                    />
                  </div>
                </div>

                {/* Salón (Opcional) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                    <span>Espacio o Salón Físico</span>
                    <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                  </label>
                  <select
                    value={roomId}
                    onChange={e => setRoomId(e.target.value)}
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                  >
                    <option value="">Sin salón físico (Virtual / Remota / Externa)</option>
                    {ROOMS.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.location})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    {roomId ? '⚠️ Al asignar un salón físico se validará disponibilidad de horario.' : 'ℹ️ Las reuniones sin salón no generan conflictos de espacio.'}
                  </p>
                </div>

                {/* Participantes / Asistentes y Persona externa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <Users size={16} className="text-purple-600" />
                        <span>Participantes</span>
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={attendees}
                      onChange={e => setAttendees(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                      placeholder="Cant. personas (ej. 4)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <User size={16} className="text-purple-600" />
                        <span>Persona o Cliente Externo</span>
                      </span>
                      <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={handleClientNameChange}
                      className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                      placeholder="Nombre de la persona (si aplica)"
                    />
                  </div>
                </div>

                {/* Teléfono opcional */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                    <span>Teléfono de Contacto</span>
                    <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm"
                    placeholder="Ej. +58 414..."
                  />
                </div>

                {/* Notas de la reunión */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center justify-between gap-1.5">
                    <span>Notas o Agenda de la Reunión</span>
                    <span className="text-[11px] font-normal text-slate-400">Opcional</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-medium text-slate-800 text-sm resize-none"
                    placeholder="Puntos a tratar, enlace de videollamada si es virtual, etc..."
                  />
                </div>
              </div>
            ) : (
              <>

            {/* Selector de Estado de la Reserva */}
            <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BookmarkCheck size={16} className="text-brand-orange" />
                  <span>Estado de la Reserva</span>
                </label>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  reservationStatus === 'Pre-reserva' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {reservationStatus === 'Pre-reserva' ? '🟡 Pre-reserva' : '🟢 Confirmada'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReservationStatus('Confirmada')}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    reservationStatus === 'Confirmada'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${reservationStatus === 'Confirmada' ? 'bg-emerald-200' : 'bg-emerald-500'}`}></span>
                  <span>Confirmada</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReservationStatus('Pre-reserva')}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    reservationStatus === 'Pre-reserva'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${reservationStatus === 'Pre-reserva' ? 'bg-amber-200' : 'bg-amber-500'}`}></span>
                  <span>Pre-reserva</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                {reservationStatus === 'Pre-reserva' 
                  ? '🟡 Pre-reserva: Bloquea el salón y horario en agenda sin generar ingresos ficticios. Puede confirmarse posteriormente con un solo clic.' 
                  : '🟢 Confirmada: Reserva formal garantizada en el cronograma de la sede.'}
              </p>

              {editingEvent && reservationStatus === 'Pre-reserva' && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-emerald-900 font-semibold">
                    ¿El cliente ya confirmó la reserva?
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmReservation}
                    disabled={isConfirmingReservation}
                    className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} />
                    <span>{isConfirmingReservation ? 'Confirmando...' : 'Confirmar reserva'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Asesor Comercial / Quién consiguió la reserva */}
            <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={16} className="text-brand-blue" />
                  <span>¿Quién consiguió la reserva? / Asesor comercial</span>
                </label>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  salesRep.toLowerCase() === 'laura' || salesRep.toLowerCase() === 'yoanelis'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : salesRep.toLowerCase() === 'juan'
                    ? 'bg-blue-100 text-brand-blue border border-blue-200'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {salesRep.toLowerCase() === 'laura' || salesRep.toLowerCase() === 'yoanelis' 
                    ? `Comisión 25% (${salesRep})` 
                    : salesRep.toLowerCase() === 'juan'
                    ? 'Asesor: Juan (Directo / 0%)'
                    : 'Directo / Sin comisión'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'Directo', label: 'Directo / Espacio', sub: 'Sin comisión' },
                  { id: 'Juan', label: 'Juan', sub: 'Directo / 0%' },
                  { id: 'Laura', label: 'Laura', sub: 'Comisión 25%' },
                  { id: 'Yoanelis', label: 'Yoanelis', sub: 'Comisión 25%' },
                  { id: 'Otro', label: 'Otro / Sin Asesor', sub: 'Sin comisión' },
                ].map(opt => {
                  const isSelected = (opt.id === 'Directo' && (!salesRep || salesRep.toLowerCase() === 'directo' || salesRep === 'Directo / Coworking')) || 
                                    (opt.id !== 'Directo' && salesRep.toLowerCase() === opt.id.toLowerCase());
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSalesRep(opt.id)}
                      className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-blue text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-[9px] font-medium ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                La comisión (25% sobre el costo total pactado para Laura y Yoanelis) se calculará y reflejará exclusivamente en los reportes privados del administrador.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 relative">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Tags size={16}/> Título del Evento</label>
                <input required type="text" value={eventName} onChange={e => setEventName(e.target.value)} 
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                  placeholder="Ej. Taller de Fotografía" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><User size={16}/> Cliente / Empresa</label>
                  <input 
                    required 
                    type="text" 
                    autoCapitalize="words"
                    autoComplete="name"
                    value={clientName} 
                    onChange={handleClientNameChange} 
                    className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                    placeholder="Nombre o empresa" 
                  />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2 pt-[1px]">WhatsApp</label>
                  <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} 
                    className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                    placeholder="+58 XXX" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                    <CalendarIcon size={16}/> Fecha {isMultiDateMode ? '(Primera fecha)' : ''} <span className="text-brand-orange font-bold">*</span>
                    <span title="Si el evento se repite en más días (cursos o talleres), activa la opción '+ Repetir fechas'.">
                      <Info size={14} className="text-slate-400 hover:text-brand-blue cursor-help" />
                    </span>
                  </label>
                </div>

                <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />

                {!editingEvent && (
                  <div className="pt-1">
                    {!isMultiDateMode ? (
                      <button
                        type="button"
                        onClick={() => setIsMultiDateMode(true)}
                        className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/70 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="p-1 bg-amber-200/60 rounded-md text-amber-900 group-hover:scale-110 transition-transform">
                            <CalendarHeart size={14} />
                          </span>
                          <span>¿Este evento dura varios días? (Cursos, talleres, clases)</span>
                        </span>
                        <span className="text-[11px] font-bold text-amber-800 underline decoration-amber-400">
                          + Repetir fechas
                        </span>
                      </button>
                    ) : (
                      <div className="p-3.5 bg-gradient-to-b from-blue-50/80 to-slate-50/80 border border-brand-blue/30 rounded-2xl space-y-3 animate-in fade-in duration-200 shadow-xs">
                        <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                          <div>
                            <span className="text-xs font-bold text-brand-blue flex items-center gap-1.5">
                              <CalendarHeart size={15} /> Modo Múltiples Fechas Activo
                            </span>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Se creará una reserva independiente por cada fecha agregada.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsMultiDateMode(false);
                              setAdditionalDates([]);
                              setCustomDateSchedules({});
                              setEditingScheduleDate(null);
                            }}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-700 underline cursor-pointer shrink-0"
                          >
                            Volver a fecha única
                          </button>
                        </div>

                        {/* List of currently selected dates with schedule controls */}
                        {(() => {
                          const targetDates = Array.from(new Set([date, ...additionalDates])).filter(Boolean).sort();
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 block">
                                  📅 Fechas e horarios ({targetDates.length}):
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                                  Default: {startTime || '--:--'} a {endTime || '--:--'}
                                </span>
                              </div>

                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {targetDates.map((d, index) => {
                                  const isPrimary = d === date;
                                  const formatted = d ? format(new Date(`${d}T12:00:00`), 'EEE d MMM yyyy', { locale: es }) : 'Fecha';
                                  const schedule = getScheduleForDate(d);
                                  const hasCustomTime = Boolean(customDateSchedules[d]);
                                  const isEditingThis = editingScheduleDate === d;

                                  return (
                                    <div key={d} className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${isPrimary ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-700'}`}>
                                            #{index + 1}
                                          </span>
                                          <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate capitalize">{formatted}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className={`text-[11px] font-semibold flex items-center gap-1 ${hasCustomTime ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                                                <Clock size={12} /> {schedule.startTime || '--:--'} - {schedule.endTime || '--:--'}
                                              </span>
                                              {hasCustomTime && (
                                                <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded-md">
                                                  Personalizado
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => setEditingScheduleDate(isEditingThis ? null : d)}
                                            className={`px-2.5 py-1 min-h-[32px] rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                                              isEditingThis || hasCustomTime
                                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                            title="Ajustar horario para esta fecha"
                                          >
                                            <Clock size={13} />
                                            <span>{hasCustomTime ? 'Editar hora' : 'Cambiar hora'}</span>
                                          </button>

                                          {!isPrimary && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveDate(d)}
                                              className="p-1.5 min-h-[32px] min-w-[32px] text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                                              title="Quitar esta fecha"
                                            >
                                              <X size={15} />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Inline Schedule Customizer */}
                                      {isEditingThis && (
                                        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                                          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                                            <span>⏰ Horario específico para este día:</span>
                                            {hasCustomTime && (
                                              <button
                                                type="button"
                                                onClick={() => handleResetCustomSchedule(d)}
                                                className="text-[10px] text-amber-800 hover:text-amber-950 underline cursor-pointer font-bold"
                                              >
                                                Usar horario general
                                              </button>
                                            )}
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-[10px] font-bold text-slate-600 block mb-1">Hora Inicio</label>
                                              <input
                                                type="time"
                                                value={schedule.startTime}
                                                onChange={e => handleSetCustomSchedule(d, e.target.value, schedule.endTime)}
                                                className="w-full px-2.5 py-1.5 min-h-[38px] bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-[10px] font-bold text-slate-600 block mb-1">Hora Fin</label>
                                              <input
                                                type="time"
                                                value={schedule.endTime}
                                                onChange={e => handleSetCustomSchedule(d, schedule.startTime, e.target.value)}
                                                className="w-full px-2.5 py-1.5 min-h-[38px] bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                              />
                                            </div>
                                          </div>

                                          <div className="flex justify-end pt-0.5">
                                            <button
                                              type="button"
                                              onClick={() => setEditingScheduleDate(null)}
                                              className="px-3 py-1 bg-brand-blue text-white rounded-lg text-xs font-bold hover:bg-blue-900 transition-all cursor-pointer shadow-2xs"
                                            >
                                              Listo ✓
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Adding more dates controls */}
                        <div className="pt-2 border-t border-blue-100/80 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 block">
                            ➕ Agregar otra fecha adicional:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={customDateInput}
                              onChange={e => setCustomDateInput(e.target.value)}
                              className="flex-1 px-3 py-2 h-10 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-medium"
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomDate}
                              disabled={!customDateInput}
                              className="px-3.5 py-2 h-10 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-blue-900 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                            >
                              <Plus size={15} /> Agregar fecha
                            </button>
                          </div>

                          {/* Quick Weekly repeat helpers */}
                          {date && (
                            <div className="pt-1 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                              <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Acceso rápido:</span>
                              {[1, 2, 3, 4].map(num => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => handleAddWeeklyDate(num)}
                                  className="text-[10px] font-semibold bg-white text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-brand-blue hover:bg-blue-50/50 hover:text-brand-blue shrink-0 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  + Repetir en {num} sem.
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Clock size={16}/> Inicio</label>
                  <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} 
                    className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Clock size={16}/> Fin</label>
                  <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} 
                    className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-600">Espacio <span className="text-brand-orange font-bold">*</span></label>
                  <div className="flex items-center gap-1 text-[11px] bg-slate-100 p-0.5 rounded-lg font-medium">
                    {(['Todos', 'Planta Baja', 'Mezzanina'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setModalFloorFilter(lvl)}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          modalFloorFilter === lvl 
                            ? 'bg-white text-brand-blue font-bold shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {lvl === 'Todos' ? 'Todos' : lvl === 'Planta Baja' ? 'PB' : 'Mezz'}
                      </button>
                    ))}
                  </div>
                </div>

                <select required value={roomId} onChange={e => setRoomId(e.target.value)}
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none cursor-pointer">
                  <option value="" disabled>Selecciona un espacio...</option>
                  {(modalFloorFilter === 'Todos' || modalFloorFilter === 'Planta Baja') && (
                    <optgroup label="📍 Planta Baja (4 Espacios)">
                      {ROOMS.filter(r => r.location === 'Planta Baja').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.area}m², máx. {r.capacity} p.)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {(modalFloorFilter === 'Todos' || modalFloorFilter === 'Mezzanina') && (
                    <optgroup label="📍 Mezzanina (6 Espacios)">
                      {ROOMS.filter(r => r.location === 'Mezzanina').map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.area}m², máx. {r.capacity} p.)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                {/* Selected Room Info Badge */}
                {(() => {
                  const selectedRoom = ROOMS.find(r => r.id === roomId);
                  if (!selectedRoom) return null;
                  return (
                    <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedRoom.dotColor }} />
                        <span className="font-bold text-brand-blue">{selectedRoom.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <span>{selectedRoom.location}</span>
                        <span>•</span>
                        <span>{selectedRoom.area} m²</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">Máx {selectedRoom.capacity} p.</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-1.5 relative flex flex-col">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <Layout size={16}/> Distribución del Espacio <span className="text-brand-orange font-bold">*</span>
                  <span title="Define cómo se organizarán las sillas y mesas en el espacio (ej. Auditorio, Escuela, Mesa U).">
                    <Info size={14} className="text-slate-400 hover:text-brand-blue cursor-help" />
                  </span>
                </label>
                <select required value={roomLayout} onChange={e => setRoomLayout(e.target.value as RoomLayout)}
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none cursor-pointer">
                  <option value="" disabled>Selecciona la distribución...</option>
                  {['Escuela', 'Auditorio', 'Mesa en U', 'Directorio', 'Otro'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${roomLayout === 'Otro' ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                   <input type="text" value={customRoomLayout} onChange={e => setCustomRoomLayout(e.target.value)}
                    className="w-full px-4 py-3 h-12 min-h-[48px] bg-white border border-brand-orange/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder:text-slate-400" 
                    placeholder="¿Qué tipo de distribución de espacio sería?" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 relative flex flex-col">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                  Tipo de Evento <span className="text-brand-orange font-bold">*</span>
                  <span title="Clasificación para reportes y métricas de uso de los espacios.">
                    <Info size={14} className="text-slate-400 hover:text-brand-blue cursor-help" />
                  </span>
                </label>
                <select required value={type} onChange={e => setType(e.target.value as EventType)}
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none cursor-pointer">
                  <option value="" disabled>Elige el tipo de evento...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${type === 'Otros' ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                   <input type="text" value={customType} onChange={e => setCustomType(e.target.value)}
                    className="w-full px-4 py-3 h-12 min-h-[48px] bg-white border border-brand-orange/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all placeholder:text-slate-400" 
                    placeholder="¿Qué tipo de evento es?" />
                </div>
              </div>

              <div className="space-y-1.5 relative flex flex-col justify-end">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <Users size={16}/> Cantidad de Personas <span className="text-brand-orange font-bold">*</span>
                  <span title="Asegura que no se supere la capacidad máxima permitida del salón.">
                    <Info size={14} className="text-slate-400 hover:text-brand-blue cursor-help" />
                  </span>
                </label>
                <input required type="number" min="1" value={attendees} onChange={e => setAttendees(e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-display font-bold text-brand-blue">Control de Pagos</h3>
                <span title="Registra el costo total y abonos realizados. El sistema calcula automáticamente el saldo pendiente.">
                  <Info size={15} className="text-slate-400 hover:text-brand-blue cursor-help" />
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600">Costo Total ($) <span className="text-brand-orange font-bold">*</span></label>
                  <input required type="number" min="0" step="0.01" value={totalCost} onChange={e => setTotalCost(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 transition-all font-mono" placeholder="0.00" />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600">Abono en Divisas ($)</label>
                  <input type="number" min="0" step="0.01" value={depositUSD} onChange={e => setDepositUSD(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 transition-all font-mono" placeholder="0.00" />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600">Abono en Bolívares (Bs)</label>
                  <input type="number" min="0" step="0.01" value={depositBS} onChange={e => setDepositBS(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 transition-all font-mono" placeholder="0.00" />
                </div>
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600">Tasa de Cambio (Bs/$) {parsedBS > 0 && <span className="text-brand-orange font-bold">*</span>}</label>
                  <input type="number" min="0" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 transition-all font-mono" placeholder="40.00" />
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Resta por Cobrar ($)</span>
                <span className={`text-lg font-bold font-mono ${remainingBalance <= 0 && parsedTotalCost > 0 ? 'text-green-600' : 'text-brand-orange'}`}>
                  ${remainingBalance.toFixed(2)}
                </span>
              </div>

              {editingEvent && remainingBalance > 0.01 && (
                <div className="mt-3 p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-left">
                    <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>✓ ¿Se completó el pago del saldo pendiente?</span>
                    </p>
                    <p className="text-[11px] text-emerald-700/90 mt-0.5">
                      Al presionar, ajusta el abono para registrar el pago total (${remainingBalance.toFixed(2)} restante).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMarkPaidConfirmModal(true)}
                    disabled={isMarkingPaid}
                    className="px-3.5 py-2 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 shrink-0 self-end sm:self-center disabled:opacity-50"
                  >
                    <span>Marcar Pagado Total</span>
                  </button>
                </div>
              )}

              {showTrustedToggle && (
                <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-brand-orange/5 border border-brand-orange/20 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-brand-orange">¿Marcar como Cliente de Confianza?</span>
                    <span className="text-xs text-brand-orange/80">Permite guardar sin el abono del 20% (${minRequiredDeposit.toFixed(2)}) requerido.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer min-h-[44px] min-w-[44px] justify-end">
                    <input type="checkbox" className="sr-only peer" checked={isTrustedClient} onChange={(e) => setIsTrustedClient(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange"></div>
                  </label>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSetup(!showSetup)}
                className="w-full min-h-[44px] flex items-center justify-between text-sm font-semibold text-brand-blue hover:text-brand-blue/80 transition-colors"
              >
                <span>Servicios y Notas Extras (Opcionales)</span>
                <span className="text-xl leading-none">{showSetup ? '−' : '+'}</span>
              </button>
              
              {showSetup && (
                <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-3 relative">
                    <label className="text-sm font-semibold text-slate-600">Recursos y Servicios</label>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-700 font-bold cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200 h-11 min-h-[44px] hover:border-brand-orange/30 transition-colors">
                        <input type="checkbox" checked={resources.tv} onChange={e => setResources({...resources, tv: e.target.checked})} 
                          className="w-4 h-4 text-brand-orange border-slate-300 rounded focus:ring-brand-orange/20" />
                        <span>Pantalla TV</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-sm font-semibold text-slate-600">Servicios y Notas Extra</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none min-h-[80px]" 
                      placeholder="Detalles sobre catering extra, tiempos de montaje, requerimientos especiales del cliente..." />
                  </div>
                </div>
              )}
            </div>
            </>
            )}

          </form>
        </div>
        
        {!isRescheduleMode ? (
          <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] sticky bottom-0 z-10 w-full">
            {editingEvent ? (
              <button type="button" onClick={handleDelete} disabled={deleting} className="w-full sm:w-auto justify-center px-4 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50 border border-red-100 sm:border-transparent bg-white sm:bg-transparent shadow-sm sm:shadow-none">
                <Trash2 size={18} /> Eliminar
              </button>
            ) : <div className="hidden sm:block"></div>}
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
              <button type="button" onClick={handleRequestClose} className="w-full sm:w-auto px-6 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white sm:bg-slate-100 border border-slate-200 sm:border-transparent shadow-sm sm:shadow-none cursor-pointer">
                Cancelar
              </button>
              <button 
                type="submit" 
                form="reservation-form" 
                disabled={loading} 
                className={`w-full flex-1 sm:flex-none sm:w-auto justify-center px-6 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-white transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2 cursor-pointer ${
                  itemType === 'recordatorio'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20'
                    : itemType === 'reunion'
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/20'
                    : reservationStatus === 'Pre-reserva'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20'
                    : 'bg-brand-orange hover:bg-[#E68505] shadow-md shadow-orange-500/20'
                }`}
              >
                {loading ? 'Guardando...' : (
                  editingEvent 
                    ? 'Guardar Cambios' 
                    : itemType === 'recordatorio'
                    ? 'Guardar Recordatorio'
                    : itemType === 'reunion'
                    ? 'Guardar Reunión'
                    : (reservationStatus === 'Pre-reserva' ? 'Guardar Pre-reserva' : 'Guardar y Confirmar')
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 border-t border-amber-200/80 bg-amber-50/50 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] sticky bottom-0 z-10 w-full font-sans">
            <button type="button" onClick={() => setIsRescheduleMode(false)} className="w-full sm:w-auto px-5 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white border border-slate-200 shadow-sm">
              Volver a Edición
            </button>
            
            <button type="button" onClick={handleExecuteReschedule} disabled={rescheduling} className="w-full sm:w-auto justify-center px-6 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2">
              {rescheduling ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
              ) : (
                <RotateCcw size={18} />
              )}
              <span>Confirmar Reprogramación</span>
            </button>
          </div>
        )}
      </div>
      </div>

      {/* MODAL 1: Confirmación al Guardar Cambios */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 z-[100005] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl border border-slate-100 font-sans space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2 sm:hidden" />
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-slate-900">¿Guardar cambios?</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  Los cambios realizados se guardarán en esta actividad.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveConfirmModal(false)}
                disabled={loading}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={loading}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-900 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Aviso al Cerrar con Cambios sin Guardar */}
      {showUnsavedWarningModal && (
        <div className="fixed inset-0 z-[100005] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl border border-slate-100 font-sans space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2 sm:hidden" />
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-slate-900">Tienes cambios sin guardar</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  Si sales ahora, perderás los cambios realizados.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleSaveFromWarning}
                disabled={loading}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-900 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                ) : (
                  'Guardar cambios'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedWarningModal(false);
                  handleClose();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm transition-colors cursor-pointer"
              >
                Descartar cambios
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedWarningModal(false)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-semibold text-sm transition-colors cursor-pointer"
              >
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmación de Pago Completo */}
      {showMarkPaidConfirmModal && (
        <div className="fixed inset-0 z-[100005] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl border border-slate-100 font-sans space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2 sm:hidden" />
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-slate-900">¿Confirmar pago completo?</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  Esta acción marcará la reserva como pagada totalmente.
                </p>
              </div>
            </div>
            {remainingBalance > 0.01 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <span className="text-slate-600 font-medium">Saldo a saldar:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">${remainingBalance.toFixed(2)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowMarkPaidConfirmModal(false)}
                disabled={isMarkingPaid}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteMarkAsPaid}
                disabled={isMarkingPaid}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isMarkingPaid ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full"></span>
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
