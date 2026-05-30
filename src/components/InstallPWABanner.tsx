import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Share, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const deferredPromptRef = useRef<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOSFolder, setIsIOSFolder] = useState(false);
  const [isSimulation, setIsSimulation] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const isDevEnv = window.location.hostname.includes('ais-dev-');
    const hasServiceWorker = 'serviceWorker' in navigator;
    
    console.log(`[PWA Debug] Current Environment: ${window.location.hostname}`);
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

    if (isStandalone && !isDevEnv) {
      console.log('[PWA Debug] App is already installed. Hiding banner.');
      return;
    }

    if (isDevEnv) {
      console.log('[PWA Debug] AI Studio Development Preview detected. Forcing install prompt simulation.');
      setIsSimulation(true);
      setShowInstallBanner(true);
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

    // iOS logic
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS && !isStandalone) {
      console.log('[PWA Debug] iOS device detected. Showing fallback iOS installation message.');
      setIsIOSFolder(true);
      setShowInstallBanner(true);
    } else if (!isStandalone) {
      console.log('[PWA Debug] Waiting for beforeinstallprompt event...');
      
      fallbackTimer = setTimeout(() => {
        if (!deferredPromptRef.current) {
          console.log('[PWA Debug] beforeinstallprompt not fired in 2.5s. Falling back to manual install banner.');
          setIsFallback(true);
          setShowInstallBanner(true);
        }
      }, 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const showPlatformInstructions = () => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) {
      alert("Android: Tap menu (⋮) → Install App");
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      alert("iOS: Tap Share → Add to Home Screen");
    } else {
      alert("Desktop: Click install icon in address bar");
    }
  };

  const handleInstallClick = async () => {
    if (isSimulation) {
      console.log('[PWA Debug] Simulated install button clicked.');
      alert('Development Preview - Install prompt simulation.\n\nIn a production environment, the browser native install dialog would appear here.');
      setShowInstallBanner(false);
      localStorage.setItem('pwa_banner_dismissed', 'true');
      return;
    }

    if (!deferredPrompt) {
      console.log('[PWA Debug] No deferredPrompt available, showing manual instructions.');
      showPlatformInstructions();
      return;
    }

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
                  {isSimulation && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-widest leading-none">
                      <Info size={10} /> Preview
                    </span>
                  )}
                  {isFallback && !isSimulation && !isIOSFolder && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-bold uppercase tracking-widest leading-none">
                      <Info size={10} /> Fallback
                    </span>
                  )}
                </h4>
                {isIOSFolder ? (
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug">
                    Instala esta app: Toca Compartir <Share size={12} className="inline mx-[2px] align-text-bottom text-slate-700" /> y "Agregar a inicio".
                  </p>
                ) : isSimulation ? (
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug truncate">
                    Development Preview - Install prompt simulation.
                  </p>
                ) : (
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-snug truncate">
                    Instala esta app para una experiencia app-like más rápida.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {(!isIOSFolder || isFallback) && (
                <button 
                  onClick={handleInstallClick}
                  className="px-3 sm:px-4 py-2 bg-brand-orange hover:bg-[#E68505] text-white text-[11px] sm:text-xs font-bold rounded-lg transition-colors active:scale-[0.98] shadow-sm shadow-orange-500/20 flex items-center justify-center gap-1.5"
                >
                  <Download size={14} /> {isFallback ? "Install App" : "Instalar"}
                </button>
              )}
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
