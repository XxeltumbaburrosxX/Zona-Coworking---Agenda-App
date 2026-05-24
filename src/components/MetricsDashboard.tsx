import React, { useMemo } from 'react';
import { EventData, ROOMS } from '../types';
import { Calendar as CalendarIcon, TrendingUp, Award, Share2 } from 'lucide-react';

interface Props {
  events: EventData[];
}

export function MetricsDashboard({ events }: Props) {
  const metrics = useMemo(() => {
    const now = new Date();
    
    // Calculate last 7 days (including today)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const weeklyEvents = events.filter(e => last7Days.includes(e.date));

    // Calculate most booked space
    const roomCounts = events.reduce((acc, curr) => {
      acc[curr.roomId] = (acc[curr.roomId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let mostBookedRoomId = '';
    let maxBookings = 0;
    Object.entries(roomCounts).forEach(([roomId, count]) => {
      if (count > maxBookings) {
        maxBookings = count;
        mostBookedRoomId = roomId;
      }
    });

    const mostBookedRoom = ROOMS.find(r => r.id === mostBookedRoomId);

    // simple utilization metric based on weekly events vs total spots conceptually. 
    // Just showing number of events for now.
    const utilizationRate = Math.min(100, Math.round((weeklyEvents.length / 20) * 100)); // Arbitrary 20 ideal bookings per week as 100%

    return {
      weeklyCount: weeklyEvents.length,
      mostBookedName: mostBookedRoom ? mostBookedRoom.name : 'N/A',
      utilizationRate: isNaN(utilizationRate) ? 0 : utilizationRate
    };
  }, [events]);

  const handleShare = () => {
    const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = `📊 *Reporte de Gestión - Zona Coworking*
🗓 Periodo: Últimos 7 días (${todayStr})
🏢 Espacio más ocupado: ${metrics.mostBookedName}
✅ Reservas totales: ${metrics.weeklyCount}
📈 Tasa de ocupación est.: ${metrics.utilizationRate}%

💡 _Nota: Reporte generado automáticamente para el equipo._`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-24 md:pb-0">
      <header className="mb-8 mt-2 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-blue tracking-tight">Métricas</h1>
          <p className="text-slate-500 mt-1">Rendimiento y uso de espacios</p>
        </div>
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1EBE5A] transition-colors shadow-sm shadow-[#25D366]/20"
        >
          <Share2 size={16} /> Compartir Reporte
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CalendarIcon size={24} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reservas (-7 días)</span>
          <span className="text-4xl font-display font-bold text-brand-blue">{metrics.weeklyCount}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Más Solicitado</span>
          <span className="text-2xl font-display font-bold text-brand-blue truncate w-full">{metrics.mostBookedName}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tasa de Ocupación est.</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-display font-bold text-brand-blue">{metrics.utilizationRate}</span>
            <span className="text-xl font-medium text-slate-400">%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden relative">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, metrics.utilizationRate)}%` }}></div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-brand-blue p-8 rounded-2xl border border-blue-900 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-orange/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>
        
        <div className="relative z-10 text-center md:text-left">
          <h3 className="text-xl font-display font-bold text-white mb-2">Generador de Reportes</h3>
          <p className="text-brand-blue-100 text-sm text-white/70 max-w-sm">Comparte un resumen rápido de las operaciones directamente a tu equipo a través de WhatsApp.</p>
        </div>
        
        <button 
          onClick={handleShare}
          className="relative z-10 w-full md:w-auto flex justify-center items-center gap-2 bg-[#25D366] text-white px-6 py-3.5 rounded-xl font-bold hover:bg-[#1EBE5A] transition-colors shadow-sm shadow-[#25D366]/20"
        >
          <Share2 size={20} /> Compartir vía WhatsApp
        </button>
      </div>

    </div>
  );
}
