import React, { useState } from 'react';
import './PublicHero.css';

const PROPERTY_TYPE_FILTERS = [
  { label: 'شقق', icon: '🏢', value: 'شقة' },
  { label: 'فلل', icon: '🏡', value: 'فيلا' },
  { label: 'أراضي', icon: '🏗️', value: 'أرض' },
  { label: 'محلات', icon: '🏪', value: 'محل' },
  { label: 'مكاتب', icon: '🏬', value: 'مكتب' },
  { label: 'عمارات', icon: '🏛️', value: 'عمارة' },
];

const PURPOSE_TABS = [
  { label: 'للبيع', value: 'بيع' },
  { label: 'للإيجار', value: 'إيجار' },
];

const FEATURES = [
  { icon: '✅', title: 'إعلانات موثّقة', desc: 'جميع الإعلانات مراجعة ومُحدَّثة باستمرار' },
  { icon: '🤝', title: 'وسطاء معتمدون', desc: 'تواصل مباشر مع وسطاء موثوقين' },
  { icon: '🔍', title: 'بحث متقدّم', desc: 'فلاتر دقيقة للعثور على عقارك بسهولة' },
  { icon: '📱', title: 'متاح دائماً', desc: 'تصفّح العقارات في أي وقت ومن أي مكان' },
];

