import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import Login from './Login';
import Register from './Register';
import AdminDashboard from './AdminDashboard';
import InstallPrompt from './InstallPrompt';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ totalMessages: 0, totalFiles: 0, files: [] });
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [propertyType, setPropertyType] = useState('الكل');
  const [region, setRegion] = useState('الكل');
  const [purpose, setPurpose] = useState('الكل');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredCount, setFilteredCount] = useState(0);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [limit] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef(null);
  const observerRef = useRef(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const detailRef = useRef(null);
  const touchStartX = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isUserActive = Boolean(user?.isActive);

  // Count active filters
  const activeFiltersCount = [category, propertyType, region, purpose].filter(f => f !== 'الكل').length;

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show/hide scroll-to-top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPurpose = useCallback((value) => {
    if (value === 'بيع') return 'للبيع';
    if (value === 'إيجار') return 'للإيجار';
    return value;
  }, []);

  const buildCardTitle = useCallback((msg) => {
    const parts = [];
    if (msg.propertyType && msg.propertyType !== 'أخرى') {
      parts.push(msg.propertyType);
    }
    if (msg.region && msg.region !== 'أخرى') {
      parts.push(msg.region);
    }
    if (msg.category && msg.category !== 'أخرى') {
      parts.push(msg.category);
    }
    const purposeLabel = formatPurpose(msg.purpose);
    if (purposeLabel && purposeLabel !== 'أخرى') {
      parts.push(purposeLabel);
    }
    return parts.length > 0 ? parts.join(' | ') : 'تفاصيل غير متوفرة';
  }, [formatPurpose]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!token) {
        setAuthLoading(false);
        return;
      }

      // Helper to clear authentication state
      const clearAuthState = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      };

      // Helper to restore cached user data
      const restoreCachedUser = () => {
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setIsAuthenticated(true);
            setUser(userData);
          } catch (parseErr) {
            console.error('Failed to parse stored user, clearing auth:', parseErr);
            clearAuthState();
          }
        } else {
          // No cached user data available - keep token but remain logged out
          // User will need to log in again to restore session and cache user data
          console.warn('No cached user data available, cannot restore session');
        }
      };

      try {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
            setUser(data.user);
          } else {
            // Server successfully validated request but token is invalid
            clearAuthState();
          }
        } else if (response.status === 401) {
          // Unauthorized - clear invalid token
          clearAuthState();
        } else {
          // Other HTTP errors (4xx except 401, 5xx) - keep user logged in with stored data
          console.warn('Auth verification failed, using cached user data');
          restoreCachedUser();
        }
      } catch (err) {
        // Network error - keep user logged in with stored data
        console.warn('Auth check network error, using cached user data:', err.message);
        restoreCachedUser();
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleRegister = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setShowLogin(false);
    setShowRegister(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setShowAdminDashboard(false);
  };

  const handleShowLogin = () => {
    setShowLogin(true);
    setShowRegister(false);
  };

  const handleShowRegister = () => {
    setShowRegister(true);
    setShowLogin(false);
  };

  const handleCloseAuth = () => {
    setShowLogin(false);
    setShowRegister(false);
  };

  useEffect(() => {
    if (!isAdmin) {
      setShowAdminDashboard(false);
    }
  }, [isAdmin]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    try {
      const response = await fetch('/api/regions');
      const data = await response.json();
      setRegions(data);
    } catch (err) {
      console.error('Error fetching regions:', err);
    }
  }, []);

  const fetchMessages = useCallback(
    async (targetPage = 1, { append = false } = {}) => {
      const isInitialLoad = targetPage === 1 && !append;
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const response = await fetch(
          `/api/messages?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&propertyType=${encodeURIComponent(propertyType)}&region=${encodeURIComponent(region)}&purpose=${encodeURIComponent(purpose)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error fetching messages');
        }

        setFilteredCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setHasMore(targetPage < (data.totalPages || 0));

        if (append) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(item => item.id));
            const newItems = data.data.filter(item => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        } else {
          setMessages(data.data);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching messages:', err);
        if (targetPage === 1) {
          setMessages([]);
          setFilteredCount(0);
          setTotalPages(1);
          setHasMore(false);
          setError('Error connecting to server. Make sure the backend is running on port 3001.');
        }
      } finally {
        if (isInitialLoad) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [limit, search, category, propertyType, region, purpose]
  );

  useEffect(() => {
    setMessages([]);
    setSelectedMessages(new Set());
    setHasMore(true);
    setFilteredCount(0);
    setTotalPages(1);
    setPage(1);
    fetchMessages(1, { append: false });
    fetchStats();
    fetchRegions();
  }, [fetchMessages, fetchStats, fetchRegions]);

  useEffect(() => {
    if (page === 1) return;
    fetchMessages(page, { append: true });
  }, [page, fetchMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

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

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handlePropertyTypeChange = (e) => {
    setPropertyType(e.target.value);
    setPage(1);
  };

  const handleRegionChange = (e) => {
    setRegion(e.target.value);
    setPage(1);
  };

  const handlePurposeChange = (e) => {
    setPurpose(e.target.value);
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setCategory('الكل');
    setPropertyType('الكل');
    setRegion('الكل');
    setPurpose('الكل');
    setPage(1);
    setSelectedMessages(new Set());
    setShowFilters(false);
  };

  // Unit detail view handlers
  const openUnitDetail = (msg) => {
    setSelectedUnit(msg);
    setDetailClosing(false);
    document.body.style.overflow = 'hidden';
  };

  const closeUnitDetail = () => {
    setDetailClosing(true);
    setTimeout(() => {
      setSelectedUnit(null);
      setDetailClosing(false);
      document.body.style.overflow = '';
    }, 300);
  };

  // Handle swipe gestures for detail view
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    // Swipe right to close (RTL layout means swipe right = back)
    if (diff > 100) {
      closeUnitDetail();
    }
    touchStartX.current = null;
  };

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedUnit) {
        closeUnitDetail();
      }
    };
    
    if (selectedUnit) {
      window.history.pushState({ unitDetail: true }, '');
    }
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedUnit]);

  const handleRefresh = async () => {
    try {
      await fetch('/api/refresh', { method: 'POST' });
      setMessages([]);
      setSelectedMessages(new Set());
      setHasMore(true);
      setPage(1);
      fetchMessages(1, { append: false });
      fetchStats();
      fetchRegions();
    } catch (err) {
      console.error('Error refreshing:', err);
    }
  };

  const handleSelectMessage = (id) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map(m => m.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.size === 0) return;
    
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف ${selectedMessages.size} رسالة؟`);
    if (!confirmDelete) return;

    try {
      const response = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedMessages) })
      });
      
      if (response.ok) {
        setSelectedMessages(new Set());
        setMessages([]);
        setHasMore(true);
        setPage(1);
        fetchMessages(1, { append: false });
        fetchStats();
      } else {
        alert('حدث خطأ أثناء حذف الوحدات');
      }
    } catch (err) {
      console.error('Error deleting messages:', err);
      alert('حدث خطأ أثناء حذف الوحدات');
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading">جاري التحقق من الجلسة...</div>
      </div>
    );
  }

  // Show login modal
  if (showLogin) {
    return (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={handleShowRegister}
        onBackToHome={handleCloseAuth}
      />
    );
  }

  // Show register modal
  if (showRegister) {
    return (
      <Register 
        onRegister={handleRegister}
        onSwitchToLogin={handleShowLogin}
        onBackToHome={handleCloseAuth}
      />
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="app">
        <div className="error-container">
          <div className="brand">
            <img src="/logo192.png" alt="كونتابو" className="brand-logo" />
            <h1>كونتابو</h1>
          </div>
          <div className="error-message">
            <p>خطأ في الاتصال بالخادم. تأكد من تشغيل الخادم على المنفذ 3001</p>
            <p>قم بتشغيل الخادم:</p>
            <code>cd server && npm install && npm start</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Analytics />
      <header className="header">
        <div className="header-row-1">
          <div className="brand">
            <img src="/logo192.png" alt="كونتابو" className="brand-logo" />
            <h1>كونتابو</h1>
          </div>
          <div className="header-actions">
            {isAdmin && (
              <button
                type="button"
                className="admin-link"
                onClick={() => setShowAdminDashboard(true)}
                title="لوحة التحكم"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                </svg>
              </button>
            )}
            {isAuthenticated ? (
              <>
                <span className="user-info">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style={{verticalAlign: 'middle', marginLeft: '4px'}}>
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  {user?.username}
                </span>
                <button onClick={handleLogout} className="logout-btn" title="تسجيل الخروج">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                </button>
              </>
            ) : (
              <div className="auth-buttons">
                <button onClick={handleShowLogin} className="auth-btn login">
                  دخول
                </button>
                <button onClick={handleShowRegister} className="auth-btn register">
                  تسجيل
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="header-row-2">
          <span className="stat-item">📊 الوحدات: <strong>{stats.totalMessages}</strong></span>
          <span className="stat-item">📁 الوسطاء: <strong>{stats.totalFiles}</strong></span>
          <span className="stat-item">✅ المشتركين: <strong>{stats.totalSubscribers || 0}</strong></span>
        </div>
      </header>

      <div className="main-content">
        <div className="controls">
        <input
          type="text"
          placeholder="البحث بالاسم أو رقم الموبايل أو الرسالة..."
          value={search}
          onChange={handleSearch}
          className="search-input"
        />
        <div className="mobile-btn-row">
          <button onClick={handleRefresh} className="refresh-btn">
            🔄 تحديث
          </button>
          <button onClick={handleReset} className="reset-btn">
            ✖ مسح
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`filter-toggle-btn ${activeFiltersCount > 0 ? 'has-active-filters' : ''}`}
          >
            {showFilters ? '🔼 فلاتر' : '🔽 فلاتر'}
            {activeFiltersCount > 0 && <span className="filter-badge">{activeFiltersCount}</span>}
          </button>
        </div>
          {isAdmin && selectedMessages.size > 0 && (
          <button onClick={handleDeleteSelected} className="delete-btn">
            🗑️ حذف المحدد ({selectedMessages.size})
          </button>
        )}
      </div>

      <div className={`filters ${showFilters ? 'filters-open' : ''}`}>
        <label className="filter-label">نوع الإعلان:</label>
        <select 
          value={category} 
          onChange={handleCategoryChange}
          className="filter-select"
        >
          <option value="الكل">الكل</option>
          <option value="مطلوب">مطلوب</option>
          <option value="معروض">معروض</option>
          <option value="أخرى">أخرى</option>
        </select>

        <label className="filter-label">نوع العقار:</label>
        <select 
          value={propertyType} 
          onChange={handlePropertyTypeChange}
          className="filter-select"
        >
          <option value="الكل">الكل</option>
          <option value="شقة">شقة</option>
          <option value="أرض">أرض / قطعة</option>
          <option value="مزرعة">مزرعة / فدان</option>
          <option value="فيلا">فيلا</option>
          <option value="بيت">بيت / منزل</option>
          <option value="محل">محل / دكان</option>
          <option value="مكتب">مكتب</option>
          <option value="عمارة">عمارة</option>
          <option value="استوديو">استوديو</option>
          <option value="دوبلكس">دوبلكس</option>
          <option value="بدروم">بدروم</option>
          <option value="هنجر">هنجر</option>
          <option value="مصنع">مصنع</option>
          <option value="مخزن">مخزن</option>
          <option value="جراج">جراج</option>
          <option value="أخرى">أخرى</option>
        </select>

        <label className="filter-label">المنطقة:</label>
        <select 
          value={region} 
          onChange={handleRegionChange}
          className="filter-select"
        >
          <option value="الكل">الكل</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <label className="filter-label">الغرض:</label>
        <select 
          value={purpose} 
          onChange={handlePurposeChange}
          className="filter-select"
        >
          <option value="الكل">الكل</option>
          <option value="بيع">للبيع</option>
          <option value="إيجار">للإيجار</option>
          <option value="أخرى">أخرى</option>
        </select>

        <div className="results-count">
          <span>📋 عدد النتائج: <strong>{filteredCount}</strong></span>
        </div>
      </div>

      {loading && messages.length === 0 ? (
        <div className="loading">جاري تحميل الوحدات...</div>
      ) : (
        <>
          {/* Grid View */}
          <div className="grid-container">
            {isAdmin && messages.length > 0 && (
              <div className="grid-select-all">
                <label>
                  <input
                    type="checkbox"
                    checked={messages.length > 0 && selectedMessages.size === messages.length}
                    onChange={handleSelectAll}
                  />
                  تحديد الكل
                </label>
              </div>
            )}
            
            {messages.length === 0 ? (
              <div className="no-data-grid">
                لا توجد رسائل. أضف ملفات محادثات واتساب إلى مجلد data-source.
              </div>
            ) : (
              <div className="properties-grid">
                {messages.map((msg, index) => (
                  <div 
                    key={msg.id} 
                    className={`property-card ${selectedMessages.has(msg.id) && isAdmin ? 'selected-card' : ''}`}
                    onClick={() => openUnitDetail(msg)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isAdmin && (
                      <div className="card-checkbox" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(msg.id)}
                          onChange={() => handleSelectMessage(msg.id)}
                        />
                      </div>
                    )}
                    
                    <div className="card-index">#{index + 1}</div>
                    
                    <div className="card-title">
                      {buildCardTitle(msg)}
                    </div>
                    
                    <div className="card-message">
                      {msg.message.length > 150 ? msg.message.substring(0, 150) + '...' : msg.message}
                    </div>
                    
                    <div className="card-footer">
                      <div className="card-contact">
                        {isUserActive ? (
                          <>
                            {msg.mobile && msg.mobile !== 'N/A' && (
                              <a href={`tel:${msg.mobile}`} className="card-phone" dir="ltr">
                                📱 {msg.mobile}
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="card-name">🔒 اشترك لرؤية رقم الوسيط</span>
                        )}
                      </div>
                      <div className="card-date">
                        🗓️ {msg.dateOfCreation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div ref={loaderRef} className="infinite-loader">
            {loadingMore && hasMore && <span>جاري جلب المزيد...</span>}
            {!hasMore && messages.length > 0 && <span>تم عرض كل النتائج.</span>}
          </div>
        </>
      )}
      </div>

      {/* Unit Detail View */}
      {selectedUnit && (
        <div 
          className={`unit-detail-overlay ${detailClosing ? 'closing' : ''}`}
          onClick={closeUnitDetail}
        >
          <div 
            className={`unit-detail-panel ${detailClosing ? 'closing' : ''}`}
            ref={detailRef}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="unit-detail-header">
              <button className="detail-close-btn" onClick={closeUnitDetail}>
                ✕
              </button>
              <button className="detail-back-btn" onClick={closeUnitDetail}>
                → رجوع
              </button>
              <h2 className="detail-title">{buildCardTitle(selectedUnit)}</h2>
            </div>
            
            <div className="unit-detail-content">
              <div className="detail-section">
                <h3>📋 تفاصيل الوحدة</h3>
                <div className="detail-info-grid">
                  {selectedUnit.category && selectedUnit.category !== 'أخرى' && (
                    <div className="detail-info-item">
                      <span className="detail-label">نوع الإعلان</span>
                      <span className="detail-value">{selectedUnit.category}</span>
                    </div>
                  )}
                  {selectedUnit.propertyType && selectedUnit.propertyType !== 'أخرى' && (
                    <div className="detail-info-item">
                      <span className="detail-label">نوع العقار</span>
                      <span className="detail-value">{selectedUnit.propertyType}</span>
                    </div>
                  )}
                  {selectedUnit.region && selectedUnit.region !== 'أخرى' && (
                    <div className="detail-info-item">
                      <span className="detail-label">المنطقة</span>
                      <span className="detail-value">{selectedUnit.region}</span>
                    </div>
                  )}
                  {selectedUnit.purpose && selectedUnit.purpose !== 'أخرى' && (
                    <div className="detail-info-item">
                      <span className="detail-label">الغرض</span>
                      <span className="detail-value">{formatPurpose(selectedUnit.purpose)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>💬 نص الإعلان</h3>
                <div className="detail-message">
                  {selectedUnit.message}
                </div>
              </div>

              <div className="detail-section">
                <h3>📞 معلومات التواصل</h3>
                <div className="detail-contact">
                  {isUserActive ? (
                    <>
                      {selectedUnit.mobile && selectedUnit.mobile !== 'N/A' && (
                        <div className="contact-buttons">
                          <a 
                            href={`tel:${selectedUnit.mobile}`} 
                            className="contact-icon-btn call-btn" 
                            title="اتصال"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                            </svg>
                          </a>
                          <a 
                            href={`https://wa.me/${selectedUnit.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أستفسر عن هذه الوحدة:\n\n${buildCardTitle(selectedUnit)}\n\n${selectedUnit.message ? selectedUnit.message.substring(0, 200) + '...' : ''}`)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="contact-icon-btn whatsapp-btn"
                            title="واتساب"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        </div>
                      )}
                      {(!selectedUnit.mobile || selectedUnit.mobile === 'N/A') && (
                        <div className="contact-no-phone">
                          <span>📵 رقم الهاتف غير متوفر</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="contact-hidden">
                      <span>🔒 سجل دخولك واشترك لرؤية معلومات التواصل</span>
                      <button onClick={() => { closeUnitDetail(); setShowLogin(true); }} className="detail-login-btn">
                        تسجيل الدخول
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section detail-meta">
                <span>🗓️ {selectedUnit.dateOfCreation}</span>
                {selectedUnit.fileName && <span>📁 {selectedUnit.fileName}</span>}
              </div>
            </div>

            <div className="swipe-hint">
              <span>← اسحب للإغلاق →</span>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showAdminDashboard && (
        <div className="unit-detail-overlay" onClick={() => setShowAdminDashboard(false)}>
          <div 
            className="unit-detail-panel admin-dashboard-panel" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="unit-detail-header">
              <button className="detail-close-btn" onClick={() => setShowAdminDashboard(false)}>
                ✕
              </button>
              <h2 className="detail-title">⚙️ لوحة التحكم</h2>
            </div>
            <div className="unit-detail-content">
              <AdminDashboard onClose={() => setShowAdminDashboard(false)} />
            </div>
          </div>
        </div>
      )}
      
      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button className="scroll-top-btn" onClick={scrollToTop} title="العودة للأعلى">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
          </svg>
        </button>
      )}
    </div>
  );
}

export default App;
