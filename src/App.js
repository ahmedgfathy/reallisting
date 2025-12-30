import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Login from './Login';
import Register from './Register';

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
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
            setUser(data.user);
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
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

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/regions');
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
          `http://localhost:3001/api/messages?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&propertyType=${encodeURIComponent(propertyType)}&region=${encodeURIComponent(region)}&purpose=${encodeURIComponent(purpose)}`
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
  };

  const handleRefresh = async () => {
    try {
      await fetch('http://localhost:3001/api/refresh', { method: 'POST' });
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
      const response = await fetch('http://localhost:3001/api/messages/delete', {
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
        alert('حدث خطأ أثناء حذف الرسائل');
      }
    } catch (err) {
      console.error('Error deleting messages:', err);
      alert('حدث خطأ أثناء حذف الرسائل');
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
          <h1>📱 عارض بيانات واتساب</h1>
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
      <header className="header">
        <h1>📱 عارض بيانات واتساب</h1>
        <div className="header-left">
          <div className="stats">
            <span className="stat-item">📊 الرسائل: <strong>{stats.totalMessages}</strong></span>
            <span className="stat-item">📁 الملفات: <strong>{stats.totalFiles}</strong></span>
          </div>
          {user?.role === 'admin' && (
            <a href="#" className="admin-link">⚙️ لوحة التحكم</a>
          )}
          {isAuthenticated ? (
            <>
              <span className="user-info">👤 {user?.username}</span>
              <button onClick={handleLogout} className="logout-btn">
                🚪 خروج
              </button>
            </>
          ) : (
            <div className="auth-buttons">
              <button onClick={handleShowLogin} className="auth-btn login">
                🔐 دخول
              </button>
              <button onClick={handleShowRegister} className="auth-btn register">
                📝 تسجيل
              </button>
            </div>
          )}
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
        <button onClick={handleRefresh} className="refresh-btn">
          🔄 تحديث
        </button>
        <button onClick={handleReset} className="reset-btn">
          ✖ مسح الفلاتر
        </button>
        {user?.role === 'admin' && selectedMessages.size > 0 && (
          <button onClick={handleDeleteSelected} className="delete-btn">
            🗑️ حذف المحدد ({selectedMessages.size})
          </button>
        )}
      </div>

      <div className="filters">
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
        <div className="loading">جاري تحميل الرسائل...</div>
      ) : (
        <>
          {/* Grid View */}
          <div className="grid-container">
            {user?.role === 'admin' && messages.length > 0 && (
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
                    className={`property-card ${selectedMessages.has(msg.id) && user?.role === 'admin' ? 'selected-card' : ''}`}
                  >
                    {user?.role === 'admin' && (
                      <div className="card-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(msg.id)}
                          onChange={() => handleSelectMessage(msg.id)}
                        />
                      </div>
                    )}
                    
                    <div className="card-index">#{(page - 1) * limit + index + 1}</div>
                    
                    <div className="card-title">
                      {buildCardTitle(msg)}
                    </div>
                    
                    <div className="card-message">
                      {msg.message.length > 150 ? msg.message.substring(0, 150) + '...' : msg.message}
                    </div>
                    
                    <div className="card-footer">
                      <div className="card-contact">
                        {user && user.isActive === true ? (
                          <>
                            <span className="card-name">👤 {msg.name}</span>
                            {msg.mobile !== 'N/A' && (
                              <a href={`tel:${msg.mobile}`} className="card-phone" dir="ltr">
                                📱 {msg.mobile}
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="card-name">👤 اسم المرسل مخفي</span>
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
    </div>
  );
}

export default App;