function PublicHero({ onLoginClick, stats, messages, onViewChange }) {
  const [activePurpose, setActivePurpose] = useState('بيع');
  const [activeType, setActiveType] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const recentProperties = messages ? messages.slice(0, 8) : [];

  const handleBrowseAll = () => {
    if (onViewChange) onViewChange('listings');
    else onLoginClick();
  };

  const handleSearch = (e) => {
    e.preventDefault();
    handleBrowseAll();
  };

  const displayedProperties = recentProperties.filter(m => {
    const matchType = activeType ? m.property_type === activeType : true;
    const matchPurpose = m.purpose === activePurpose || !m.purpose;
    return matchType && matchPurpose;
  });

  const shownProperties = displayedProperties.length > 0 ? displayedProperties : recentProperties;

  const regions = messages
    ? [...new Set(messages.map(m => m.region).filter(r => r && r !== 'أخرى'))].slice(0, 8)
    : [];

  return (
    <div className="pf-landing" dir="rtl">

      {/* ── Top Navigation ───────────────────────────── */}
      <header className="pf-navbar">
        <div className="pf-navbar-inner">
          <div className="pf-navbar-brand">
            <span className="pf-brand-logo">🏠</span>
            <span className="pf-brand-text">كونتابو</span>
          </div>
          <nav className="pf-navbar-links">
            <button className="pf-nav-link" onClick={() => { setActivePurpose('بيع'); handleBrowseAll(); }}>شراء</button>
            <button className="pf-nav-link" onClick={() => { setActivePurpose('إيجار'); handleBrowseAll(); }}>إيجار</button>
            <button className="pf-nav-link" onClick={handleBrowseAll}>جميع العقارات</button>
          </nav>
          <div className="pf-navbar-actions">
            <button className="pf-btn-login" onClick={onLoginClick}>تسجيل الدخول</button>
          </div>
        </div>
      </header>

      {/* ── Hero / Search Section ─────────────────────── */}
      <section className="pf-hero">
        <div className="pf-hero-bg" />
        <div className="pf-hero-content">
          <h1 className="pf-hero-title">ابحث عن عقارك المثالي</h1>
          <p className="pf-hero-subtitle">آلاف العقارات في مصر — بيع، إيجار، شقق، فلل وأكثر</p>

          <div className="pf-search-box">
            <div className="pf-search-purpose-tabs">
              {PURPOSE_TABS.map(t => (
                <button
                  key={t.value}
                  className={`pf-purpose-tab${activePurpose === t.value ? ' active' : ''}`}
                  onClick={() => setActivePurpose(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <form className="pf-search-form" onSubmit={handleSearch}>
              <div className="pf-search-fields">
                <div className="pf-search-field pf-search-field--type">
                  <span className="pf-search-field-icon">🏠</span>
                  <select
                    className="pf-search-select"
                    value={activeType || ''}
                    onChange={e => setActiveType(e.target.value || null)}
                  >
                    <option value="">نوع العقار</option>
                    {PROPERTY_TYPE_FILTERS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div className="pf-search-divider" />
                <div className="pf-search-field pf-search-field--location">
                  <span className="pf-search-field-icon">📍</span>
                  <input
                    className="pf-search-input"
                    type="text"
                    placeholder="المنطقة أو المدينة..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="pf-search-btn">
                <span>🔍</span>
                <span>بحث</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────── */}
      {stats && (
        <div className="pf-stats-bar">
          <div className="pf-stats-inner">
            <div className="pf-stat-item">
              <span className="pf-stat-value">{(stats.totalMessages || 0).toLocaleString('ar-EG')}+</span>
              <span className="pf-stat-label">إعلان عقاري</span>
            </div>
            <div className="pf-stat-sep" />
            <div className="pf-stat-item">
              <span className="pf-stat-value">{(stats.totalSenders || 0).toLocaleString('ar-EG')}+</span>
              <span className="pf-stat-label">وسيط معتمد</span>
            </div>
            <div className="pf-stat-sep" />
            <div className="pf-stat-item">
              <span className="pf-stat-value">٢٤/٧</span>
              <span className="pf-stat-label">متاح دائماً</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Property Type Categories ─────────────────── */}
      <section className="pf-categories">
        <div className="pf-section-inner">
          <h2 className="pf-section-title">تصفّح حسب نوع العقار</h2>
          <div className="pf-categories-grid">
            {PROPERTY_TYPE_FILTERS.map(f => (
              <button
                key={f.value}
                className={`pf-category-card${activeType === f.value ? ' active' : ''}`}
                onClick={() => { setActiveType(prev => prev === f.value ? null : f.value); }}
              >
                <span className="pf-category-icon">{f.icon}</span>
                <span className="pf-category-label">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Listings ───────────────────────────── */}
      {recentProperties.length > 0 && (
        <section className="pf-listings">
          <div className="pf-section-inner">
            <div className="pf-section-header">
              <h2 className="pf-section-title">أحدث الإعلانات</h2>
              <button className="pf-see-all-btn" onClick={handleBrowseAll}>عرض الكل ←</button>
            </div>

            {/* Purpose filter pills */}
            <div className="pf-listings-purpose-filter">
              <button
                className={`pf-pill${activePurpose === 'بيع' ? ' active' : ''}`}
                onClick={() => setActivePurpose('بيع')}
              >للبيع</button>
              <button
                className={`pf-pill${activePurpose === 'إيجار' ? ' active' : ''}`}
                onClick={() => setActivePurpose('إيجار')}
              >للإيجار</button>
              {PROPERTY_TYPE_FILTERS.map(f => (
                <button
                  key={f.value}
                  className={`pf-pill${activeType === f.value ? ' active' : ''}`}
                  onClick={() => setActiveType(prev => prev === f.value ? null : f.value)}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </div>

            <div className="pf-listings-grid">
              {shownProperties.slice(0, 6).map(msg => (
                <div key={msg.id} className="pf-property-card" onClick={handleBrowseAll}>
                  {/* Image area */}
                  <div className="pf-card-image">
                    {msg.image_url ? (
                      <img src={msg.image_url} alt="عقار" className="pf-card-img" />
                    ) : (
                      <div className="pf-card-img-placeholder">
                        <span className="pf-card-img-icon">
                          {PROPERTY_TYPE_FILTERS.find(f => f.value === msg.property_type)?.icon || '🏠'}
                        </span>
                      </div>
                    )}
                    {msg.purpose && msg.purpose !== 'أخرى' && (
                      <span className={`pf-card-purpose-badge pf-purpose--${msg.purpose === 'بيع' ? 'sale' : 'rent'}`}>
                        {msg.purpose === 'بيع' ? 'للبيع' : msg.purpose === 'إيجار' ? 'للإيجار' : msg.purpose}
                      </span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="pf-card-body">
                    <div className="pf-card-meta">
                      {msg.property_type && msg.property_type !== 'أخرى' && (
                        <span className="pf-card-tag">{msg.property_type}</span>
                      )}
                      {msg.category && msg.category !== 'أخرى' && (
                        <span className="pf-card-tag pf-card-tag--cat">{msg.category}</span>
                      )}
                    </div>
                    {msg.region && msg.region !== 'أخرى' && (
                      <p className="pf-card-location">📍 {msg.region}</p>
                    )}
                    <p className="pf-card-desc">
                      {msg.message
                        ? (msg.message.length > 90 ? msg.message.substring(0, 90) + '...' : msg.message)
                        : 'لا يوجد وصف'}
                    </p>
                    <div className="pf-card-footer">
                      <span className="pf-card-lock">🔒 سجّل الدخول لرؤية التفاصيل</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pf-listings-cta">
              <button className="pf-btn-browse" onClick={handleBrowseAll}>
                عرض جميع العقارات
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Explore by Region ────────────────────────── */}
      {regions.length > 0 && (
        <section className="pf-regions">
          <div className="pf-section-inner">
            <h2 className="pf-section-title">تصفّح حسب المنطقة</h2>
            <div className="pf-regions-grid">
              {regions.map(region => (
                <button key={region} className="pf-region-chip" onClick={handleBrowseAll}>
                  <span className="pf-region-icon">📍</span>
                  <span>{region}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Why Us ───────────────────────────────────── */}
      <section className="pf-features">
        <div className="pf-section-inner">
          <h2 className="pf-section-title">لماذا كونتابو؟</h2>
          <div className="pf-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="pf-feature-card">
                <span className="pf-feature-icon">{f.icon}</span>
                <h3 className="pf-feature-title">{f.title}</h3>
                <p className="pf-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Broker CTA ───────────────────────────────── */}
      <section className="pf-broker-cta">
        <div className="pf-broker-cta-inner">
          <div className="pf-broker-cta-text">
            <h2>هل أنت وسيط عقاري؟</h2>
            <p>سجّل دخولك للوصول إلى بيانات التواصل المباشر مع الوسطاء وإدارة إعلاناتك</p>
          </div>
          <button className="pf-btn-cta" onClick={onLoginClick}>
            🔑 تسجيل الدخول للوسطاء
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="pf-footer">
        <div className="pf-footer-inner">
          <div className="pf-footer-brand">
            <span className="pf-footer-logo">🏠</span>
            <span className="pf-footer-name">كونتابو</span>
            <p className="pf-footer-tagline">شبكة الإعلانات العقارية الموثوقة في مصر</p>
          </div>
          <div className="pf-footer-links">
            <button className="pf-footer-link" onClick={handleBrowseAll}>العقارات</button>
            <button className="pf-footer-link" onClick={onLoginClick}>تسجيل الدخول</button>
          </div>
        </div>
        <div className="pf-footer-bottom">
          <span>© {new Date().getFullYear()} كونتابو — جميع الحقوق محفوظة</span>
        </div>
      </footer>

    </div>
  );
}

export default PublicHero;
