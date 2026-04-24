import React, { useState } from 'react';
import './PublicHero.css';

const PROPERTY_TYPE_FILTERS = [
  { label: 'شقق', icon: '🏢', value: 'شقة' },
  { label: 'فلل', icon: '🏡', value: 'فيلا' },
  { label: 'أراضي', icon: '🏗️', value: 'أرض' },
  { label: 'محلات', icon: '🏪', value: 'محل' },
];

function PublicHero({ onLoginClick, stats, messages, onViewChange }) {
  const [activeFilter, setActiveFilter] = useState(null);
  const recentProperties = messages ? messages.slice(0, 6) : [];

  const handleFilterClick = (filterValue) => {
    setActiveFilter(prev => (prev === filterValue ? null : filterValue));
  };

  const handleBrowseAll = () => {
    if (onViewChange) onViewChange('listings');
    else onLoginClick();
  };

  const filteredRecent = activeFilter
    ? recentProperties.filter(m => m.property_type === activeFilter)
    : recentProperties;

  return (
    <div className="public-landing" dir="rtl">

      {/* ── Hero Section ─────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-overlay" />
        <div className="landing-hero-content">
          <div className="landing-brand">
            <span className="landing-brand-icon">🏠</span>
            <h1 className="landing-brand-name">كونتابو</h1>
            <p className="landing-brand-tagline">شبكة الإعلانات العقارية الموثوقة</p>
          </div>

          <div className="landing-quick-filters">
            {PROPERTY_TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                className={`landing-filter-pill${activeFilter === f.value ? ' active' : ''}`}
                onClick={() => handleFilterClick(f.value)}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <button className="landing-browse-btn" onClick={handleBrowseAll}>
            🔍 تصفح جميع العقارات
          </button>
        </div>
      </section>

      {/* ── Stats Section ────────────────────────────── */}
      {stats && (
        <section className="landing-stats">
          <div className="landing-stat-card">
            <span className="landing-stat-icon">🏠</span>
            <span className="landing-stat-number">
              {(stats.totalMessages || 0).toLocaleString('ar-EG')}
            </span>
            <span className="landing-stat-label">إعلان عقاري</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat-card">
            <span className="landing-stat-icon">👤</span>
            <span className="landing-stat-number">
              {(stats.totalSenders || 0).toLocaleString('ar-EG')}
            </span>
            <span className="landing-stat-label">وسيط عقاري</span>
          </div>
        </section>
      )}

      {/* ── Recent Properties ────────────────────────── */}
      {recentProperties.length > 0 && (
        <section className="landing-recent">
          <div className="landing-section-header">
            <h2 className="landing-section-title">أحدث الإعلانات</h2>
            <button className="landing-see-all-btn" onClick={handleBrowseAll}>
              عرض الكل ←
            </button>
          </div>
          <div className="landing-properties-grid">
            {(filteredRecent.length > 0 ? filteredRecent : recentProperties).map(msg => (
              <div key={msg.id} className="landing-property-card" onClick={handleBrowseAll}>
                <div className="landing-property-badges">
                  {msg.property_type && msg.property_type !== 'أخرى' && (
                    <span className="landing-badge-type">{msg.property_type}</span>
                  )}
                  {msg.region && msg.region !== 'أخرى' && (
                    <span className="landing-badge-region">📍 {msg.region}</span>
                  )}
                  {msg.purpose && msg.purpose !== 'أخرى' && (
                    <span className="landing-badge-purpose">
                      {msg.purpose === 'بيع' ? 'للبيع' : msg.purpose === 'إيجار' ? 'للإيجار' : msg.purpose}
                    </span>
                  )}
                </div>
                <p className="landing-property-text">
                  {msg.message
                    ? (msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message)
                    : 'لا يوجد وصف'}
                </p>
                <div className="landing-property-footer">
                  <span className="landing-contact-hint">🔒 سجّل الدخول لرؤية التفاصيل</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Broker CTA ───────────────────────────────── */}
      <section className="landing-cta">
        <span className="landing-cta-icon">🔑</span>
        <h2>هل أنت وسيط عقاري؟</h2>
        <p>سجّل دخولك للوصول إلى بيانات التواصل المباشر مع الوسطاء</p>
        <button className="landing-login-btn" onClick={onLoginClick}>
          تسجيل الدخول للوسطاء
        </button>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="landing-footer">
        <span className="landing-footer-brand">🏠 كونتابو</span>
        <span className="landing-footer-copy">© {new Date().getFullYear()} — شبكة الإعلانات العقارية</span>
      </footer>

    </div>
  );
}

export default PublicHero;
