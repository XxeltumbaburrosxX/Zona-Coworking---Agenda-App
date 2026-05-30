import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showIOSBadge, setShowIOSBadge] = useState(false);

  useEffect(() => {
    // Check if dismissed previously
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      return;
    }

    // Android/Chrome logic - Native intercept
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidBanner(true);
      setShowIOSBadge(false); // Just in case
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS logic - Minimalist Fallback
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone) {
      setShowIOSBadge(true);
    }
    
    // Lifecycle clean up on success
    const handleAppInstalled = () => {
      setShowAndroidBanner(false);
      setShowIOSBadge(false);
      localStorage.setItem('pwa_banner_dismissed', 'true');
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowAndroidBanner(false);
        localStorage.setItem('pwa_banner_dismissed', 'true');
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowAndroidBanner(false);
    setShowIOSBadge(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <>
      <AnimatePresence>
        {showAndroidBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex-shrink-0 w-full bg-white border-b border-slate-200 shadow-sm relative z-50 overflow-hidden text-[#182865]"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 rounded-xl overflow-hidden shadow-inner border border-slate-200 hidden sm:block mt-0.5">
                  <img src="https://i.ibb.co/Wp4cVb35/Icono-Agenda-ZC.png" alt="Icono" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm flex items-center gap-2 truncate">
                    Zona Coworking
                  </h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug truncate">
                    Instala esta app para una experiencia app-like más rápida.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={handleInstallClick}
                  className="px-3 sm:px-4 py-2 bg-[#FF9305] hover:bg-[#E68505] text-white text-[11px] sm:text-xs font-bold rounded-lg transition-colors active:scale-[0.98] shadow-sm shadow-[#FF9305]/20 flex items-center justify-center gap-1.5"
                >
                  <Download size={14} /> Instalar
                </button>
                <button 
                  onClick={handleDismiss}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Cerrar notificación"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIOSBadge && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md shadow-xl shadow-slate-200/50 border border-slate-200 rounded-full py-2.5 px-4 flex items-center justify-between gap-3 text-[#182865] max-w-sm w-full relative">
              <p className="text-[12px] font-medium leading-snug flex-1 w-full flex items-center justify-center gap-1 flex-wrap">
                Instala la app: Toca compartir <Share size={12} className="inline opacity-80" /> y luego 'Agregar a inicio'.
              </p>
              <button 
                onClick={handleDismiss}
                className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors absolute right-2"
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
