import React from 'react';
import './Sidebar.css';

const navItems = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    )
  },
  {
    id: 'listings',
    label: 'الإعلانات',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    )
  },
  {
    id: 'brokers',
    label: 'الوسطاء',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    )
  },
  {
    id: 'import',
    label: 'الاستيراد',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
      </svg>
    )
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
      </svg>
    )
  }
];

function Sidebar({ activeView, onViewChange, user, onLogout, stats, onShowLogin }) {
  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.svg" alt="كونتابو" className="sidebar-logo" onError={e => { e.target.style.display = 'none'; }} />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">كونتابو</span>
          <span className="sidebar-brand-tagline">منصة عقارية ذكية</span>
        </div>
      </div>

      {stats && (
        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <span className="sidebar-stat-value">{stats.totalMessages || 0}</span>
            <span className="sidebar-stat-label">إعلان</span>
          </div>
          <div className="sidebar-stat">
            <span className="sidebar-stat-value">{stats.totalSenders || 0}</span>
            <span className="sidebar-stat-label">وسيط</span>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item${activeView === item.id ? ' active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span className="sidebar-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(user.username || 'م').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.username}</span>
              <span className="sidebar-user-role">{user.role === 'admin' ? 'مدير' : 'مستخدم'}</span>
            </div>
            <button className="sidebar-logout-btn" onClick={onLogout} title="تسجيل الخروج">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4zM5 5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h7v-2H5V5z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="sidebar-user-placeholder">
            <span>غير مسجل</span>
            <button type="button" className="sidebar-login-btn" onClick={onShowLogin}>
              تسجيل الدخول
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
