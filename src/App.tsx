import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Plus, PieChart, Share, 
  LogOut, Clock, MapPin, Users, CheckCircle2, ChevronRight, Hash, Settings, Sparkles, HelpCircle, RotateCcw, Check, Lock, User as UserIcon
} from 'lucide-react';
import { db, auth } from './firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

import { EventData, ROOMS, LOGO_COLOR, getRoomForEvent, AgendaItemType, ADMIN_EMAIL } from './types';
import { LoginScreen } from './components/LoginScreen';
import { ColorSelectionScreen } from './components/ColorSelectionScreen';
import { CalendarGrid } from './components/CalendarGrid';
import { AddEventModal } from './components/AddEventModal';
import { NewItemSelector } from './components/NewItemSelector';
import { MetricsDashboard } from './components/MetricsDashboard';
import { NextEventCounter } from './components/NextEventCounter';
import { PendingPreReservationsNotice } from './components/PendingPreReservationsNotice';
import { PendingPaymentsNotice } from './components/PendingPaymentsNotice';
import { InstallPWABanner } from './components/InstallPWABanner';
import { UserProfileModal } from './components/UserProfileModal';
import { TutorialModal } from './components/TutorialModal';

// A beautifully minimal layout
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [events, setEvents] = useState<EventData[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  
  // User Config State
  const [usersConfig, setUsersConfig] = useState<Record<string, string>>({});
  const [usersProfile, setUsersProfile] = useState<Record<string, { color?: string; displayName?: string; email?: string }>>({});
  const [isColorSelectionRequired, setIsColorSelectionRequired] = useState(false);
  const [userConfigLoaded, setUserConfigLoaded] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeMenu, setActiveMenu] = useState<'agenda' | 'metrics'>('agenda');
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isAdmin && activeMenu === 'metrics') {
      setActiveMenu('agenda');
    }
  }, [isAdmin, activeMenu]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [initialItemType, setInitialItemType] = useState<AgendaItemType>('reserva');
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('Todos');
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const handleSelectNewItemType = (type: AgendaItemType) => {
    setIsSelectorOpen(false);
    setInitialItemType(type);
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleToggleReminder = async (e: React.MouseEvent, evt: EventData) => {
    e.stopPropagation();
    if (!db) return;
    const newCompleted = !evt.isCompleted;
    try {
      await updateDoc(doc(db, 'events', evt.id), {
        isCompleted: newCompleted,
        completedAt: newCompleted ? Date.now() : null
      });
    } catch (err) {
      console.error('Error toggling reminder status:', err);
    }
  };

  useEffect(() => {
    if (!authInitialized || !user) return;
    const key = `tutorial_general_seen_${user.uid}`;
    try {
      const hasSeen = localStorage.getItem(key);
      if (!hasSeen) {
        setIsTutorialOpen(true);
      }
    } catch {
      // storage fallback
    }
  }, [authInitialized, user]);

  const filterRoomsMap = [
    { label: 'Todos', ids: [] },
    { label: 'Planta Baja', ids: ['1', '2', '3', '4'] },
    { label: 'Mezzanina', ids: ['5', '6', '7', '8', '9', '10'] },
    { label: 'Río Morichal', ids: ['1'] },
    { label: 'Río Guanipa', ids: ['2'] },
    { label: 'Río Tigre', ids: ['3'] },
    { label: 'Cocina de Ríos', ids: ['4'] },
    { label: 'Río San Juan', ids: ['5'] },
    { label: 'Río Caripe', ids: ['6'] },
    { label: 'Río Amana', ids: ['7'] },
    { label: 'Río Guarapiche II', ids: ['8'] },
    { label: 'Río Mapirito', ids: ['9'] },
    { label: 'Río Guarapiche I', ids: ['10'] },
  ];

  useEffect(() => {
    if (!auth) {
       setAuthInitialized(true);
       return;
    }
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  // Listen to users_config for all users (to color events and fetch usernames) and check current user
  useEffect(() => {
    if (!user || !db) return;
    const unsubUsers = onSnapshot(collection(db, 'users_config'), (snapshot) => {
      const configMap: Record<string, string> = {};
      const profileMap: Record<string, { color?: string; displayName?: string; email?: string }> = {};
      let currentUserHasColor = false;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.color) {
          configMap[docSnap.id] = data.color;
        }
        profileMap[docSnap.id] = {
          color: data.color || '',
          displayName: data.displayName || '',
          email: data.email || ''
        };
        if (docSnap.id === user.uid && data.color) {
          currentUserHasColor = true;
        }
      });
      setUsersConfig(configMap);
      setUsersProfile(profileMap);
      setIsColorSelectionRequired(!currentUserHasColor);
      setUserConfigLoaded(true);
    });
    return () => unsubUsers();
  }, [user]);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'events'));
    const unsubEvents = onSnapshot(q, (snapshot) => {
      const liveEvents: EventData[] = [];
      snapshot.forEach(doc => liveEvents.push({ id: doc.id, ...doc.data() } as EventData));
      setEvents(liveEvents);
      setIsEventsLoading(false);
    });
    return () => unsubEvents();
  }, [user]);

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-2 border-brand-orange/20 border-t-brand-orange animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  if (userConfigLoaded && isColorSelectionRequired) {
    return <ColorSelectionScreen onComplete={() => setIsColorSelectionRequired(false)} />;
  }

  const activeFilterInfo = filterRoomsMap.find(f => f.label === selectedRoomFilter);
  
  const filteredEvents = events.filter(e => {
    if (selectedRoomFilter === 'Todos') return true;
    const room = getRoomForEvent(e);
    if (!room) return false;
    return activeFilterInfo?.ids.includes(room.id);
  });

  // Derived state for selected day
  const dayEvents = filteredEvents
    .filter(e => e.date === selectedDateStr)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const formattedSelectedDate = new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('es-ES', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });


  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#F3F4F6] text-slate-800">
      <InstallPWABanner />
        
      <div className="font-sans app-layout flex-1 overflow-hidden">
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
              <h3 className="text-xl font-display font-bold text-brand-blue mb-2">¿Cerrar Sesión?</h3>
              <p className="text-sm text-slate-600 mb-8 font-medium">Estás a punto de salir de tu cuenta.</p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowLogoutConfirm(false)} 
                  className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    if (auth) signOut(auth);
                  }} 
                  className="px-5 py-2 font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm shadow-red-500/20 flex items-center gap-2 text-sm"
                >
                  <LogOut size={16} /> Salir
                </button>
              </div>
            </div>
          </div>
        )}

      <TutorialModal 
        isOpen={isTutorialOpen} 
        onClose={() => setIsTutorialOpen(false)} 
        userId={user?.uid}
      />

      <NewItemSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelect={handleSelectNewItemType}
      />

      {isModalOpen && <AddEventModal 
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }} 
        selectedDateStr={selectedDateStr}
        editingEvent={editingEvent}
        initialItemType={initialItemType}
        usersProfile={usersProfile}
      />}
      
      {/* 1. Left Sidebar Navigation - Minimal & Elegant */}
      <aside className="desktop-sidebar">
        <div className="p-8 pb-4">
          <img src={LOGO_COLOR} alt="Zona Coworking" className="h-8 w-auto mb-12" />
          
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveMenu('agenda')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                activeMenu === 'agenda' 
                  ? 'bg-brand-blue text-white shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue'
              }`}
            >
              <CalendarIcon size={18} /> Resumen de Agenda
            </button>

            {isAdmin && (
              <button 
                onClick={() => setActiveMenu('metrics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  activeMenu === 'metrics' 
                    ? 'bg-brand-blue text-white shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-brand-blue'
                }`}
              >
                <PieChart size={18} /> Métricas y Reportes
              </button>
            )}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100 mt-auto">
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center justify-between p-2 -mx-2 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group mb-4"
            title="Configurar Perfil"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: usersConfig[user.uid] || '#182865' }}
              >
                {(usersProfile[user.uid]?.displayName || user.displayName || 'Staff').charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-brand-blue truncate max-w-[120px]">
                  {usersProfile[user.uid]?.displayName || user.displayName || 'Staff Zona'}
                </p>
                <p className="text-xs text-slate-500 truncate max-w-[120px]">
                  {usersProfile[user.uid]?.email || user.email}
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-brand-orange hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
              <Settings size={15} className="group-hover:rotate-45 transition-transform duration-300" />
            </div>
          </div>
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer animate-none"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="main-content hide-scrollbar relative">
        <div className="desktop-main-container">
            {/* Mobile Header */}
            <header className="mobile-header flex items-center justify-between p-4 mb-4 bg-white rounded-2xl shadow-sm md:hidden shrink-0 gap-2">
              <div 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 cursor-pointer group shrink-0"
                title="Configurar Perfil"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: usersConfig[user.uid] || '#182865' }}
                >
                  {(usersProfile[user.uid]?.displayName || user.displayName || 'Staff').charAt(0).toUpperCase()}
                </div>
                <div className="hidden xs:block text-left">
                  <p className="text-[11px] font-bold text-brand-blue truncate max-w-[80px]">
                    {usersProfile[user.uid]?.displayName || user.displayName || 'Staff Zona'}
                  </p>
                </div>
              </div>
              <img src={LOGO_COLOR} alt="Zona" className="h-5 object-contain" />
              <button onClick={() => setShowLogoutConfirm(true)} className="text-slate-400 hover:text-red-500 p-2 shrink-0">
                <LogOut size={20} />
              </button>
            </header>
            
            <div className="w-full">
              {activeMenu === 'agenda' && (
                <>
                  <header className="mb-6 mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 px-4 md:px-0">
                    <div>
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-brand-blue tracking-tight">Hub de Reservas</h1>
                        <button
                          onClick={() => setIsTutorialOpen(true)}
                          className="md:hidden flex items-center gap-1.5 bg-blue-50 text-brand-blue border border-blue-200/80 px-2.5 py-1 rounded-lg font-bold text-[11px] hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Ver guía de novedades"
                        >
                          <Sparkles size={13} className="text-brand-orange" />
                          <span>Novedades</span>
                        </button>
                      </div>
                      <p className="text-[#6b7280] text-xs md:text-sm mt-1">Coordinación de actividades y ocupación en tiempo real</p>
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                      <button
                        onClick={() => setIsTutorialOpen(true)}
                        className="flex items-center gap-2 bg-blue-50 text-brand-blue border border-blue-200/80 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-100/80 transition-colors cursor-pointer"
                        title="Ver guía de novedades"
                      >
                        <Sparkles size={15} className="text-brand-orange" />
                        <span>Novedades y Guía</span>
                      </button>
                      <button 
                        onClick={() => {
                          setIsSelectorOpen(true);
                        }}
                        className="flex items-center gap-2 bg-brand-orange text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#E68505] transition-colors shadow-sm shadow-orange-500/20 cursor-pointer"
                      >
                        <Plus size={16} /> Agendar
                      </button>
                    </div>
                  </header>
                  <div className="px-4 md:px-0">
                    <PendingPaymentsNotice
                      events={events}
                      currentUser={user}
                      usersProfile={usersProfile}
                      onSelectEvent={(evt) => {
                        setEditingEvent(evt);
                        setIsModalOpen(true);
                      }}
                    />
                    <PendingPreReservationsNotice 
                      events={events}
                      onSelectEvent={(evt) => {
                        setEditingEvent(evt);
                        setIsModalOpen(true);
                      }}
                    />
                    <NextEventCounter events={events} isLoading={isEventsLoading} />
                  </div>
                </>
              )}

              <AnimatePresence mode="wait">
                {activeMenu === 'agenda' ? (
                  <motion.div 
                    key="agenda"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4 md:px-0"
                  >
                    {/* Left Side: Calendar Component */}
                    <div className="lg:col-span-5 relative">
                      
                      {/* FILTRO POR ESPACIO (PILLS) */}
                      <div className="mb-4 w-full overflow-x-auto hide-scrollbar touch-pan-x">
                        <div className="flex items-center gap-2 pb-2 min-w-max">
                          {filterRoomsMap.map((filter) => (
                            <button
                              key={filter.label}
                              onClick={() => setSelectedRoomFilter(filter.label)}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center ${
                                selectedRoomFilter === filter.label 
                                  ? 'bg-brand-blue text-white shadow-md shadow-blue-900/10' 
                                  : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-blue/30 hover:bg-slate-50'
                              }`}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <CalendarGrid 
                        events={filteredEvents} 
                        usersConfig={usersConfig}
                        selectedDateStr={selectedDateStr} 
                        onSelectDate={setSelectedDateStr}
                        currentDate={currentDate}
                        setCurrentDate={setCurrentDate}
                      />
                    </div>

                    {/* Right Side: Flowing list of events */}
                    <div className="lg:col-span-7">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-display font-bold text-brand-blue capitalize">
                          {formattedSelectedDate}
                        </h3>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-brand-blue/10 text-brand-blue rounded-full">
                          {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
                        </span>
                      </div>

                      <AnimatePresence mode="popLayout">
                        {isEventsLoading ? (
                          <motion.div key="skeleton-events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            <div className="h-28 bg-slate-200 animate-pulse rounded-2xl w-full"></div>
                            <div className="h-28 bg-slate-200 animate-pulse rounded-2xl w-full"></div>
                            <div className="h-28 bg-slate-200 animate-pulse rounded-2xl w-full"></div>
                          </motion.div>
                        ) : dayEvents.length === 0 ? (
                          <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white/50"
                          >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-300 border border-slate-100 mb-4">
                              <CalendarIcon size={24} />
                            </div>
                            <p className="text-slate-500 font-medium text-sm">No hay eventos agendados para este día. ¡Agrega el primero!</p>
                            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-brand-orange text-sm font-bold bg-brand-orange/10 px-4 py-2 rounded-xl hover:bg-brand-orange hover:text-white transition-colors">
                              Agendar un evento
                            </button>
                          </motion.div>
                        ) : (
                          <div className="space-y-4">
                            {dayEvents.map((evt, idx) => {
                              const room = getRoomForEvent(evt);
                              
                              const total = evt.totalCost || 0;
                              const dUSD = evt.depositUSD || 0;
                              const rate = evt.exchangeRate || 1;
                              const dBS = evt.depositBS ? (evt.depositBS / rate) : 0;
                              const remaining = total - (dUSD + dBS);
                              const totalPaid = dUSD + dBS;
                              
                              let paymentBadge = null;
                              if (total > 0) {
                                if (totalPaid === 0) {
                                  paymentBadge = <div className="flex items-center text-[10px] sm:text-xs font-medium bg-red-50 text-red-600 px-2.5 py-1 rounded-lg border border-red-200 gap-1.5 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Deuda Total</div>;
                                } else if (remaining > 0) {
                                  paymentBadge = <div className="flex items-center text-[10px] sm:text-xs font-medium bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-lg border border-yellow-200 gap-1.5 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Abonado (Resta ${remaining.toFixed(2)})</div>;
                                } else {
                                  paymentBadge = <div className="flex items-center text-[10px] sm:text-xs font-medium bg-green-50 text-green-700 px-2.5 py-1 rounded-lg border border-green-200 gap-1.5 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Pagado Total</div>;
                                }
                              }

                              if (evt.itemType === 'recordatorio') {
                                const isDone = !!evt.isCompleted;
                                return (
                                  <motion.div 
                                    key={evt.id}
                                    onClick={() => {
                                      setEditingEvent(evt);
                                      setIsModalOpen(true);
                                    }}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50, scale: 0.95, transition: { duration: 0.2 } }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`group bg-white border ${isDone ? 'border-emerald-200/80 hover:border-emerald-400 bg-slate-50/50' : 'border-amber-200/80 hover:border-amber-400'} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden`}
                                  >
                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isDone ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    
                                    <div className="flex justify-between items-start mb-1.5 pl-2 gap-2">
                                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                                        <button
                                          type="button"
                                          onClick={(e) => handleToggleReminder(e, evt)}
                                          className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                            isDone
                                              ? 'bg-emerald-500 border-emerald-500 text-white'
                                              : 'border-amber-400 bg-white hover:bg-amber-50 text-transparent'
                                          }`}
                                          title={isDone ? 'Marcar como pendiente' : 'Marcar como completado'}
                                        >
                                          <Check size={13} strokeWidth={3} className={isDone ? 'block' : 'hidden'} />
                                        </button>
                                        <h4 className={`text-base font-bold leading-tight min-w-0 ${
                                          isDone ? 'text-slate-400 line-through font-normal' : 'text-slate-800'
                                        }`}>
                                          {evt.eventName}
                                        </h4>
                                      </div>
                                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className={`flex items-center text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-lg border gap-1.5 shrink-0 ${
                                          isDone
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-amber-50 text-amber-900 border-amber-300'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                          <span>{isDone ? 'Completado' : 'Recordatorio'}</span>
                                        </div>
                                        {evt.startTime ? (
                                          <div className="flex items-center text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                                            <Clock size={11} className="mr-1 text-slate-500" />
                                            {evt.startTime}
                                          </div>
                                        ) : (
                                          <div className="flex items-center text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">
                                            Todo el día
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <p className={`text-sm mb-4 pl-2 font-medium ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {evt.assignedTo ? `Responsable: ${evt.assignedTo}` : (evt.notes ? evt.notes : 'Nota interna')}
                                    </p>
                                    
                                    <div className="flex flex-wrap items-center gap-4 pl-2 pt-3.5 border-t border-slate-50 text-xs font-medium text-slate-400">
                                      <div className={`flex items-center gap-1 font-semibold ${isDone ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        <span>{isDone ? '✓ Tarea completada' : '📌 Tarea interna'}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5 ml-auto">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: usersConfig[evt.createdBy] || (isDone ? '#10B981' : '#F59E0B') }} title={evt.createdBy_Name}></span>
                                        <span className="text-[10px] uppercase text-slate-400">{evt.createdBy_Name?.split(' ')[0] || 'Staff'}</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              }

                              if (evt.itemType === 'reunion') {
                                return (
                                  <motion.div 
                                    key={evt.id}
                                    onClick={() => {
                                      setEditingEvent(evt);
                                      setIsModalOpen(true);
                                    }}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50, scale: 0.95, transition: { duration: 0.2 } }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group bg-white border border-purple-200/80 hover:border-purple-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                  >
                                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-purple-600" />
                                    
                                    <div className="flex justify-between items-start mb-1.5 pl-2 gap-2">
                                      <h4 className="text-base font-bold text-purple-950 leading-tight min-w-0 pr-2">
                                        {evt.eventName}
                                      </h4>
                                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        <div className="flex items-center text-[10px] sm:text-xs font-bold bg-purple-50 text-purple-900 px-2.5 py-1 rounded-lg border border-purple-200 gap-1.5 shrink-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                                          <span>Reunión</span>
                                        </div>
                                        <div className="flex items-center text-[10px] sm:text-xs font-medium bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200/60">
                                          <Clock size={11} className="mr-1.5 text-purple-600" />
                                          {evt.startTime} - {evt.endTime}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <p className="text-sm text-slate-500 mb-4 pl-2 font-medium">
                                      {evt.clientName ? `Con: ${evt.clientName}` : (evt.notes ? evt.notes : 'Reunión de coordinación')}
                                    </p>
                                    
                                    <div className="flex flex-wrap items-center gap-4 pl-2 pt-3.5 border-t border-slate-50 text-xs font-medium text-slate-500">
                                      <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-purple-400" />
                                        <span style={{ color: room ? room.dotColor : '#7E22CE' }}>
                                          {room ? room.name : 'Virtual / Sin salón'}
                                        </span>
                                      </div>
                                      {evt.attendees && (
                                        <div className="flex items-center gap-1.5">
                                          <Users size={14} className="text-slate-400" />
                                          <span>{evt.attendees} pers</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5 ml-auto">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: usersConfig[evt.createdBy] || '#8B5CF6' }} title={evt.createdBy_Name}></span>
                                        <span className="text-[10px] uppercase text-slate-400">{evt.createdBy_Name?.split(' ')[0] || 'Staff'}</span>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              }

                              return (
                                <motion.div 
                                  key={evt.id}
                                  onClick={() => {
                                    setEditingEvent(evt);
                                    setIsModalOpen(true);
                                  }}
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50, scale: 0.95, transition: { duration: 0.2 } }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="group bg-white border border-slate-100 hover:border-brand-blue/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                                >
                                  <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: usersConfig[evt.createdBy] || '#182865' }} />
                                  
                                  <div className="flex justify-between items-start mb-1.5 pl-2 gap-2">
                                    <h4 className="text-base font-bold text-brand-blue leading-tight min-w-0 pr-2">
                                      {evt.eventName}
                                    </h4>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                      <div className="flex items-center text-[10px] sm:text-xs font-medium bg-brand-orange/10 text-[#CC7604] px-2.5 py-1 rounded-lg border border-brand-orange/20">
                                        <Clock size={12} className="mr-1.5 text-brand-orange/70" />
                                        {evt.startTime} - {evt.endTime}
                                      </div>
                                      {evt.reservationStatus === 'Pre-reserva' && (
                                        <div className="flex items-center text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-300/80 gap-1.5 shrink-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                          <span>Pre-reserva</span>
                                        </div>
                                      )}
                                      {evt.isRescheduled && (
                                        <div className="flex items-center text-[10px] sm:text-xs font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200/80 gap-1 shrink-0" title={evt.originalDate ? `Fecha original: ${evt.originalDate}` : 'Evento reprogramado'}>
                                          <RotateCcw size={11} className="text-amber-600 shrink-0" />
                                          <span>🔄 Reprogramada</span>
                                        </div>
                                      )}
                                      {paymentBadge}
                                    </div>
                                  </div>
                                  
                                  <p className="text-sm text-slate-500 mb-4 pl-2 font-medium">{evt.clientName}</p>
                                  
                                  <div className="flex flex-wrap items-center gap-4 pl-2 pt-4 border-t border-slate-50 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin size={14} className="text-slate-400" />
                                      <span style={{ color: room?.dotColor }}>{room?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Users size={14} className="text-slate-400" />
                                      <span>{evt.attendees} pers</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Hash size={14} className="text-slate-400" />
                                      <span>{evt.type}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-auto">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: usersConfig[evt.createdBy] || '#182865' }} title={evt.createdBy_Name}></span>
                                      <span className="text-[10px] uppercase text-slate-400">{evt.createdBy_Name?.split(' ')[0]}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (isAdmin && (
                  <motion.div 
                    key="metrics"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="w-full px-4 md:px-0"
                  >
                    <MetricsDashboard events={events} currentUserEmail={user?.email} usersProfile={usersProfile} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button 
          onClick={() => setActiveMenu('agenda')}
          className={`flex flex-col items-center gap-1 py-1 flex-1 ${activeMenu === 'agenda' ? 'text-brand-blue' : 'text-slate-400'}`}
        >
          <CalendarIcon size={24} className={activeMenu === 'agenda' ? 'fill-brand-blue/10' : ''} />
          <span className="text-[10px] font-semibold">Agenda</span>
        </button>
        
        <div className="mobile-fab-wrapper flex-1">
          <button 
            onClick={() => {
              setIsSelectorOpen(true);
            }}
            className="mobile-fab w-14 h-14 bg-brand-orange text-white rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 border-[6px] border-white hover:scale-105 transition-transform cursor-pointer"
          >
            <Plus size={24} />
          </button>
        </div>

        {isAdmin ? (
          <button 
            onClick={() => setActiveMenu('metrics')}
            className={`flex flex-col items-center gap-1 py-1 flex-1 ${activeMenu === 'metrics' ? 'text-brand-blue' : 'text-slate-400'}`}
          >
            <PieChart size={24} className={activeMenu === 'metrics' ? 'fill-brand-blue/10' : ''} />
            <span className="text-[10px] font-semibold">Métricas</span>
          </button>
        ) : (
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex flex-col items-center gap-1 py-1 flex-1 text-slate-400 hover:text-brand-blue transition-colors cursor-pointer"
          >
            <UserIcon size={24} />
            <span className="text-[10px] font-semibold">Mi Perfil</span>
          </button>
        )}
      </div>
      
      {/* 4. Edit Profile Modal */}
      {isProfileModalOpen && (
        <UserProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}

    </div>
    </div>
  );
}
