import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Plus, Package, Bot, Bell, Clock, MapPin, 
  Check, AlertCircle, Coffee, Droplets, Share, Users, BellRing, LogOut, KeyRound, Mail, Trash2, PieChart
} from 'lucide-react';
import { db, auth } from './firebase';
import { 
  collection, doc, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc, query, getDoc, getDocs, where 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, onAuthStateChanged, signOut, User
} from 'firebase/auth';

// --- Error Handler Helper ---
enum OperationType {
  CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write'
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app we might throw or display, but logging is critical for diagnostics
}

// --- Types ---
type EventType = 'Reunión' | 'Curso' | 'Masterclass' | 'Taller' | 'Sesión Fotográfica' | 'Grabación de Contenido' | 'Evento Corporativo' | 'Otros';
const EVENT_TYPES: EventType[] = ['Reunión', 'Curso', 'Masterclass', 'Taller', 'Sesión Fotográfica', 'Grabación de Contenido', 'Evento Corporativo', 'Otros'];

type RoomLayout = 'Auditorio' | 'Mesa en U' | 'Talleres';

interface EventResource {
  sillas: boolean; mesas: boolean; cubiertos: boolean; agua: boolean; cafe: boolean; servilletas: boolean;
}

interface Room {
  id: string; name: string; area: number; capacity: number; color: string;
}

interface EventData {
  id: string; eventName: string; clientName: string; type: EventType;
  roomId: string; attendees: number; date: string; startTime: string; endTime: string;
  resources: EventResource; roomLayout: RoomLayout; createdBy: string; createdBy_Name?: string; createdBy_Color?: string; createdAt?: number;
}

interface UserIdentity {
  colorSelected: boolean;
  color?: string;
  displayName?: string;
}

interface Inventory {
  coffeeStatus: 'green' | 'yellow' | 'red';
  waterStatus: 'green' | 'yellow' | 'red';
}

const ROOMS: Room[] = [
  { id: '1', name: 'Río Morichal', area: 46, capacity: 50, color: 'bg-blue-500' },
  { id: '2', name: 'Cocina de Ríos', area: 12.35, capacity: 8, color: 'bg-amber-500' },
  { id: '3', name: 'Río Amana', area: 15.4, capacity: 12, color: 'bg-emerald-500' },
  { id: '4', name: 'Río Guarapiche 1', area: 10.8, capacity: 6, color: 'bg-purple-500' },
  { id: '5', name: 'Río Guarapiche 2', area: 9.6, capacity: 8, color: 'bg-pink-500' },
  { id: '6', name: 'Río San Juan', area: 23.6, capacity: 20, color: 'bg-indigo-500' },
];

const COLOR_OPTIONS = ['#182865', '#FF9305', '#10b981', '#6366f1', '#f43f5e'];

const LOGO_WHITE = "https://i.ibb.co/Kp9Hh2Vt/Logo-Blanco.png";
const LOGO_COLOR = "https://i.ibb.co/ZzzzFy6S/Logo.png";
const ICON_WHITE = "https://i.ibb.co/pvPcNWzD/Icono-Negativoo.png";
const ICON_COLOR = "https://i.ibb.co/HfL8FrzP/Icono.png";

