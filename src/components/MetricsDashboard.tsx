import React, { useMemo } from 'react';
import { EventData, ROOMS } from '../types';
import { Calendar as CalendarIcon, TrendingUp, Award, Share2, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';

interface Props {
  events: EventData[];
}

export function MetricsDashboard({ events }: Props) {
  const { metrics, distributionData, peakHoursData } = useMemo(() => {
    const now = new Date();
    
    // Calculate 30 days ago and 30 days ahead to capture both past and future bookings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
    thirtyDaysAhead.setHours(23, 59, 59, 999);

    const monthlyEvents = events.filter(e => {
      if (!e.date) return false;
      // Parse local date safely
      const eventDate = new Date(e.date + 'T00:00:00');
      return eventDate >= thirtyDaysAgo && eventDate <= thirtyDaysAhead;
    });

    // Area 1: Ocupación por Salón
    const roomCounts = monthlyEvents.reduce((acc, curr) => {
      acc[curr.roomId] = (acc[curr.roomId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const distributionData = ROOMS.map(room => ({
      name: room.name,
      reservas: roomCounts[room.id] || 0,
      color: room.dotColor,
    })).sort((a, b) => b.reservas - a.reservas);

    const mostBookedRoom = distributionData.length > 0 ? distributionData[0].name : 'N/A';

    // Area 2: Horas Pico
    const hourCounts = new Array(24).fill(0);
    monthlyEvents.forEach(evt => {
      if (!evt.startTime) return;
      const hour = parseInt(evt.startTime.split(':')[0], 10);
      if (!isNaN(hour)) {
        hourCounts[hour]++;
      }
    });

    const peakHoursData = hourCounts.map((count, hour) => ({
      hora: `${hour}:00`,
      eventos: count,
    })).filter(d => d.hora >= '06:00' && d.hora <= '22:00'); // Filter typical working hours

    const totalAttendees = monthlyEvents.reduce((sum, evt) => sum + (Number(evt.attendees) || 0), 0);

    return {
      metrics: {
        monthlyCount: monthlyEvents.length,
        mostBookedName: mostBookedRoom,
        totalAttendees
      },
      distributionData,
      peakHoursData
    };
  }, [events]);

  const handleShare = () => {
    const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = `📊 *Reporte de Gestión - Zona Coworking*
🗓 Periodo: Rango de 30 días (Paso y Futuro) (${todayStr})

🏢 *Espacio más ocupado:* ${metrics.mostBookedName}
✅ *Reservas totales:* ${metrics.monthlyCount}
👥 *Asistencia total est.:* ${metrics.totalAttendees} personas

💡 _Nota: Reporte de analíticas autogenerado para el equipo operativo._`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-24 md:pb-0">
      <header className="mb-8 mt-2 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-brand-blue tracking-tight">Métricas y Reportes</h1>
          <p className="text-slate-500 mt-1">Visión de 30 días (pasados y futuros) del uso de espacios y flujos operativos</p>
        </div>
        <button 
          onClick={handleShare}
          className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1EBE5A] transition-colors shadow-sm shadow-[#25D366]/20"
        >
          <Share2 size={16} /> Enviar Resumen
        </button>
      </header>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <CalendarIcon size={24} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reservas Mensuales</span>
          <span className="text-4xl font-display font-bold text-brand-blue">{metrics.monthlyCount}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Top Salón</span>
          <span className="text-2xl font-display font-bold text-brand-blue truncate w-full">{metrics.mostBookedName}</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-start hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Volumen de Asistentes</span>
          <span className="text-4xl font-display font-bold text-brand-blue">{metrics.totalAttendees}</span>
        </div>
      </div>
      
      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Chart 1: Ocupación por Salón */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-brand-blue mb-6">Gráfica de Ocupación por Salón</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="reservas" radius={[0, 4, 4, 0]} barSize={24}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Horas Pico */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-brand-blue mb-6">Líneas de Horas Pico (Inicios)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hora" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="eventos" stroke="#FF9305" strokeWidth={3} dot={{ fill: '#FF9305', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
