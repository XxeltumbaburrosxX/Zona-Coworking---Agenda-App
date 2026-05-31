import React, { useState, FormEvent } from 'react';
import { Mail, KeyRound, AlertCircle, User, CheckCircle2, ShieldAlert } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { LOGO_COLOR } from '../types';

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError('Error de conexión a Firebase.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Validation entries
        if (!displayName.trim()) {
          setError('Por favor ingresa tu nombre completo.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          setLoading(false);
          return;
        }

        // 1. Create User standard credentials
        const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = credentials.user;

        // 2. Set profile displayName
        await updateProfile(user, {
          displayName: displayName.trim()
        });

        // 3. Keep fully synced inside Firestore users_config document under UID
        if (db) {
          await setDoc(doc(db, 'users_config', user.uid), {
            displayName: displayName.trim(),
            email: email.trim(),
            color: '', // Set clear to prompt them to choose their unique layout color on onboarding
            updatedAt: Date.now()
          });
        }

        setSuccess('¡Cuenta registrada exitosamente!');
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);

      } else {
        // Sign in standard credentials
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Auth action error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del correo ingresado no es válido.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña es demasiado débil.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Credenciales incorrectas. Revisa tu correo y contraseña.');
      } else {
        setError(err.message || 'Ocurrió un error inesperado al procesar tu solicitud.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3F4F6] p-4 text-slate-800 font-sans">
      <div className="max-w-md w-full bg-white p-7 sm:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center relative overflow-hidden">
        {/* Decorative dynamic top bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#182865] via-[#FF9305] to-[#182865]" />
        
        <img className="h-10 w-auto mb-6 mt-2 drop-shadow-sm" src={LOGO_COLOR} alt="Zona Coworking" />
        
        <h2 className="text-2xl font-display font-black text-[#182865] mb-2 text-center tracking-tight">
          {isRegistering ? 'Crear Cuenta' : 'Acceso al Dashboard'}
        </h2>
        <p className="text-xs text-slate-500 mb-6 text-center max-w-xs leading-normal">
          {isRegistering 
            ? 'Regístrate para coordinar tus reservas en tiempo real' 
            : 'Coordinación y gestión de espacios de Zona Coworking'}
        </p>

        {/* Tab switcher */}
        <div className="w-full flex bg-slate-100 p-1.5 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => isRegistering && handleToggleMode()}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${!isRegistering ? 'bg-[#182865] text-white shadow-sm' : 'text-slate-500 hover:text-[#182865]'}`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => !isRegistering && handleToggleMode()}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${isRegistering ? 'bg-[#182865] text-white shadow-sm' : 'text-slate-500 hover:text-[#182865]'}`}
          >
            Registrarse
          </button>
        </div>

        <form className="w-full space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold border border-red-100 flex gap-2 items-center">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-xs font-semibold border border-emerald-100 flex gap-2 items-center">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* DYNAMIC FIELD: NAME ON REGISTRATION */}
          {isRegistering && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombre Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all text-slate-800"
                  placeholder="Escribe tu nombre de usuario"
                />
              </div>
            </div>
          )}
          
          {/* EMAIL */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all text-slate-800"
                placeholder="usuario@zonacoworking.com"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all text-slate-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* DYNAMIC FIELD: PASSWORD CONFIRMATION */}
          {isRegistering && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  className="pl-9 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#182865]/10 focus:border-[#182865] transition-all text-slate-800"
                  placeholder="Confirmar tu contraseña de acceso"
                />
              </div>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full flex justify-center py-3 px-4 rounded-xl text-xs font-extrabold text-white bg-[#FF9305] hover:bg-[#E08103] active:bg-[#CC7604] transition-all focus:outline-none focus:ring-2 focus:ring-[#FF9305]/50 disabled:opacity-75 mt-4 shadow-md shadow-[#FF9305]/15 active:scale-[0.98] cursor-pointer cursor-allowed"
          >
            {loading ? 'Procesando...' : (isRegistering ? 'Crear Mi Cuenta' : 'Entrar al Dashboard')}
          </button>
        </form>

        <div className="text-[10px] text-slate-400 font-medium text-center mt-6">
          🔒 Acceso verificado y gestionado con Google Firebase.
        </div>
      </div>
    </div>
  );
}
