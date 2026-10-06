import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CalendarDays, BookmarkCheck, CheckCircle2, 
  Receipt, Plus, Sparkles, ArrowRight, ArrowLeft, Check,
  Clock, DollarSign, Calendar
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, userId }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = userId ? `tutorial_general_seen_${userId}` : 'tutorial_general_seen';

  const handleFinish = () => {
    try {
      localStorage.setItem(storageKey, 'true');
      localStorage.setItem('hasSeenMultiDateTutorial', 'true');
    } catch {
      // storage unavailable fallback
    }
    onClose();
  };

  const steps = [
    {
      stepNumber: 1,
      badge: "Novedad 1 de 5",
      tag: "Eventos de Varios Días",
      icon: <CalendarDays className="w-8 h-8 text-brand-blue" />,
      title: "¿Tu actividad dura varios días?",
      description: "Ahora puedes programarla de una sola vez seleccionando el período completo, sin tener que crear cada día manualmente.",
      graphic: (
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-brand-blue flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
              Taller o Curso Consecutivo
            </span>
            <span className="text-[11px] font-bold text-brand-orange bg-orange-100/70 px-2 py-0.5 rounded-md">
              1 solo clic
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold">
            <div className="bg-white border border-blue-200 text-brand-blue py-1.5 rounded-lg shadow-2xs">Lun 15</div>
            <div className="bg-white border border-blue-200 text-brand-blue py-1.5 rounded-lg shadow-2xs">Mar 16</div>
            <div className="bg-white border border-blue-200 text-brand-blue py-1.5 rounded-lg shadow-2xs">Mié 17</div>
            <div className="bg-brand-blue text-white py-1.5 rounded-lg shadow-2xs">Jue 18</div>
          </div>
          <p className="text-[11px] text-slate-500 text-center font-medium">
            El sistema valida la disponibilidad de la sala para todas las fechas elegidas.
          </p>
        </div>
      )
    },
    {
      stepNumber: 2,
      badge: "Novedad 2 de 5",
      tag: "Reserva o Pre-reserva",
      icon: <BookmarkCheck className="w-8 h-8 text-amber-600" />,
      title: "¿El cliente aún no está 100% seguro?",
      description: "Si todavía no está confirmada, puedes dejarla como pre-reserva. Cuando se acerque la fecha, la plataforma te recordará que debes confirmar si el cliente ya está listo.",
      graphic: (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex items-start gap-2 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
              <div>
                <strong className="block text-emerald-900 font-bold">Reserva Confirmada</strong>
                <span className="text-[11px] text-slate-500">Espacio garantizado formalmente.</span>
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-amber-300 ring-2 ring-amber-300/40 flex items-start gap-2 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0"></span>
              <div>
                <strong className="block text-amber-900 font-bold">Pre-reserva</strong>
                <span className="text-[11px] text-slate-500">Aparta el salón sin generar compromisos ficticios.</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 text-center font-medium">
            🟡 Bloquea la fecha para que nadie te gane el espacio mientras el cliente define.
          </p>
        </div>
      )
    },
    {
      stepNumber: 3,
      badge: "Novedad 3 de 5",
      tag: "Confirmación Rápida",
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
      title: "¿El cliente ya confirmó?",
      description: "Puedes convertir la pre-reserva en reserva con un toque. Al acercarse la fecha verás un aviso para revisarla sin tener que volver a llenar toda la información.",
      graphic: (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
          <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800">Pre-reserva próxima a vencer</p>
                <p className="text-[11px] text-slate-500">¿El cliente ya garantizó?</p>
              </div>
            </div>
            <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shrink-0 shadow-2xs">
              Confirmar Reserva ✓
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 text-center font-medium">
            ¡Un solo toque para oficializarla en el cronograma definitivo!
          </p>
        </div>
      )
    },
    {
      stepNumber: 4,
      badge: "Novedad 4 de 5",
      tag: "Pagos y Saldos",
      icon: <Receipt className="w-8 h-8 text-brand-orange" />,
      title: "¿El cliente abonó, pero todavía falta dinero?",
      description: "La plataforma te ayuda a tener ese saldo pendiente presente. Puedes registrar pago completo, abonos o clientes de confianza. Cuando recibas el pago restante, puedes marcar la reserva como pagada.",
      graphic: (
        <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-3.5 space-y-2.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Costo total pactado:</span>
              <strong className="font-mono text-slate-800 font-bold">$100.00</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Abono registrado:</span>
              <span className="font-mono font-semibold text-emerald-700">$30.00</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-1.5 font-bold">
              <span className="text-amber-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Saldo pendiente:
              </span>
              <span className="font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">$70.00</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center font-medium">
            Avisos preventivos para recordar cobrar antes del día del evento.
          </p>
        </div>
      )
    },
    {
      stepNumber: 5,
      badge: "Novedad 5 de 5",
      tag: "Más que Reservas",
      icon: <Plus className="w-8 h-8 text-brand-blue" />,
      title: "El botón '+' ahora tiene 3 opciones",
      description: "Ahora puedes organizar tu día completo distinguiendo claramente cada tipo de actividad:",
      graphic: (
        <div className="space-y-2">
          <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl flex items-center gap-3 text-xs">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              📅
            </span>
            <div>
              <strong className="text-brand-blue block font-bold">Reserva</strong>
              <span className="text-slate-600 text-[11px]">Apartar y facturar un espacio o salón comercial.</span>
            </div>
          </div>
          <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded-xl flex items-center gap-3 text-xs">
            <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
              🤝
            </span>
            <div>
              <strong className="text-purple-900 block font-bold">Reunión</strong>
              <span className="text-slate-600 text-[11px]">Coordinar un encuentro o videollamada de trabajo.</span>
            </div>
          </div>
          <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl flex items-center gap-3 text-xs">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
              📌
            </span>
            <div>
              <strong className="text-amber-900 block font-bold">Recordatorio</strong>
              <span className="text-slate-600 text-[11px]">Guardar una tarea o pendiente que no quieres olvidar.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      stepNumber: 6,
      badge: "¡Todo Listo!",
      tag: "Comienza a Explorar",
      icon: <Sparkles className="w-8 h-8 text-brand-orange" />,
      title: "Eso es todo",
      description: "Ahora puedes aprovechar las nuevas funciones de la plataforma para gestionar tus actividades con mayor agilidad y tranquilidad.",
      graphic: (
        <div className="bg-gradient-to-br from-blue-50 to-orange-50 border border-slate-200 p-4 rounded-2xl text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs mx-auto flex items-center justify-center text-brand-orange font-bold text-xl">
            🚀
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Plataforma Zona Coworking</h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Todas estas herramientas están activas en tu agenda para hacer tu trabajo más simple.
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
          <div className="bg-gradient-to-r from-brand-blue to-blue-900 px-6 pt-5 pb-4 text-white relative shrink-0">
            <button
              onClick={handleFinish}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Cerrar tutorial"
              title="Cerrar tutorial"
            >
              <X size={18} />
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles size={12} className="text-amber-300" />
              <span>{current.badge}</span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold leading-snug pr-8">
              Novedades de la Plataforma
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
                className="px-6 py-2.5 min-h-[44px] bg-brand-orange hover:bg-[#E68505] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer ml-auto"
              >
                <span>Empezar</span>
                <Check size={16} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
