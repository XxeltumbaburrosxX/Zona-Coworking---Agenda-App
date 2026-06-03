import React, { useState, FormEvent, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Users, User, Layout, Tags, Trash2, CalendarHeart, MessageCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { EVENT_TYPES, ROOMS, EventData, EventType, RoomLayout } from '../types';

interface Props {
  onClose: () => void;
  selectedDateStr: string;
  editingEvent?: EventData | null;
}

export function AddEventModal({ onClose, selectedDateStr, editingEvent }: Props) {
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
  
  const [eventName, setEventName] = useState(editingEvent?.eventName ?? '');
  const [clientName, setClientName] = useState(editingEvent?.clientName ?? '');
  const [clientPhone, setClientPhone] = useState(editingEvent?.clientPhone ?? '');
  const [type, setType] = useState<EventType | ''>(editingEvent?.type ?? '');
  const [customType, setCustomType] = useState('');
  const [roomId, setRoomId] = useState(editingEvent?.roomId ?? '');
  const [attendees, setAttendees] = useState<number | ''>(editingEvent?.attendees ?? '');
  const [date, setDate] = useState(editingEvent?.date ?? '');
  const [startTime, setStartTime] = useState(editingEvent?.startTime ?? '');
  const [endTime, setEndTime] = useState(editingEvent?.endTime ?? '');
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

    const message = `📊 *REPORTES ZONA COWORKING* 📊\n📅 *Fecha:* ${capitalizedDate}\n\n🚪 *Espacio:* ${roomName}\n👥 *Evento:* ${eventName} (${finalType})\n👥 *Asistencia Planeada:* ${attendees} personas\n⏰ *Horario:* ${startTime} - ${endTime}\n\n🛠️ *Servicios y Notas Extra:*\n${notes || (resources.water || resources.coffee || resources.tv ? 'Incluye recursos logísticos estándar.' : 'Ninguna nota especial.')}\n\n⚡ *Estado:* Confirmado y Sincronizado.`;
    
    const encodedUri = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedUri}`, '_blank');
  };
  
  const checkCollision = async (): Promise<string | null> => {
    if (!db) return null;
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('date', '==', date), where('roomId', '==', roomId));
    const querySnapshot = await getDocs(q);
    
    let conflictingName: string | null = null;
    
    querySnapshot.forEach((docSnap) => {
      if (editingEvent && docSnap.id === editingEvent.id) return;
      
      const existing = docSnap.data() as EventData;
      if (startTime < existing.endTime && endTime > existing.startTime) {
        conflictingName = existing.eventName;
      }
    });
    
    return conflictingName;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth?.currentUser || !db) return;
    
    if (!eventName.trim() || !clientName.trim() || !type || !roomId || attendees === '' || !date || !startTime || !endTime || !roomLayout) {
      Swal.fire({
        title: 'Formulario Incompleto',
        text: 'Por favor completa todos los campos obligatorios, incluyendo la distribución del espacio.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return;
    }

    if (type === 'Otros' && !customType.trim()) {
      Swal.fire({
        title: 'Especificar Tipo',
        text: 'Por favor especifica el tipo de evento.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return;
    }

    if (roomLayout === 'Otro' && !customRoomLayout.trim()) {
      Swal.fire({
        title: 'Especificar Distribución',
        text: 'Por favor especifica la distribución del espacio.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return;
    }
    
    if (Number(attendees) < 1) {
      Swal.fire({
        title: 'Asistencia Inválida',
        text: 'El número de asistentes debe ser al menos 1.',
        icon: 'warning',
        confirmButtonColor: '#182865'
      });
      return;
    }

    setLoading(true);
    try {
      const conflict = await checkCollision();
      if (conflict) {
        Swal.fire({
          title: 'Espacio Ocupado',
          text: '¡Espacio ocupado! Ya existe un evento agendado en este horario y lugar. Detalles: ' + conflict,
          icon: 'error',
          confirmButtonColor: '#182865'
        });
        setLoading(false);
        return;
      }

      const payload: Omit<EventData, 'id'> = {
        eventName,
        clientName,
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
        totalCost: totalCost === '' ? undefined : Number(totalCost),
        depositUSD: depositUSD === '' ? undefined : Number(depositUSD),
        depositBS: depositBS === '' ? undefined : Number(depositBS),
        exchangeRate: exchangeRate === '' ? undefined : Number(exchangeRate),
        isTrustedClient,
        createdBy: auth.currentUser.uid,
        createdBy_Name: auth.currentUser.displayName ?? auth.currentUser.email ?? 'Staff',
        createdAt: editingEvent?.createdAt ?? Date.now()
      };
      
      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), payload);
      } else {
        await addDoc(collection(db, 'events'), payload);
      }
      
      if (editingEvent) {
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
    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'Error al guardar la reserva', icon: 'error', confirmButtonColor: '#182865' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || !db) return;
    
    const result = await Swal.fire({
      title: '¿Eliminar reserva?',
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
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Reserva eliminada correctamente', showConfirmButton: false, timer: 3000 });
      } catch (err) {
        console.error(err);
        Swal.fire({ title: 'Error', text: 'Hubo un problema al eliminar la reserva.', icon: 'error', confirmButtonColor: '#182865' });
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <>
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0'}`}>
      <div 
        className={`bg-white rounded-t-3xl sm:rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh] transition-transform duration-300 ease-out`}
        style={{ transform: (isOpen && !isClosing) ? 'translateY(0)' : 'translateY(100%)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 sticky top-0 bg-white z-10 font-sans">
          <h2 className="text-xl font-display font-bold text-brand-blue">
            {editingEvent ? 'Editar Reserva' : 'Nueva Reserva'}
          </h2>
          <div className="flex items-center gap-2">
            {editingEvent && (
              <button 
                type="button" 
                onClick={handleDelete} 
                disabled={deleting}
                className="p-2 sm:p-2.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 border border-red-100 bg-red-50/20 sm:border-transparent sm:bg-transparent"
                title="Eliminar Reserva"
              >
                <Trash2 size={18} />
                <span className="text-xs font-bold sm:hidden pr-1">Eliminar</span>
              </button>
            )}
            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 minimal-scrollbar pb-8 relative">
          <form id="reservation-form" onSubmit={handleSubmit} className="space-y-6">
            
            {editingEvent && (
              <div className="flex flex-wrap gap-2 mb-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <button type="button" onClick={generateICS} className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors shadow-sm shadow-blue-900/10">
                  <CalendarHeart size={16} /> Sincronizar Calendario
                </button>
                <button type="button" onClick={sendWhatsApp} className="flex-1 sm:flex-none min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1EBE5D] transition-colors shadow-sm shadow-green-600/20">
                  <MessageCircle size={16} /> Enviar Reporte
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 relative">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Tags size={16}/> Título del Evento</label>
                <input required type="text" value={eventName} onChange={e => setEventName(e.target.value)} 
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                  placeholder="Ej. Taller de Fotografía" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><User size={16}/> Cliente</label>
                  <input required type="text" value={clientName} onChange={e => setClientName(e.target.value)} 
                    className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                    placeholder="Nombre" />
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
              <div className="space-y-1.5 relative">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><CalendarIcon size={16}/> Fecha</label>
                <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
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
              <div className="space-y-1.5 relative">
                <label className="text-sm font-semibold text-slate-600">Espacio <span className="text-brand-orange font-bold">*</span></label>
                <select required value={roomId} onChange={e => setRoomId(e.target.value)}
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none cursor-pointer">
                  <option value="" disabled>Selecciona un espacio...</option>
                  {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name} (Max {r.capacity})</option>)}
                </select>
              </div>

              <div className="space-y-1.5 relative flex flex-col">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Layout size={16}/> Distribución del Espacio <span className="text-brand-orange font-bold">*</span></label>
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
                <label className="text-sm font-semibold text-slate-600">Tipo de Evento <span className="text-brand-orange font-bold">*</span></label>
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
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Users size={16}/> Cantidad de Personas <span className="text-brand-orange font-bold">*</span></label>
                <input required type="number" min="1" value={attendees} onChange={e => setAttendees(e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="w-full px-4 py-3 h-12 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-base font-display font-bold text-brand-blue mb-4">Control de Pagos</h3>
              
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
                  <input required={parsedBS > 0} type="number" min="0" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                    className="w-full px-4 py-3 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 transition-all font-mono" placeholder="40.00" />
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Resta por Cobrar ($)</span>
                <span className={`text-lg font-bold font-mono ${remainingBalance <= 0 && parsedTotalCost > 0 ? 'text-green-600' : 'text-brand-orange'}`}>
                  ${remainingBalance.toFixed(2)}
                </span>
              </div>

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

          </form>
        </div>
        
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))] sticky bottom-0 z-10 w-full">
          {editingEvent ? (
            <button type="button" onClick={handleDelete} disabled={deleting} className="w-full sm:w-auto justify-center px-4 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50 border border-red-100 sm:border-transparent bg-white sm:bg-transparent shadow-sm sm:shadow-none">
              <Trash2 size={18} /> Eliminar
            </button>
          ) : <div className="hidden sm:block"></div>}
          
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <button type="button" onClick={handleClose} className="w-full sm:w-auto px-6 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white sm:bg-slate-100 border border-slate-200 sm:border-transparent shadow-sm sm:shadow-none">
              Cancelar
            </button>
            <button type="submit" form="reservation-form" disabled={loading || !isFormValidFinancially} className="w-full flex-1 sm:flex-none sm:w-auto justify-center px-6 py-3 h-12 min-h-[44px] rounded-xl text-sm font-bold text-white bg-brand-orange hover:bg-[#E68505] shadow-md shadow-orange-500/20 transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2">
              {loading ? 'Guardando...' : 'Guardar y Confirmar'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
