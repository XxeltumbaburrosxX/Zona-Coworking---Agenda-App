import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { COLOR_OPTIONS, LOGO_COLOR } from '../types';
import { CheckCircle2 } from 'lucide-react';

export function ColorSelectionScreen({ onComplete }: { onComplete: () => void }) {
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'users_config'), (snapshot) => {
      const colors: string[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.color) colors.push(data.color.toUpperCase());
      });
      setTakenColors(colors);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!selectedColor || !auth?.currentUser || !db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users_config', auth.currentUser.uid), {
        color: selectedColor,
        displayName: auth.currentUser.displayName || auth.currentUser.email,
        updatedAt: Date.now()
      });
      onComplete();
    } catch (err) {
      console.error(err);
      alert('Error guardando color');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-8 h-8 rounded-full border-2 border-brand-orange/20 border-t-brand-orange animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <img className="h-10 w-auto mb-6" src={LOGO_COLOR} alt="Zona Coworking" />
        <h2 className="text-2xl font-display font-semibold text-brand-blue mb-2">Elige tu Identidad</h2>
        <p className="text-sm text-slate-500 mb-8">
          Selecciona un color único para que el equipo pueda identificar tus reservas rápidamente en la agenda.
        </p>

        <div className="grid grid-cols-3 gap-4 w-full mb-8">
          {COLOR_OPTIONS.map(color => {
            const isTaken = takenColors.includes(color.toUpperCase());
            const isSelected = selectedColor === color;
            return (
              <button
                key={color}
                disabled={isTaken}
                onClick={() => setSelectedColor(color)}
                className={`relative h-20 rounded-2xl flex items-center justify-center transition-all ${isTaken ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105'} ${isSelected ? 'ring-4 ring-offset-2 ring-brand-blue/30 scale-105' : ''}`}
                style={{ backgroundColor: color }}
              >
                {isSelected && <CheckCircle2 className="text-white drop-shadow-md" size={28} />}
                {isTaken && !isSelected && <span className="text-xs font-semibold text-white bg-black/30 px-2 py-1 rounded-full absolute">Ocupado</span>}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={!selectedColor || saving}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-orange hover:bg-[#E68505] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-orange-500/20"
        >
          {saving ? 'Guardando...' : 'Confirmar Color'}
        </button>
      </motion.div>
    </div>
  );
}
