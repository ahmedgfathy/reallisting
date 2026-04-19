import React from 'react';
import './Header.css';

const viewTitles = {
  dashboard: 'لوحة التحكم',
  listings: 'الإعلانات',
  import: 'الاستيراد',
  review: 'المراجعة',
  duplicates: 'المكررات',
  settings: 'الإعدادات'
};

function Header({ activeView, user, onLogout, isAuthenticated, onShowLogin }) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-title">
        <h2>{viewTitles[activeView] || 'ريل ليستنج'}</h2>
      </div>
      <div className="mobile-header-actions">
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
