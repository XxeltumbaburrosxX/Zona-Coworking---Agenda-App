import React, { useState, FormEvent } from 'react';
import { Mail, KeyRound, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { LOGO_COLOR } from '../types';

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError('Error de conexión.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError('Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
        <img className="h-10 w-auto mb-8 drop-shadow-sm" src={LOGO_COLOR} alt="Zona Coworking" />
        <h2 className="text-2xl font-display font-semibold text-brand-blue mb-1">Acceso al Dashboard</h2>
        <p className="text-sm text-slate-500 mb-8">Ingresa tus credenciales para continuar</p>

        <form className="w-full space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium border border-red-100 flex gap-2 items-center">
              <AlertCircle size={18} /> {error}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="pl-10 block w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-medium text-slate-800"
                placeholder="usuario@zonacoworking.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="pl-10 block w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all font-medium text-slate-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-orange hover:bg-[#E68505] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange/50 disabled:opacity-70 mt-4 shadow-sm shadow-orange-500/20"
          >
            {loading ? 'Iniciando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
