import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOSFolder, setIsIOSFolder] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      return;
    }

    // Android/Chrome logic
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS logic
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = (window.navigator as any).standalone === true;

    if (isIOS && !isStandalone) {
      setIsIOSFolder(true);
      setShowInstallBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {showInstallBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 z-[9999] bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) * 0.5)' }}
        >
          <div className="p-4 flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-zinc-100 rounded-xl overflow-hidden shadow-inner border border-slate-200">
              <img src="https://i.ibb.co/Wp4cVb35/Icono-Agenda-ZC.png" alt="Zona Coworking" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h4 className="text-brand-blue font-bold text-sm">Zona Coworking</h4>
              {isIOSFolder ? (
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-snug pe-2">
                  Instala el Dashboard en tu iPhone: Toca el botón Compartir <Share size={12} className="inline mx-[2px] align-baseline text-slate-700" /> y luego "Agregar a la pantalla de inicio".
                </p>
              ) : (
                <p className="text-slate-500 text-[11px] sm:text-xs mt-1 leading-snug">
                  Mantén el control de tus espacios instalando la app de forma directa y nativa.
                </p>
              )}
            </div>
            
            <button 
              onClick={() => setShowInstallBanner(false)}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
              aria-label="Cerrar notificación de instalación"
            >
              <X size={18} />
            </button>
          </div>
          
          {!isIOSFolder && (
            <div className="px-4 pb-4">
              <button 
                onClick={handleInstallClick}
                className="w-full h-12 min-h-[44px] bg-brand-orange hover:bg-[#E68505] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-500/20 active:scale-[0.98]"
              >
                <Download size={18} /> Instalar Dashboard
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
