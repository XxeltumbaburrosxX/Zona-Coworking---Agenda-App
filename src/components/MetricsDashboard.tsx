import React, { useMemo, useState } from 'react';
import { EventData, ROOMS, getRoomForEvent, ADMIN_EMAIL } from '../types';
import { 
  Calendar as CalendarIcon, Award, Share2, Users, Building2, 
  MapPin, TrendingUp, TrendingDown, ArrowRightLeft, 
  DollarSign, Zap, Plus, X, Sparkles, Activity, BarChart2,
  Lock, ShieldCheck, Receipt, UserCheck, Copy, Check, HelpCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  Cell, LineChart, Line, CartesianGrid 
} from 'recharts';
import { MetricsTutorialModal } from './MetricsTutorialModal';

interface Props {
  events: EventData[];
  currentUserEmail?: string | null;
  usersProfile?: Record<string, { color?: string; displayName?: string; email?: string }>;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type PeriodSelect = { year: number; month: number } | 'ALL';

export function MetricsDashboard({ events, currentUserEmail, usersProfile }: Props) {
  const isAuthorized = currentUserEmail?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();

  // If user is not the authorized administrator, render nothing (no message, no exposure)
  if (!isAuthorized) {
    return null;
  }

  // Tutorial State for Juan (Only shows on first visit, or when clicking Help button)
  const [isMetricsTutorialOpen, setIsMetricsTutorialOpen] = useState(() => {
    if (!isAuthorized) return false;
    const key = currentUserEmail ? `tutorial_metrics_seen_${currentUserEmail.toLowerCase().trim()}` : 'tutorial_metrics_seen_admin';
    try {
      return !localStorage.getItem(key);
    } catch {
      return false;
    }
  });

  // Pro Mode Toggle State (Default false = Modo Simple)
  const [isProMode, setIsProMode] = useState<boolean>(false);

  const [selectedLocation, setSelectedLocation] = useState<'Todos' | 'Planta Baja' | 'Mezzanina'>('Todos');
  
  // Period selections: { year, month } (month is 0-11) or 'ALL'
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // e.g. 7 for August

  // Primary Period A
  const [primaryPeriod, setPrimaryPeriod] = useState<PeriodSelect>({
    year: currentYear,
    month: currentMonth
  });

  // Comparison Period B (used in Simple Mode when enabled, or Pro Mode Period B)
  const [enableComparison, setEnableComparison] = useState<boolean>(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<{ year: number; month: number }>({
    year: currentMonth === 0 ? currentYear - 1 : currentYear,
    month: currentMonth === 0 ? 11 : currentMonth - 1
  });

  // Pro Mode Period C (Optional 3rd period)
  const [periodC, setPeriodC] = useState<{ year: number; month: number } | null>(null);

  // Pro Mode Trend Metric Selector
  const [trendMetric, setTrendMetric] = useState<'reservas' | 'ingresos' | 'asistencia'>('reservas');

  // Strictly filter commercial reservations for all business metrics (blindaje contra reuniones y recordatorios)
  const commercialReservations = useMemo(() => {
    return events.filter(e => !e.itemType || e.itemType === 'reserva');
  }, [events]);

  // Calculate list of available months from existing events plus elapsed months for current year
  const availablePeriods = useMemo(() => {
    const periodSet = new Set<string>();
    
    // Add elapsed months of the current year (0 up to currentMonth)
    for (let m = 0; m <= currentMonth; m++) {
      periodSet.add(`${currentYear}-${m}`);
    }

    // Add any month that has actual commercial events in the database
    commercialReservations.forEach(e => {
      if (!e.date) return;
      const parts = e.date.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-based
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
          periodSet.add(`${y}-${m}`);
        }
      }
    });

    const result = Array.from(periodSet).map(str => {
      const [yStr, mStr] = str.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      return {
        year,
        month,
        label: `${MONTH_NAMES[month]} ${year}`
      };
    });

    // Sort descending (newest first)
    return result.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [commercialReservations, currentYear, currentMonth]);

  // Helper to format a period object to string
  const formatPeriodLabel = (p: PeriodSelect | null): string => {
    if (!p) return 'N/A';
    if (p === 'ALL') return 'Histórico Completo';
    return `${MONTH_NAMES[p.month]} ${p.year}`;
  };

  // Filter events by location first so all subsequent computations are consistently filtered
  const locationFilteredEvents = useMemo(() => {
    if (selectedLocation === 'Todos') return commercialReservations;
    return commercialReservations.filter(e => {
      const room = getRoomForEvent(e);
      return room ? room.location === selectedLocation : false;
    });
  }, [commercialReservations, selectedLocation]);

  // Filter helper by period
  const filterEventsByPeriod = (period: PeriodSelect | null, sourceEvents: EventData[]) => {
    if (!period) return [];
    if (period === 'ALL') return sourceEvents;
    return sourceEvents.filter(e => {
      if (!e.date) return false;
      const parts = e.date.split('-');
      if (parts.length < 3) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      return y === period.year && m === period.month;
    });
  };

  // Only allow comparison if primary period is a specific month (not ALL)
  const isComparisonAllowed = primaryPeriod !== 'ALL';

  const primaryEvents = useMemo(() => filterEventsByPeriod(primaryPeriod, locationFilteredEvents), [locationFilteredEvents, primaryPeriod]);
  const compEvents = useMemo(() => (enableComparison || isProMode) && isComparisonAllowed ? filterEventsByPeriod(comparisonPeriod, locationFilteredEvents) : [], [locationFilteredEvents, comparisonPeriod, enableComparison, isProMode, isComparisonAllowed]);
  const cEvents = useMemo(() => (isProMode && periodC && isComparisonAllowed) ? filterEventsByPeriod(periodC, locationFilteredEvents) : [], [locationFilteredEvents, periodC, isProMode, isComparisonAllowed]);

  // Compute metrics for a set of events
  const computeMetricsForEvents = (eventList: EventData[]) => {
    const roomCounts = eventList.reduce((acc, curr) => {
      const room = getRoomForEvent(curr);
      if (room) {
        acc[room.id] = (acc[room.id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    let pbCount = 0;
    let mezzCount = 0;

    // Filter rooms to evaluate based on selectedLocation
    const roomsToEvaluate = selectedLocation === 'Todos'
      ? ROOMS
      : ROOMS.filter(r => r.location === selectedLocation);

    const allRoomStats = roomsToEvaluate.map(room => {
      const count = roomCounts[room.id] || 0;
      if (room.location === 'Planta Baja') pbCount += count;
      if (room.location === 'Mezzanina') mezzCount += count;

      return {
        ...room,
        reservas: count
      };
    }).sort((a, b) => {
      if (b.reservas !== a.reservas) {
        return b.reservas - a.reservas;
      }
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

    const topRoom = allRoomStats.length > 0 && allRoomStats[0].reservas > 0 ? allRoomStats[0] : null;

    const totalAttendees = eventList.reduce((sum, evt) => sum + (Number(evt.attendees) || 0), 0);

    let totalCostSum = 0;
    let totalPaidSum = 0;
    let pendingSum = 0;
    let uncountedBsCount = 0;
    let uncountedBsTotal = 0;

    eventList.forEach(e => {
      const cost = Number(e.totalCost) || 0;
      const dUSD = Number(e.depositUSD) || 0;
      
      let dBSInUSD = 0;
      if (e.depositBS && Number(e.depositBS) > 0) {
        const rawRate = Number(e.exchangeRate);
        if (rawRate && !isNaN(rawRate) && rawRate > 0) {
          dBSInUSD = Number(e.depositBS) / rawRate;
        } else {
          // Exchange rate missing or invalid: do NOT convert with fallback of 1
          uncountedBsCount++;
          uncountedBsTotal += Number(e.depositBS);
        }
      }

      const paidThisEvent = dUSD + dBSInUSD;
      // Calculate pending balance per-reservation: max(0, cost - paid)
      const pendingThisEvent = Math.max(0, cost - paidThisEvent);

      totalCostSum += cost;
      totalPaidSum += paidThisEvent;
      pendingSum += pendingThisEvent;
    });

    // Peak hours (0-23)
    const hourCounts = new Array(24).fill(0);
    eventList.forEach(evt => {
      if (!evt.startTime) return;
      const hour = parseInt(evt.startTime.split(':')[0], 10);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        hourCounts[hour]++;
      }
    });

    const confirmedCount = eventList.filter(e => e.reservationStatus !== 'Pre-reserva').length;
    const preReservationCount = eventList.filter(e => e.reservationStatus === 'Pre-reserva').length;

    return {
      totalCount: eventList.length,
      confirmedCount,
      preReservationCount,
      topRoomName: topRoom ? topRoom.name : 'N/A',
      topRoomLocation: topRoom ? topRoom.location : '',
      totalAttendees,
      pbCount,
      mezzCount,
      totalCostSum,
      totalPaidSum,
      pendingSum,
      uncountedBsCount,
      uncountedBsTotal,
      roomCounts,
      hourCounts,
      allRoomStats
    };
  };

  const primaryData = useMemo(() => computeMetricsForEvents(primaryEvents), [primaryEvents, selectedLocation]);
  const compData = useMemo(() => computeMetricsForEvents(compEvents), [compEvents, selectedLocation]);
  const cData = useMemo(() => computeMetricsForEvents(cEvents), [cEvents, selectedLocation]);

  // Labels for headers
  const primaryLabel = formatPeriodLabel(primaryPeriod);
  const compLabel = formatPeriodLabel(comparisonPeriod);
  const cLabel = formatPeriodLabel(periodC);

  // Dynamically ranked rooms filtered by location for primary period
  const rankedRooms = useMemo(() => {
    return primaryData.allRoomStats;
  }, [primaryData.allRoomStats]);

  // Helper to normalize strings (lowercase, trimmed, accents removed)
  const normalize = (str?: string): string => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Reliable helper to identify the commercial advisor:
  // 1. Explicit salesRep field (principal source)
  // 2. Authenticated creator profile by UID (verified email / name in usersProfile)
  // 3. Exact creator name fallback (createdBy_Name)
  // 4. Exact assignedTo fallback
  const resolveAdvisor = (evt: EventData): 'Juan' | 'Laura' | 'Yoanelis' | 'Directo / Coworking' => {
    // 1. Primary: Explicit salesRep field
    if (evt.salesRep && evt.salesRep.trim() !== '') {
      const rep = normalize(evt.salesRep);
      if (rep === 'laura' || rep === 'laura gomez') return 'Laura';
      if (rep === 'yoanelis' || rep === 'yoanelis suarez') return 'Yoanelis';
      if (rep === 'juan' || rep === 'juan medina') return 'Juan';
      if (rep === 'directo' || rep === 'otro' || rep === 'directo / coworking' || rep === 'zona coworking' || rep === 'sin asesor' || rep === 'coworking') {
        return 'Directo / Coworking';
      }
    }

    // 2. Verified creator user profile (email and display name from Firebase Auth / users_config)
    if (evt.createdBy && usersProfile && usersProfile[evt.createdBy]) {
      const prof = usersProfile[evt.createdBy];
      const pEmail = (prof.email || '').trim().toLowerCase();
      const pUsername = pEmail.split('@')[0];
      const pName = normalize(prof.displayName);

      // Check Juan (Admin email or Juan)
      if (pEmail === ADMIN_EMAIL.toLowerCase() || pUsername === 'juan' || pUsername.startsWith('juan.') || pUsername.startsWith('juan_') || pName === 'juan' || pName === 'juan medina') {
        return 'Juan';
      }
      // Check Laura
      if (pUsername === 'laura' || pUsername.startsWith('laura.') || pUsername.startsWith('laura_') || pName === 'laura' || pName === 'laura gomez') {
        return 'Laura';
      }
      // Check Yoanelis
      if (pUsername === 'yoanelis' || pUsername.startsWith('yoanelis.') || pUsername.startsWith('yoanelis_') || pName === 'yoanelis' || pName === 'yoanelis suarez') {
        return 'Yoanelis';
      }
    }

    // 3. Fallback: exact creator display name stored on event (createdBy_Name)
    if (evt.createdBy_Name && evt.createdBy_Name.trim() !== '') {
      const creator = normalize(evt.createdBy_Name);
      if (creator === 'laura' || creator === 'laura gomez') return 'Laura';
      if (creator === 'yoanelis' || creator === 'yoanelis suarez') return 'Yoanelis';
      if (creator === 'juan' || creator === 'juan medina') return 'Juan';
    }

    // 4. Fallback for legacy tasks/assignments: assignedTo
    if (evt.assignedTo && evt.assignedTo.trim() !== '') {
      const assigned = normalize(evt.assignedTo);
      if (assigned === 'laura' || assigned === 'laura gomez') return 'Laura';
      if (assigned === 'yoanelis' || assigned === 'yoanelis suarez') return 'Yoanelis';
      if (assigned === 'juan' || assigned === 'juan medina') return 'Juan';
    }

    return 'Directo / Coworking';
  };

  // Private Commission & Revenue State (5 views: Todos, Juan, Laura, Yoanelis, Directo)
  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState<'Todos' | 'Juan' | 'Laura' | 'Yoanelis' | 'Directo'>('Todos');
  const [isCopiedCommissions, setIsCopiedCommissions] = useState(false);

  // Private Commissions & Revenue Breakdown for Primary Period
  const commissionReport = useMemo(() => {
    let juanCount = 0;
    let juanGross = 0;
    let juanNet = 0;

    let lauraCount = 0;
    let lauraGross = 0;
    let lauraCommission = 0;
    let lauraNet = 0;

    let yoanelisCount = 0;
    let yoanelisGross = 0;
    let yoanelisCommission = 0;
    let yoanelisNet = 0;

    let directCount = 0;
    let directGross = 0;

    const detailedList = primaryEvents.map(evt => {
      const room = getRoomForEvent(evt);
      const totalCost = Number(evt.totalCost) || 0;
      const advisorName = resolveAdvisor(evt);
      
      let commissionPct = 0;
      let commissionAmount = 0;
      let netForCoworking = totalCost;

      if (advisorName === 'Laura') {
        commissionPct = 0.25;
        commissionAmount = Number((totalCost * 0.25).toFixed(2));
        netForCoworking = Number((totalCost - commissionAmount).toFixed(2));
        lauraCount++;
        lauraGross += totalCost;
        lauraCommission += commissionAmount;
        lauraNet += netForCoworking;
      } else if (advisorName === 'Yoanelis') {
        commissionPct = 0.25;
        commissionAmount = Number((totalCost * 0.25).toFixed(2));
        netForCoworking = Number((totalCost - commissionAmount).toFixed(2));
        yoanelisCount++;
        yoanelisGross += totalCost;
        yoanelisCommission += commissionAmount;
        yoanelisNet += netForCoworking;
      } else if (advisorName === 'Juan') {
        commissionPct = 0;
        commissionAmount = 0;
        netForCoworking = totalCost;
        juanCount++;
        juanGross += totalCost;
        juanNet += netForCoworking;
      } else {
        directCount++;
        directGross += totalCost;
      }

      return {
        id: evt.id,
        date: evt.date,
        eventName: evt.eventName,
        clientName: evt.clientName || 'Cliente no especificado',
        roomName: room?.name || 'Espacio',
        totalCost,
        advisorName,
        commissionPct,
        commissionAmount,
        netForCoworking,
        reservationStatus: evt.reservationStatus || 'Confirmada'
      };
    });

    const totalGross = primaryData.totalCostSum;
    const totalCommissions = Number((lauraCommission + yoanelisCommission).toFixed(2));
    const totalCoworkingNet = Number((totalGross - totalCommissions).toFixed(2));

    return {
      totalGross,
      totalCommissions,
      totalCoworkingNet,
      juan: {
        count: juanCount,
        gross: Number(juanGross.toFixed(2)),
        commission: 0,
        net: Number(juanNet.toFixed(2))
      },
      laura: {
        count: lauraCount,
        gross: Number(lauraGross.toFixed(2)),
        commission: Number(lauraCommission.toFixed(2)),
        net: Number(lauraNet.toFixed(2))
      },
      yoanelis: {
        count: yoanelisCount,
        gross: Number(yoanelisGross.toFixed(2)),
        commission: Number(yoanelisCommission.toFixed(2)),
        net: Number(yoanelisNet.toFixed(2))
      },
      direct: {
        count: directCount,
        gross: Number(directGross.toFixed(2)),
        net: Number(directGross.toFixed(2))
      },
      detailedList
    };
  }, [primaryEvents, primaryData.totalCostSum, usersProfile]);

  // Filtered reservations for the private commission table (5 views: Todos, Juan, Laura, Yoanelis, Directo)
  const filteredCommissionList = useMemo(() => {
    if (selectedAdvisorFilter === 'Todos') return commissionReport.detailedList;
    if (selectedAdvisorFilter === 'Juan') return commissionReport.detailedList.filter(item => item.advisorName === 'Juan');
    if (selectedAdvisorFilter === 'Laura') return commissionReport.detailedList.filter(item => item.advisorName === 'Laura');
    if (selectedAdvisorFilter === 'Yoanelis') return commissionReport.detailedList.filter(item => item.advisorName === 'Yoanelis');
    if (selectedAdvisorFilter === 'Directo') return commissionReport.detailedList.filter(item => item.advisorName === 'Directo / Coworking');
    return commissionReport.detailedList;
  }, [commissionReport.detailedList, selectedAdvisorFilter]);

  // Dynamic Coworking Net Margin Percentage based on the actual mix of reservations
  const dynamicCoworkingMarginPct = commissionReport.totalGross > 0
    ? Number(((commissionReport.totalCoworkingNet / commissionReport.totalGross) * 100).toFixed(1))
    : 100;

  const handleCopyCommissionsSummary = () => {
    let text = '';
    if (selectedAdvisorFilter === 'Laura') {
      text = `💰 *LIQUIDACIÓN DE COMISIÓN* 💰
🏢 *Zona Coworking*
🗓 *Período:* ${primaryLabel}
👤 *Asesora:* LAURA
─────────────────────────
• Reservas comerciales: ${commissionReport.laura.count}
• Total facturado: $${commissionReport.laura.gross.toFixed(2)}
• Porcentaje de comisión: 25%
💵 *Comisión a liquidar (25%):* $${commissionReport.laura.commission.toFixed(2)}
🤝 *Neto para Coworking (75%):* $${commissionReport.laura.net.toFixed(2)}
─────────────────────────
Generado confidencialmente desde la plataforma Zona Coworking.`;
    } else if (selectedAdvisorFilter === 'Yoanelis') {
      text = `💰 *LIQUIDACIÓN DE COMISIÓN* 💰
🏢 *Zona Coworking*
🗓 *Período:* ${primaryLabel}
👤 *Asesora:* YOANELIS
─────────────────────────
• Reservas comerciales: ${commissionReport.yoanelis.count}
• Total facturado: $${commissionReport.yoanelis.gross.toFixed(2)}
• Porcentaje de comisión: 25%
💵 *Comisión a liquidar (25%):* $${commissionReport.yoanelis.commission.toFixed(2)}
🤝 *Neto para Coworking (75%):* $${commissionReport.yoanelis.net.toFixed(2)}
─────────────────────────
Generado confidencialmente desde la plataforma Zona Coworking.`;
    } else if (selectedAdvisorFilter === 'Juan') {
      text = `💰 *REPORTE DE VENTAS - JUAN* 💰
🏢 *Zona Coworking*
🗓 *Período:* ${primaryLabel}
👤 *Asesor:* JUAN (Directo)
─────────────────────────
• Reservas directas: ${commissionReport.juan.count}
• Total facturado: $${commissionReport.juan.gross.toFixed(2)}
• Comisión a pagar: $0.00 (0% - Director)
🤝 *Margen para Coworking (100%):* $${commissionReport.juan.net.toFixed(2)}
─────────────────────────
Generado confidencialmente desde la plataforma Zona Coworking.`;
    } else if (selectedAdvisorFilter === 'Directo') {
      text = `🏢 *REPORTE DE VENTAS DIRECTAS - ZONA COWORKING* 🏢
🗓 *Período:* ${primaryLabel}
─────────────────────────
• Reservas comerciales directas: ${commissionReport.direct.count}
• Total facturado: $${commissionReport.direct.gross.toFixed(2)}
• Comisión: $0.00 (0% - Sin Asesor)
🤝 *Margen neto Zona Coworking (100%):* $${commissionReport.direct.net.toFixed(2)}
─────────────────────────
Generado confidencialmente desde la plataforma Zona Coworking.`;
    } else {
      text = `💰 *LIQUIDACIÓN DE COMISIONES & INGRESOS* 💰
🏢 *Zona Coworking*
🗓 *Período:* ${primaryLabel}
─────────────────────────
💵 *Facturación Total Reservas:* $${commissionReport.totalGross.toFixed(2)}
🤝 *Margen Neto para Coworking (${dynamicCoworkingMarginPct}%):* $${commissionReport.totalCoworkingNet.toFixed(2)}
📊 *Total Comisiones Asesoras:* $${commissionReport.totalCommissions.toFixed(2)}

👤 *JUAN (Directo):*
• Reservas: ${commissionReport.juan.count} | Facturado: $${commissionReport.juan.gross.toFixed(2)} | Margen Coworking: $${commissionReport.juan.net.toFixed(2)}

👤 *LAURA (25%):*
• Reservas: ${commissionReport.laura.count} | Facturado: $${commissionReport.laura.gross.toFixed(2)} | Su comisión (25%): $${commissionReport.laura.commission.toFixed(2)} | Neto Coworking: $${commissionReport.laura.net.toFixed(2)}

👤 *YOANELIS (25%):*
• Reservas: ${commissionReport.yoanelis.count} | Facturado: $${commissionReport.yoanelis.gross.toFixed(2)} | Su comisión (25%): $${commissionReport.yoanelis.commission.toFixed(2)} | Neto Coworking: $${commissionReport.yoanelis.net.toFixed(2)}

🏢 *DIRECTAS / COWORKING (100%):*
• Reservas sin asesor: ${commissionReport.direct.count} | Margen Coworking: $${commissionReport.direct.gross.toFixed(2)}
─────────────────────────
Generado confidencialmente desde la plataforma Zona Coworking.`;
    }

    navigator.clipboard.writeText(text);
    setIsCopiedCommissions(true);
    setTimeout(() => setIsCopiedCommissions(false), 2500);
  };

  // Historical Monthly Trend Data (in memory)
  const monthlyTrendData = useMemo(() => {
    // Only take periods that are in the past or current, or have actual events in locationFilteredEvents
    const eligiblePeriods = availablePeriods.filter(p => {
      const isPastOrCurrent = p.year < currentYear || (p.year === currentYear && p.month <= currentMonth);
      if (isPastOrCurrent) return true;
      return locationFilteredEvents.some(e => {
        if (!e.date) return false;
        const parts = e.date.split('-');
        if (parts.length < 3) return false;
        return parseInt(parts[0], 10) === p.year && (parseInt(parts[1], 10) - 1) === p.month;
      });
    });

    // Take chronological list of eligible periods (oldest first, last 12 max)
    const chronList = [...eligiblePeriods].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    }).slice(-12);

    return chronList.map(p => {
      const evts = locationFilteredEvents.filter(e => {
        if (!e.date) return false;
        const parts = e.date.split('-');
        if (parts.length < 3) return false;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        return y === p.year && m === p.month;
      });

      const metrics = computeMetricsForEvents(evts);
      return {
        label: `${MONTH_NAMES[p.month].substring(0, 3)} ${p.year.toString().substring(2)}`,
        fullLabel: `${MONTH_NAMES[p.month]} ${p.year}`,
        reservas: metrics.confirmedCount,
        totalApartados: metrics.totalCount,
        ingresos: metrics.totalCostSum,
        asistencia: metrics.totalAttendees,
      };
    });
  }, [locationFilteredEvents, availablePeriods, currentYear, currentMonth, selectedLocation]);

  // Combined distribution data for chart (uses dynamic ranking order)
  const distributionData = useMemo(() => {
    return rankedRooms.map(room => {
      const pCount = primaryData.roomCounts[room.id] || 0;
      const cCount = compData.roomCounts[room.id] || 0;
      const c3Count = cData.roomCounts[room.id] || 0;
      return {
        id: room.id,
        fullName: room.name,
        shortName: room.name.replace('Salón ', '').replace('Sala ', ''),
        primaryCount: pCount,
        compCount: cCount,
        c3Count: c3Count,
        color: room.dotColor,
        location: room.location,
        area: room.area,
        capacity: room.capacity
      };
    });
  }, [rankedRooms, primaryData.roomCounts, compData.roomCounts, cData.roomCounts]);

  const maxReservas = useMemo(() => {
    let max = 1;
    distributionData.forEach(d => {
      if (d.primaryCount > max) max = d.primaryCount;
      if (d.compCount > max) max = d.compCount;
      if (d.c3Count > max) max = d.c3Count;
    });
    return max;
  }, [distributionData]);

  // Combined peak hours data for line chart
  const peakHoursData = useMemo(() => {
    let minHour = 7;
    let maxHour = 21;

    for (let h = 0; h < 24; h++) {
      if ((primaryData.hourCounts[h] || 0) > 0 ||
          (compData.hourCounts[h] || 0) > 0 ||
          (cData.hourCounts[h] || 0) > 0) {
        if (h < minHour) minHour = h;
        if (h > maxHour) maxHour = h;
      }
    }

    const result = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
      const horaStr = `${hour.toString().padStart(2, '0')}:00`;
      result.push({
        hora: horaStr,
        primaryEventos: primaryData.hourCounts[hour] || 0,
        compEventos: compData.hourCounts[hour] || 0,
        c3Eventos: cData.hourCounts[hour] || 0,
      });
    }
    return {
      data: result,
      minHour,
      maxHour
    };
  }, [primaryData, compData, cData]);

  // Delta calculation helper
  const calcDelta = (valP: number, valC: number) => {
    if ((!enableComparison && !isProMode) || !isComparisonAllowed) return null;
    const diff = valP - valC;
    let pct = 0;
    if (valC > 0) {
      pct = Math.round(((valP - valC) / valC) * 100);
    } else if (valP > 0) {
      pct = 100;
    }
    return { diff, pct, isPositive: diff >= 0 };
  };

  const deltaConfirmed = calcDelta(primaryData.confirmedCount, compData.confirmedCount);
  const deltaTotalApartados = calcDelta(primaryData.totalCount, compData.totalCount);
  const deltaCost = calcDelta(primaryData.totalCostSum, compData.totalCostSum);
  const deltaAttendees = calcDelta(primaryData.totalAttendees, compData.totalAttendees);

  // Executive Summary & Automatic Insights Calculation (Pro Mode)
  const executiveSummary = useMemo(() => {
    if (!isProMode) return null;

    const insights: {
      id: string;
      icon: string;
      badge: string;
      badgeColor: string;
      title: string;
      detail: string;
    }[] = [];

    // If primary period is ALL, return clean historical conclusions without comparing against month B
    if (!isComparisonAllowed) {
      insights.push({
        id: 'all-history-summary',
        icon: '📚',
        badge: 'Histórico Global',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        title: `${primaryData.confirmedCount} reservas confirmadas`,
        detail: `Histórico acumulado de ${primaryData.totalCount} apartados (${primaryData.confirmedCount} confirmadas y ${primaryData.preReservationCount} pre-reservas) con un monto reservado de $${primaryData.totalCostSum.toFixed(2)}.`
      });
      if (primaryData.topRoomName && primaryData.topRoomName !== 'N/A') {
        insights.push({
          id: 'all-top-room',
          icon: '🏆',
          badge: 'Espacio Líder',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
          title: `${primaryData.topRoomName}`,
          detail: `Es el salón con mayor volumen histórico registrado (${primaryData.roomCounts[ROOMS.find(r => r.name === primaryData.topRoomName)?.id || ''] || 0} apartados).`
        });
      }
      return insights;
    }

    // Helper to calculate percentage
    const calcPct = (p: number, c: number) => {
      if (c === 0) return p > 0 ? 100 : 0;
      return Math.round(((p - c) / c) * 100);
    };

    // 1. Multi-period trend check if Period C exists
    let isThreePeriodTrend = false;
    if (periodC) {
      const pList = [
        { label: cLabel, data: cData, period: periodC },
        { label: compLabel, data: compData, period: comparisonPeriod },
        { label: primaryLabel, data: primaryData, period: primaryPeriod },
      ].filter(p => p.period !== 'ALL') as { label: string; data: typeof primaryData; period: { year: number; month: number } }[];

      pList.sort((x, y) => (x.period.year * 12 + x.period.month) - (y.period.year * 12 + y.period.month));

      if (pList.length === 3) {
        const [p1, p2, p3] = pList;
        const r1 = p1.data.confirmedCount;
        const r2 = p2.data.confirmedCount;
        const r3 = p3.data.confirmedCount;

        if (r1 < r2 && r2 < r3) {
          isThreePeriodTrend = true;
          insights.push({
            id: 'three-period-growth',
            icon: '📈',
            badge: 'Tendencia al Alza',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            title: 'Tendencia creciente constante',
            detail: `Las reservas confirmadas muestran crecimiento continuo durante los tres períodos: ${p1.label} (${r1}) ➔ ${p2.label} (${r2}) ➔ ${p3.label} (${r3}).`
          });
        } else if (r1 > r2 && r2 > r3) {
          isThreePeriodTrend = true;
          insights.push({
            id: 'three-period-decline',
            icon: '📉',
            badge: 'Tendencia a la Baja',
            badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
            title: 'Tendencia decreciente constante',
            detail: `Disminución progresiva de reservas confirmadas: ${p1.label} (${r1}) ➔ ${p2.label} (${r2}) ➔ ${p3.label} (${r3}).`
          });
        }
      }
    }

    // 2. Comparison between Primary (A) and Secondary (B) if no 3-period trend insight
    const pConf = primaryData.confirmedCount;
    const cConf = compData.confirmedCount;
    const confDiff = pConf - cConf;
    const confPct = calcPct(pConf, cConf);

    if (!isThreePeriodTrend) {
      if (Math.abs(confDiff) <= 1 && cConf > 0) {
        insights.push({
          id: 'reservation-stability',
          icon: '⚖️',
          badge: 'Actividad Estable',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
          title: 'Volumen de reservas confirmado estable',
          detail: `Actividad constante con ${pConf} reserva${pConf !== 1 ? 's confirmadas' : ' confirmada'} en ${primaryLabel} vs ${cConf} en ${compLabel}.`
        });
      } else if (confDiff > 0) {
        insights.push({
          id: 'reservation-growth',
          icon: '📈',
          badge: 'Crecimiento',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          title: `Las reservas confirmadas aumentaron ${confPct}%`,
          detail: `Se registraron +${confDiff} reserva${confDiff > 1 ? 's confirmadas' : ' confirmada'} respecto al período anterior (${primaryLabel}: ${pConf} vs ${compLabel}: ${cConf}).`
        });
      } else if (confDiff < 0) {
        insights.push({
          id: 'reservation-decline',
          icon: '📉',
          badge: 'Disminución',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
          title: `Las reservas confirmadas disminuyeron ${Math.abs(confPct)}%`,
          detail: `Variación de ${confDiff} reserva${Math.abs(confDiff) > 1 ? 's confirmadas' : ' confirmada'} (${primaryLabel}: ${pConf} vs ${compLabel}: ${cConf}).`
        });
      }
    }

    // 3. Room with highest growth between B and A
    let bestRoomGrowth = { roomName: '', diff: 0, pVal: 0, cVal: 0 };
    rankedRooms.forEach(r => {
      const pVal = primaryData.roomCounts[r.id] || 0;
      const cVal = compData.roomCounts[r.id] || 0;
      const diff = pVal - cVal;
      if (diff > bestRoomGrowth.diff) {
        bestRoomGrowth = { roomName: r.name, diff, pVal, cVal };
      }
    });

    if (bestRoomGrowth.diff >= 2) {
      insights.push({
        id: 'best-growth-room',
        icon: '🚀',
        badge: 'Mayor Crecimiento',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        title: `${bestRoomGrowth.roomName}`,
        detail: `Fue el espacio con mayor crecimiento (+${bestRoomGrowth.diff} apartados: ${bestRoomGrowth.pVal} en ${primaryLabel} vs ${bestRoomGrowth.cVal} en ${compLabel}).`
      });
    }

    // 4. Top utilized room in primary period
    if (primaryData.topRoomName && primaryData.topRoomName !== 'N/A') {
      const topRoomObj = ROOMS.find(r => r.name === primaryData.topRoomName);
      const topRoomCount = topRoomObj ? (primaryData.roomCounts[topRoomObj.id] || 0) : 0;
      if (topRoomCount > 0 && primaryData.topRoomName !== bestRoomGrowth.roomName) {
        insights.push({
          id: 'top-utilized-room',
          icon: '🏆',
          badge: 'Mayor Utilización',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
          title: `${primaryData.topRoomName}`,
          detail: `Continúa siendo el espacio con mayor utilización con ${topRoomCount} apartado${topRoomCount > 1 ? 's' : ''} en ${primaryLabel}.`
        });
      }
    }

    // 5. Financial highlight (Pending debt or revenue)
    const pendingDiff = primaryData.pendingSum - compData.pendingSum;
    if (primaryData.pendingSum > 0 && Math.abs(pendingDiff) >= 10) {
      insights.push({
        id: 'pending-balance-alert',
        icon: '⚠️',
        badge: 'Saldo Pendiente',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        title: pendingDiff > 0 ? 'El monto pendiente aumentó' : 'El monto pendiente disminuyó',
        detail: `Saldo pendiente actual: $${primaryData.pendingSum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${pendingDiff > 0 ? '+' : ''}$${pendingDiff.toFixed(2)} vs ${compLabel}).`
      });
    } else if (primaryData.totalCostSum > 0) {
      const revPct = calcPct(primaryData.totalCostSum, compData.totalCostSum);
      insights.push({
        id: 'revenue-insight',
        icon: '💰',
        badge: 'Facturación',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        title: `Monto reservado: $${primaryData.totalCostSum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        detail: `Facturación en ${primaryLabel}${compData.totalCostSum > 0 ? ` (${revPct >= 0 ? '+' : ''}${revPct}% vs ${compLabel})` : ''}.`
      });
    }

    if (insights.length === 0) {
      insights.push({
        id: 'no-data-insight',
        icon: 'ℹ️',
        badge: 'Sin Datos Suficientes',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        title: 'Sin actividad relevante registrada',
        detail: `No hay variaciones ni datos suficientes para generar conclusiones en ${primaryLabel}.`
      });
    }

    // Max 3 or 4 visible insights at a time
    return insights.slice(0, 4);
  }, [isProMode, primaryData, compData, cData, primaryPeriod, comparisonPeriod, periodC, primaryLabel, compLabel, cLabel, isComparisonAllowed, rankedRooms]);

  // WhatsApp Share handler
  const handleShare = () => {
    const pendingSum = primaryData.pendingSum;
    const locationText = selectedLocation !== 'Todos' ? ` (${selectedLocation})` : '';

    const activeRooms = rankedRooms.filter(r => r.reservas > 0);
    const topRoomsFormatted = activeRooms.length > 0
      ? activeRooms.map((r, i) => `${i + 1}. *${r.name}*: ${r.reservas} apartado${r.reservas > 1 ? 's' : ''} (${r.location})`).join('\n')
      : '_Sin apartados en este período_';

    let peakHourStr = 'N/A';
    let maxHourCount = 0;
    for (let h = 0; h < 24; h++) {
      if ((primaryData.hourCounts[h] || 0) > maxHourCount) {
        maxHourCount = primaryData.hourCounts[h];
        peakHourStr = `${h.toString().padStart(2, '0')}:00 hrs (${maxHourCount} inicio${maxHourCount > 1 ? 's' : ''})`;
      }
    }

    const modeText = isProMode ? ' [Modo Pro]' : '';
    const hasComparison = (enableComparison || isProMode) && isComparisonAllowed;

    const text = `📊 *REPORTE DE GESTIÓN Y OCUPACIÓN*${modeText}
🏢 *Zona Coworking*
🗓 *Período:* ${primaryLabel}${locationText}${
      hasComparison ? `\n🔄 *Comparado con:* ${compLabel}` : ''
    }${
      (isProMode && periodC && isComparisonAllowed) ? ` y ${cLabel}` : ''
    }
───────────────────────

📌 *RESUMEN DE RESERVAS*
• *Reservas Confirmadas:* ${primaryData.confirmedCount}${deltaConfirmed ? ` (${deltaConfirmed.diff >= 0 ? '+' : ''}${deltaConfirmed.diff} vs ${compLabel})` : ''}
• *Pre-reservas:* ${primaryData.preReservationCount}
• *Total Apartados:* ${primaryData.totalCount}${deltaTotalApartados ? ` (${deltaTotalApartados.diff >= 0 ? '+' : ''}${deltaTotalApartados.diff} vs ${compLabel})` : ''}
• *Asistencia Estimada:* ${primaryData.totalAttendees} personas${deltaAttendees ? ` (${deltaAttendees.diff >= 0 ? '+' : ''}${deltaAttendees.diff} personas)` : ''}
• *Espacio Principal:* ${primaryData.topRoomName}
• *Hora Pico de Inicio:* ${peakHourStr}

📍 *DISTRIBUCIÓN POR UBICACIÓN*
• *Planta Baja:* ${primaryData.pbCount} apartado${primaryData.pbCount !== 1 ? 's' : ''}
• *Mezzanina:* ${primaryData.mezzCount} apartado${primaryData.mezzCount !== 1 ? 's' : ''}

🏆 *RANKING POR ESPACIO*
${topRoomsFormatted}

💰 *BALANCE FINANCIERO*
• *Monto Reservado:* $${primaryData.totalCostSum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${deltaCost ? ` (${deltaCost.pct >= 0 ? '+' : ''}${deltaCost.pct}% vs ${compLabel})` : ''}
• *Total Cobrado:* $${primaryData.totalPaidSum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
• *Pendiente por Cobrar:* $${pendingSum.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${
  primaryData.uncountedBsCount > 0 ? `\n⚠️ _(${primaryData.uncountedBsCount} abono(s) en Bs no convertidos por falta de tasa de cambio)_` : ''
}

───────────────────────
💡 _Reporte generado desde el Dashboard de Zona Coworking_`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const chartHeight = Math.max(280, distributionData.length * (isProMode && periodC ? 52 : 44));

  return (
    <div className="w-full max-w-6xl mx-auto pb-24 md:pb-8 px-2 sm:px-4">
      {/* Metrics Tutorial Modal (Exclusively for Juan) */}
      <MetricsTutorialModal
        isOpen={isMetricsTutorialOpen}
        onClose={() => setIsMetricsTutorialOpen(false)}
        userEmail={currentUserEmail}
      />

      {/* Header with Mode Toggle */}
      <header className="mb-6 mt-1 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-brand-orange font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={16} /> Panel Metrónico & Ocupación Histórica
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-bold text-brand-blue tracking-tight flex items-center gap-2.5 flex-wrap">
            <span>Métricas y Reportes</span>
            {isProMode && (
              <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-2xs animate-in fade-in">
                <Zap size={13} className="fill-current" /> Modo Pro
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {isProMode 
              ? 'Análisis profundo de rendimiento, comparación multiperíodo y tendencias por espacio'
              : 'Análisis de rendimiento mensual e histórico en los 10 salones'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-col sm:flex-row">
          {/* Mode Switcher Control */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center w-full sm:w-auto shrink-0 shadow-inner">
            <button
              onClick={() => setIsProMode(false)}
              className={`flex-1 sm:flex-none px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                !isProMode 
                  ? 'bg-white text-brand-blue shadow-xs font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 size={15} /> Modo Simple
            </button>

            <button
              onClick={() => setIsProMode(true)}
              className={`flex-1 sm:flex-none px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isProMode 
                  ? 'bg-amber-500 text-white shadow-xs font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap size={15} className={isProMode ? 'fill-current' : ''} /> Modo Pro
            </button>
          </div>

          <button 
            onClick={() => setIsMetricsTutorialOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0 min-h-[40px]"
            title="Ver guía rápida de métricas y reportes"
          >
            <HelpCircle size={16} className="text-brand-blue" />
            <span>Guía</span>
          </button>

          <button 
            onClick={handleShare}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-[#1EBE5A] active:scale-[0.98] transition-all shadow-md shadow-[#25D366]/20 cursor-pointer shrink-0"
          >
            <Share2 size={17} /> Compartir WhatsApp
          </button>
        </div>
      </header>

      {/* Control Panel */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all mb-6 space-y-4 ${
        isProMode 
          ? 'bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 border-amber-200/80 shadow-xs' 
          : 'bg-white border-slate-200/80 shadow-xs'
      }`}>
        
        {/* Mode Info Bar if Pro */}
        {isProMode && (
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 text-xs font-semibold text-amber-900 gap-2 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Sparkles size={15} className="text-amber-600 shrink-0" />
              <span><strong>Análisis Multimensual Activo:</strong> Puedes comparar hasta 3 períodos simultáneamente y analizar tendencias.</span>
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-950 font-extrabold px-2 py-0.5 rounded-md">
              Procesamiento Local Optimizado ⚡
            </span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Primary Month Selector (Period A) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <CalendarIcon size={15} className={isProMode ? 'text-amber-600' : 'text-brand-blue'} />
              <span>{isProMode ? 'Período A (Principal):' : 'Período Principal:'}</span>
            </label>
            <select
              value={primaryPeriod === 'ALL' ? 'ALL' : `${primaryPeriod.year}-${primaryPeriod.month}`}
              onChange={e => {
                if (e.target.value === 'ALL') {
                  setPrimaryPeriod('ALL');
                } else {
                  const [y, m] = e.target.value.split('-').map(Number);
                  setPrimaryPeriod({ year: y, month: m });
                }
              }}
              className="w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] bg-white border border-slate-300 text-slate-800 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer"
            >
              <option value="ALL">🗓️ Histórico Completo (Todos los datos)</option>
              {availablePeriods.map(p => (
                <option key={`pA-${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                  📅 {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Comparison Controls */}
          {!isProMode ? (
            /* Modo Simple Comparison Toggle */
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              {!isComparisonAllowed ? (
                <div className="w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center gap-2">
                  <ArrowRightLeft size={15} className="text-slate-400" />
                  <span>Comparación disponible al seleccionar un mes</span>
                </div>
              ) : (
                <button
                  onClick={() => setEnableComparison(!enableComparison)}
                  className={`w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                    enableComparison
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <ArrowRightLeft size={16} className={enableComparison ? 'text-brand-orange' : 'text-slate-500'} />
                  <span>{enableComparison ? '✓ Comparación Activa' : '+ Comparar con otro Mes'}</span>
                </button>
              )}

              {enableComparison && isComparisonAllowed && (
                <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in duration-200">
                  <span className="text-xs font-semibold text-slate-400">vs</span>
                  <select
                    value={`${comparisonPeriod.year}-${comparisonPeriod.month}`}
                    onChange={e => {
                      const [y, m] = e.target.value.split('-').map(Number);
                      setComparisonPeriod({ year: y, month: m });
                    }}
                    className="w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] bg-amber-50/80 border border-amber-300 text-amber-950 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                  >
                    {availablePeriods.map(p => (
                      <option key={`comp-${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                        📅 {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            /* Modo Pro Multi-Period Comparison Controls */
            <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-amber-200/60">
              {!isComparisonAllowed ? (
                <div className="w-full sm:w-auto px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-amber-100/60 text-amber-900 border border-amber-200 flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-600 shrink-0" />
                  <span>Selecciona un mes específico en Período A para comparar multiperíodo</span>
                </div>
              ) : (
                <>
                  {/* Period B */}
                  <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-amber-300 shadow-2xs w-full sm:w-auto">
                    <span className="text-xs font-bold text-amber-900 px-2 flex items-center gap-1 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      Período B:
                    </span>
                    <select
                      value={`${comparisonPeriod.year}-${comparisonPeriod.month}`}
                      onChange={e => {
                        const [y, m] = e.target.value.split('-').map(Number);
                        setComparisonPeriod({ year: y, month: m });
                      }}
                      className="px-2.5 py-1.5 min-h-[38px] bg-amber-50/50 border-0 text-amber-950 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      {availablePeriods.map(p => (
                        <option key={`compB-${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                          📅 {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Period C Optional */}
                  {periodC ? (
                    <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-purple-300 shadow-2xs w-full sm:w-auto animate-in fade-in">
                      <span className="text-xs font-bold text-purple-900 px-2 flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                        Período C:
                      </span>
                      <select
                        value={`${periodC.year}-${periodC.month}`}
                        onChange={e => {
                          const [y, m] = e.target.value.split('-').map(Number);
                          setPeriodC({ year: y, month: m });
                        }}
                        className="px-2.5 py-1.5 min-h-[38px] bg-purple-50/50 border-0 text-purple-950 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        {availablePeriods.map(p => (
                          <option key={`compC-${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                            📅 {p.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setPeriodC(null)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Quitar 3er Período"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        // Default period C to 2 months prior or similar available
                        const prev2 = availablePeriods.length > 2 ? availablePeriods[2] : availablePeriods[0];
                        setPeriodC({ year: prev2.year, month: prev2.month });
                      }}
                      className="px-3 py-2 min-h-[40px] bg-white border border-dashed border-amber-300 text-amber-900 hover:bg-amber-100/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Plus size={15} />
                      <span>+ Agregar 3er Período (C)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

        </div>

        {/* Location Floor Filter Pills */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <MapPin size={13} /> Nivel:
          </span>
          {(['Todos', 'Planta Baja', 'Mezzanina'] as const).map((loc) => {
            const isActive = selectedLocation === loc;
            return (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer active:scale-95 ${
                  isActive 
                    ? 'bg-brand-blue text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {loc === 'Todos' ? 'Todos (10 salones)' : loc === 'Planta Baja' ? 'Planta Baja (4)' : 'Mezzanina (6)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modo Pro Executive Summary & Automatic Insights */}
      {isProMode && executiveSummary && executiveSummary.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-orange-50/30 p-4 sm:p-5 rounded-2xl border border-amber-200/80 shadow-2xs mb-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center font-bold shadow-2xs">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Resumen
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Conclusiones clave basadas en la actividad de {primaryLabel} {(enableComparison || isProMode) ? `vs ${compLabel}` : ''} {periodC ? `y ${cLabel}` : ''}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/60 px-2.5 py-1 rounded-full">
              Insights Automáticos ⚡
            </span>
          </div>

          {/* Grid of short, clear insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {executiveSummary.map(item => (
              <div key={item.id} className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className="text-base">{item.icon}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-snug mb-1">
                    {item.title}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-normal mt-1">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
        
        {/* Card 1: Reservas Confirmadas */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-brand-blue rounded-xl flex items-center justify-center">
              <CalendarIcon size={18} />
            </div>
            {deltaConfirmed && (
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                deltaConfirmed.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {deltaConfirmed.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {deltaConfirmed.diff >= 0 ? `+${deltaConfirmed.diff}` : deltaConfirmed.diff}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Reservas Confirmadas
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl sm:text-3xl font-display font-bold text-brand-blue">{primaryData.confirmedCount}</span>
              {primaryData.preReservationCount > 0 && (
                <span className="text-[11px] sm:text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  +{primaryData.preReservationCount} pre-reservas
                </span>
              )}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium flex items-center justify-between flex-wrap gap-1">
              <span>Total apartados: <strong className="text-slate-600 font-bold">{primaryData.totalCount}</strong></span>
              {(enableComparison || isProMode) && isComparisonAllowed && (
                <span>vs {compData.confirmedCount} en {compLabel}</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Top Espacio */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-50 text-brand-orange rounded-xl flex items-center justify-center mb-2 sm:mb-3">
            <Award size={18} />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Top Espacio</span>
            <span className="text-xs sm:text-base font-display font-bold text-brand-blue leading-tight truncate block" title={primaryData.topRoomName}>
              {primaryData.topRoomName}
            </span>
            {primaryData.topRoomLocation && (
              <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 block mt-0.5">{primaryData.topRoomLocation}</span>
            )}
          </div>
        </div>

        {/* Card 3: Valor Total Reservas */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <DollarSign size={18} />
            </div>
            {deltaCost && (
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                deltaCost.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {deltaCost.pct >= 0 ? `+${deltaCost.pct}%` : `${deltaCost.pct}%`}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Monto Reservado</span>
            <span className="text-xl sm:text-2xl font-display font-bold text-emerald-700">${primaryData.totalCostSum.toFixed(2)}</span>
            <div className="text-[10px] text-slate-500 mt-0.5 flex flex-col gap-0.5">
              <span>Cobrado: <strong className="text-slate-700 font-semibold">${primaryData.totalPaidSum.toFixed(2)}</strong></span>
              <span>Pendiente: <strong className="text-amber-700 font-semibold">${primaryData.pendingSum.toFixed(2)}</strong></span>
              {primaryData.uncountedBsCount > 0 && (
                <span className="text-[9px] text-amber-600 font-medium leading-tight">
                  * {primaryData.uncountedBsCount} abono(s) en Bs pendientes por tasa
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Asistentes Estimados */}
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Users size={18} />
            </div>
            {deltaAttendees && (
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                deltaAttendees.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {deltaAttendees.pct >= 0 ? `+${deltaAttendees.pct}%` : `${deltaAttendees.pct}%`}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Asistentes Est.</span>
            <span className="text-xl sm:text-3xl font-display font-bold text-brand-blue">{primaryData.totalAttendees}</span>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {(selectedLocation === 'Todos' || selectedLocation === 'Planta Baja') && (
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                  PB: {primaryData.pbCount}
                </span>
              )}
              {(selectedLocation === 'Todos' || selectedLocation === 'Mezzanina') && (
                <span className="text-[9px] sm:text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                  Mezz: {primaryData.mezzCount}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* REPORTES PRIVADOS DE INGRESOS Y COMISIONES (ADMINISTRADOR) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm mb-8 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="p-1.5 bg-brand-blue/10 text-brand-blue rounded-lg">
                <Receipt size={18} />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-brand-blue">
                Reportes Privados de Ingresos & Liquidación de Comisiones
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} /> Confidencial Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Cálculo de comisiones comerciales (25% sobre el valor cotizado <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">totalCost</code>) en {primaryLabel}.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyCommissionsSummary}
              className="px-3.5 py-2 min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Copiar desglose completo para compartir por WhatsApp"
            >
              {isCopiedCommissions ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              <span>
                {isCopiedCommissions 
                  ? '¡Copiado al portapapeles!' 
                  : selectedAdvisorFilter === 'Todos' 
                  ? 'Copiar Liquidación' 
                  : `Copiar Liquidación (${selectedAdvisorFilter})`}
              </span>
            </button>
          </div>
        </div>

        {/* 4 Filter Tabs: Todos, Juan, Laura, Yoanelis */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Filtrar Vista del Reporte:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              {(['Todos', 'Juan', 'Laura', 'Yoanelis'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedAdvisorFilter(tab)}
                  className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedAdvisorFilter === tab
                      ? 'bg-brand-blue text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    selectedAdvisorFilter === tab
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab === 'Todos' ? commissionReport.detailedList.length 
                      : tab === 'Juan' ? commissionReport.juan.count 
                      : tab === 'Laura' ? commissionReport.laura.count 
                      : commissionReport.yoanelis.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Vista activa: <strong className="text-brand-blue">{selectedAdvisorFilter === 'Todos' ? 'Equipo Completo' : `Asesor: ${selectedAdvisorFilter}`}</strong>
            </span>
          </div>
        </div>

        {/* 4 Reactive Summary Cards (Dynamically adapted to the active filter) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {selectedAdvisorFilter === 'Todos' && (
            <>
              {/* Card 1: Ingresos Totales de Reservas */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Total Reservas Facturado
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-brand-blue font-mono">
                    ${commissionReport.totalGross.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {primaryEvents.length} reserva{primaryEvents.length === 1 ? '' : 's'} comercial{primaryEvents.length === 1 ? '' : 'es'} en total
                  </p>
                </div>
              </div>

              {/* Card 2: Comisión Laura */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/70 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                    Comisión Laura (25%)
                  </span>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100/90 px-1.5 py-0.5 rounded">
                    {commissionReport.laura.count} res.
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-purple-900 font-mono">
                    ${commissionReport.laura.commission.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-purple-700/80 mt-0.5 font-medium">
                    Sobre ${commissionReport.laura.gross.toFixed(2)} facturados
                  </p>
                </div>
              </div>

              {/* Card 3: Comisión Yoanelis */}
              <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/70 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                    Comisión Yoanelis (25%)
                  </span>
                  <span className="text-[10px] font-bold text-purple-800 bg-purple-100/90 px-1.5 py-0.5 rounded">
                    {commissionReport.yoanelis.count} res.
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-purple-900 font-mono">
                    ${commissionReport.yoanelis.commission.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-purple-700/80 mt-0.5 font-medium">
                    Sobre ${commissionReport.yoanelis.gross.toFixed(2)} facturados
                  </p>
                </div>
              </div>

              {/* Card 4: Restante Neto para Zona Coworking */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950">
                    Margen Neto Coworking
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    {dynamicCoworkingMarginPct}% margen
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-emerald-900 font-mono">
                    ${commissionReport.totalCoworkingNet.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 font-medium">
                    Tras deducir ${commissionReport.totalCommissions.toFixed(2)} en comisiones sobre ${commissionReport.totalGross.toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}

          {selectedAdvisorFilter === 'Laura' && (
            <>
              {/* Card 1: Monto Facturado Laura */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                  Total Facturado por Laura
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-purple-900 font-mono">
                    ${commissionReport.laura.gross.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-purple-700 mt-0.5 font-medium">
                    {commissionReport.laura.count} reserva{commissionReport.laura.count === 1 ? '' : 's'} comercial{commissionReport.laura.count === 1 ? '' : 'es'}
                  </p>
                </div>
              </div>

              {/* Card 2: Porcentaje de Comisión */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Porcentaje de Comisión
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-slate-800 font-mono">
                    25.0%
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Calculado sobre totalCost
                  </p>
                </div>
              </div>

              {/* Card 3: Comisión a Liquidar a Laura */}
              <div className="p-4 rounded-xl bg-purple-100/80 border border-purple-300 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-950">
                    Comisión a Pagar a Laura
                  </span>
                  <span className="text-[10px] font-bold text-purple-900 bg-white/80 px-1.5 py-0.5 rounded">
                    25%
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-purple-950 font-mono">
                    ${commissionReport.laura.commission.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-purple-800 mt-0.5 font-medium">
                    25% de ${commissionReport.laura.gross.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Card 4: Margen Coworking (75%) */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950">
                    Ingreso Coworking (75%)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Restante
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-emerald-900 font-mono">
                    ${commissionReport.laura.net.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 font-medium">
                    75% neto para Zona Coworking
                  </p>
                </div>
              </div>
            </>
          )}

          {selectedAdvisorFilter === 'Yoanelis' && (
            <>
              {/* Card 1: Monto Facturado Yoanelis */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                  Total Facturado por Yoanelis
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-purple-900 font-mono">
                    ${commissionReport.yoanelis.gross.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-purple-700 mt-0.5 font-medium">
                    {commissionReport.yoanelis.count} reserva{commissionReport.yoanelis.count === 1 ? '' : 's'} comercial{commissionReport.yoanelis.count === 1 ? '' : 'es'}
                  </p>
                </div>
              </div>

              {/* Card 2: Porcentaje de Comisión */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Porcentaje de Comisión
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-slate-800 font-mono">
                    25.0%
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Calculado sobre totalCost
                  </p>
                </div>
              </div>

              {/* Card 3: Comisión a Liquidar a Yoanelis */}
              <div className="p-4 rounded-xl bg-purple-100/80 border border-purple-300 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-950">
                    Comisión a Pagar a Yoanelis
                  </span>
                  <span className="text-[10px] font-bold text-purple-900 bg-white/80 px-1.5 py-0.5 rounded">
                    25%
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-purple-950 font-mono">
                    ${commissionReport.yoanelis.commission.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-purple-800 mt-0.5 font-medium">
                    25% de ${commissionReport.yoanelis.gross.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Card 4: Margen Coworking (75%) */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950">
                    Ingreso Coworking (75%)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Restante
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-emerald-900 font-mono">
                    ${commissionReport.yoanelis.net.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 font-medium">
                    75% neto para Zona Coworking
                  </p>
                </div>
              </div>
            </>
          )}

          {selectedAdvisorFilter === 'Juan' && (
            <>
              {/* Card 1: Monto Facturado Juan */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-blue">
                  Total Facturado por Juan
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-brand-blue font-mono">
                    ${commissionReport.juan.gross.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    {commissionReport.juan.count} reserva{commissionReport.juan.count === 1 ? '' : 's'} directa{commissionReport.juan.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {/* Card 2: Porcentaje de Comisión */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Porcentaje de Comisión
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-slate-800 font-mono">
                    0.0%
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Asesor Comercial / Director
                  </p>
                </div>
              </div>

              {/* Card 3: Comisión */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Comisión a Pagar
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                    Directo
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-slate-700 font-mono">
                    $0.00
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Sin intermediación externa
                  </p>
                </div>
              </div>

              {/* Card 4: Margen Coworking (100%) */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950">
                    Margen Coworking (100%)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Íntegro
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-emerald-900 font-mono">
                    ${commissionReport.juan.net.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 font-medium">
                    100% de margen para Zona Coworking
                  </p>
                </div>
              </div>
            </>
          )}

          {selectedAdvisorFilter === 'Directo' && (
            <>
              {/* Card 1: Monto Facturado Directo */}
              <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                  Total Facturado Directo
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-slate-900 font-mono">
                    ${commissionReport.direct.gross.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    {commissionReport.direct.count} reserva{commissionReport.direct.count === 1 ? '' : 's'} comercial{commissionReport.direct.count === 1 ? '' : 'es'}
                  </p>
                </div>
              </div>

              {/* Card 2: Porcentaje de Comisión */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Porcentaje de Comisión
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-slate-800 font-mono">
                    0.0%
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    Sin intermediación de asesor
                  </p>
                </div>
              </div>

              {/* Card 3: Comisión */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Comisión a Pagar
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                    Directo
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-slate-700 font-mono">
                    $0.00
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    100% de la venta para la empresa
                  </p>
                </div>
              </div>

              {/* Card 4: Margen Coworking (100%) */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950">
                    Margen Coworking (100%)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Íntegro
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-display font-bold text-emerald-900 font-mono">
                    ${commissionReport.direct.net.toFixed(2)}
                  </span>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5 font-medium">
                    100% de margen para Zona Coworking
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Visual Revenue Share Bar by Advisor */}
        {commissionReport.totalGross > 0 && (
          <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <BarChart2 size={15} className="text-brand-blue" />
                <span>Participación de Facturación por Asesor ({primaryLabel})</span>
              </span>
              <span className="text-slate-500 text-[11px]">
                Total: <strong className="font-mono text-slate-800">${commissionReport.totalGross.toFixed(2)}</strong>
              </span>
            </div>

            {/* Segmented bar */}
            <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
              {commissionReport.juan.gross > 0 && (
                <div 
                  style={{ width: `${(commissionReport.juan.gross / commissionReport.totalGross) * 100}%` }}
                  className="bg-brand-blue h-full transition-all"
                  title={`Juan: $${commissionReport.juan.gross.toFixed(2)} (${Math.round((commissionReport.juan.gross / commissionReport.totalGross) * 100)}%)`}
                />
              )}
              {commissionReport.laura.gross > 0 && (
                <div 
                  style={{ width: `${(commissionReport.laura.gross / commissionReport.totalGross) * 100}%` }}
                  className="bg-purple-600 h-full transition-all"
                  title={`Laura: $${commissionReport.laura.gross.toFixed(2)} (${Math.round((commissionReport.laura.gross / commissionReport.totalGross) * 100)}%)`}
                />
              )}
              {commissionReport.yoanelis.gross > 0 && (
                <div 
                  style={{ width: `${(commissionReport.yoanelis.gross / commissionReport.totalGross) * 100}%` }}
                  className="bg-purple-400 h-full transition-all"
                  title={`Yoanelis: $${commissionReport.yoanelis.gross.toFixed(2)} (${Math.round((commissionReport.yoanelis.gross / commissionReport.totalGross) * 100)}%)`}
                />
              )}
              {commissionReport.direct.gross > 0 && (
                <div 
                  style={{ width: `${(commissionReport.direct.gross / commissionReport.totalGross) * 100}%` }}
                  className="bg-slate-400 h-full transition-all"
                  title={`Directo: $${commissionReport.direct.gross.toFixed(2)} (${Math.round((commissionReport.direct.gross / commissionReport.totalGross) * 100)}%)`}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] pt-1">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue inline-block"></span>
                <span>Juan: <strong className="font-mono">${commissionReport.juan.gross.toFixed(2)}</strong> ({commissionReport.totalGross > 0 ? Math.round((commissionReport.juan.gross / commissionReport.totalGross) * 100) : 0}%)</span>
              </span>
              <span className="flex items-center gap-1.5 text-purple-900">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
                <span>Laura: <strong className="font-mono">${commissionReport.laura.gross.toFixed(2)}</strong> ({commissionReport.totalGross > 0 ? Math.round((commissionReport.laura.gross / commissionReport.totalGross) * 100) : 0}%)</span>
              </span>
              <span className="flex items-center gap-1.5 text-purple-700">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block"></span>
                <span>Yoanelis: <strong className="font-mono">${commissionReport.yoanelis.gross.toFixed(2)}</strong> ({commissionReport.totalGross > 0 ? Math.round((commissionReport.yoanelis.gross / commissionReport.totalGross) * 100) : 0}%)</span>
              </span>
              {commissionReport.direct.gross > 0 && (
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                  <span>Directo: <strong className="font-mono">${commissionReport.direct.gross.toFixed(2)}</strong> ({commissionReport.totalGross > 0 ? Math.round((commissionReport.direct.gross / commissionReport.totalGross) * 100) : 0}%)</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Breakdown by Advisor & Direct Reservations Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck size={14} className="text-brand-blue" />
              <span>ASESORES</span>
            </span>
            {selectedAdvisorFilter !== 'Todos' && (
              <button
                onClick={() => setSelectedAdvisorFilter('Todos')}
                className="text-[11px] font-bold text-brand-blue hover:underline cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>

          {/* 3 ASESORES COMERCIALES (PERSONAS) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Juan */}
            <div 
              onClick={() => setSelectedAdvisorFilter('Juan')}
              className={`p-4 rounded-xl border transition-all space-y-3 cursor-pointer ${
                selectedAdvisorFilter === 'Juan'
                  ? 'border-brand-blue ring-2 ring-brand-blue/30 bg-blue-50/30 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-brand-blue font-bold flex items-center justify-center text-xs">
                    J
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Juan</h4>
                    <span className="text-[10px] text-brand-blue font-semibold">Asesor Comercial (0%)</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-brand-blue bg-blue-50 px-2 py-0.5 rounded-md">
                  {commissionReport.juan.count} reserva{commissionReport.juan.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Monto Facturado:</span>
                  <strong className="font-mono text-slate-800">${commissionReport.juan.gross.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Comisión:</span>
                  <strong className="font-mono text-slate-500">$0.00 (0%)</strong>
                </div>
                <div className="flex justify-between text-emerald-800 border-t border-slate-100 pt-1.5 font-bold">
                  <span>Margen Coworking (100%):</span>
                  <strong className="font-mono">${commissionReport.juan.net.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Laura */}
            <div 
              onClick={() => setSelectedAdvisorFilter('Laura')}
              className={`p-4 rounded-xl border transition-all space-y-3 cursor-pointer ${
                selectedAdvisorFilter === 'Laura'
                  ? 'border-purple-600 ring-2 ring-purple-500/30 bg-purple-50/30 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                    L
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Laura</h4>
                    <span className="text-[10px] text-purple-700 font-semibold">Asesora Comercial (25%)</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md">
                  {commissionReport.laura.count} reserva{commissionReport.laura.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Monto Facturado:</span>
                  <strong className="font-mono text-slate-800">${commissionReport.laura.gross.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-purple-900 font-semibold">
                  <span>Comisión a Pagar (25%):</span>
                  <strong className="font-mono text-purple-900">${commissionReport.laura.commission.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-emerald-800 border-t border-slate-100 pt-1.5 font-bold">
                  <span>Ingreso Coworking (75%):</span>
                  <strong className="font-mono">${commissionReport.laura.net.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* Yoanelis */}
            <div 
              onClick={() => setSelectedAdvisorFilter('Yoanelis')}
              className={`p-4 rounded-xl border transition-all space-y-3 cursor-pointer ${
                selectedAdvisorFilter === 'Yoanelis'
                  ? 'border-purple-600 ring-2 ring-purple-500/30 bg-purple-50/30 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-xs">
                    Y
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Yoanelis</h4>
                    <span className="text-[10px] text-purple-700 font-semibold">Asesora Comercial (25%)</span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md">
                  {commissionReport.yoanelis.count} reserva{commissionReport.yoanelis.count === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Monto Facturado:</span>
                  <strong className="font-mono text-slate-800">${commissionReport.yoanelis.gross.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-purple-900 font-semibold">
                  <span>Comisión a Pagar (25%):</span>
                  <strong className="font-mono text-purple-900">${commissionReport.yoanelis.commission.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-emerald-800 border-t border-slate-100 pt-1.5 font-bold">
                  <span>Ingreso Coworking (75%):</span>
                  <strong className="font-mono">${commissionReport.yoanelis.net.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* OTRAS RESERVAS: Directo / Zona Coworking (Diferenciada visualmente como procedencia directa de la empresa) */}
          {commissionReport.direct.count > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={14} className="text-slate-500" />
                <span>OTRAS RESERVAS</span>
              </span>
              <div 
                onClick={() => setSelectedAdvisorFilter(selectedAdvisorFilter === 'Directo' ? 'Todos' : 'Directo')}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                  selectedAdvisorFilter === 'Directo'
                    ? 'border-slate-500 ring-2 ring-slate-400/30 bg-slate-100 shadow-xs'
                    : 'border-slate-200 bg-slate-50/90 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Directo / Zona Coworking</h4>
                      <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        Procedencia Directa (Sin Asesor)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Reservas comerciales contratadas directamente con la empresa (100% margen Zona Coworking)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-5 shrink-0 self-end sm:self-center font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Reservas</span>
                    <span className="font-bold text-slate-700">{commissionReport.direct.count}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Facturado</span>
                    <span className="font-bold text-slate-800">${commissionReport.direct.gross.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-sans">Comisión</span>
                    <span className="font-bold text-slate-500">$0.00 (0%)</span>
                  </div>
                  <div className="text-right pl-2 border-l border-slate-200">
                    <span className="text-[10px] text-emerald-800 block font-sans font-bold">Margen Coworking</span>
                    <span className="font-bold text-emerald-800">${commissionReport.direct.net.toFixed(2)} (100%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Table Section */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Detalle de Reservas: {selectedAdvisorFilter === 'Todos' ? 'Todas las reservas del período' : selectedAdvisorFilter === 'Directo' ? 'Directo / Zona Coworking (Sin Asesor)' : `Asignadas a ${selectedAdvisorFilter}`} ({filteredCommissionList.length})</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Atribución individual, costo total pactado y comisión calculada en base a totalCost
              </p>
            </div>
          </div>

          {filteredCommissionList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/60 text-slate-500 text-xs font-medium">
              No hay reservas comerciales para el filtro seleccionado en este período.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cliente / Evento</th>
                    <th className="px-4 py-3">Espacio</th>
                    <th className="px-4 py-3 text-right">Costo Total</th>
                    <th className="px-4 py-3 text-center">Asesor</th>
                    <th className="px-4 py-3 text-right">Comisión</th>
                    <th className="px-4 py-3 text-right">Neto Coworking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredCommissionList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                        {item.date}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.clientName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{item.eventName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {item.roomName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${item.totalCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.advisorName === 'Laura' || item.advisorName === 'Yoanelis'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : item.advisorName === 'Juan'
                            ? 'bg-blue-100 text-brand-blue border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {item.advisorName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                        {item.commissionAmount > 0 ? (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            ${item.commissionAmount.toFixed(2)} (25%)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">$0.00</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                        ${item.netForCoworking.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {isProMode && (
        <div className="space-y-6 mb-8 animate-in fade-in duration-300">
          
          {/* Pro Section 1: Multi-Period Comparison Table */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity size={18} className="text-amber-500" />
                  <span>Tabla de Comparación Multiperíodo</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Resumen comparativo de las métricas clave en los períodos seleccionados
                </p>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                {!isComparisonAllowed ? 'Modo Histórico' : periodC ? '3 Períodos comparados' : '2 Períodos comparados'}
              </span>
            </div>

            {/* Responsive Table Container */}
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[550px] text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Métrica</th>
                    <th className="px-4 py-3 bg-blue-50/50 text-brand-blue font-bold">A: {primaryLabel}</th>
                    <th className="px-4 py-3 bg-amber-50/50 text-amber-900 font-bold">B: {compLabel}</th>
                    {periodC && <th className="px-4 py-3 bg-purple-50/50 text-purple-900 font-bold">C: {cLabel}</th>}
                    <th className="px-4 py-3 text-right">Variación (A vs B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                  {/* Row 1: Reservas Confirmadas */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon size={14} className="text-brand-blue" /> Reservas Confirmadas
                    </td>
                    <td className="px-4 py-3 bg-blue-50/20 font-bold text-brand-blue">
                      {primaryData.confirmedCount}
                    </td>
                    <td className="px-4 py-3 bg-amber-50/20 text-amber-950 font-bold">
                      {compData.confirmedCount}
                    </td>
                    {periodC && (
                      <td className="px-4 py-3 bg-purple-50/20 text-purple-950 font-bold">
                        {cData.confirmedCount}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {deltaConfirmed ? (
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                          deltaConfirmed.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {deltaConfirmed.diff >= 0 ? `+${deltaConfirmed.diff}` : deltaConfirmed.diff} ({deltaConfirmed.pct >= 0 ? '+' : ''}{deltaConfirmed.pct}%)
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>

                  {/* Row 1b: Total Apartados (con pre-reservas) */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <CalendarIcon size={14} className="text-amber-600" /> Total Apartados (con pre-reservas)
                    </td>
                    <td className="px-4 py-3 bg-blue-50/20 text-slate-700">
                      {primaryData.totalCount}
                      {primaryData.preReservationCount > 0 && (
                        <span className="ml-1.5 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                          +{primaryData.preReservationCount} pre
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 bg-amber-50/20 text-slate-700">
                      {compData.totalCount}
                      {compData.preReservationCount > 0 && (
                        <span className="ml-1.5 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                          +{compData.preReservationCount} pre
                        </span>
                      )}
                    </td>
                    {periodC && (
                      <td className="px-4 py-3 bg-purple-50/20 text-slate-700">
                        {cData.totalCount}
                        {cData.preReservationCount > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                            +{cData.preReservationCount} pre
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {deltaTotalApartados ? (
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                          deltaTotalApartados.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {deltaTotalApartados.diff >= 0 ? `+${deltaTotalApartados.diff}` : deltaTotalApartados.diff} ({deltaTotalApartados.pct >= 0 ? '+' : ''}{deltaTotalApartados.pct}%)
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>

                  {/* Row 2: Asistencia */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <Users size={14} className="text-purple-600" /> Asistencia Estimada
                    </td>
                    <td className="px-4 py-3 bg-blue-50/20 font-bold text-brand-blue">{primaryData.totalAttendees} pers.</td>
                    <td className="px-4 py-3 bg-amber-50/20 text-amber-950">{compData.totalAttendees} pers.</td>
                    {periodC && <td className="px-4 py-3 bg-purple-50/20 text-purple-950">{cData.totalAttendees} pers.</td>}
                    <td className="px-4 py-3 text-right">
                      {deltaAttendees ? (
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                          deltaAttendees.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {deltaAttendees.diff >= 0 ? `+${deltaAttendees.diff}` : deltaAttendees.diff} ({deltaAttendees.pct >= 0 ? '+' : ''}{deltaAttendees.pct}%)
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>

                  {/* Row 3: Monto Reservado */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign size={14} className="text-emerald-600" /> Monto Reservado
                    </td>
                    <td className="px-4 py-3 bg-blue-50/20 font-bold text-emerald-700">${primaryData.totalCostSum.toFixed(2)}</td>
                    <td className="px-4 py-3 bg-amber-50/20 text-amber-950">${compData.totalCostSum.toFixed(2)}</td>
                    {periodC && <td className="px-4 py-3 bg-purple-50/20 text-purple-950">${cData.totalCostSum.toFixed(2)}</td>}
                    <td className="px-4 py-3 text-right">
                      {deltaCost ? (
                        <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                          deltaCost.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {deltaCost.pct >= 0 ? `+${deltaCost.pct}%` : `${deltaCost.pct}%`}
                        </span>
                      ) : 'N/A'}
                    </td>
                  </tr>

                  {/* Row 4: Total Recaudado */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign size={14} className="text-blue-600" /> Total Recaudado
                    </td>
                    <td className="px-4 py-3 bg-blue-50/20 font-bold text-brand-blue">${primaryData.totalPaidSum.toFixed(2)}</td>
                    <td className="px-4 py-3 bg-amber-50/20 text-amber-950">${compData.totalPaidSum.toFixed(2)}</td>
                    {periodC && <td className="px-4 py-3 bg-purple-50/20 text-purple-950">${cData.totalPaidSum.toFixed(2)}</td>}
                    <td className="px-4 py-3 text-right text-slate-500 font-normal">
                      ${(primaryData.totalPaidSum - compData.totalPaidSum).toFixed(2)}
                    </td>
                  </tr>

                  {/* Row 5: Pendiente por Cobrar */}
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign size={14} className="text-amber-600" /> Pendiente por Cobrar
                    </td>
                    <td className="px-4 py-3 bg-blue-50/20 font-bold text-amber-700">${primaryData.pendingSum.toFixed(2)}</td>
                    <td className="px-4 py-3 bg-amber-50/20 text-amber-950">${compData.pendingSum.toFixed(2)}</td>
                    {periodC && <td className="px-4 py-3 bg-purple-50/20 text-purple-950">${cData.pendingSum.toFixed(2)}</td>}
                    <td className="px-4 py-3 text-right text-slate-500 font-normal">
                      ${(primaryData.pendingSum - compData.pendingSum).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pro Section 2: Historical Trend Analysis Chart */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-brand-blue flex items-center gap-2">
                  <TrendingUp size={18} className="text-brand-orange" />
                  <span>Evolución Histórica y Tendencia Mensual</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Comportamiento a lo largo de los últimos meses grabados en agenda
                </p>
              </div>

              {/* Selector for Trend Metric */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setTrendMetric('reservas')}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    trendMetric === 'reservas' ? 'bg-brand-blue text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📊 Reservas
                </button>
                <button
                  onClick={() => setTrendMetric('ingresos')}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    trendMetric === 'ingresos' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💰 Ingresos ($)
                </button>
                <button
                  onClick={() => setTrendMetric('asistencia')}
                  className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    trendMetric === 'asistencia' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👥 Asistentes
                </button>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer key={`trend-container-${trendMetric}`} width="100%" height="100%">
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <p className="font-bold text-brand-orange">{data.fullLabel}</p>
                            <p className="text-slate-200">Reservas confirmadas: <strong className="text-white">{data.reservas}</strong></p>
                            {data.totalApartados !== data.reservas && (
                              <p className="text-slate-400 text-[11px]">Total apartados: {data.totalApartados}</p>
                            )}
                            <p className="text-slate-200">Monto reservado: <strong className="text-emerald-400">${data.ingresos.toFixed(2)}</strong></p>
                            <p className="text-slate-200">Asistentes: <strong className="text-purple-300">{data.asistencia} pers.</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={trendMetric} 
                    name={trendMetric === 'reservas' ? 'Reservas (Confirmadas)' : trendMetric === 'ingresos' ? 'Ingresos ($)' : 'Asistentes'}
                    stroke={trendMetric === 'reservas' ? '#1A365D' : trendMetric === 'ingresos' ? '#059669' : '#7C3AED'} 
                    strokeWidth={3} 
                    dot={{ fill: '#FF9305', strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Chart 1: Apartados por Espacio */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-brand-blue">Apartados por Espacio</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {primaryLabel} {(enableComparison || isProMode) && isComparisonAllowed ? `vs ${compLabel}` : ''} {isProMode && periodC && isComparisonAllowed ? `y ${cLabel}` : ''}
              </p>
            </div>
            {(enableComparison || isProMode) && isComparisonAllowed && (
              <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                <span className="flex items-center gap-1 text-brand-blue">
                  <span className="w-3 h-3 rounded-xs bg-brand-blue inline-block"></span> {primaryLabel}
                </span>
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block"></span> {compLabel}
                </span>
                {isProMode && periodC && (
                  <span className="flex items-center gap-1 text-purple-600">
                    <span className="w-3 h-3 rounded-xs bg-purple-500 inline-block"></span> {cLabel}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <div style={{ height: `${chartHeight}px` }} className="w-full min-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={distributionData} 
                  layout="vertical" 
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="shortName" 
                    type="category" 
                    width={100} 
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
                            <p className="font-bold text-sm text-brand-orange">{data.fullName}</p>
                            <p className="text-slate-300">📍 Ubicación: <span className="text-white font-medium">{data.location}</span></p>
                            <p className="text-slate-300">📐 Dimensiones: <span className="text-white font-medium">{data.area} m²</span></p>
                            <p className="text-slate-300">👥 Capacidad: <span className="text-white font-medium">{data.capacity} pers.</span></p>
                            <div className="pt-1.5 border-t border-slate-800 space-y-0.5">
                              <p className="text-brand-orange font-bold">
                                {primaryLabel}: {data.primaryCount} apartados
                              </p>
                              {(enableComparison || isProMode) && isComparisonAllowed && (
                                <p className="text-amber-400 font-bold">
                                  {compLabel}: {data.compCount} apartados
                                </p>
                              )}
                              {isProMode && periodC && isComparisonAllowed && (
                                <p className="text-purple-300 font-bold">
                                  {cLabel}: {data.c3Count} apartados
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="primaryCount" name={primaryLabel} radius={[0, 6, 6, 0]} barSize={(enableComparison || isProMode) && isComparisonAllowed ? 10 : 18}>
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(enableComparison || isProMode) && isComparisonAllowed ? '#1A365D' : entry.color} />
                    ))}
                  </Bar>
                  {(enableComparison || isProMode) && isComparisonAllowed && (
                    <Bar dataKey="compCount" name={compLabel} fill="#F59E0B" radius={[0, 6, 6, 0]} barSize={10} />
                  )}
                  {isProMode && periodC && isComparisonAllowed && (
                    <Bar dataKey="c3Count" name={cLabel} fill="#8B5CF6" radius={[0, 6, 6, 0]} barSize={10} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Peak Hours Line Chart */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-brand-blue mb-0.5">Horas de Mayor Demanda</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mb-4">
              Comparativa de horas de inicio ({primaryLabel} {(enableComparison || isProMode) && isComparisonAllowed ? `vs ${compLabel}` : ''})
            </p>
            <div className="h-56 sm:h-72">
              <ResponsiveContainer key={`peak-container-${primaryLabel}-${compLabel}-${cLabel}`} width="100%" height="100%">
                <LineChart data={peakHoursData.data} margin={{ top: 10, right: 10, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hora" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="primaryEventos" 
                    name={primaryLabel}
                    stroke="#1A365D" 
                    strokeWidth={3} 
                    dot={{ fill: '#1A365D', strokeWidth: 2, r: 3 }} 
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                  {(enableComparison || isProMode) && isComparisonAllowed && (
                    <Line 
                      type="monotone" 
                      dataKey="compEventos" 
                      name={compLabel}
                      stroke="#F59E0B" 
                      strokeWidth={2} 
                      strokeDasharray="4 4"
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                      isAnimationActive={false}
                      connectNulls={true}
                    />
                  )}
                  {isProMode && periodC && isComparisonAllowed && (
                    <Line 
                      type="monotone" 
                      dataKey="c3Eventos" 
                      name={cLabel}
                      stroke="#8B5CF6" 
                      strokeWidth={2} 
                      strokeDasharray="2 2"
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                      isAnimationActive={false}
                      connectNulls={true}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Rango operativo analizado:</span>
            <span className="font-bold text-slate-700">07:00 - 21:00</span>
          </div>
        </div>

      </div>

      {/* Detailed Room Ranking & Breakdown List */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-brand-blue flex items-center gap-2">
              <span>Desglose Detallado por Espacio</span>
              {isProMode && <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md">Análisis Dinámico Pro</span>}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Listado dinámicamente ordenado por nivel de ocupación real en {primaryLabel}
            </p>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-brand-orange bg-orange-50 px-2.5 py-1 rounded-full">
            Ranking: {primaryLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {rankedRooms.map((room, idx) => {
            const percentage = maxReservas > 0 ? Math.round((room.reservas / maxReservas) * 100) : 0;
            const compCountForRoom = compData.roomCounts[room.id] || 0;
            const diffForRoom = room.reservas - compCountForRoom;

            // Pro mode room growth trend calculation
            let trendBadge = null;
            if (isProMode) {
              if (compCountForRoom === 0 && room.reservas > 0) {
                trendBadge = (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <TrendingUp size={11} /> Crecimiento (Nuevo)
                  </span>
                );
              } else if (diffForRoom > 0) {
                const pctGrowth = compCountForRoom > 0 ? Math.round((diffForRoom / compCountForRoom) * 100) : 100;
                trendBadge = (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <TrendingUp size={11} /> ↑ +{diffForRoom} (+{pctGrowth}%)
                  </span>
                );
              } else if (diffForRoom < 0) {
                const pctDrop = compCountForRoom > 0 ? Math.round((Math.abs(diffForRoom) / compCountForRoom) * 100) : 0;
                trendBadge = (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <TrendingDown size={11} /> ↓ {diffForRoom} (-{pctDrop}%)
                  </span>
                );
              } else {
                trendBadge = (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    → Estable
                  </span>
                );
              }
            }

            return (
              <div 
                key={room.id}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 border border-slate-100/80 hover:border-slate-200 transition-all flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-md bg-slate-200/80 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: room.dotColor }} />
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm truncate">{room.name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
                        <span className="font-semibold text-brand-blue/80">{room.location}</span>
                        <span>•</span>
                        <span>{room.area} m²</span>
                        <span>•</span>
                        <span>Máx {room.capacity} p.</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-sm sm:text-base font-bold font-mono text-brand-blue">{room.reservas}</span>
                      {(enableComparison || isProMode) && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          diffForRoom >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {diffForRoom >= 0 ? `+${diffForRoom}` : diffForRoom}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium">
                      reservas {(enableComparison || isProMode) ? `(vs ${compCountForRoom} en ${compLabel})` : ''}
                    </span>
                  </div>
                </div>

                {/* Pro Mode badge if enabled */}
                {isProMode && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 text-[10px]">
                    <span className="text-slate-500 font-medium">Tendencia vs {compLabel}:</span>
                    {trendBadge}
                  </div>
                )}

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 h-1.5 sm:h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.max(percentage, 3)}%`,
                      backgroundColor: room.dotColor 
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