// --- Login Screen Component ---
  function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
  
    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!auth) {
        setError('Firebase Auth no inicializado. Revisa la consola.');
        return;
      }
      setError('');
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess();
      } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        console.error('ERROR CRÍTICO: Firebase Auth "Email/Password" no está habilitado en tu consola de Firebase. Por favor actívalo en Authentication > Sign-in method.');
      }
      setError('Error de credenciales. Verifica tu usuario y contraseña, o contacta al administrador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[#182865]">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-zona-orange/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      </div>
      
      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex justify-center mb-6">
          <img className="h-16 w-auto object-contain drop-shadow-xl" src={LOGO_WHITE} alt="Zona Coworking" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-white tracking-tight">
          Acceso al Sistema
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-md py-10 px-6 sm:px-10 shadow-2xl rounded-[24px] border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-[12px] text-sm font-semibold flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0" /> {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                Correo Electrónico
              </label>
              <div className="mt-2 relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-10 appearance-none block w-full px-3 py-3 border border-gray-200 rounded-[12px] shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zona-orange focus:border-transparent transition-all font-medium text-gray-900"
                  placeholder="ejemplo@coworking.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                Contraseña
              </label>
              <div className="mt-2 relative">
                <KeyRound className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-10 appearance-none block w-full px-3 py-3 border border-gray-200 rounded-[12px] shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zona-orange focus:border-transparent transition-all font-medium text-gray-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit" disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-[12px] shadow-lg shadow-orange-500/30 text-sm font-bold text-white bg-zona-orange hover:bg-[#eb8400] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zona-orange active:scale-95 disabled:opacity-70"
              >
                {loading ? 'Procesando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// --- Main Application ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null);
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  const [events, setEvents] = useState<EventData[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inventory, setInventory] = useState<Inventory>({ coffeeStatus: 'green', waterStatus: 'green' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'agenda' | 'nuevo' | 'metricas' | 'ia'>('agenda');
  
  // Notification State
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState({ title: '', desc: '', type: 'success' });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<EventData>>({
    eventName: '', clientName: '', type: 'Reunión', attendees: 10, roomId: '',
    date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00',
    roomLayout: 'Mesa en U', resources: { sillas: false, mesas: false, cubiertos: false, agua: false, cafe: false, servilletas: false }
  });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventToView, setEventToView] = useState<EventData | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Check Auth State
  useEffect(() => {
    if (!auth) {
       console.error("Firebase Auth is not initialized due to missing config or initialization error.");
       setAuthInitialized(true);
       return;
    }
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserIdentity;
            setUserIdentity(data);
            if (!data.colorSelected) {
              setShowIdentityModal(true);
            }
          } else {
            setShowIdentityModal(true);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      } else {
        setUserIdentity(null);
        setShowIdentityModal(false);
      }
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  // Sync with Firestore
  useEffect(() => {
    if (!user || !db) return;

    const q = query(collection(db, 'events'));
    const unsubEvents = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const ev = change.doc.data() as EventData;
          if (!change.doc.metadata.hasPendingWrites && ev.createdAt && (Date.now() - ev.createdAt < 60000)) {
            const roomName = ROOMS.find(r => r.id === ev.roomId)?.name || 'Sala';
            const creator = ev.createdBy_Name || 'Usuario';
            sendRealNotification(`¡Nueva Reserva! - ${roomName}`, { 
              body: `Agendada por ${creator} para el ${ev.date.split('-').reverse().join('/')}` 
            });
          }
        }
      });

      const liveEvents: EventData[] = [];
      snapshot.forEach(doc => {
        liveEvents.push({ id: doc.id, ...doc.data() } as EventData);
      });
      setEvents(liveEvents);
      setIsEventsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'events');
    });

    const inventoryRef = doc(db, 'inventory', 'dispensers');
    const unsubInventory = onSnapshot(inventoryRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Inventory;
        setInventory({ coffeeStatus: data.coffeeStatus || 'green', waterStatus: data.waterStatus || 'green' });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory/dispensers');
    });

    return () => {
      unsubEvents();
      unsubInventory();
    };
  }, [user]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Suggest Room Effect
  useEffect(() => {
    if (formData.attendees && !formData.roomId) {
      const suggest = ROOMS.filter(r => r.capacity >= (formData.attendees || 0)).sort((a,b) => a.capacity - b.capacity)[0];
      if (suggest) {
        setFormData(prev => ({ ...prev, roomId: suggest.id }));
      }
    }
  }, [formData.attendees, formData.roomId]);

  const updateInventoryInFirestore = async (newInventory: Inventory) => {
    if (!db) return;
    setInventory(newInventory); // optimistic
    try {
      const inventoryRef = doc(db, 'inventory', 'dispensers');
      await setDoc(inventoryRef, newInventory, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'inventory/dispensers');
    }
  };

  const triggerAppNotification = (title: string, desc: string, type: 'success' | 'error' | 'alert' = 'success') => {
    setNotificationMsg({ title, desc, type });
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
       triggerAppNotification('Error', 'Tu navegador no soporta notificaciones de escritorio.', 'error');
       return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (permission === 'granted') {
       triggerAppNotification('¡Activadas!', 'Las notificaciones del sistema están habilitadas.', 'success');
    }
  };

  const sendRealNotification = (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { icon: ICON_COLOR, ...options });
    }
  };

  const handleResourceToggle = (key: keyof EventResource) => {
    setFormData(prev => ({
      ...prev,
      resources: { ...prev.resources!, [key]: !prev.resources![key] }
    }));
  };

  const checkConflicts = (date: string, start: string, end: string, roomId: string, excludeEventId: string | null = null) => {
    const newStart = new Date(`1970-01-01T${start}:00`).getTime();
    const newEnd = new Date(`1970-01-01T${end}:00`).getTime();

    return events.filter(e => e.date === date && e.roomId === roomId && e.id !== excludeEventId).some(e => {
      const eStart = new Date(`1970-01-01T${e.startTime}:00`).getTime();
      const eEnd = new Date(`1970-01-01T${e.endTime}:00`).getTime();
      return (newStart < eEnd && newEnd > eStart);
    });
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!user || !db) return;
    if (!formData.eventName || !formData.clientName || !formData.date || !formData.startTime || !formData.endTime || !formData.roomId) return;

    setIsSaving(true);

    const selectedRoomDetails = ROOMS.find(r => r.id === formData.roomId);
    if (selectedRoomDetails && (formData.attendees || 0) > selectedRoomDetails.capacity) {
      triggerAppNotification('Capacidad Excedida', 'Por favor, selecciona una sala con suficiente capacidad.', 'error');
      setIsSaving(false);
      return;
    }

    try {
      // Remote Duplicate Prevention Query
      const q = query(
        collection(db, 'events'), 
        where('date', '==', formData.date), 
        where('roomId', '==', formData.roomId)
      );
      const snapshot = await getDocs(q);
      const newStart = new Date(`1970-01-01T${formData.startTime}:00`).getTime();
      const newEnd = new Date(`1970-01-01T${formData.endTime}:00`).getTime();
      
      const hasConflict = snapshot.docs.some(d => {
        if (d.id === editingEventId) return false;
        const eData = d.data();
        const eStart = new Date(`1970-01-01T${eData.startTime}:00`).getTime();
        const eEnd = new Date(`1970-01-01T${eData.endTime}:00`).getTime();
        return (newStart < eEnd && newEnd > eStart);
      });

      if (hasConflict) {
        triggerAppNotification('Conflicto detectado', 'El salón ya está ocupado en este horario', 'error');
        setIsSaving(false);
        return;
      }
    } catch (err) {
      console.warn('Conflict check failed, falling back to local state:', err);
      if (checkConflicts(formData.date, formData.startTime as string, formData.endTime as string, formData.roomId, editingEventId)) {
        triggerAppNotification('Conflicto detectado', 'El salón ya está ocupado en este horario', 'error');
        setIsSaving(false);
        return;
      }
    }

    const payload = {
      eventName: formData.eventName,
      clientName: formData.clientName,
      type: formData.type as EventType,
      roomId: formData.roomId,
      attendees: formData.attendees || 0,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      roomLayout: formData.roomLayout as RoomLayout,
      resources: formData.resources as EventResource,
      createdBy: user.uid,
      createdBy_Name: user.displayName || user.email || 'Usuario',
      createdBy_Color: userIdentity?.color || '#182865',
      createdAt: Date.now()
    };

    try {
      if (editingEventId) {
        await updateDoc(doc(db, 'events', editingEventId), payload as any);
        triggerAppNotification('Reserva Exitosa', `Modificado: ${payload.eventName}`, 'success');
      } else {
        await addDoc(collection(db, 'events'), payload);
        triggerAppNotification('Reserva Exitosa', `Reservado: ${payload.eventName}`, 'success');
        
        // Secondary actions running asynchronously without failing UI
        Promise.allSettled([
          sendRealNotification('✅ Nuevo Evento Agendado', { body: `${payload.eventName} por ${payload.clientName} en ${ROOMS.find(r=>r.id===payload.roomId)?.name}.` })
        ]).catch(err => console.error("Secondary action failed:", err));
      }
      
      setActiveTab('agenda');
      setCurrentDate(new Date(`${formData.date}T12:00:00`));

      setFormData({
        eventName: '', clientName: '', type: 'Reunión', attendees: 10, roomId: '',
        date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00',
        roomLayout: 'Mesa en U', resources: { sillas: false, mesas: false, cubiertos: false, agua: false, cafe: false, servilletas: false }
      });
      setEditingEventId(null);
    } catch (error: any) {
      console.error("DEBUG_INFO:", error?.code, error?.message || error);
      
      const errorCode = error?.code || '';
      if (errorCode === 'already-exists' || errorCode === 'document-already-exists') {
        setActiveTab('agenda');
        setEditingEventId(null);
        triggerAppNotification('Reserva Exitosa', `La reserva ya fue procesada.`, 'success');
      } else {
        const eventExistsInLocalCache = events.some(e => 
          e.date === formData.date && 
          e.roomId === formData.roomId && 
          e.startTime === formData.startTime && 
          e.createdBy === user.uid
        );

        if (eventExistsInLocalCache) {
          triggerAppNotification('Reserva Exitosa', 'Guardado y sincronizado localmente.', 'success');
          setActiveTab('agenda');
          setEditingEventId(null);
        } else {
          triggerAppNotification('Error', 'Error inesperado: No se pudo procesar la solicitud.', 'error');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!db) return;
    try {
      // Optimistic delete, run in background
      deleteDoc(doc(db, 'events', id)).catch(error => {
        console.error("Background sync error (delete):", error);
      });
      triggerAppNotification('Evento Eliminado', 'La reserva ha sido cancelada con éxito.', 'success');
      setEventToDelete(null);
      if (editingEventId === id) {
        setEditingEventId(null);
        setActiveTab('agenda');
      }
    } catch (error) {
      triggerAppNotification('Error', 'Error inesperado: No se pudo procesar la solicitud.', 'error');
    }
  };

  const handleNewTabClick = () => {
    setEditingEventId(null);
    setFormData({
      eventName: '', clientName: '', type: 'Reunión', attendees: 10, roomId: '',
      date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00',
      roomLayout: 'Mesa en U', resources: { sillas: false, mesas: false, cubiertos: false, agua: false, cafe: false, servilletas: false }
    });
    setActiveTab('nuevo');
  };

  const handleEventClick = (evt: EventData) => {
    setEventToView(evt);
  };

  const handleEditFromView = (evt: EventData) => {
    setEventToView(null);
    setEditingEventId(evt.id);
    setFormData({
      eventName: evt.eventName,
      clientName: evt.clientName,
      type: evt.type,
      roomId: evt.roomId,
      attendees: evt.attendees,
      date: evt.date,
      startTime: evt.startTime,
      endTime: evt.endTime,
      roomLayout: evt.roomLayout,
      resources: evt.resources
    });
    setActiveTab('nuevo');
  };

  const simulatePrepAlert = () => {
    triggerAppNotification('Alerta de Preparación', 'Faltan 45 min para "Taller de Diseño".', 'alert');
    sendRealNotification('⏳ Alerta de Preparación', { body: 'Faltan 45 min para "Taller de Diseño". Revisa el café y agua.' });
  };

  const generateAIReport = () => {
    const todayStr = currentDate.toISOString().split('T')[0];
    const currDay = currentDate.getDay() || 7; 
    const firstDay = new Date(currentDate);
    firstDay.setDate(currentDate.getDate() - currDay + 1);
    
    let weekEventsCount = 0;
    let coffeeCount = 0;
    let summaryList = '';

    for(let i=0; i<7; i++) {
        const d = new Date(firstDay);
        d.setDate(firstDay.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        const dayEvts = events.filter(e => e.date === dStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
        weekEventsCount += dayEvts.length;

        dayEvts.forEach(e => {
            if (e.resources?.cafe) coffeeCount += (e.attendees * 0.2); 
            const room = ROOMS.find(r => r.id === e.roomId);
            const dayName = d.toLocaleDateString('es-ES', { weekday: 'long' });
            summaryList += `- ${dayName} ${e.startTime}: ${room?.name} (${e.eventName})\n`;
        });
    }

    let report = `*Logística Zona Coworking - Resumen Semanal*\n\n`;
    report += `☕ Café aprox requerido: ${Math.ceil(coffeeCount)}L\n`;
    report += `💧 Estado Filtros: Agua (${inventory.waterStatus.toUpperCase()})\n\n`;
    
    if (weekEventsCount === 0) {
      report += `No hay eventos programados esta semana.`;
    } else {
      report += `*Eventos de la semana (${weekEventsCount}):*\n`;
      report += summaryList;
    }

    const url = `https://wa.me/?text=${encodeURIComponent(report)}`;
    window.open(url, '_blank');
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const formattedMonth = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getNextEvent = () => {
    const now = new Date();
    const sorted = [...events].filter(e => {
        const evDate = new Date(`${e.date}T${e.startTime}:00`);
        return evDate > now;
    }).sort((a,b) => new Date(`${a.date}T${a.startTime}:00`).getTime() - new Date(`${b.date}T${b.startTime}:00`).getTime());
    return sorted[0];
  };
  const nextEvent = getNextEvent();
  const suggestedRoom = ROOMS.filter(r => r.capacity >= (formData.attendees || 0)).sort((a,b) => a.capacity - b.capacity)[0];
  const selectedRoomDetails = ROOMS.find(r => r.id === formData.roomId);
  const exceedsCapacity = selectedRoomDetails && (formData.attendees || 0) > selectedRoomDetails.capacity;

  // Metrics Computation
  const currentMonthEvents = events.filter(e => {
    const d = new Date(`${e.date}T12:00:00`);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  });
  
  const totalReservasMes = currentMonthEvents.length;
  
  const roomCounts = currentMonthEvents.reduce((acc, e) => {
    acc[e.roomId] = (acc[e.roomId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const favoriteRoomId = Object.keys(roomCounts).length > 0 ? Object.keys(roomCounts).reduce((a, b) => roomCounts[a] > roomCounts[b] ? a : b) : '';
  const salonFavorito = ROOMS.find(r => r.id === favoriteRoomId)?.name || 'N/A';
  
  const totalBookedHours = currentMonthEvents.reduce((acc, e) => {
    const startObj = new Date(`1970-01-01T${e.startTime}:00`);
    const endObj = new Date(`1970-01-01T${e.endTime}:00`);
    return acc + Math.max(0, (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60));
  }, 0);
  const totalAvailableHours = 22 * 10 * ROOMS.length; // ~22 days, 10 hours/day, all rooms
  const occupancyPercentage = Math.min(100, Math.max(0, Math.round((totalBookedHours / totalAvailableHours) * 100))) || 0;

  if (!authInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zona-orange"></div></div>;
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={() => triggerAppNotification('Bienvenido', 'Has iniciado sesión correctamente.', 'success')} />;
  }

  return (
    <div className="flex h-[100dvh] bg-gray-50/50 overflow-hidden font-sans text-zona-blue selection:bg-zona-orange/20 selection:text-zona-blue">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex w-[260px] lg:w-64 shrink-0 bg-white border-r border-gray-100 flex-col h-full z-20">
        <div className="py-8 px-6 flex justify-center mb-8 border-b border-gray-50/50">
          <img src={LOGO_COLOR} alt="Zona Coworking" className="w-[85%] h-auto object-contain" />
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'agenda', icon: CalendarIcon, label: 'Agenda' },
            { id: 'nuevo', icon: Plus, label: 'Nuevo Evento' },
            { id: 'metricas', icon: PieChart, label: 'Métricas' }
          ].map(item => (
            <button key={item.id} onClick={() => {
              if (item.id === 'nuevo') {
                handleNewTabClick();
              } else {
                setActiveTab(item.id as any);
              }
            }} className={`w-full flex items-center px-4 py-3.5 rounded-[16px] transition-all duration-300 ${activeTab === item.id ? 'bg-zona-orange/10 text-zona-orange font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-zona-blue font-medium'}`}>
              <item.icon className="w-5 h-5 mr-3 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mx-4 mt-8 mb-4 p-4 rounded-[16px] bg-gradient-to-br from-zona-blue to-[#1a2f7c] border border-blue-900/50 cursor-pointer shadow-lg hover:-translate-y-0.5 transition-transform group shrink-0" onClick={() => setActiveTab('ia')}>
            <div className="flex items-center mb-1">
                <Bot className="w-4 h-4 text-zona-orange mr-2 shrink-0" />
                <span className="font-bold text-sm text-white">Reporte IA</span>
            </div>
            <p className="text-[11px] text-white/70 font-medium leading-tight">Generación de resumen.</p>
        </div>
        
        <div className="px-4 pb-6">
          <button onClick={() => auth && signOut(auth)} className="w-full flex items-center justify-center px-4 py-3 text-red-500 hover:bg-red-50 rounded-[16px] transition-colors font-bold text-sm">
            <LogOut className="w-4 h-4 mr-2" /> Salir
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto pb-32 md:pb-8 pt-[calc(80px+env(safe-area-inset-top))] md:pt-0 relative scroll-smooth flex flex-col justify-start items-center">
        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 right-0 w-full flex items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-white/90 backdrop-blur-xl shadow-sm z-[1000] border-b border-gray-100">
          <div className="flex items-center shrink-0">
             <img src={ICON_COLOR} alt="Zona" className="h-8 w-8 mr-2 object-contain" />
             <span className="font-bold tracking-tight text-lg text-zona-blue">Zona</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={requestNotifications} className="p-2 relative bg-gray-50 rounded-full text-zona-blue hover:bg-gray-100 transition-colors shrink-0">
              {notificationsEnabled ? <BellRing className="w-5 h-5 text-zona-orange" /> : <Bell className="w-5 h-5" />}
            </button>
            <button onClick={() => auth && signOut(auth)} className="p-2 bg-red-50 rounded-full text-red-500 hover:bg-red-100 transition-colors shrink-0">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <AnimatePresence>
        {showNotification && (
          <motion.div initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }} transition={{ duration: 0.3 }} className="fixed top-[calc(5rem+env(safe-area-inset-top))] md:top-4 left-1/2 z-[1100] w-[90%] md:w-auto max-w-md">
            <div className={`px-6 py-4 rounded-[20px] shadow-2xl flex items-center border backdrop-blur-xl ${
                notificationMsg.type === 'error' ? 'bg-red-500/95 border-red-400 text-white' : 
                notificationMsg.type === 'alert' ? 'bg-zona-orange/95 border-orange-400 text-white' : 
                'bg-[#182865]/95 border-blue-800 text-white'
            }`}>
              {notificationMsg.type === 'error' ? <AlertCircle className="w-6 h-6 mr-3 shrink-0" /> : 
               notificationMsg.type === 'alert' ? <Clock className="w-6 h-6 mr-3 shrink-0" /> :
               <Check className="w-6 h-6 mr-3 text-green-400 shrink-0" />}
              <div>
                <p className="text-sm font-bold">{notificationMsg.title}</p>
                <p className="text-xs opacity-90 mt-0.5">{notificationMsg.desc}</p>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="w-full xl:w-[90%] max-w-[2000px] px-4 md:px-6 lg:px-8 py-6 md:py-8 flex flex-col">
          <AnimatePresence mode="wait">
          {/* TAB: AGENDA */}
          {activeTab === 'agenda' && (
            <motion.div key="agenda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 bg-white p-4 md:p-6 rounded-[24px] shadow-sm border border-gray-100 w-full">
                <div className="flex items-center min-w-0">
                  <div className="w-12 h-12 rounded-[16px] bg-blue-50 flex items-center justify-center mr-4 shrink-0 border border-blue-100/50">
                     <CalendarIcon className="w-6 h-6 text-zona-blue" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zona-blue capitalize truncate">{formattedMonth}</h1>
                    <p className="text-gray-500 mt-0.5 text-xs md:text-sm font-medium">Visualización Mensual</p>
                  </div>
                </div>
                
                <div className="flex items-center bg-gray-50 rounded-[16px] border border-gray-200 p-1 w-fit shrink-0">
                  <button onClick={prevMonth} className="px-3 sm:px-4 py-2 hover:bg-white rounded-xl transition-all font-semibold text-gray-600 hover:shadow-sm text-sm">Anterior</button>
                  <button onClick={nextMonth} className="px-3 sm:px-4 py-2 hover:bg-white rounded-xl transition-all font-semibold text-gray-600 hover:shadow-sm text-sm">Siguiente</button>
                </div>
              </div>

              <div className="bg-white rounded-[24px] shadow-lg shadow-blue-900/5 border border-gray-100 overflow-hidden w-full min-h-[400px] relative">
                 {isEventsLoading ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zona-orange mb-4"></div>
                     <p className="text-gray-500 font-medium">Sincronizando con reservas...</p>
                   </div>
                 ) : (
                   <>
                     <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                       {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                         <div key={d} className="text-center text-[10px] md:text-xs font-bold text-gray-400 py-3 uppercase tracking-wider">{d}</div>
                       ))}
                     </div>
                     <div className="grid grid-cols-7 auto-rows-[80px] md:auto-rows-[120px] bg-gray-100 gap-px">
                       {blanks.map((_, i) => <div key={`blank-${i}`} className="bg-white min-h-[80px] md:min-h-[120px]" />)}
                       {days.map(day => {
                          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                          const dayEvents = events.filter(e => e.date === dateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
                          const isToday = new Date().toISOString().split('T')[0] === dateStr;
                          const isSelected = selectedDateStr === dateStr;
                          return (
                            <div key={day} onClick={() => setSelectedDateStr(dateStr)} className={`bg-white p-2 md:p-3 transition-colors hover:bg-blue-50/50 cursor-pointer overflow-hidden flex flex-col ${isSelected ? 'ring-[3px] ring-zona-orange ring-inset bg-orange-50/20 z-10 relative' : ''}`}>
                               <div className={`font-bold text-xs md:text-sm mb-1.5 md:mb-2 w-6 h-6 md:w-7 md:h-7 mx-auto md:mx-0 flex items-center justify-center rounded-full shrink-0 ${isToday ? 'bg-zona-orange text-white shadow-md' : isSelected ? 'bg-zona-blue text-white' : 'text-gray-500'}`}>{day}</div>
                               <div className="flex flex-wrap md:flex-col gap-2 md:gap-1 mt-1 pb-1 justify-center md:justify-start flex-1 overflow-hidden">
                                 {dayEvents.map(e => {
                                   const room = ROOMS.find(r => r.id === e.roomId);
                                   return (
                                     <div key={e.id} onClick={(evt) => { evt.stopPropagation(); handleEventClick(e); }} className="relative group cursor-pointer lg:w-full min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center md:block justify-center">
                                       <div className="md:hidden w-3 h-3 rounded-full shadow-sm hover:scale-150 transition-transform m-2" style={{ backgroundColor: e.createdBy_Color || e.userColor || '#9ca3af' }} />
                                       <div className="hidden md:flex w-full px-1.5 py-1 text-[10.5px] font-bold rounded overflow-hidden whitespace-nowrap text-ellipsis text-white shadow-sm hover:opacity-90 transition-opacity min-h-[24px] items-center" style={{ backgroundColor: e.createdBy_Color || e.userColor || '#9ca3af' }} title={e.eventName}>
                                          {e.eventName}
                                       </div>
                                     </div>
                                   );
                                 })}
                               </div>
                            </div>
                          );
                       })}
                     </div>
                   </>
                 )}
              </div>

              {/* Eventos del Día Seleccionado */}
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                 <h3 className="text-xl md:text-2xl font-bold tracking-tight text-zona-blue mb-4">
                   Eventos del <span className="text-zona-orange">{selectedDateStr.split('-').reverse().join('/')}</span>
                 </h3>
                 {(() => {
                   const dayEvents = events.filter(e => e.date === selectedDateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
                   if (dayEvents.length === 0) {
                     return (
                       <div className="bg-gray-50/80 rounded-[20px] p-8 text-center border border-gray-100">
                         <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                         <p className="text-gray-500 font-medium">No hay eventos agendados para este día.</p>
                       </div>
                     );
                   }
                   return (
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {dayEvents.map((e, idx) => {
                         const room = ROOMS.find(r => r.id === e.roomId);
                         return (
                           <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.05 }} onClick={() => handleEventClick(e)} className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col relative hover:shadow-md transition-all hover:-translate-y-1 group cursor-pointer">
                              <div className={`absolute top-0 left-0 w-1.5 h-full ${room?.color || 'bg-gray-500'}`}></div>
                              <div className="p-5 md:p-6 pl-6 md:pl-8 flex-1 flex flex-col w-full min-w-0">
                                  <div className="flex justify-between items-center mb-4">
                                      <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center border shadow-sm ${room?.color ? room.color.replace('bg-', 'bg-').replace('500', '50') : 'bg-gray-50'} ${room?.color ? room.color.replace('bg-', 'text-').replace('500', '700') : 'text-gray-700'} ${room?.color ? room.color.replace('bg-', 'border-').replace('500', '200') : 'border-gray-200'}`}>
                                          <MapPin className="w-3 h-3 mr-1 shrink-0"/> <span className="truncate">{room?.name}</span>
                                      </div>
                                      <div className="text-sm font-bold text-gray-500 flex items-center bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                                          <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400 shrink-0"/> {e.startTime} - {e.endTime}
                                      </div>
                                  </div>
                                  
                                  <div className="mb-6">
                                      <h4 className="text-xl font-bold text-zona-blue leading-tight mb-1 line-clamp-2" title={e.eventName}>{e.eventName}</h4>
                                      <p className="text-sm text-gray-500 font-medium truncate" title={`${e.clientName} • ${e.type}`}>{e.clientName} • {e.type}</p>
                                  </div>

                                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100 shadow-sm shrink-0 border border-gray-200" style={{ backgroundColor: e.createdBy_Color || e.userColor || '#f3f4f6', borderColor: 'rgba(0,0,0,0.05)' }}>
                                             {/* Initials could go here if we had them, leave empty for just color */}
                                          </div>
                                          <div className="flex flex-col">
                                              <span className="text-[10px] text-gray-400 font-bold uppercase leading-none mb-0.5">Organizador</span>
                                              <span className="text-xs font-semibold text-gray-700 leading-none truncate max-w-[120px]" title={e.createdBy_Name || e.creatorName || 'Usuario'}>{e.createdBy_Name || e.creatorName || 'Usuario'}</span>
                                          </div>
                                      </div>
                                      <div className="flex items-center text-xs font-semibold text-gray-500">
                                          <Users className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {e.attendees}
                                      </div>
                                  </div>
                              </div>
                           </motion.div>
                         );
                       })}
                     </div>
                   );
                 })()}
              </div>
            </motion.div>
          )}

          {/* TAB: NUEVO EVENTO */}
          {activeTab === 'nuevo' && (
            <motion.div key="nuevo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full max-w-5xl">
              <div className="mb-6 md:mb-8 text-center md:text-left">
                 <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zona-blue">{editingEventId ? 'Editar Espacio' : 'Agendar Espacio'}</h1>
                 <p className="text-gray-500 text-xs md:text-sm mt-1 font-medium">{editingEventId ? 'Modifica los detalles de la reserva.' : 'Reserva inteligente con prevención de conflictos.'}</p>
              </div>
              <form onSubmit={handleAddEvent} className="bg-white rounded-[24px] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden w-full">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-6 md:p-10 border-b md:border-b-0 md:border-r border-gray-100">
                    <h3 className="text-base md:text-lg font-bold text-zona-blue mb-6 flex items-center min-w-0"><MapPin className="w-5 h-5 mr-2 text-zona-orange shrink-0" /> Detalles del Evento</h3>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Nombre del Evento</label>
                        <input required type="text" value={formData.eventName} onChange={e => setFormData({...formData, eventName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-zona-orange/30 transition-all font-semibold text-gray-900" placeholder="Ej. Bootcamp de Diseño" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Cliente / Empresa</label>
                        <input required type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-zona-orange/30 transition-all font-medium text-gray-900" placeholder="Ej. Acme Corp" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Tipo</label>
                          <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as EventType})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-zona-orange/30 transition-all font-medium text-gray-900 text-sm">
                            {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2 relative">
                          <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Asistentes</label>
                          <div className="relative">
                            <Users className="w-5 h-5 absolute left-3 top-3.5 text-blue-500" />
                            <input required type="number" min="1" max="500" value={formData.attendees} onChange={e => setFormData({...formData, attendees: parseInt(e.target.value) || 0})} className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-200 rounded-[14px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-zona-blue/30 transition-all font-bold text-zona-blue" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 md:p-10 bg-gray-50/50">
                     <h3 className="text-base md:text-lg font-bold text-zona-blue mb-6 flex items-center min-w-0"><Clock className="w-5 h-5 mr-2 text-zona-orange shrink-0" /> Horario y Espacio</h3>
                     <div className="space-y-6">
                       <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Fecha</label>
                            <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-zona-orange/30 font-medium text-gray-900 shadow-sm" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                             <div className="space-y-2">
                                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Inicio</label>
                                <input required type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full px-2 py-3 bg-white border border-gray-200 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-zona-orange/30 font-mono font-medium text-gray-900 shadow-sm text-center"/>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">Fin</label>
                                <input required type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full px-2 py-3 bg-white border border-gray-200 rounded-[14px] focus:outline-none focus:ring-2 focus:ring-zona-orange/30 font-mono font-medium text-gray-900 shadow-sm text-center"/>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400 text-ellipsis overflow-hidden whitespace-nowrap block w-full">Sala (Sugerencia por: {formData.attendees} pers)</label>
                          <select required value={formData.roomId} onChange={e => setFormData({...formData, roomId: e.target.value})} className={`w-full px-4 py-3 border rounded-[14px] focus:outline-none focus:ring-2 shadow-sm transition-all font-semibold text-sm ${exceedsCapacity ? 'bg-red-50/50 border-red-300 text-red-900 focus:ring-red-500/20' : suggestedRoom && formData.roomId === suggestedRoom.id ? 'bg-green-50/50 border-green-300 text-green-900 focus:ring-green-500/20' : 'bg-white border-gray-200 text-gray-900 focus:ring-zona-orange/30'}`}>
                            <option value="" disabled>Selecciona una sala...</option>
                            {ROOMS.map(r => <option key={r.id} value={r.id} disabled={(formData.attendees || 0) > r.capacity}>{r.name} (Cap: {r.capacity} | {r.area}m²)</option>)}
                          </select>
                          {exceedsCapacity && <p className="text-[11px] font-bold text-red-600 px-1 mt-1 flex items-center min-w-0"><AlertCircle className="w-3 h-3 mr-1 shrink-0" /> La capacidad de la sala es de {selectedRoomDetails?.capacity} pers.</p>}
                          {!exceedsCapacity && suggestedRoom && formData.roomId === suggestedRoom.id && <p className="text-[11px] font-bold text-green-600 px-1 mt-1 flex items-center min-w-0"><Check className="w-3 h-3 mr-1 shrink-0" /> Sugerencia por capacidad aplicada.</p>}
                       </div>
                       <div className="pt-2">
                          <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400 block mb-3">Requerimientos (Checklist)</label>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(formData.resources || {}).map(([key, value]) => (
                               <button type="button" key={key} onClick={() => handleResourceToggle(key as keyof EventResource)} className={`px-4 py-2 rounded-[12px] text-xs font-bold transition-all capitalize border ${value ? 'bg-zona-blue text-white border-zona-blue shadow-md shadow-blue-900/20' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>{key}</button>
                            ))}
                          </div>
                       </div>
                     </div>
                  </div>
                </div>
                <div className="bg-white p-6 md:px-10 border-t border-gray-100 flex flex-col md:flex-row justify-between gap-4">
                  {editingEventId ? (
                     <button type="button" onClick={() => setEventToDelete(editingEventId)} className="w-full md:w-auto flex items-center justify-center px-8 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-[16px] font-bold shadow-sm transition-all active:scale-[0.98] text-lg shrink-0 border border-red-200">
                       <Trash2 className="w-5 h-5 mr-3 shrink-0" />
                       <span className="whitespace-nowrap shrink-0">Eliminar Evento</span>
                     </button>
                  ) : <div />}
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto justify-end">
                    {editingEventId && (
                      <button type="button" onClick={() => { setEditingEventId(null); setActiveTab('agenda'); }} className="w-full md:w-auto flex items-center justify-center px-10 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-[16px] font-bold shadow-xl shadow-gray-500/10 transition-all active:scale-[0.98] text-lg shrink-0">
                        <span className="whitespace-nowrap shrink-0">Cancelar</span>
                      </button>
                    )}
                    <button type="submit" disabled={isSaving} className="w-full md:w-auto flex items-center justify-center px-10 py-4 bg-zona-orange hover:bg-[#eb8400] text-white rounded-[16px] font-bold shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98] text-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3 shrink-0"></div>
                          <span className="whitespace-nowrap shrink-0">Procesando...</span>
                        </>
                      ) : (
                        <>
                          <CalendarIcon className="w-5 h-5 mr-3 shrink-0" />
                          <span className="whitespace-nowrap shrink-0">{editingEventId ? 'Actualizar Reserva' : 'Confirmar Reserva'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* TAB: MÉTRICAS */}
          {activeTab === 'metricas' && (
            <motion.div key="metricas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="w-full max-w-5xl">
              <div className="mb-6 md:mb-8 text-center md:text-left">
                 <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zona-blue mb-1">Métricas de Ocupación</h1>
                 <p className="text-gray-500 text-xs md:text-sm font-medium">Estadísticas en tiempo real del uso de salas.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                
                {/* Total Reservas */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col items-center justify-center p-8 relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -mr-10 -mt-10"></div>
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 z-10">Reservas del Mes</h3>
                   <p className="text-5xl font-black text-zona-blue z-10">{totalReservasMes}</p>
                </div>

                {/* Salón Favorito */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col items-center justify-center p-8 relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-[40px] -mr-10 -mt-10"></div>
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 z-10">Salón Favorito</h3>
                   <p className="text-2xl md:text-3xl font-black text-zona-orange text-center z-10 leading-tight">{salonFavorito}</p>
                </div>

                {/* Ocupación */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col items-center justify-center p-8 relative">
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 z-10">Ocupación Mensual</h3>
                   <div className="relative w-32 h-32 flex items-center justify-center z-10">
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="56" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                        <circle cx="64" cy="64" r="56" fill="none" stroke="#10b981" strokeWidth="12" 
                                strokeDasharray="351.858" strokeDashoffset={351.858 - (351.858 * occupancyPercentage / 100)} 
                                strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                      </svg>
                      <span className="text-3xl font-black text-gray-800">{occupancyPercentage}%</span>
                   </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB: IA ASSISTANT */}
          {activeTab === 'ia' && (
            <motion.div key="ia" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="w-full max-w-5xl mb-8">
              <div className="bg-gradient-to-br from-zona-blue to-[#0e173a] rounded-[32px] border border-blue-900/50 shadow-2xl shadow-blue-900/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Bot className="w-96 h-96 text-white"/></div>
                <div className="p-8 md:p-14 text-center md:text-left flex flex-col items-center md:flex-row relative z-10 w-full">
                  <div className="w-full md:w-3/5 md:pr-10 flex flex-col items-center md:items-start">
                    <div className="inline-flex w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-[18px] items-center justify-center mb-6 shadow-inner shadow-white/5 shrink-0">
                      <Bot className="w-8 h-8 text-zona-orange shrink-0" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">Asistente de <br className="hidden md:block"/> <span className="text-zona-orange">Productividad</span></h2>
                    <p className="text-blue-100/90 text-sm md:text-base leading-relaxed mb-8 md:mb-10 font-medium max-w-lg mx-auto md:mx-0">
                      Compila automáticamente el cronograma y prevé las necesidades y recursos para la logística semanal.
                    </p>
                    <button onClick={generateAIReport} className="group flex flex-row flex-nowrap items-center justify-center gap-2 h-[60px] md:h-16 w-max min-w-max px-6 sm:px-8 rounded-[20px] bg-green-500 font-bold text-white shadow-xl shadow-green-500/20 transition-all hover:bg-[#1dba54] hover:scale-[1.02] active:scale-[0.98] shrink-0 whitespace-nowrap">
                      <span className="whitespace-nowrap flex-shrink-0 text-sm sm:text-base md:text-lg">Generar Reporte WhatsApp</span>
                      <Share className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                  <div className="hidden md:flex w-full md:w-2/5 justify-center items-center mt-12 md:mt-0 relative shrink-0">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-zona-orange/10 rounded-full blur-[80px] pointer-events-none"></div>
                     <img src={LOGO_WHITE} alt="Zona Coworking" className="w-[80%] max-w-[240px] opacity-90 relative z-10 object-contain" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          </AnimatePresence>
        </div>
      </main>

      {/* Desktop Right Sidebar */}
      <aside className="hidden xl:flex w-[320px] shrink-0 bg-white border-l border-gray-100 flex-col h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] relative z-10">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between min-w-0">
          <h3 className="font-bold text-sm text-gray-400 tracking-widest uppercase truncate min-w-0">Insights</h3>
          <button onClick={requestNotifications} className={`flex items-center px-4 py-2 rounded-full border text-xs font-bold transition-colors shrink-0 ${notificationsEnabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
            {notificationsEnabled ? <BellRing className="w-3.5 h-3.5 mr-1.5 shrink-0" /> : <Bell className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
            {notificationsEnabled ? 'Activas' : 'Notificaciones'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="bg-gradient-to-br from-zona-blue to-[#1c2e7a] rounded-[24px] p-6 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden group border border-white/5">
             <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
             <h4 className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-4 flex items-center"><Clock className="w-3 h-3 mr-1.5 shrink-0"/> Próximo Evento</h4>
             {nextEvent ? (
               <AnimatePresence mode="wait">
                 <motion.div key={nextEvent.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="relative z-10 min-w-0">
                   <p className="text-3xl font-bold tracking-tight mb-1 truncate">{nextEvent.startTime}</p>
                   <div className="flex items-center gap-2 mb-4">
                      {(nextEvent.createdBy_Color || nextEvent.userColor) && (
                         <div className="relative group cursor-pointer inline-flex">
                           <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: nextEvent.createdBy_Color || nextEvent.userColor }}></div>
                           <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-max bg-gray-900/90 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-xl z-50 pointer-events-none">
                             Creado por {nextEvent.createdBy_Name || nextEvent.creatorName || 'Usuario'}
                           </div>
                         </div>
                      )}
                      <p className="text-sm font-semibold text-white/90 truncate" title={nextEvent.eventName}>{nextEvent.eventName}</p>
                   </div>
                   <div className="bg-black/20 backdrop-blur-sm rounded-[16px] p-4 border border-white/10 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">Sala Reservada</p>
                      <p className="text-xs font-bold flex items-center text-white"><MapPin className="w-3.5 h-3.5 mr-1.5 text-zona-orange shrink-0"/> <span className="truncate">{ROOMS.find(r=>r.id===nextEvent.roomId)?.name}</span></p>
                   </div>
                 </motion.div>
               </AnimatePresence>
             ) : (
                <div className="py-8 text-center min-w-0">
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-3"><CalendarIcon className="w-5 h-5 text-white/30 shrink-0"/></div>
                  <p className="text-sm text-white/50 font-medium truncate">Agenda libre</p>
                </div>
             )}
          </div>
          <div>
             <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center min-w-0"><AlertCircle className="w-3.5 h-3.5 mr-1.5 shrink-0"/> Pruebas del Sistema</h4>
             <div className="space-y-4">
               <div className="bg-white p-4 rounded-[16px] border border-gray-100 shadow-sm cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={simulatePrepAlert}>
                 <div className="flex gap-3 min-w-0">
                   <div className="w-8 h-8 rounded-full bg-zona-orange/10 border border-zona-orange/20 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-zona-orange shrink-0" />
                   </div>
                   <div className="min-w-0">
                     <p className="text-xs font-bold text-gray-900 leading-tight truncate">Test: Alerta Logística</p>
                     <p className="text-[11px] text-gray-500 mt-1 font-medium leading-relaxed">Dispara alert push: -45min.</p>
                   </div>
                 </div>
               </div>
               <div className="bg-white p-4 rounded-[16px] border border-gray-100 shadow-sm cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => sendRealNotification('🧹 Sala Lista', { body: 'Río Morichal está lista y limpia.' })}>
                 <div className="flex gap-3 min-w-0">
                   <div className="w-8 h-8 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                   </div>
                   <div className="min-w-0">
                     <p className="text-xs font-bold text-gray-900 leading-tight truncate">Test: Limpieza lista</p>
                     <p className="text-[11px] text-gray-500 mt-1 font-medium leading-relaxed">Notificación simple.</p>
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 pb-[env(safe-area-inset-bottom)] z-40 border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 pt-3 pb-4">
            <button onClick={() => setActiveTab('agenda')} className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] transition-colors ${activeTab === 'agenda' ? 'text-zona-orange' : 'text-gray-400 hover:text-zona-blue'}`}>
              <CalendarIcon className="w-6 h-6 mb-1 shrink-0" />
              <span className="text-[10px] font-bold tracking-wide">Agenda</span>
            </button>
            <button onClick={handleNewTabClick} className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] transition-colors ${activeTab === 'nuevo' ? 'text-zona-orange' : 'text-gray-400 hover:text-zona-blue'}`}>
              <Plus className="w-6 h-6 mb-1 shrink-0" />
              <span className="text-[10px] font-bold tracking-wide">Nuevo</span>
            </button>
            <div className="relative -top-8 shrink-0">
               <button onClick={() => setActiveTab('ia')} className="relative bg-gradient-to-tr from-zona-orange to-[#ffaa33] w-[60px] h-[60px] flex items-center justify-center rounded-[20px] shadow-xl shadow-orange-500/20 text-white outline-none transform active:scale-95 transition-all border-4 border-white z-10 hover:border-gray-50 min-w-[44px] min-h-[44px]">
                 <img src={ICON_WHITE} alt="IA" className="w-[26px] h-[26px] object-contain shrink-0" />
               </button>
            </div>
            <button onClick={() => setActiveTab('metricas')} className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] transition-colors ${activeTab === 'metricas' ? 'text-zona-orange' : 'text-gray-400 hover:text-zona-blue'}`}>
              <PieChart className="w-6 h-6 mb-1 shrink-0" />
              <span className="text-[10px] font-bold tracking-wide">Métricas</span>
            </button>
            <button onClick={requestNotifications} className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] transition-colors ${notificationsEnabled ? 'text-green-500' : 'text-gray-400'}`}>
               {notificationsEnabled ? <BellRing className="w-6 h-6 mb-1 shrink-0" /> : <Bell className="w-6 h-6 mb-1 shrink-0" />}
               <span className="text-[10px] font-bold tracking-wide">Alertas</span>
            </button>
        </div>
      </nav>

      <AnimatePresence>
      {/* Identity Selection Modal */}
      {showIdentityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 bg-white/40 backdrop-blur-[15px]"></motion.div>
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", duration: 0.6 }} className="bg-white rounded-[32px] p-8 md:p-12 max-w-lg w-full relative z-10 shadow-2xl border border-gray-100">
             <div className="text-center mb-8">
               <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <img src={ICON_COLOR} alt="Zona" className="w-10 h-10 object-contain drop-shadow-sm" />
               </div>
               <h2 className="text-2xl md:text-3xl font-black text-zona-blue mb-3 tracking-tight">¡Bienvenido a Zona Coworking!</h2>
               <p className="text-gray-500 font-medium leading-relaxed">
                 Selecciona tu color de identidad corporativa. Esta elección será <span className="font-bold text-gray-700">permanente</span> y marcará todas tus gestiones (Eventos, Masterclasses, Reuniones, etc.).
               </p>
             </div>
             
             <div className="flex justify-center flex-wrap gap-4 mb-4">
               {COLOR_OPTIONS.map((colorStr) => (
                 <button 
                   key={colorStr}
                   onClick={async () => {
                     if (user) {
                       try {
                         const identityData: UserIdentity = {
                           colorSelected: true,
                           color: colorStr,
                           displayName: user.displayName || user.email || 'Usuario'
                         };
                         await setDoc(doc(db, 'users', user.uid), identityData, { merge: true });
                         setUserIdentity(identityData);
                         setShowIdentityModal(false);
                         triggerAppNotification('Identidad Configurada', 'Tu color de perfil ha sido guardado.', 'success');
                       } catch (error) {
                         handleFirestoreError(error, OperationType.WRITE, 'users');
                       }
                     }
                   }}
                   className="w-14 h-14 rounded-full shadow-md hover:scale-110 hover:shadow-lg transition-transform focus:outline-none focus:ring-4 focus:ring-offset-2 ring-gray-200"
                   style={{ backgroundColor: colorStr }}
                   title="Seleccionar este color"
                 />
               ))}
             </div>
             
             <button onClick={() => auth && signOut(auth)} className="mt-8 text-sm font-bold text-gray-400 hover:text-red-500 transition-colors mx-auto flex items-center justify-center w-full">
                <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
             </button>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {/* Event Detail View */}
      {eventToView && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:justify-center items-center p-0 md:p-4 pointer-events-none">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setEventToView(null)}></motion.div>
          
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white w-full rounded-t-[32px] md:rounded-[32px] p-6 md:p-8 md:max-w-md relative z-10 shadow-2xl pointer-events-auto flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 md:hidden"></div>
            
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border shadow-sm ${ROOMS.find(r => r.id === eventToView.roomId)?.color ? 'text-zona-blue bg-blue-50 border-blue-100' : 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                 {ROOMS.find(r => r.id === eventToView.roomId)?.name}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-zona-blue mb-2 leading-tight pr-4">{eventToView.eventName}</h2>
            <p className="text-gray-500 font-medium mb-6 text-sm">{eventToView.clientName} • {eventToView.type}</p>

            <div className="bg-gray-50 rounded-[16px] p-4 mb-6 border border-gray-100 flex flex-col gap-3">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <span className="font-bold text-gray-700">{eventToView.startTime} - {eventToView.endTime}</span>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                <span className="font-bold text-gray-700 capitalize">{new Date(`${eventToView.date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </div>
            </div>

            <div className="flex items-center mb-8 bg-blue-50/50 p-4 rounded-[16px] border border-blue-50/80">
              <div className="w-4 h-4 rounded-full mr-3 shadow-sm shrink-0" style={{ backgroundColor: eventToView.createdBy_Color || eventToView.userColor || '#182865' }}></div>
              <span className="text-sm font-semibold text-gray-600">Organizado por <span className="text-gray-900 font-bold">{eventToView.createdBy_Name || eventToView.creatorName || 'Usuario'}</span></span>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)] pt-2">
              <button onClick={() => setEventToView(null)} className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[16px] font-bold transition-all text-sm tracking-wide active:scale-95">Cerrar</button>
              <button onClick={() => handleEditFromView(eventToView)} className="w-full py-3.5 bg-zona-blue hover:bg-[#111e4f] text-white rounded-[16px] font-bold transition-all text-sm tracking-wide shadow-md shadow-blue-900/20 active:scale-95">Editar</button>
              
              <button onClick={() => { setEventToDelete(eventToView.id); setEventToView(null); }} className="col-span-2 mt-2 w-full py-3 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-[16px] font-bold transition-colors text-xs tracking-wide">
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar Reserva
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {/* Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEventToDelete(null)}></motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full relative z-10 shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-center text-zona-blue mb-2">¿Eliminar Reserva?</h3>
            <p className="text-gray-500 text-center mb-8 font-medium">
              ¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setEventToDelete(null)}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-[16px] transition-colors"
               >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteEvent(eventToDelete)}
                className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-[16px] shadow-lg shadow-red-500/20 transition-all active:scale-95"
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

    </div>
  );
}
