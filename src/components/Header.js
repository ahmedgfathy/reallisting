import React from 'react';
import './Header.css';

const viewTitles = {
  dashboard: 'لوحة التحكم',
  listings: 'الإعلانات',
  brokers: 'الوسطاء',
  import: 'الاستيراد',
  review: 'المراجعة',
  duplicates: 'المكررات',
  settings: 'الإعدادات'
};

function Header({ activeView, user, onLogout, isAuthenticated, onShowLogin, darkMode, onToggleDark }) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-title">
        <h2>{viewTitles[activeView] || 'كونتابو'}</h2>
      </div>
      <div className="mobile-header-actions">
        {onToggleDark && (
          <button className="header-icon-btn" onClick={onToggleDark} title={darkMode ? 'وضع النهار' : 'وضع الليل'}>
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
              </svg>
            )}
          </button>
        )}
        {isAuthenticated ? (
          <div className="header-user">
            <div className="header-user-avatar">
              {(user?.username || 'م').charAt(0).toUpperCase()}
            </div>
            <button className="header-icon-btn" onClick={onLogout} title="تسجيل الخروج">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V5z" />
              </svg>
            </button>
          </div>
        ) : (
          <button className="header-login-btn" onClick={onShowLogin}>
            دخول
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
