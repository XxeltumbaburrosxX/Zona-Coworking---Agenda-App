import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { COLOR_OPTIONS, LOGO_COLOR } from '../types';
import { CheckCircle2, Lock, ShieldAlert, User, Paintbrush } from 'lucide-react';
import Swal from 'sweetalert2';

export function ColorSelectionScreen({ onComplete }: { onComplete: () => void }) {
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [staleDocIds, setStaleDocIds] = useState<string[]>([]);

  useEffect(() => {
    if (!db) return;
    const currentEmail = auth?.currentUser?.email?.toLowerCase();
    const currentUid = auth?.currentUser?.uid;

    const unsub = onSnapshot(collection(db, 'users_config'), (snapshot) => {
      const colors: string[] = [];
      const staleIds: string[] = [];
      let foundUserOldColor: string | null = null;
      let foundUserOldName: string = '';

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const docEmail = data.email?.toLowerCase();
        
        const isOwnDoc = docSnap.id === currentUid;
        const hasSameEmail = currentEmail && docEmail === currentEmail;

        if (isOwnDoc || hasSameEmail) {
          if (data.color) {
            foundUserOldColor = data.color;
          }
          if (data.displayName) {
            foundUserOldName = data.displayName;
          }
          if (docSnap.id !== currentUid) {
            staleIds.push(docSnap.id);
          }
        } else {
          if (data.color) {
            colors.push(data.color.toUpperCase());
          }
        }
      });

      setTakenColors(colors);
      setStaleDocIds(staleIds);
      
      if (foundUserOldColor) {
        setSelectedColor(prev => prev || foundUserOldColor);
      }
      if (foundUserOldName) {
        setDisplayName(prev => prev || foundUserOldName);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!displayName.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo o de agenda.');
      return;
    }

    if (!selectedColor) {
      setErrorMsg('Por favor selecciona un color para identificarte en el calendario.');
      return;
    }

    if (!auth?.currentUser || !db) return;
    
    setSaving(true);
    const currentUser = auth.currentUser;

    // Validate password if filled
    const isPasswordFilled = password.trim().length > 0;
    if (isPasswordFilled) {
      if (password.length < 6) {
        setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
        setSaving(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Las contraseñas no coinciden.');
        setSaving(false);
        return;
      }
    }

    try {
      // 1. If password was filled, attempt updating password first through Auth
      if (isPasswordFilled) {
        await updatePassword(currentUser, password.trim());
      }

      // Update auth profile display name
      await updateProfile(currentUser, {
        displayName: displayName.trim()
      });

      // 2. Save user config configuration to Firestore users_config document under UID
      await setDoc(doc(db, 'users_config', currentUser.uid), {
        color: selectedColor,
        displayName: displayName.trim(),
        email: currentUser.email || '',
        updatedAt: Date.now()
      });

      // Clean up any stale records from old deleted accounts with the same email
      if (staleDocIds.length > 0) {
        for (const staleId of staleDocIds) {
          try {
            await deleteDoc(doc(db, 'users_config', staleId));
          } catch (e) {
            console.warn('Failed to delete stale config for ID:', staleId, e);
          }
        }
      }

      Swal.fire({
        title: '¡Identidad Lista!',
        text: 'Tu nombre, color de agenda y configuración de acceso han sido guardados con éxito.',
        icon: 'success',
        confirmButtonColor: '#182865'
      });

      onComplete();
    } catch (err: any) {
      console.error('Error saving onboarding info:', err);
      setErrorMsg(err.message || 'Ocurrió un error guardando tu configuración de identidad.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-8 h-8 rounded-full border-2 border-[#182865]/20 border-t-[#182865] animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 text-slate-800 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-md w-full bg-white p-7 sm:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center"
      >
        <img className="h-10 w-auto mb-6 mt-2" src={LOGO_COLOR} alt="Zona Coworking" />
        <h2 className="text-2xl font-display font-black text-[#182865] tracking-tight mb-2">Completar Registro</h2>
        <p className="text-xs text-slate-500 mb-6 text-center leading-normal max-w-sm">
          Por favor, introduce tu nombre, selecciona tu color correspondiente para la agenda de reservas y de forma opcional personaliza tu contraseña.
        </p>

        {errorMsg && (
          <div className="w-full mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold border border-red-100 flex gap-2 items-center text-left">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="w-full space-y-5 text-left">
          
          {/* USER DISPLAY NAME */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <User size={12} className="text-[#FF9305]" /> 1. Nombre en Agenda (para las Reservas)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={displayName}
                onChange={e => {
                  setDisplayName(e.target.value);
                  setErrorMsg('');
                }}
                className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all text-slate-800"
                placeholder="Escribe tu nombre y apellido"
              />
            </div>
          </div>

          {/* COLOR SELECTION */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Paintbrush size={12} className="text-[#FF9305]" /> 2. Selecciona tu Color de Identidad
            </label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {COLOR_OPTIONS.map(color => {
                const isTaken = takenColors.includes(color.toUpperCase());
                const isSelected = selectedColor?.toUpperCase() === color.toUpperCase();
                return (
                  <button
                    key={color}
                    type="button"
                    disabled={isTaken}
                    onClick={() => {
                      setSelectedColor(color);
                      setErrorMsg('');
                    }}
                    className={`relative h-11 rounded-xl flex items-center justify-center transition-all ${isTaken ? 'opacity-25 cursor-not-allowed grayscale' : 'hover:scale-105 active:scale-95'} ${isSelected ? 'ring-2 ring-offset-2 ring-[#182865]' : ''}`}
                    style={{ backgroundColor: color }}
                    title={isTaken ? 'Color ocupado' : 'Elegir color'}
                  >
                    {isSelected && <CheckCircle2 className="text-white drop-shadow-md stroke-[3]" size={16} />}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              ⚠️ Cada color representa a un miembro de staff para evitar confusiones en el calendario común.
            </p>
          </div>

          {/* OPTIONAL PASSWORD MODIFICATION */}
          <div className="border-t border-slate-100 pt-4">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>3. Personalizar Contraseña</span>
              <span className="text-[9px] text-[#FF9305] font-normal capitalize">Opcional</span>
            </label>
            
            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all text-slate-800"
                  placeholder="Nueva contraseña (deja en blanco si no quieres cambiarla)"
                />
              </div>

              {password.trim() && (
                <div className="relative animate-in fade-in duration-200">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all text-slate-800"
                    placeholder="Confirmar nueva contraseña"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-xs font-extrabold text-white bg-[#FF9305] hover:bg-[#E08103] active:bg-[#CC7604] transition-all focus:outline-none focus:ring-2 focus:ring-[#FF9305]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#FF9305]/15 cursor-pointer"
          >
            {saving ? 'Guardando...' : 'Completar Configuración'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
