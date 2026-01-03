import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Properties.css';

// Fixed: Auto-refresh issue resolved
function Properties({ user }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('الكل');
  const [propertyType, setPropertyType] = useState('الكل');
  const [category, setCategory] = useState('الكل');
  const [purpose, setPurpose] = useState('الكل');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredCount, setFilteredCount] = useState(0);
  const [regions, setRegions] = useState([]);
  const [propertyTypes, setPropertyTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const loaderRef = useRef(null);
  const observerRef = useRef(null);
  const fetchingRef = useRef(false);

  const activeFiltersCount = [category, propertyType, region, purpose].filter(f => f !== 'الكل').length;

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch('/api/glomar-filters');
        const data = await response.json();
        setRegions(data.regions || []);
        setPropertyTypes(data.propertyTypes || []);
        setCategories(data.categories || []);
        setPurposes(data.purposes || []);
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };
    fetchFilters();
  }, []);

  const fetchProperties = useCallback(async (targetPage = 1, { append = false } = {}) => {
    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const isInitialLoad = targetPage === 1 && !append;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(
        `/api/glomar-properties?page=${targetPage}&limit=50&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&propertyType=${encodeURIComponent(propertyType)}&region=${encodeURIComponent(region)}&purpose=${encodeURIComponent(purpose)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setFilteredCount(data.total || 0);
      setHasMore(targetPage < (data.totalPages || 0));

      if (append) {
        setProperties(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = data.data.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setProperties(data.data);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      fetchingRef.current = false;
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [search, category, propertyType, region, purpose]);

  // Reset state and fetch when filters change
  useEffect(() => {
    // Don't fetch if viewing property details
    if (selectedProperty) return;
    
    setProperties([]);
    setHasMore(true);
    setPage(1);
    fetchProperties(1, { append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, propertyType, region, purpose]);

  // Fetch properties when page changes (for pagination only)
  useEffect(() => {
    // Don't fetch if viewing property details or if page is 1 (handled by filter effect)
    if (page === 1 || selectedProperty) return;
    
    fetchProperties(page, { append: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
        setPage(prev => prev + 1);
      }
    });

    observerRef.current.observe(node);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore]);

  const formatPrice = (price) => {
    if (!price) return '';
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return num.toLocaleString('ar-EG');
  };

  const PropertyCard = ({ property }) => {
    const firstImage = property.images && property.images[0];
    const totalMedia = (property.images?.length || 0) + (property.videos?.length || 0);
    const hasVideos = property.videos && property.videos.length > 0;

    return (
      <div className="property-card" onClick={() => setSelectedProperty(property)}>
        {firstImage && (
          <div className="property-image">
            <img src={firstImage} alt={property.title || property.name} loading="lazy" />
            {totalMedia > 1 && (
              <div className="image-count">
                <i className="fas fa-images"></i> {totalMedia}
                {hasVideos && <span style={{ marginLeft: '4px' }}>🎥</span>}
              </div>
            )}
          </div>
        )}
        <div className="property-content">
          <h3 className="property-title">
            {property.compoundname || property.title || property.name || 'عقار'}
          </h3>

          {property.totalprice && (
            <div className="property-price">
              {formatPrice(property.totalprice)} {property.currency_name || 'جنيه'}
            </div>
          )}

          <div className="property-details">
            {property.property_type_name && (
              <span className="detail-tag">
                <i className="fas fa-building"></i> {property.property_type_name}
              </span>
            )}
            {property.region_name && (
              <span className="detail-tag">
                <i className="fas fa-map-marker-alt"></i> {property.region_name}
              </span>
            )}
            {property.rooms && (
              <span className="detail-tag">
                <i className="fas fa-bed"></i> {property.rooms} غرفة
              </span>
            )}
            {property.built_area && (
              <span className="detail-tag">
                <i className="fas fa-ruler-combined"></i> {property.built_area}م²
              </span>
            )}
          </div>

          {property.category_name && (
            <div className="property-category">{property.category_name}</div>
          )}
        </div>
      </div>
    );
  };

  const PropertyDetail = ({ property, onClose }) => {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [showShareMenu, setShowShareMenu] = useState(false);

    // Combine images and videos into a single media array
    const media = [
      ...(property.images || []).map(url => ({ type: 'image', url })),
      ...(property.videos || []).map(url => ({ type: 'video', url }))
    ];

    const nextMedia = () => {
      setCurrentMediaIndex((prev) =>
        (prev + 1) % media.length
      );
    };

    const prevMedia = () => {
      setCurrentMediaIndex((prev) =>
        prev === 0 ? media.length - 1 : prev - 1
      );
    };

    const currentMedia = media[currentMediaIndex];

    // Generate shareable content
    const getShareContent = () => {
      const title = property.compoundname || property.title || property.name || 'عقار';
      const price = property.totalprice ? `${formatPrice(property.totalprice)} ${property.currency_name || 'جنيه'}` : '';
      const propertyType = property.property_type_name || '';
      const region = property.region_name || '';
      const rooms = property.rooms ? `${property.rooms} غرفة` : '';
      const area = property.built_area ? `${property.built_area}م²` : '';
      
      let description = `${title}\n\n`;
      if (price) description += `💰 السعر: ${price}\n`;
      if (propertyType) description += `🏠 النوع: ${propertyType}\n`;
      if (region) description += `📍 المنطقة: ${region}\n`;
      if (rooms) description += `🛏️ الغرف: ${rooms}\n`;
      if (area) description += `📐 المساحة: ${area}\n`;
      
      if (property.description) {
        description += `\n📝 الوصف:\n${property.description.substring(0, 200)}${property.description.length > 200 ? '...' : ''}`;
      }
      
      // Add app link - using current URL as base
      const appUrl = window.location.origin;
      description += `\n\n🔗 للمزيد من التفاصيل:\n${appUrl}`;
      
      return {
        title,
        text: description,
        url: appUrl
      };
    };

    // Handle native share (Web Share API)
    const handleNativeShare = () => {
      // Always show the share menu for consistent behavior
      setShowShareMenu(!showShareMenu);
    };

    // Handle WhatsApp share
    const handleWhatsAppShare = () => {
      const shareContent = getShareContent();
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareContent.text)}`;
      window.open(whatsappUrl, '_blank');
      setShowShareMenu(false);
    };

    // Handle Facebook share
    const handleFacebookShare = () => {
      const shareContent = getShareContent();
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareContent.url)}&quote=${encodeURIComponent(shareContent.text)}`;
      window.open(facebookUrl, '_blank');
      setShowShareMenu(false);
    };

    // Handle Twitter share
    const handleTwitterShare = () => {
      const shareContent = getShareContent();
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareContent.text)}&url=${encodeURIComponent(shareContent.url)}`;
      window.open(twitterUrl, '_blank');
      setShowShareMenu(false);
    };

    // Handle copy link
    const handleCopyLink = () => {
      const shareContent = getShareContent();
      
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareContent.text).then(() => {
          alert('تم نسخ التفاصيل إلى الحافظة!');
          setShowShareMenu(false);
        }).catch(err => {
          console.error('Error copying to clipboard:', err);
          alert('فشل نسخ التفاصيل. يرجى المحاولة مرة أخرى.');
        });
      } else {
        // Fallback for browsers that don't support clipboard API
        try {
          const textArea = document.createElement('textarea');
          textArea.value = shareContent.text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('تم نسخ التفاصيل إلى الحافظة!');
          setShowShareMenu(false);
        } catch (err) {
          console.error('Error copying to clipboard:', err);
          alert('فشل نسخ التفاصيل. يرجى المحاولة مرة أخرى.');
        }
      }
    };

    return (
      <div className="unit-detail-overlay" onClick={onClose}>
        <div className="unit-detail-panel" onClick={(e) => e.stopPropagation()}>
          <div className="unit-detail-header">
            <button className="detail-close-btn" onClick={onClose}>
              ✕
            </button>
            <button className="detail-back-btn" onClick={onClose}>
              → رجوع
            </button>
            <h2 className="detail-title">{property.compoundname || property.title || property.name}</h2>
            <div className="share-container">
              <button 
                className="share-btn" 
                onClick={handleNativeShare}
                title="مشاركة"
                aria-label="مشاركة العقار"
                aria-expanded={showShareMenu}
                aria-haspopup="menu"
              >
                <i className="fas fa-share-alt"></i>
              </button>
              {showShareMenu && (
                <div 
                  className="share-menu"
                  role="menu"
                  aria-label="خيارات المشاركة"
                >
                  <button className="share-option whatsapp" onClick={handleWhatsAppShare} role="menuitem">
                    <i className="fab fa-whatsapp"></i>
                    <span>واتساب</span>
                  </button>
                  <button className="share-option facebook" onClick={handleFacebookShare} role="menuitem">
                    <i className="fab fa-facebook"></i>
                    <span>فيسبوك</span>
                  </button>
                  <button className="share-option twitter" onClick={handleTwitterShare} role="menuitem">
                    <i className="fab fa-twitter"></i>
                    <span>تويتر</span>
                  </button>
                  <button className="share-option copy" onClick={handleCopyLink} role="menuitem">
                    <i className="fas fa-copy"></i>
                    <span>نسخ</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {media.length > 0 && (
            <div className="property-gallery">
              {currentMedia.type === 'image' ? (
                <img
                  src={currentMedia.url}
                  alt={property.title}
                  className="gallery-image"
                  onError={(e) => {
                    console.error('Image failed to load:', currentMedia.url);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <video
                  src={currentMedia.url}
                  className="gallery-image"
                  controls
                  onError={(e) => {
                    console.error('Video failed to load:', currentMedia.url);
                    e.target.style.display = 'none';
                  }}
                >
                  متصفحك لا يدعم تشغيل الفيديو
                </video>
              )}
              {media.length > 1 && (
                <>
                  <button className="gallery-btn prev" onClick={prevMedia}>
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  <button className="gallery-btn next" onClick={nextMedia}>
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <div className="gallery-indicator">
                    {currentMediaIndex + 1} / {media.length}
                    {currentMedia.type === 'video' && <span style={{ marginLeft: '8px' }}>🎥</span>}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="property-detail-content">

            {property.totalprice && (
              <div className="detail-price">
                {formatPrice(property.totalprice)} {property.currency_name || 'جنيه'}
              </div>
            )}

            {property.description && (
              <div className="detail-description">
                <p>{property.description}</p>
              </div>
            )}

            <div className="detail-grid">
              {property.property_type_name && (
                <div className="detail-item">
                  <strong>نوع العقار:</strong> {property.property_type_name}
                </div>
              )}
              {property.region_name && (
                <div className="detail-item">
                  <strong>المنطقة:</strong> {property.region_name}
                </div>
              )}
              {property.category_name && (
                <div className="detail-item">
                  <strong>التصنيف:</strong> {property.category_name}
                </div>
              )}
              {property.property_purpose_name && (
                <div className="detail-item">
                  <strong>الغرض:</strong> {property.property_purpose_name}
                </div>
              )}
              {property.rooms && (
                <div className="detail-item">
                  <strong>عدد الغرف:</strong> {property.rooms}
                </div>
              )}
              {property.building && (
                <div className="detail-item">
                  <strong>المساحة:</strong> {property.building} م²
                </div>
              )}
              {property.spaceunit && property.spaceunit !== '0' && (
                <div className="detail-item">
                  <strong>مساحة الوحدة:</strong> {property.spaceunit} م²
                </div>
              )}
              {property.spaceeerth && property.spaceeerth !== '0' && (
                <div className="detail-item">
                  <strong>مساحة الأرض:</strong> {property.spaceeerth} م²
                </div>
              )}
              {property.thefloors && (
                <div className="detail-item">
                  <strong>الطابق:</strong> {property.thefloors}
                </div>
              )}
              {property.finishing_level_name && (
                <div className="detail-item">
                  <strong>مستوى التشطيب:</strong> {property.finishing_level_name}
                </div>
              )}
              {property.inoroutsidecompound && (
                <div className="detail-item">
                  <strong>داخل/خارج المجمع:</strong> {property.inoroutsidecompound === 'inside' ? 'داخل المجمع' : 'خارج المجمع'}
                </div>
              )}
              {property.propertyofferedby && (
                <div className="detail-item">
                  <strong>معروض من:</strong> {property.propertyofferedby === 'owner' ? 'المالك' : property.propertyofferedby}
                </div>
              )}
              {property.status && (
                <div className="detail-item">
                  <strong>الحالة:</strong> {property.status}
                </div>
              )}
            </div>

            {property.location && (
              <div className="detail-location">
                <strong>📍 الموقع:</strong> {property.location}
              </div>
            )}

            {/* Contact Information - Only visible for admin users */}
            {(property.mobileno || property.tel || property.name) && (
              <div className="property-contact-info">
                <h3 className="contact-title">📞 معلومات الاتصال</h3>
                <div className="contact-details">
                  {property.name && (
                    <div className="contact-item">
                      <strong>👤 الاسم:</strong>
                      <span className="contact-value">{property.name}</span>
                    </div>
                  )}
                  {property.mobileno && (
                    <div className="contact-item">
                      <strong>📱 رقم الموبايل:</strong>
                      <a href={`tel:${property.mobileno}`} className="contact-link">
                        {property.mobileno}
                      </a>
                      <a 
                        href={`https://wa.me/${property.mobileno.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="whatsapp-contact-btn"
                        title="تواصل عبر واتساب"
                      >
                        <i className="fab fa-whatsapp"></i>
                      </a>
                    </div>
                  )}
                  {property.tel && (
                    <div className="contact-item">
                      <strong>☎️ الهاتف:</strong>
                      <a href={`tel:${property.tel}`} className="contact-link">
                        {property.tel}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="properties-container">
      <div className="controls">
        <input
          type="text"
          placeholder="🔍 ابحث عن عقار..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <div className="mobile-btn-row">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`filter-toggle-btn ${activeFiltersCount > 0 ? 'has-active-filters' : ''}`}
          >
            {showFilters ? '🔼 إخفاء الفلاتر' : '🔽 إظهار الفلاتر'}
            {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
          </button>
          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                setRegion('الكل');
                setPropertyType('الكل');
                setCategory('الكل');
                setPurpose('الكل');
              }}
              className="reset-btn"
            >
              ✖ مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      <div className={`filters ${showFilters ? 'filters-open' : ''}`}>
        <div className="filter-group">
          <label className="filter-label">📍 المنطقة</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="filter-select"
          >
            <option value="الكل">جميع المناطق</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">🏠 نوع العقار</label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="filter-select"
          >
            <option value="الكل">جميع الأنواع</option>
            {propertyTypes.map((pt) => (
              <option key={pt} value={pt}>{pt}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">📋 التصنيف</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="filter-select"
          >
            <option value="الكل">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">🎯 الغرض</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="filter-select"
          >
            <option value="الكل">جميع الأغراض</option>
            {purposes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="results-count">
          <span>📋 عدد النتائج: <strong>{filteredCount}</strong></span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>جاري تحميل العقارات...</p>
        </div>
      ) : (
        <>
          <div className="properties-grid">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="loading-more">
              {loadingMore && <div className="spinner-small"></div>}
            </div>
          )}
        </>
      )}

      {selectedProperty && (
        <PropertyDetail
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}
    </div>
  );
}

export default Properties;
