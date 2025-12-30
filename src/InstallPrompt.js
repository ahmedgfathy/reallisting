import React, { useState, useEffect } from 'react';
import './InstallPrompt.css';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return; // App is already installed
    }

    // Check if dismissed recently (within 24 hours)
    const dismissed = localStorage.getItem('pwaPromptDismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show iOS install instructions after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
      return;
    }

    // For Android/Chrome
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt-overlay">
      <div className="install-prompt">
        <button className="install-close" onClick={handleDismiss}>✕</button>
        
        <div className="install-icon">
          <img src="/logo192.png" alt="كونتابو" />
        </div>
        
        <h2>تثبيت تطبيق كونتابو</h2>
        <p>أضف التطبيق إلى شاشتك الرئيسية للوصول السريع</p>
        
        {isIOS ? (
          <div className="ios-instructions">
            <p className="ios-step">
              <span className="step-num">1</span>
              اضغط على زر المشاركة 
              <span className="ios-icon">⬆️</span>
            </p>
            <p className="ios-step">
              <span className="step-num">2</span>
              اختر "إضافة إلى الشاشة الرئيسية"
              <span className="ios-icon">➕</span>
            </p>
            <button className="install-btn ios-btn" onClick={handleDismiss}>
              فهمت
            </button>
          </div>
        ) : (
          <div className="install-actions">
            <button className="install-btn primary" onClick={handleInstall}>
              📲 تثبيت التطبيق
            </button>
            <button className="install-btn secondary" onClick={handleDismiss}>
              ليس الآن
            </button>
          </div>
        )}
        
        <div className="install-features">
          <span>✓ وصول سريع</span>
          <span>✓ بدون متصفح</span>
          <span>✓ إشعارات</span>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
