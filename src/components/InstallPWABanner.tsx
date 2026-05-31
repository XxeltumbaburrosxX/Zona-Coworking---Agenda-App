import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

let deferredPrompt: any = null;

export function InstallPWABanner() {
  const [showInstallBanner, setShowInstallBanner] = useState(false);

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
      deferredPrompt = e;
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Lifecycle clean up on success
    const handleAppInstalled = () => {
      deferredPrompt = null;
      setShowInstallBanner(false);
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
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        localStorage.setItem('pwa_banner_dismissed', 'true');
        setShowInstallBanner(false);
      }
      deferredPrompt = null;
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showInstallBanner && (
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
                className="px-3 sm:px-4 py-2 bg-[#FF9305] hover:bg-[#E68505] text-white text-[11px] sm:text-xs font-bold rounded-lg transition-colors active:scale-[0.98] shadow-sm shadow-[#FF9305]/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Instalar
              </button>
              <button 
                onClick={handleDismiss}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                aria-label="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
