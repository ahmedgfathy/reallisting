import React, { useEffect, useMemo, useState } from 'react';
import './PublicHero.css';

function PublicHero({ onLoginClick, stats, featuredImage }) {
  const internetSlides = [
    'https://images.pexels.com/photos/7587880/pexels-photo-7587880.jpeg?cs=srgb&dl=pexels-artbovich-7587880.jpg&fm=jpg',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80',
    'https://images.pexels.com/photos/7587882/pexels-photo-7587882.jpeg?cs=srgb&dl=pexels-artbovich-7587882.jpg&fm=jpg'
  ];
  const safeFeaturedImage = typeof featuredImage === 'string' ? featuredImage.trim() : '';
  const slides = useMemo(() => {
    return [safeFeaturedImage, ...internetSlides].filter((src, index, arr) => src && arr.indexOf(src) === index);
  }, [safeFeaturedImage]);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setActiveSlide(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="public-hero">
      <div className="public-hero-slider" aria-hidden="true">
        {slides.map((src, index) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`public-hero-slide${index === activeSlide ? ' active' : ''}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ))}
      </div>

      <div className="public-hero-backdrop">
        <header className="public-hero-header">
          <div className="public-hero-brand">
            <img src="/logo.svg" alt="كونتابو" className="public-hero-logo" />
            <div className="public-hero-brand-text">
              <span className="public-hero-name">كونتابو</span>
              <span className="public-hero-tagline">منصة عقارية للجمهور</span>
            </div>
          </div>
          <nav className="public-hero-nav" aria-label="Public navigation">
            <a href="#market-listings">للبيع</a>
            <a href="#market-listings">للإيجار</a>
            <a href="#market-listings">مشروعات جديدة</a>
            <a href="#market-listings">تواصل مع وسيط</a>
          </nav>
          <button className="public-hero-login" onClick={onLoginClick}>
            دخول الوسطاء
          </button>
        </header>

        <div className="public-hero-content">
          <p className="public-hero-eyebrow">بوابة العقارات في مصر</p>
          <h1 className="public-hero-title">ابحث عن بيتك المقبل بثقة وسرعة</h1>
          <p className="public-hero-description">
            استكشف عروض البيع والإيجار في مكان واحد مع تفاصيل أوضح، صور أفضل، وفلاتر تبحث كما يفكر المشتري الحقيقي.
          </p>

          {stats && (
            <div className="public-hero-stats">
              <div className="public-hero-stat">
                <span className="public-hero-stat-value">{(stats.totalMessages || 0).toLocaleString('ar-EG')}</span>
                <span className="public-hero-stat-label">عقار منشور</span>
              </div>
              <div className="public-hero-stat">
                <span className="public-hero-stat-value">{(stats.totalSenders || 0).toLocaleString('ar-EG')}</span>
                <span className="public-hero-stat-label">وسيط موثق</span>
              </div>
            </div>
          )}

          <div className="public-hero-actions">
            <a className="public-hero-action primary" href="#market-listings">
              استكشف العقارات
            </a>
            <button className="public-hero-action secondary" onClick={onLoginClick}>
              تسجيل الدخول
            </button>
          </div>

          {slides.length > 1 && (
            <div className="public-hero-dots" aria-label="Hero image slider controls">
              {slides.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  className={`public-hero-dot${index === activeSlide ? ' active' : ''}`}
                  onClick={() => setActiveSlide(index)}
                  aria-label={`صورة ${index + 1}`}
                  aria-pressed={index === activeSlide}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default PublicHero;
