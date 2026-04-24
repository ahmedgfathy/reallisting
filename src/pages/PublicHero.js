import React from 'react';
import './PublicHero.css';

function PublicHero({ onLoginClick, stats }) {
  return (
    <div className="public-hero">
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

        <p className="hero-description">
          اكتشف أحدث الإعلانات العقارية — شقق، فلل، أراضي وأكثر.
          <br />
          سجّل دخولك للوصول إلى بيانات الوسطاء والتواصل المباشر معهم.
        </p>

        <button className="hero-login-btn" onClick={onLoginClick}>
          🔑 تسجيل الدخول للوسطاء
        </button>
      </div>
    </div>
  );
}

export default PublicHero;
