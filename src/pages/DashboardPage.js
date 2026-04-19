import React from 'react';
import StatCard from '../components/StatCard';
import './DashboardPage.css';

function DashboardPage({ stats, messages, user, onViewChange, isUserActive, isAdmin, buildWhatsAppHref, buildCardTitle }) {
  const recentMessages = messages ? messages.slice(0, 6) : [];

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1>مرحباً{user ? `، ${user.username}` : ''} 👋</h1>
          <p>هذا ملخص النشاط العقاري في منصتك</p>
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
          label="إجمالي الإعلانات"
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
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M12 1C8.676 1 6 3.676 6 7c0 2.43 1.376 4.546 3.4 5.644C5.644 13.864 3 17.166 3 21h2c0-3.86 3.14-7 7-7s7 3.14 7 7h2c0-3.834-2.644-7.136-6.4-8.356C16.624 11.546 18 9.43 18 7c0-3.324-2.676-6-6-6zm0 2c2.206 0 4 1.794 4 4s-1.794 4-4 4-4-1.794-4-4 1.794-4 4-4z" />
            </svg>
          }
          label="المشتركون"
          value={stats?.totalSubscribers || 0}
          color="var(--color-success)"
        />
        <StatCard
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
              <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
            </svg>
          }
          label="الملفات المستوردة"
          value={stats?.totalFiles || 0}
          color="var(--color-warning)"
        />
      </div>

      <div className="dashboard-quick-actions">
        <h2>إجراءات سريعة</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={() => onViewChange('listings')}>
            <span className="quick-action-icon">🏠</span>
            <span>عرض الإعلانات</span>
          </button>
          {isAdmin && (
            <button className="quick-action-btn" onClick={() => onViewChange('import')}>
              <span className="quick-action-icon">📥</span>
              <span>استيراد ملفات</span>
            </button>
          )}
          <button className="quick-action-btn" onClick={() => onViewChange('settings')}>
            <span className="quick-action-icon">⚙️</span>
            <span>الإعدادات</span>
          </button>
        </div>
      </div>

      {recentMessages.length > 0 && (
        <div className="dashboard-recent">
          <div className="dashboard-section-header">
            <h2>آخر الإعلانات</h2>
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
