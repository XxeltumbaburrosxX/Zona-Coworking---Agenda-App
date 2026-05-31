import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, User, Mail, ShieldAlert, KeyRound, CheckCircle2, Lock, Palette } from 'lucide-react';
import { db, auth } from '../firebase';
import { doc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { COLOR_OPTIONS } from '../types';
import Swal from 'sweetalert2';

interface UserProfileModalProps {
  onClose: () => void;
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const currentUser = auth?.currentUser;
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [currentPasswordConfirm, setCurrentPasswordConfirm] = useState('');
  const [requireCurrentPassword, setRequireCurrentPassword] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch current user colors and configurations from firestore
  useEffect(() => {
    if (!db || !currentUser) return;
    
    // Listen to firestore to fetch current identity colors and track taken colors
    const unsub = onSnapshot(collection(db, 'users_config'), (snapshot) => {
      const colors: string[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (docSnap.id === currentUser.uid) {
          if (data.color) setSelectedColor(data.color);
        } else {
          if (data.color) colors.push(data.color.toUpperCase());
        }
      });
      setTakenColors(colors);
    });

    return () => unsub();
  }, [currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !db) return;

    setErrorMsg('');
    setSuccessMsg('');
    
    if (!displayName.trim()) {
      setErrorMsg('El nombre no puede estar vacío.');
      return;
    }

    setSaving(true);

    try {
      // 1. First attempt to update regular Firestore payload and general display name
      const userRef = doc(db, 'users_config', currentUser.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        email: email.trim(),
        color: selectedColor,
        updatedAt: Date.now()
      });

      // Update Firebase Auth DisplayName
      await updateProfile(currentUser, {
        displayName: displayName.trim()
      });

      // 2. Sensitive Authentication Updates (Email or Password changes)
      // Check if email or password is being modified
      const isEmailChanged = email.trim() !== (currentUser.email || '');
      const isPasswordChanged = password.trim().length > 0;

      if (isEmailChanged || isPasswordChanged) {
        if (requireCurrentPassword && !currentPasswordConfirm) {
          setSaving(false);
          setErrorMsg('Por favor introduce tu contraseña actual para confirmar los cambios de tu cuenta.');
          return;
        }

        try {
          if (requireCurrentPassword && currentPasswordConfirm) {
            const credential = EmailAuthProvider.credential(currentUser.email || '', currentPasswordConfirm);
            await reauthenticateWithCredential(currentUser, credential);
          }

          if (isEmailChanged) {
            await updateEmail(currentUser, email.trim());
          }

          if (isPasswordChanged) {
            if (password.length < 6) {
              setSaving(false);
              setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
              return;
            }
            await updatePassword(currentUser, password);
          }
        } catch (credentialErr: any) {
          // If Firebase requests recent login
          if (credentialErr.code === 'auth/requires-recent-login') {
            setRequireCurrentPassword(true);
            setSaving(false);
            setErrorMsg('Por seguridad, requiere reautenticación. Ingresa tu contraseña actual abajo.');
            return;
          }
          throw credentialErr;
        }
      }

      // Success
      setSuccessMsg('¡Perfil actualizado con éxito!');
      setPassword('');
      setCurrentPasswordConfirm('');
      setRequireCurrentPassword(false);
      
      Swal.fire({
        title: 'Perfil Guardado',
        text: 'Tus cambios se han sincronizado con Firebase.',
        icon: 'success',
        confirmButtonColor: '#182865'
      });

    } catch (err: any) {
      console.error('Error updating profile:', err);
      if (err.code === 'auth/wrong-password') {
        setErrorMsg('La contraseña actual es incorrecta.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Ese correo ya está registrado con otra cuenta.');
      } else {
        setErrorMsg(err.message || 'Error al actualizar el perfil.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 relative border border-slate-100 my-8 text-slate-800 font-sans"
      >
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-[#182865] to-[#FF9305] rounded-t-3xl" />

        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="mb-5 mt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#182865]/10 flex items-center justify-center text-[#182865]">
            <User size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-lg font-display font-black text-[#182865] tracking-tight">Mi Perfil</h3>
            <p className="text-slate-500 text-xs mt-0.5">Configura tu nombre en agenda y seguridad</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold border border-red-100 flex gap-2 items-center">
            <ShieldAlert size={16} className="shrink-0" /> 
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-xs font-semibold border border-emerald-100 flex gap-2 items-center">
            <CheckCircle2 size={16} className="shrink-0" /> 
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* NOMBE COMPLETO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 label-field">
              Nombre en Agenda
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all"
                placeholder="Escribe tu nombre personal"
              />
            </div>
          </div>

          {/* CORREO ELECTRONICO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 label-field">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all"
                placeholder="usuario@zonacoworking.com"
              />
            </div>
          </div>

          {/* SEGURIDAD DE CONTRASEÑA */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 label-field flex items-center justify-between">
              <span>Nueva Contraseña</span>
              <span className="text-[9px] text-[#FF9305] font-normal capitalize">Opcional</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all"
                placeholder="Ingresar para cambiar contraseña"
              />
            </div>
          </div>

          {/* RE-AUTHENTICATION FIELD (CONDITIONAL) */}
          {requireCurrentPassword && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px]">
                <Lock size={12} /> RE-AUTENTICACIÓN REQUERIDA
              </div>
              <p className="text-[10px] text-amber-700 font-medium leading-normal">
                Para cambiar datos altamente confidenciales (email/contraseña), ingresa tu contraseña de inicio de sesión actual:
              </p>
              <input
                type="password" required value={currentPasswordConfirm} onChange={e => setCurrentPasswordConfirm(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                placeholder="Contraseña Actual"
              />
            </div>
          )}

          {/* COLOR DE IDENTIDAD (PILARED GRID) */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Palette size={12} className="text-[#FF9305]" /> Tu Color de Identidad (Agenda)
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_OPTIONS.map(c => {
                const isTaken = takenColors.includes(c.toUpperCase());
                const isSelected = selectedColor.toUpperCase() === c.toUpperCase();
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={isTaken}
                    onClick={() => setSelectedColor(c)}
                    className={`h-8 rounded-lg flex items-center justify-center transition-all relative ${isTaken ? 'opacity-25 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                    style={{ backgroundColor: c }}
                    title={isTaken ? 'Color ocupado' : 'Elegir color'}
                  >
                    {isSelected && <CheckCircle2 size={14} className="text-white drop-shadow-md stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* INFO BADGE */}
          <div className="text-[9.5px] text-slate-400 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            🔒 Las contraseñas de acceso están blindadas con Firebase Authentication de Google (nunca se guardan en texto plano en la base de datos).
          </div>

          <div className="flex gap-2 pt-2">
            <button 
              type="button" onClick={onClose}
              className="flex-1 py-3 text-slate-500 hover:bg-slate-50 border border-slate-200 font-bold rounded-xl transition-all text-xs active:scale-98"
            >
              Cerrar
            </button>
            <button 
              type="submit" disabled={saving}
              className="flex-1 py-3 bg-[#FF9305] hover:bg-[#E08103] active:bg-[#CC7604] text-white font-black rounded-xl transition-all text-xs active:scale-98 shadow-md shadow-[#FF9305]/15 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
