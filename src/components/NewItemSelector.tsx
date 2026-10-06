import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarPlus, Users, CheckSquare, ChevronRight } from 'lucide-react';
import { AgendaItemType } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: AgendaItemType) => void;
}

export function NewItemSelector({ isOpen, onClose, onSelect }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />

          {/* Sheet / Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 350,
              mass: 0.8
            }}
            className="relative w-full sm:max-w-sm bg-white rounded-t-[28px] sm:rounded-[24px] p-6 pb-8 sm:pb-6 shadow-2xl z-10 font-sans border border-slate-100 safe-area-pb"
          >
            {/* iOS Pull handle on mobile */}
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4 sm:hidden" />

            {/* Header */}
            <div className="mb-5">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight font-display text-center sm:text-left">
                Nuevo
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {/* Option 1: Reserva (Mayor jerarquía comercial) */}
              <button
                type="button"
                onClick={() => onSelect('reserva')}
                className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/70 hover:bg-blue-50 hover:border-blue-300 active:scale-[0.985] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-brand-blue text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-900/20">
                    <CalendarPlus size={20} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-slate-900 leading-snug">
                        Reserva
                      </span>
                      <span className="text-[10px] font-semibold text-brand-blue bg-blue-100/70 px-2 py-0.5 rounded-full">
                        Comercial
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-normal leading-normal mt-0.5 truncate">
                      Apartar un espacio
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                />
              </button>

              {/* Option 2: Reunión */}
              <button
                type="button"
                onClick={() => onSelect('reunion')}
                className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.985] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Users size={20} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-slate-900 leading-snug">
                      Reunión
                    </span>
                    <p className="text-xs text-slate-500 font-normal leading-normal mt-0.5 truncate">
                      Coordinar un encuentro
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                />
              </button>

              {/* Option 3: Recordatorio */}
              <button
                type="button"
                onClick={() => onSelect('recordatorio')}
                className="group w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.985] transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <CheckSquare size={20} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[15px] font-bold text-slate-900 leading-snug">
                      Recordatorio
                    </span>
                    <p className="text-xs text-slate-500 font-normal leading-normal mt-0.5 truncate">
                      No olvidar algo
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                />
              </button>
            </div>

            {/* Cancel Action */}
            <div className="mt-4 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors text-center cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
