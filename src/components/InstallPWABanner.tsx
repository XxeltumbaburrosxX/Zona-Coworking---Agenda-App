import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

let deferredPrompt: any = null;

function checkIfAppIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 1. Display mode standalone query
  const isStandaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandaloneQuery) return true;
  
  // 2. iOS standalone check
  if ('standalone' in window.navigator && (window.navigator as any).standalone) {
    return true;
  }
  
  // 3. Android TWA check via referrer
  if (document.referrer && document.referrer.includes('android-app://')) {
    return true;
  }
  
  // 4. Other displaying modes like minimal-ui or fullscreen
  if (window.matchMedia('(display-mode: minimal-ui)').matches || window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }

  return false;
}

export function InstallPWABanner() {
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';
      if (dismissed) return false;
      
      if (checkIfAppIsStandalone()) return false;

      // If we already captured the event early globally in index.html, initialize to true
      if ((window as any).deferredPrompt) {
        deferredPrompt = (window as any).deferredPrompt;
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    // Immediate immunity check: If already dismissed or running in standalone PWA, never show the banner
    const dismissed = localStorage.getItem('pwa_banner_dismissed') === 'true';
    if (dismissed || checkIfAppIsStandalone()) {
      setShowInstallBanner(false);
      return;
    }

    // Double check with navigator.getInstalledRelatedApps if supported by the browser
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps && relatedApps.length > 0) {
          // Already installed, don't show or shut banner down immediately
          setShowInstallBanner(false);
          return;
        }
      }).catch((err: any) => {
        console.warn('Silent PWA related apps pass:', err);
      });
    }

    // Fallback if window.deferredPrompt is filled after the custom event or initialization
    if ((window as any).deferredPrompt && !deferredPrompt) {
      deferredPrompt = (window as any).deferredPrompt;
      setShowInstallBanner(true);
    }

    // Intercept native Chrome events (standard and custom dispatch)
    const handlePromptReady = (e: any) => {
      const event = e.detail || e;
      if (event) {
        event.preventDefault();
        deferredPrompt = event;
        // Verify we are not standalone before showing
        if (!checkIfAppIsStandalone()) {
          setShowInstallBanner(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handlePromptReady);
    window.addEventListener('deferredpromptready', handlePromptReady);

    // Clean up when the app is installed successfully
    const handleAppInstalled = () => {
      deferredPrompt = null;
      (window as any).deferredPrompt = null;
      setShowInstallBanner(false);
      localStorage.setItem('pwa_banner_dismissed', 'true');
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePromptReady);
      window.removeEventListener('deferredpromptready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        console.log('PWA installation choice:', choiceResult.outcome);
        
        if (choiceResult.outcome === 'accepted') {
          localStorage.setItem('pwa_banner_dismissed', 'true');
        }
      } catch (err) {
        console.error('Failed to trigger PWA native install prompt:', err);
      } finally {
        deferredPrompt = null;
        (window as any).deferredPrompt = null;
        setShowInstallBanner(false);
      }
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
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} // Super snappy cubic transition
          className="flex-shrink-0 w-full bg-gradient-to-r from-[#182865] via-[#1c2e75] to-[#121f52] border-b-2 border-[#FF9305]/85 shadow-lg relative z-50 overflow-hidden text-white font-sans"
        >
          {/* Subtle Ambient background glow behind the logo */}
          <div className="absolute -left-8 -top-8 w-24 h-24 bg-[#FF9305]/15 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <div className="flex-shrink-0 w-9 h-9 bg-white/10 backdrop-blur-md rounded-xl overflow-hidden shadow-md border border-white/15">
                <img src="https://i.ibb.co/Wp4cVb35/Icono-Agenda-ZC.png" alt="Icono" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5 truncate text-white leading-normal">
                  Zona Coworking
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF9305] animate-pulse"></span>
                </h4>
                <p className="text-blue-100/90 text-[11px] sm:text-xs leading-none mt-0.5 truncate">
                  Instala el dashboard oficial para una experiencia ultrarrápida y sin barras.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={handleInstallClick}
                className="px-4 sm:px-5 py-2 bg-[#FF9305] hover:bg-[#E08103] active:bg-[#CC7604] text-white text-[11.5px] sm:text-xs font-black rounded-xl transition-all active:scale-[0.96] shadow-md shadow-[#FF9305]/20 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-lg hover:shadow-[#FF9305]/30"
              >
                <Download size={13} className="stroke-[3]" /> Instalar
              </button>
              <button 
                onClick={handleDismiss}
                className="w-8 h-8 flex items-center justify-center text-blue-200 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
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

