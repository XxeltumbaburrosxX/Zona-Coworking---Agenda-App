export type EventType = 'Reunión' | 'Curso' | 'Masterclass' | 'Taller' | 'Sesión Fotográfica' | 'Grabación de Contenido' | 'Evento Corporativo' | 'Otros';
export const EVENT_TYPES: EventType[] = ['Reunión', 'Curso', 'Masterclass', 'Taller', 'Sesión Fotográfica', 'Grabación de Contenido', 'Evento Corporativo', 'Otros'];

export type RoomLayout = 'Tipo U' | 'Teatro' | 'Mesa de Conferencias' | 'Con Mesas' | 'Con Mesas y Sillas' | 'Solo Sillas';

export interface EventResource {
  water: boolean; coffee: boolean; napkins: boolean; tv: boolean;
}

export interface Room {
  id: string; name: string; area: number; capacity: number; color: string; dotColor: string;
}

export interface EventData {
  id: string; 
  eventName: string; 
  clientName: string; 
  clientPhone?: string;
  type: EventType;
  roomId: string; 
  attendees: number; 
  date: string; 
  startTime: string; 
  endTime: string;
  resources: EventResource; 
  notes?: string;
  roomLayout: RoomLayout; 
  createdBy: string; 
  createdBy_Name?: string; 
  createdBy_Color?: string; 
  createdAt?: number;
}

export interface UserIdentity {
  colorSelected: boolean;
  color?: string;
  displayName?: string;
}

export const ROOMS: Room[] = [
  { id: '1', name: 'Río Morichal', area: 46, capacity: 50, color: 'bg-blue-600', dotColor: '#2563eb' },
  { id: '2', name: 'Cocina de Ríos', area: 12.35, capacity: 8, color: 'bg-amber-500', dotColor: '#f59e0b' },
  { id: '3', name: 'Río Amana', area: 15.4, capacity: 12, color: 'bg-emerald-500', dotColor: '#10b981' },
  { id: '4', name: 'Río Guarapiche 1', area: 10.8, capacity: 6, color: 'bg-purple-500', dotColor: '#8b5cf6' },
  { id: '5', name: 'Río Guarapiche 2', area: 9.6, capacity: 8, color: 'bg-pink-500', dotColor: '#ec4899' },
  { id: '6', name: 'Río San Juan', area: 23, capacity: 20, color: 'bg-indigo-500', dotColor: '#6366f1' },
];

export const COLOR_OPTIONS = ['#182865', '#FF9305', '#28A745', '#DC3545', '#8B5CF6', '#EAB308'];

export const LOGO_WHITE = "https://i.ibb.co/Kp9Hh2Vt/Logo-Blanco.png";
export const LOGO_COLOR = "https://i.ibb.co/ZzzzFy6S/Logo.png";
export const ICON_WHITE = "https://i.ibb.co/pvPcNWzD/Icono-Negativoo.png";
export const ICON_COLOR = "https://i.ibb.co/HfL8FrzP/Icono.png";
