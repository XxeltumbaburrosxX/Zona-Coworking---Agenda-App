export type EventType = 'Reunión' | 'Curso' | 'Masterclass' | 'Taller' | 'Sesión Fotográfica' | 'Grabación de Contenido' | 'Evento Corporativo' | 'Otros';
export const EVENT_TYPES: EventType[] = ['Reunión', 'Curso', 'Masterclass', 'Taller', 'Sesión Fotográfica', 'Grabación de Contenido', 'Evento Corporativo', 'Otros'];

export type RoomLayout = 'Escuela' | 'Auditorio' | 'Mesa en U' | 'Directorio' | 'Otro';

export interface EventResource {
  water: boolean; coffee: boolean; napkins: boolean; tv: boolean;
}

export interface Room {
  id: string; 
  name: string; 
  area: number; 
  capacity: number; 
  color: string; 
  dotColor: string;
  location?: 'Planta Baja' | 'Mezzanina';
}

export type AgendaItemType = 'reserva' | 'reunion' | 'recordatorio';

export interface EventData {
  id: string; 
  itemType?: AgendaItemType;
  eventName: string; 
  clientName?: string; 
  clientPhone?: string;
  type?: EventType;
  roomId?: string; 
  attendees?: number; 
  date: string; 
  startTime?: string; 
  endTime?: string;
  resources?: EventResource; 
  notes?: string;
  roomLayout?: RoomLayout;
  totalCost?: number;
  depositUSD?: number;
  depositBS?: number;
  exchangeRate?: number;
  isTrustedClient?: boolean;
  createdBy: string; 
  createdBy_Name?: string; 
  createdBy_Color?: string; 
  createdAt?: number;
  reservationStatus?: 'Confirmada' | 'Pre-reserva';
  isRescheduled?: boolean;
  originalDate?: string;
  rescheduledAt?: number;
  isCompleted?: boolean;
  completedAt?: number;
  assignedTo?: string;
  salesRep?: string;
}

export type CommercialAdvisor = 'Juan' | 'Laura' | 'Yoanelis' | 'Directo / Coworking' | 'Otro';

export const ADMIN_EMAIL = 'jumesco@gmail.com';

export interface UserIdentity {
  colorSelected: boolean;
  color?: string;
  displayName?: string;
}

export const ROOMS: Room[] = [
  { id: '1', name: 'Salón Río Morichal', area: 46, capacity: 50, color: 'bg-blue-600', dotColor: '#2563eb', location: 'Planta Baja' },
  { id: '2', name: 'Salón Río Guanipa', area: 13.8, capacity: 12, color: 'bg-cyan-600', dotColor: '#0891b2', location: 'Planta Baja' },
  { id: '3', name: 'Salón Río Tigre', area: 10.5, capacity: 6, color: 'bg-orange-500', dotColor: '#f97316', location: 'Planta Baja' },
  { id: '4', name: 'Cocina de Ríos', area: 15.2, capacity: 10, color: 'bg-amber-500', dotColor: '#f59e0b', location: 'Planta Baja' },
  { id: '5', name: 'Salón Río San Juan', area: 25, capacity: 20, color: 'bg-indigo-500', dotColor: '#6366f1', location: 'Mezzanina' },
  { id: '6', name: 'Salón Río Caripe', area: 15.2, capacity: 10, color: 'bg-teal-500', dotColor: '#14b8a6', location: 'Mezzanina' },
  { id: '7', name: 'Salón Río Amana', area: 15.2, capacity: 12, color: 'bg-emerald-500', dotColor: '#10b981', location: 'Mezzanina' },
  { id: '8', name: 'Sala Río Guarapiche II', area: 9.6, capacity: 8, color: 'bg-pink-500', dotColor: '#ec4899', location: 'Mezzanina' },
  { id: '9', name: 'Salón Río Mapirito', area: 7.8, capacity: 8, color: 'bg-rose-500', dotColor: '#f43f5e', location: 'Mezzanina' },
  { id: '10', name: 'Sala Río Guarapiche I', area: 10.8, capacity: 9, color: 'bg-purple-500', dotColor: '#8b5cf6', location: 'Mezzanina' },
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

export function getRoomForEvent(evt: Partial<EventData>): Room | null {
  // Un recordatorio NUNCA tiene salón
  if (evt.itemType === 'recordatorio') return null;

  const roomId = (evt.roomId || '').trim();

  // Una reunión sin salón NUNCA tiene salón
  if (evt.itemType === 'reunion' && (!roomId || roomId === 'none')) return null;

  // Si tiene tipo explícito pero no tiene roomId
  if (!roomId && evt.itemType) return null;

  // Reservas heredadas/antiguas sin itemType ni roomId: preserva comportamiento existente
  if (!roomId) return ROOMS[0];

  const cleanId = roomId.toLowerCase();

  // 1. Direct lookup by exact room ID ('1' through '10')
  const foundById = ROOMS.find(r => r.id === roomId || r.id === cleanId);
  if (foundById) return foundById;

  // 2. Match by room name if roomId contains text
  const cleanInput = cleanId.replace(/salón |sala |de /g, '').trim();
  const matchedByName = ROOMS.find(r => {
    const normRoom = r.name.toLowerCase().replace(/salón |sala |de /g, '').trim();
    return cleanInput === normRoom || cleanInput.includes(normRoom) || normRoom.includes(cleanInput);
  });

  if (matchedByName) return matchedByName;

  // Si es reserva con ID no reconocido, mantener fallback a ROOMS[0]
  if (!evt.itemType || evt.itemType === 'reserva') {
    return ROOMS[0];
  }

  return null;
}
export const LOGO_COLOR = "https://i.ibb.co/ZzzzFy6S/Logo.png";
export const ICON_WHITE = "https://i.ibb.co/pvPcNWzD/Icono-Negativoo.png";
export const ICON_COLOR = "https://i.ibb.co/HfL8FrzP/Icono.png";
