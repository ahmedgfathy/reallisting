import React, { useState } from 'react';
import './PublicHero.css';

const PROPERTY_TYPE_PILLS = [
  { label: 'شقق', value: 'شقة', icon: '🏢' },
  { label: 'فلل', value: 'فيلا', icon: '🏡' },
  { label: 'أراضي', value: 'أرض', icon: '🌍' },
  { label: 'محلات', value: 'محل', icon: '🏪' },
];

function PublicHero({ onLoginClick, stats, messages, onSearch, onFilterByType }) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchInput.trim());
  };

  const handlePillClick = (typeValue) => {
    if (onFilterByType) onFilterByType(typeValue);
  };

  const recentListings = messages ? messages.slice(0, 6) : [];

  return (
    <div className="public-hero-page" dir="rtl">

      {/* Hero Section */}
      <section className="public-hero">
        <div className="hero-content">
          <div className="hero-brand">
            <span className="hero-icon">🏠</span>
            <h1 className="hero-title">كونتابو</h1>
            <p className="hero-tagline">شبكة الإعلانات العقارية</p>
          </div>

          {stats && (
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">{(stats.totalMessages || 0).toLocaleString('ar-EG')}</span>
                <span className="hero-stat-label">إعلان عقاري</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">{(stats.totalSenders || 0).toLocaleString('ar-EG')}</span>
                <span className="hero-stat-label">وسيط عقاري</span>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <form className="hero-search-form" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              className="hero-search-input"
              placeholder="ابحث عن شقة، فيلا، أرض..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="hero-search-btn">🔍 بحث</button>
          </form>

          {/* Property Type Pills */}
          <div className="hero-pills">
            {PROPERTY_TYPE_PILLS.map((pill) => (
              <button
                key={pill.value}
                className="hero-pill"
                onClick={() => handlePillClick(pill.value)}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Properties Section */}
      {recentListings.length > 0 && (
        <section className="hero-recent-section">
          <h2 className="hero-section-title">آخر الإعلانات العقارية</h2>
          <div className="hero-recent-grid">
            {recentListings.map((msg) => (
              <div key={msg.id} className="hero-recent-card">
                <div className="hero-recent-badges">
                  {msg.property_type && msg.property_type !== 'أخرى' && (
                    <span className="hero-badge-type">{msg.property_type}</span>
                  )}
                  {msg.region && msg.region !== 'أخرى' && (
                    <span className="hero-badge-region">{msg.region}</span>
                  )}
                  {msg.purpose && msg.purpose !== 'أخرى' && (
                    <span className="hero-badge-purpose">{msg.purpose}</span>
                  )}
                </div>
                <p className="hero-recent-text">
                  {msg.message && msg.message.length > 100
                    ? msg.message.substring(0, 100) + '...'
                    : msg.message}
                </p>
                <div className="hero-recent-meta">
                  <span className="hero-recent-sender">🧑‍💼 {msg.sender_name || 'وسيط'}</span>
                  <span className="hero-recent-date">🗓️ {msg.date_of_creation ? new Date(msg.date_of_creation).toLocaleDateString('ar-EG') : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Login CTA Section */}
      <section className="hero-cta-section">
        <div className="hero-cta-content">
          <h2 className="hero-cta-title">هل أنت وسيط عقاري؟</h2>
          <p className="hero-cta-desc">
            سجّل دخولك للوصول إلى بيانات التواصل مع الوسطاء وإدارة الإعلانات العقارية.
          </p>
          <button className="hero-login-btn" onClick={onLoginClick}>
            🔑 تسجيل الدخول
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="hero-footer">
        <p>© {new Date().getFullYear()} كونتابو — منصة الإعلانات العقارية العربية</p>
      </footer>

    </div>
  );
}

export default PublicHero;
