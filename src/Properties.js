import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Properties.css';

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
  const loaderRef = useRef(null);
  const observerRef = useRef(null);

  const activeFiltersCount = [category, propertyType, region, purpose].filter(f => f !== 'الكل').length;

  const fetchProperties = useCallback(async (targetPage = 1, { append = false } = {}) => {
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
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [search, category, propertyType, region, purpose]);

  useEffect(() => {
    setProperties([]);
    setHasMore(true);
    setPage(1);
    fetchProperties(1, { append: false });
  }, [fetchProperties]);

  useEffect(() => {
    if (page === 1) return;
    fetchProperties(page, { append: true });
  }, [page, fetchProperties]);

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
    
    return (
      <div className="property-card" onClick={() => setSelectedProperty(property)}>
        {firstImage && (
          <div className="property-image">
            <img src={firstImage} alt={property.title || property.name} loading="lazy" />
            {property.images.length > 1 && (
              <div className="image-count">
                <i className="fas fa-images"></i> {property.images.length}
              </div>
            )}
          </div>
        )}
        <div className="property-content">
          <h3 className="property-title">
            {property.title || property.name || 'عقار'}
          </h3>
          
          {property.price && (
            <div className="property-price">
              {formatPrice(property.price)} {property.currency_name || 'جنيه'}
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
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = () => {
      setCurrentImageIndex((prev) => 
        (prev + 1) % property.images.length
      );
    };

    const prevImage = () => {
      setCurrentImageIndex((prev) => 
        prev === 0 ? property.images.length - 1 : prev - 1
      );
    };

    return (
      <div className="unit-detail-overlay" onClick={onClose}>
        <div className="unit-detail-container" onClick={(e) => e.stopPropagation()}>
          <button className="close-detail-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>

          {property.images && property.images.length > 0 && (
            <div className="property-gallery">
              <img 
                src={property.images[currentImageIndex]} 
                alt={property.title} 
                className="gallery-image"
              />
              {property.images.length > 1 && (
                <>
                  <button className="gallery-btn prev" onClick={prevImage}>
                    <i className="fas fa-chevron-right"></i>
                  </button>
                  <button className="gallery-btn next" onClick={nextImage}>
                    <i className="fas fa-chevron-left"></i>
                  </button>
                  <div className="gallery-indicator">
                    {currentImageIndex + 1} / {property.images.length}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="property-detail-content">
            <h2>{property.title || property.name}</h2>
            
            {property.price && (
              <div className="detail-price">
                {formatPrice(property.price)} {property.currency_name || 'جنيه'}
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
              {property.built_area && (
                <div className="detail-item">
                  <strong>المساحة المبنية:</strong> {property.built_area} م²
                </div>
              )}
              {property.land_area && (
                <div className="detail-item">
                  <strong>مساحة الأرض:</strong> {property.land_area} م²
                </div>
              )}
              {property.finishing_level_name && (
                <div className="detail-item">
                  <strong>مستوى التشطيب:</strong> {property.finishing_level_name}
                </div>
              )}
            </div>

            {property.description && (
              <div className="detail-description">
                <strong>الوصف:</strong>
                <p>{property.description}</p>
              </div>
            )}

            {property.location && (
              <div className="detail-location">
                <strong>الموقع:</strong> {property.location}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="properties-container">
      <div className="properties-header">
        <h1>العقارات</h1>
        <div className="properties-count">{filteredCount} عقار</div>
      </div>

      <div className="search-filters">
        <input
          type="text"
          placeholder="ابحث عن عقار..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        
        <button 
          className={`filters-toggle ${activeFiltersCount > 0 ? 'has-active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <i className="fas fa-filter"></i>
          {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="filters-panel">
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="الكل">كل المناطق</option>
          </select>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
            <option value="الكل">كل الأنواع</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="الكل">كل التصنيفات</option>
          </select>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="الكل">كل الأغراض</option>
          </select>
        </div>
      )}

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
