export type EventType = 'Reunión' | 'Curso' | 'Masterclass' | 'Taller' | 'Sesión Fotográfica' | 'Grabación de Contenido' | 'Evento Corporativo' | 'Otros';
export const EVENT_TYPES: EventType[] = ['Reunión', 'Curso', 'Masterclass', 'Taller', 'Sesión Fotográfica', 'Grabación de Contenido', 'Evento Corporativo', 'Otros'];

export type RoomLayout = 'School' | 'Theater' | 'U-Shape' | 'Boardroom' | 'Otro';

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

export const COLOR_OPTIONS = [
  '#182865', // Azul Marinero (Original)
  '#FF9305', // Naranja (Original)
  '#28A745', // Verde (Original)
  '#DC3545', // Rojo (Original)
  '#8B5CF6', // Violeta (Original)
  '#EAB308', // Amarillo (Original)
  '#EC4899', // Rosado Dulce (Femenino)
  '#F472B6', // Rosa Pastel (Femenino)
  '#DB2777', // Magenta Elegante (Femenino)
  '#9333EA', // Púrpura Profundo (Femenino/Neutro)
  '#3B82F6', // Azul Eléctrico (Masculino)
  '#0284C7', // Azul Océano (Masculino)
  '#4F46E5', // Índigo Moderno (Masculino/Neutro)
  '#64748B', // Azul Pizarra (Masculino)
  '#0D9488', // Verde Azulado/Teal (Neutro)
  '#10B981', // Verde Esmeralda (Neutro)
  '#06B6D4', // Azul Cian (Neutro)
  '#EA580C'  // Óxido / Terracota (Neutro)
];

export const LOGO_WHITE = "https://i.ibb.co/Kp9Hh2Vt/Logo-Blanco.png";
export const LOGO_COLOR = "https://i.ibb.co/ZzzzFy6S/Logo.png";
export const ICON_WHITE = "https://i.ibb.co/pvPcNWzD/Icono-Negativoo.png";
export const ICON_COLOR = "https://i.ibb.co/HfL8FrzP/Icono.png";
