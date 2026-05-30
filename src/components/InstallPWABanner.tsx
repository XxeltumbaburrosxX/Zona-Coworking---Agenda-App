import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const deferredPromptRef = useRef<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const hasServiceWorker = 'serviceWorker' in navigator;
    
    console.log(`[PWA Debug] Service Worker supported: ${hasServiceWorker}`);

    // Check if dismissed previously
    const dismissed = localStorage.getItem('pwa_banner_dismissed');
    if (dismissed === 'true') {
      console.log('[PWA Debug] Banner previously dismissed by user.');
      return;
    }

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    console.log(`[PWA Debug] Installability status - Is standalone: ${isStandalone}`);

    if (isStandalone) {
      console.log('[PWA Debug] App is already installed. Hiding banner.');
      return;
    }

    let fallbackTimer: NodeJS.Timeout;

    // Android/Chrome logic
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('[PWA Debug] beforeinstallprompt event fired.');
      e.preventDefault();
      setDeferredPrompt(e);
      deferredPromptRef.current = e;
      setShowInstallBanner(true);
      setIsFallback(false);
      clearTimeout(fallbackTimer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    console.log('[PWA Debug] Waiting for beforeinstallprompt event...');
    
    fallbackTimer = setTimeout(() => {
      if (!deferredPromptRef.current) {
        console.log('[PWA Debug] beforeinstallprompt not fired in 2.5s. Falling back to manual install banner.');
        setIsFallback(true);
        setShowInstallBanner(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      console.log('[PWA Debug] Native install prompt triggered');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('[PWA Debug] User accepted the install prompt.');
        setShowInstallBanner(false);
        localStorage.setItem('pwa_banner_dismissed', 'true');
      } else {
        console.log('[PWA Debug] User dismissed the install prompt.');
      }
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
    } else {
      console.log('[PWA Debug] Fallback used (reason: native install prompt unavailable)');
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      
      if (/android/i.test(userAgent)) {
        console.log('[PWA Debug] Platform detected: Android');
      } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        console.log('[PWA Debug] Platform detected: iOS');
      } else {
        console.log('[PWA Debug] Platform detected: Desktop');
      }

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Zona Coworking',
            text: 'Instala esta aplicación',
            url: window.location.href,
          });
          console.log('[PWA Debug] Share API triggered for manual installation');
        } catch (error) {
          console.log('[PWA Debug] Error triggering share API:', error);
        }
      } else {
        console.log('[PWA Debug] Minimal fallback (Share API unsupported)');
      }
    }
  };

  const handleDismiss = () => {
    console.log('[PWA Debug] User manually dismissed the banner.');
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
          className="flex-shrink-0 w-full bg-white border-b border-slate-200 shadow-sm relative z-50 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <div className="flex-shrink-0 w-10 h-10 bg-zinc-100 rounded-xl overflow-hidden shadow-inner border border-slate-200 hidden sm:block mt-0.5">
                <img src="https://i.ibb.co/Wp4cVb35/Icono-Agenda-ZC.png" alt="Icono" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-brand-blue font-bold text-sm flex items-center gap-2 truncate">
                  Zona Coworking
                  {isFallback && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest leading-none">
                      <Info size={10} /> Fallback
                    </span>
                  )}
                </h4>
                <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug truncate">
                  Instala esta app para una experiencia app-like más rápida.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={handleInstallClick}
                className="px-3 sm:px-4 py-2 bg-brand-orange hover:bg-[#E68505] text-white text-[11px] sm:text-xs font-bold rounded-lg transition-colors active:scale-[0.98] shadow-sm shadow-orange-500/20 flex items-center justify-center gap-1.5"
              >
                <Download size={14} /> {isFallback ? "Install App" : "Instalar"}
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
  );
}
