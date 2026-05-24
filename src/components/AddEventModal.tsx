import React, { useState, FormEvent, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, Users, User, Layout, Tags, Trash2, AlertTriangle } from 'lucide-react';
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
  
  const [eventName, setEventName] = useState(editingEvent?.eventName ?? '');
  const [clientName, setClientName] = useState(editingEvent?.clientName ?? '');
  const [clientPhone, setClientPhone] = useState(editingEvent?.clientPhone ?? '');
  const [type, setType] = useState<EventType | ''>(editingEvent?.type ?? '');
  const [roomId, setRoomId] = useState(editingEvent?.roomId ?? '');
  const [attendees, setAttendees] = useState<number | ''>(editingEvent?.attendees ?? '');
  const [date, setDate] = useState(editingEvent?.date ?? '');
  const [startTime, setStartTime] = useState(editingEvent?.startTime ?? '');
  const [endTime, setEndTime] = useState(editingEvent?.endTime ?? '');
  const [roomLayout, setRoomLayout] = useState<RoomLayout | ''>(editingEvent?.roomLayout ?? '');
  const [notes, setNotes] = useState(editingEvent?.notes ?? '');
  const [resources, setResources] = useState({
    water: editingEvent?.resources?.water ?? false,
    coffee: editingEvent?.resources?.coffee ?? false,
    napkins: editingEvent?.resources?.napkins ?? false,
    tv: editingEvent?.resources?.tv ?? false,
  });
  
  const checkCollision = async (): Promise<string | null> => {
    if (!db) return null;
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('date', '==', date), where('roomId', '==', roomId));
    const querySnapshot = await getDocs(q);
    
    let conflictingName: string | null = null;
    
    querySnapshot.forEach((docSnap) => {
      if (editingEvent && docSnap.id === editingEvent.id) return;
      
      const existing = docSnap.data() as EventData;
      // Overlap condition: new start before existing ends AND new end after existing starts
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
      alert("Por favor completa todos los campos obligatorios y selecciona opciones válidas.");
      return;
    }
    
    if (Number(attendees) < 1) {
      alert("El número de asistentes debe ser al menos 1.");
      return;
    }

    setLoading(true);
    try {
      const conflict = await checkCollision();
      if (conflict) {
        alert("¡Espacio ocupado! Ya existe un evento agendado en este horario y lugar. Por favor, verifica con el responsable o elige otro espacio/horario.");
        setLoading(false);
        return;
      }

      const payload: Omit<EventData, 'id'> = {
        eventName,
        clientName,
        clientPhone,
        type: type as EventType,
        roomId,
        attendees: Number(attendees),
        date,
        startTime,
        endTime,
        roomLayout: roomLayout as RoomLayout,
        resources,
        notes,
        createdBy: auth.currentUser.uid,
        createdBy_Name: auth.currentUser.displayName ?? auth.currentUser.email ?? 'Staff',
        createdAt: editingEvent?.createdAt ?? Date.now()
      };
      
      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), payload);
      } else {
        await addDoc(collection(db, 'events'), payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la reserva');
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmDelete = async () => {
    if (!editingEvent || !db) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'events', editingEvent.id));
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error al eliminar la reserva');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-800 mb-2">¿Eliminar Reserva?</h3>
            <p className="text-sm font-medium text-slate-600 mb-6 px-2">
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este evento de la agenda?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete}
                disabled={deleting}
                className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-bold shadow-sm shadow-red-500/20 transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-display font-bold text-brand-blue">
            {editingEvent ? 'Editar Reserva' : 'Nueva Reserva'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 custom-scrollbar">
          <form id="reservation-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Tags size={16}/> Título del Evento</label>
                <input required type="text" value={eventName} onChange={e => setEventName(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                  placeholder="Ej. Taller de Fotografía" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><User size={16}/> Cliente</label>
                  <input required type="text" value={clientName} onChange={e => setClientName(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                    placeholder="Nombre" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2 pt-[1px]">WhatsApp</label>
                  <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" 
                    placeholder="+58 XXX" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><CalendarIcon size={16}/> Fecha</label>
                <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Clock size={16}/> Inicio</label>
                  <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Clock size={16}/> Fin</label>
                  <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600">Espacio</label>
                <select required value={roomId} onChange={e => setRoomId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all">
                  <option value="" disabled>Selecciona un espacio...</option>
                  {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name} (Max {r.capacity})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600">Tipo de Evento</label>
                <select required value={type} onChange={e => setType(e.target.value as EventType)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all">
                  <option value="" disabled>Selecciona tipo de evento...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Users size={16}/> Asistentes</label>
                <input required type="number" min="1" value={attendees} onChange={e => setAttendees(e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSetup(!showSetup)}
                className="w-full flex items-center justify-between text-sm font-semibold text-brand-blue hover:text-brand-blue/80 transition-colors"
              >
                <span>Configuración y Logística (Opcional)</span>
                <span className="text-xl leading-none">{showSetup ? '−' : '+'}</span>
              </button>
              
              {showSetup && (
                <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-600 flex items-center gap-2"><Layout size={16}/> Distribución del Espacio</label>
                      <select value={roomLayout} onChange={e => setRoomLayout(e.target.value as RoomLayout)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all">
                        <option value="" disabled>Selecciona un tipo de montaje...</option>
                        {['Tipo U', 'Teatro', 'Mesa de Conferencias', 'Con Mesas', 'Con Mesas y Sillas', 'Solo Sillas'].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-slate-600">Requerimientos Específicos</label>
                      
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <label className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <input type="checkbox" checked={resources.water} onChange={e => setResources({...resources, water: e.target.checked})} 
                            className="w-3.5 h-3.5 text-brand-orange border-slate-300 rounded focus:ring-brand-orange/20" />
                          <span>Agua</span>
                        </label>
                        <label className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <input type="checkbox" checked={resources.coffee} onChange={e => setResources({...resources, coffee: e.target.checked})} 
                            className="w-3.5 h-3.5 text-brand-orange border-slate-300 rounded focus:ring-brand-orange/20" />
                          <span>Café</span>
                        </label>
                        <label className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <input type="checkbox" checked={resources.napkins} onChange={e => setResources({...resources, napkins: e.target.checked})} 
                            className="w-3.5 h-3.5 text-brand-orange border-slate-300 rounded focus:ring-brand-orange/20" />
                          <span>Servilletas</span>
                        </label>
                        <label className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer p-2 rounded-xl bg-slate-50 border border-slate-200">
                          <input type="checkbox" checked={resources.tv} onChange={e => setResources({...resources, tv: e.target.checked})} 
                            className="w-3.5 h-3.5 text-brand-orange border-slate-300 rounded focus:ring-brand-orange/20" />
                          <span>TV</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-600">Observaciones</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all resize-none" 
                      placeholder="Detalles adicionales del evento..." />
                  </div>
                </div>
              )}
            </div>

          </form>
        </div>
        
        <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {editingEvent ? (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={deleting} className="w-full sm:w-auto justify-center px-4 py-3 sm:py-2.5 rounded-xl text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50 border border-red-100 sm:border-transparent bg-white sm:bg-transparent shadow-sm sm:shadow-none">
              <Trash2 size={18} /> Eliminar
            </button>
          ) : <div className="hidden sm:block"></div>}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white sm:bg-slate-100 border border-slate-200 sm:border-transparent shadow-sm sm:shadow-none">
              Cancelar
            </button>
            <button type="submit" form="reservation-form" disabled={loading} className="w-full sm:w-auto justify-center px-6 py-3 sm:py-2.5 rounded-xl text-sm font-bold text-white bg-brand-orange hover:bg-[#E68505] shadow-md shadow-orange-500/20 transition-all disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2">
              {loading ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
