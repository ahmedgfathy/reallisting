import React from 'react';
import './BrokerCard.css';

function BrokerCard({ broker, isUserActive }) {
  const initials = broker.name ? broker.name.charAt(0).toUpperCase() : '?';
  const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const colorIndex = broker.name ? broker.name.charCodeAt(0) % colors.length : 0;
  const avatarColor = colors[colorIndex];

  return (
    <div className="broker-card">
      <div className="broker-avatar" style={{ background: avatarColor }}>
        {initials}
      </div>
      <div className="broker-info">
        <span className="broker-name">{broker.name || 'غير معروف'}</span>
        {isUserActive ? (
          <span className="broker-phone" dir="ltr">{broker.phone}</span>
        ) : (
          <span className="broker-phone-locked">🔒 محجوب</span>
        )}
        <span className="broker-count">{broker.count} إعلان</span>
      </div>
      {isUserActive && broker.phone && (
        <div className="broker-actions">
          <a href={`tel:${broker.phone}`} className="broker-action-btn phone" title="اتصال">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

export default BrokerCard;
