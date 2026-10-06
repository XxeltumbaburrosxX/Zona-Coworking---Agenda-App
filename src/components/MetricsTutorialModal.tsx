import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, BarChart2, Calendar, ArrowRightLeft, UserCheck, 
  Receipt, TrendingUp, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, Check, Building2
} from 'lucide-react';

interface MetricsTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export const MetricsTutorialModal: React.FC<MetricsTutorialModalProps> = ({ 
  isOpen, 
  onClose,
  userEmail
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = userEmail ? `tutorial_metrics_seen_${userEmail.toLowerCase().trim()}` : 'tutorial_metrics_seen_admin';

  const handleFinish = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // storage fallback
    }
    onClose();
  };

  const steps = [
    {
      stepNumber: 1,
      badge: "Métricas 1 de 6",
      tag: "Vista General",
      icon: <BarChart2 className="w-8 h-8 text-brand-blue" />,
      title: "Aquí puedes revisar cómo evoluciona Zona Coworking",
      description: "De un vistazo podrás consultar reservas, ingresos, pagos y saldos, comisiones de tu equipo, información por asesor y la evolución por período.",
      graphic: (
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Reservas</span>
              <span className="text-base font-extrabold text-brand-blue">Total Actividad</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Facturación</span>
              <span className="text-base font-extrabold text-emerald-800">$ Ingresos</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Cobros</span>
              <span className="text-base font-extrabold text-amber-800">Saldos & Abonos</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Margen</span>
              <span className="text-base font-extrabold text-purple-900">% Coworking</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center font-medium">
            Toda la información económica y comercial consolidada en un solo lugar.
          </p>
        </div>
      )
    },
    {
      stepNumber: 2,
      badge: "Métricas 2 de 6",
      tag: "Filtro Temporal",
      icon: <Calendar className="w-8 h-8 text-brand-blue" />,
      title: "Selecciona el período que quieres analizar",
      description: "Puedes consultar mes a mes, ver el año en curso o revisar el Histórico Completo de la empresa. Todas las tarjetas y gráficas se actualizan al instante.",
      graphic: (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-center gap-1.5 font-bold">
            <span className="px-3 py-1.5 bg-brand-blue text-white rounded-xl shadow-2xs">
              Mes actual (ej. Agosto)
            </span>
            <span className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-2xs">
              Meses anteriores
            </span>
            <span className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl shadow-2xs">
              Histórico Completo
            </span>
          </div>
          <p className="text-[11px] text-slate-500 text-center font-medium">
            Al cambiar el período, los totales y métricas se adaptan de inmediato.
          </p>
        </div>
      )
    },
    {
      stepNumber: 3,
      badge: "Métricas 3 de 6",
      tag: "Comparativa",
      icon: <ArrowRightLeft className="w-8 h-8 text-amber-600" />,
      title: "Compara el crecimiento entre períodos",
      description: "En el modo normal puedes comparar dos meses para ver cómo cambió la actividad. En el modo Pro puedes ampliar la comparación hasta tres meses y observar mejor la evolución.",
      graphic: (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2 text-center font-bold">
            <div className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] text-brand-blue block uppercase font-extrabold">Período Principal (A)</span>
              <span className="text-slate-800 text-xs">Mes en evaluación</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-300 shadow-2xs">
              <span className="text-[10px] text-amber-800 block uppercase font-extrabold">Comparativa (B)</span>
              <span className="text-slate-800 text-xs">Mes de referencia</span>
            </div>
          </div>
          <div className="bg-white/80 p-2 rounded-xl text-center text-[11px] text-slate-600 font-medium border border-amber-200/60">
            ⚡ Modo Pro: activa una 3ª columna para comparar 3 meses continuos.
          </div>
        </div>
      )
    },
    {
      stepNumber: 4,
      badge: "Métricas 4 de 6",
      tag: "Equipo & Asesores",
      icon: <UserCheck className="w-8 h-8 text-purple-700" />,
      title: "Distribución de reservas por persona",
      description: "Puedes revisar cómo se distribuyen las reservas entre Juan, Laura y Yoanelis. Las reservas contratadas directamente con la empresa aparecen en una sección separada (Directo / Zona Coworking).",
      graphic: (
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="space-y-1.5 font-bold">
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-brand-blue">👤 Asesores Comerciales:</span>
              <span className="text-slate-600 text-[11px]">Juan • Laura • Yoanelis</span>
            </div>
            <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-700 flex items-center gap-1">
                <Building2 size={13} className="text-slate-500" /> Otras Reservas:
              </span>
              <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                Directo Zona Coworking (100% margen)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-purple-900 text-center font-medium">
            Pulsa sobre cualquier asesor para filtrar el detalle de sus reservas.
          </p>
        </div>
      )
    },
    {
      stepNumber: 5,
      badge: "Métricas 5 de 6",
      tag: "Comisiones",
      icon: <Receipt className="w-8 h-8 text-emerald-700" />,
      title: "Cálculo automático de comisiones",
      description: "Cuando una reserva corresponde a Laura o Yoanelis, el reporte calcula automáticamente su comisión del 25% sobre el monto de la reserva.",
      graphic: (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs space-y-2">
            <div className="flex justify-between items-center font-semibold text-slate-700">
              <span>Ejemplo: Reserva de asesor</span>
              <strong className="font-mono text-slate-900 text-sm">$100.00</strong>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 font-bold">
              <div className="bg-purple-50 p-2 rounded-lg text-purple-900 text-center">
                <span className="text-[10px] block font-normal">Comisión Asesora (25%)</span>
                <span className="font-mono text-sm">$25.00</span>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-900 text-center">
                <span className="text-[10px] block font-normal">Zona Coworking (75%)</span>
                <span className="font-mono text-sm">$75.00</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-emerald-800 text-center font-medium">
            Las reservas directas y de Juan conservan el 100% de margen para la sede.
          </p>
        </div>
      )
    },
    {
      stepNumber: 6,
      badge: "Métricas 6 de 6",
      tag: "Gráficas de Evolución",
      icon: <TrendingUp className="w-8 h-8 text-brand-orange" />,
      title: "Visualiza la evolución de los datos",
      description: "Las gráficas te permiten ver la evolución de los datos de forma visual para detectar cambios entre meses, horarios pico y los salones más demandados.",
      graphic: (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
            <span className="font-bold text-slate-700 block text-center">
              Distribución por Espacios (PB vs Mezzanina)
            </span>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                  <span>Planta Baja</span>
                  <span className="font-bold font-mono">60%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-brand-blue h-full w-[60%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                  <span>Mezzanina</span>
                  <span className="font-bold font-mono">40%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-brand-orange h-full w-[40%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center font-medium">
            Tendencias claras para tomar decisiones con información real.
          </p>
        </div>
      )
    },
    {
      stepNumber: 7,
      badge: "¡Todo Listo!",
      tag: "Listo para Usar",
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
      title: "Listo, Juan",
      description: "Ya puedes utilizar tus reportes y comparar la evolución de Zona Coworking con total claridad y privacidad.",
      graphic: (
        <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-slate-200 p-4 rounded-2xl text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs mx-auto flex items-center justify-center text-emerald-600 font-bold text-xl">
            📈
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Control Comercial Completo</h4>
          <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
            Puedes volver a consultar esta guía en cualquier momento pulsando el botón de ayuda en la esquina superior.
          </p>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-[24px] sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-100"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-brand-blue to-slate-900 px-6 pt-5 pb-4 text-white relative shrink-0">
            <button
              onClick={handleFinish}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Cerrar tutorial de métricas"
              title="Cerrar tutorial"
            >
              <X size={18} />
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles size={12} className="text-amber-300" />
              <span>{current.badge}</span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold leading-snug pr-8">
              Guía de Métricas y Reportes
            </h2>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0 shadow-2xs">
                {current.icon}
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange block">
                  {current.tag}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                  {current.title}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              {current.description}
            </p>

            {/* Visual element */}
            <div className="pt-0.5">
              {current.graphic}
            </div>

            {/* Dots / Indicators */}
            <div className="flex justify-center items-center gap-1.5 pt-2">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentStep === idx ? 'w-6 bg-brand-blue' : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Ir al paso ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} /> Anterior
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                Saltar
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-5 py-2.5 min-h-[44px] bg-brand-blue hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer ml-auto"
              >
                <span>Continuar</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer ml-auto"
              >
                <span>Empezar a revisar</span>
                <Check size={16} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
