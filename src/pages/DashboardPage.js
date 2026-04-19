import React from 'react';
import StatCard from '../components/StatCard';
import './DashboardPage.css';

function DashboardPage({ stats, messages, user, onViewChange, isUserActive }) {
  const recentMessages = messages ? messages.slice(0, 6) : [];
  const now = new Date();
  const currentDate = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(now);
  const currentTime = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(now);

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1>مرحباً{user ? `، ${user.username}` : ''} 👋</h1>
          <p>هذا ملخص النشاط العقاري في منصتك</p>
          <div className="dashboard-welcome-meta">
            <span>{currentDate}</span>
            <span>{currentTime}</span>
          </div>
        </div>
        <div className="dashboard-welcome-badge">
          {user?.role === 'admin' ? '⚙️ مدير' : isUserActive ? '✅ مشترك' : '🔓 زائر'}
        </div>
      </div>

      <div className="dashboard-stats-grid">
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          }
          label="إجمالي العقارات"
          value={stats?.totalMessages || 0}
          color="var(--color-primary)"
        />
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          }
          label="المرسلون"
          value={stats?.totalSenders || 0}
          color="var(--color-accent)"
        />
      </div>

      <div className="dashboard-quick-actions">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={() => onViewChange('listings')}>
            <span className="quick-action-icon">🏠</span>
            <span>عرض العقارات</span>
          </button>
          <button className="quick-action-btn" onClick={() => onViewChange('leads')}>
            <span className="quick-action-icon">👥</span>
            <span>عرض العملاء المحتملين</span>
          </button>
        </div>
      </div>

      {recentMessages.length > 0 && (
        <div className="dashboard-recent">
          <div className="dashboard-section-header">
            <h2>آخر العقارات</h2>
            <button className="see-all-btn" onClick={() => onViewChange('listings')}>عرض الكل</button>
          </div>
          <div className="recent-listings">
            {recentMessages.map(msg => (
              <div key={msg.id} className="recent-listing-item" onClick={() => onViewChange('listings')}>
                <div className="recent-listing-badges">
                  {msg.property_type && msg.property_type !== 'أخرى' && (
                    <span className="recent-badge">{msg.property_type}</span>
                  )}
                  {msg.region && msg.region !== 'أخرى' && (
                    <span className="recent-region">{msg.region}</span>
                  )}
                </div>
                <p className="recent-listing-text">
                  {msg.message && msg.message.length > 80 ? msg.message.substring(0, 80) + '...' : msg.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
