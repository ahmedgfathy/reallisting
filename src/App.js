import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Login from './Login';
import AdminDashboard from './AdminDashboard';
import { apiCall } from './apiConfig';
import InstallPrompt from './InstallPrompt';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import PublicHero from './pages/PublicHero';
import './theme-v2.css';

export const FALLBACK_PROPERTY_IMAGE = '/logo192.png';

export const getPropertyImageUrl = (msg) => {
  const image = typeof msg?.image_url === 'string' ? msg.image_url.trim() : '';
  return image || FALLBACK_PROPERTY_IMAGE;
};

export const buildCompactCardTitle = (msg, formatPurpose) => {
  const purposeLabel = formatPurpose(msg?.purpose);
  const candidates = [msg?.property_type, msg?.category, purposeLabel];
  const compactTitle = candidates.find((value) => value && value !== 'أخرى');
  return compactTitle || 'عقار';
};

export const buildCardHeaderMeta = (msg) => {
  const values = [msg?.category, msg?.region, msg?.property_type]
    .map((value) => (typeof value === 'string' ? value.trim() : value))
    .filter((value) => value && value !== 'أخرى');

  return values.length > 0 ? values.join(' | ') : 'عقار';
};

export const truncateCardMessage = (message, maxLength = 70) => {
  if (message === null || message === undefined) return 'لا يوجد وصف';
  const text = String(message).trim();
  if (!text) return 'لا يوجد وصف';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

export const calculateHasMorePages = ({ page, limit, total, totalPages, currentPageSize, hasMore }) => {
  const safePage = Number(page);
  const safeLimit = Number(limit);
  const safeTotal = Number(total);
  const safeTotalPages = Number(totalPages);
  const safeCurrentPageSize = Number(currentPageSize);

  if (typeof hasMore === 'boolean') {
    return hasMore;
  }

  if (Number.isFinite(safeTotal) && safeTotal >= 0 && Number.isFinite(safeLimit) && safeLimit > 0 && Number.isFinite(safePage) && safePage > 0) {
    return safePage * safeLimit < safeTotal;
  }

  if (Number.isFinite(safeTotalPages) && safeTotalPages > 0 && Number.isFinite(safePage) && safePage > 0) {
    return safePage < safeTotalPages;
  }

  return Number.isFinite(safeCurrentPageSize) && Number.isFinite(safeLimit) && safeLimit > 0
    ? safeCurrentPageSize >= safeLimit
    : false;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ totalMessages: 0, totalSenders: 0, totalFiles: 0, files: [], filters: { categories: [], propertyTypes: [], purposes: [] } });
  const [regions, setRegions] = useState([]);
  const [availableCategories, setAvailableCategories] = useState(['مطلوب', 'معروض', 'أخرى']);
  const [availablePropertyTypes, setAvailablePropertyTypes] = useState(['شقة', 'أرض', 'فيلا', 'محل', 'مكتب', 'عمارة', 'أخرى']);
  const [availablePurposes, setAvailablePurposes] = useState(['بيع', 'إيجار', 'مطلوب', 'أخرى']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [propertyType, setPropertyType] = useState('الكل');
  const [region, setRegion] = useState('الكل');
  const [purpose, setPurpose] = useState('الكل');
  const [page, setPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [filteredCount, setFilteredCount] = useState(0);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [limit] = useState(50);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loaderRef = useRef(null);
  const observerRef = useRef(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [openImportOnAdminOpen, setOpenImportOnAdminOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const detailRef = useRef(null);
  const touchStartX = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isUserActive = Boolean(user?.isActive || isAdmin);

  const [activeView, setActiveView] = useState('dashboard');

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const closeAdminDashboard = () => {
    setShowAdminDashboard(false);
    setOpenImportOnAdminOpen(false);
  };

  // Enforce the brand theme globally so auth/PWA/mobile/desktop stay visually consistent.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'brand');
  }, []);

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

  const normalizeDigits = useCallback((value) => {
    return String(value || '')
      .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
  }, []);

  const buildWhatsAppNumber = useCallback((rawNumber) => {
    let digits = normalizeDigits(rawNumber).replace(/[^\d+]/g, '');

    if (!digits) return '';
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (digits.startsWith('00')) digits = digits.slice(2);

    // Already internationalized
    if (/^201\d{9}$/.test(digits)) return digits;
    if (/^9665\d{8}$/.test(digits)) return digits;

    // Egypt local mobile: 01xxxxxxxxx -> 201xxxxxxxxx
    if (/^01\d{9}$/.test(digits)) return `2${digits}`;

    // Saudi local mobile: 05xxxxxxxx -> 9665xxxxxxxx
    if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
    if (/^5\d{8}$/.test(digits)) return `966${digits}`;

    return digits;
  }, [normalizeDigits]);

  const buildCardTitle = useCallback((msg) => {
    const parts = [];
    if (msg.property_type && msg.property_type !== 'أخرى') {
      parts.push(msg.property_type);
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

  const buildWhatsAppMessage = useCallback((senderName, unit) => {
    const lines = [];
    lines.push(`مرحباً ${senderName || ''}، أستفسر عن طلبك التالي:`);
    lines.push('');
    lines.push('📋 تفاصيل الطلب:');

    if (unit.category && unit.category !== 'أخرى') {
      lines.push(`• نوع الإعلان: ${unit.category}`);
    }
    if (unit.property_type && unit.property_type !== 'أخرى') {
      lines.push(`• نوع العقار: ${unit.property_type}`);
    }
    if (unit.region && unit.region !== 'أخرى') {
      lines.push(`• المنطقة: ${unit.region}`);
    }
    if (unit.purpose && unit.purpose !== 'أخرى') {
      lines.push(`• الغرض: ${formatPurpose(unit.purpose)}`);
    }

    const meta = unit.ai_metadata;
    if (meta && (meta.district || meta.area || meta.price)) {
      lines.push('');
      lines.push('✨ تفاصيل إضافية:');
      if (meta.district) lines.push(`• المكان: ${meta.district}`);
      if (meta.area) lines.push(`• المساحة: ${meta.area} م²`);
      if (meta.price) lines.push(`• السعر: ${Number(meta.price).toLocaleString('ar-EG')} ج.م`);
    }

    if (unit.message) {
      lines.push('');
      lines.push('💬 نص الإعلان:');
      lines.push(unit.message);
    }

    return lines.join('\n');
  }, [formatPurpose]);

  const buildWhatsAppHref = useCallback((rawNumber, senderName, unit) => {
    const normalizedNumber = buildWhatsAppNumber(rawNumber);
    if (!normalizedNumber) return '';

    return `https://wa.me/${normalizedNumber}?text=${encodeURIComponent(
      buildWhatsAppMessage(senderName, unit)
    )}`;
  }, [buildWhatsAppMessage, buildWhatsAppNumber]);

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
        const response = await apiCall('/api/auth?path=verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.authenticated) {
          setIsAuthenticated(true);
          setUser(data.user);
        } else {
          // Server successfully validated request but token is invalid
          clearAuthState();
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
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setShowAdminDashboard(false);
  };

  const handleShowLogin = () => {
    setShowLoginModal(true);
  };

  useEffect(() => {
    if (!isAdmin) {
      setShowAdminDashboard(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeView === 'brokers') {
      setActiveView('dashboard');
      return;
    }
    if (activeView === 'import') {
      setActiveView('settings');
    }
  }, [activeView]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiCall('/api/stats');
      const data = await response.json();
      setStats(data);

      if (data.filters) {
        const clean = (arr) => [...new Set((arr || []).filter(v => v && v !== 'أخرى'))];

        // 1. Transaction Types (Dynamic + Core Defaults)
        // We prioritize the core ones but allow others if they exist in DB
        const dbCats = clean(data.filters.categories);
        const coreCats = ['بيع', 'إيجار', 'مطلوب'];
        setAvailableCategories([...new Set([...coreCats, ...dbCats, 'أخرى'])]);

        // 2. Property Types (Dynamic + Core Defaults)
        const dbTypes = clean(data.filters.propertyTypes);
        const coreTypes = ['شقة', 'فيلا', 'أرض', 'منزل', 'عمارة', 'شاليه', 'مصنع', 'مخزن', 'محل', 'مكتب'];
        setAvailablePropertyTypes([...new Set([...coreTypes, ...dbTypes, 'أخرى'])]);

        // 3. Usage Purposes (Dynamic + Core Defaults)
        const dbPurposes = clean(data.filters.purposes);
        const corePurposes = ['سكني', 'تجاري', 'صناعي'];
        setAvailablePurposes([...new Set([...corePurposes, ...dbPurposes, 'أخرى'])]);

        // 4. Regions (Fully Dynamic)
        if (data.filters.regions?.length > 0) {
          const regionsList = clean(data.filters.regions);
          setRegions(prev => [...new Set([...prev, ...regionsList])].sort());
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    try {
      const response = await apiCall('/api/regions');
      const data = await response.json();
      setRegions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching regions:', err);
      setRegions([]);
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
        const token = localStorage.getItem('token');
        const response = await apiCall(
          `/api/messages?page=${targetPage}&limit=${limit}&search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&propertyType=${encodeURIComponent(propertyType)}&region=${encodeURIComponent(region)}&purpose=${encodeURIComponent(purpose)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error fetching messages');
        }

        setFilteredCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setHasMore(calculateHasMorePages({
          page: targetPage,
          limit,
          total: data.total,
          totalPages: data.totalPages,
          hasMore: data.hasMore,
          currentPageSize: Array.isArray(data.data) ? data.data.length : 0
        }));

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
          setError('خطأ في الاتصال بالـ API. يرجى التحقق من اتصال الإنترنت أو المحاولة مرة أخرى لاحقاً.');
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

  const handleImportSuccess = useCallback(() => {
    fetchMessages(1, { append: false });
    fetchStats();
  }, [fetchMessages, fetchStats]);

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
      await apiCall('/api/refresh', { method: 'POST' });
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [addPropertyForm, setAddPropertyForm] = useState({
    message: '', sender_name: '', sender_mobile: '',
    category: 'أخرى', property_type: 'أخرى', region: 'أخرى', purpose: 'أخرى'
  });
  const [addPropertyLoading, setAddPropertyLoading] = useState(false);
  const [addPropertyError, setAddPropertyError] = useState('');

  // ... existing code ...

  const handleDeleteSelected = () => {
    if (selectedMessages.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);

    try {
      const response = await apiCall('/api/messages/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ids: Array.from(selectedMessages) })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Deleted ${data.deletedCount} messages`);
        setSelectedMessages(new Set());
        setMessages([]);
        setHasMore(true);
        setPage(1);
        fetchMessages(1, { append: false });
        fetchStats();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to delete messages';
        console.error('Delete failed:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error deleting messages:', err);
      setError('An unexpected error occurred while deleting');
    }
  };

  const handleAddPropertyChange = (e) => {
    const { name, value } = e.target;
    setAddPropertyForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddPropertySubmit = async (e) => {
    e.preventDefault();
    setAddPropertyLoading(true);
    setAddPropertyError('');
    try {
      const response = await apiCall('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(addPropertyForm)
      });
      if (response.ok) {
        setShowAddProperty(false);
        setAddPropertyForm({
          message: '', sender_name: '', sender_mobile: '',
          category: 'أخرى', property_type: 'أخرى', region: 'أخرى', purpose: 'أخرى'
        });
        setMessages([]);
        setHasMore(true);
        setPage(1);
        fetchMessages(1, { append: false });
        fetchStats();
      } else {
        const errorData = await response.json();
        setAddPropertyError(errorData.error || 'فشل إضافة الإعلان');
      }
    } catch (err) {
      console.error('Error adding property:', err);
      setAddPropertyError('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
    } finally {
      setAddPropertyLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>جاري التحقق من الجلسة...</div>
      </div>
    );
  }

  // API error is handled inline inside AppShell (not as a full-page takeover)


  // Render the public landing page outside AppShell (no sidebar/header chrome)
  if (activeView === 'dashboard' && !isAuthenticated) {
    return (
      <>
        <PublicHero
          onLoginClick={handleShowLogin}
          stats={stats}
          messages={messages}
          onViewChange={handleViewChange}
        />
        {showLoginModal && (
          <Login
            onLogin={handleLogin}
            onClose={() => setShowLoginModal(false)}
          />
        )}
      </>
    );
  }

  const renderPageContent = () => {
    if (activeView === 'dashboard') {
      return (
        <DashboardPage
          stats={stats}
          messages={messages}
          user={user}
          onViewChange={handleViewChange}
          isUserActive={isUserActive}
        />
      );
    }

    if (activeView === 'settings') {
      return (
        <SettingsPage
          user={user}
          isAdmin={isAdmin}
          onOpenImportTools={() => {
            setOpenImportOnAdminOpen(true);
            setShowAdminDashboard(true);
          }}
        />
      );
    }

    // Default: listings view
    return (
      <div className="main-content">
        {error && messages.length === 0 && (
          <div className="api-error-banner">
            <span>⚠️ تعذّر الاتصال بالخادم — يرجى التحقق من تشغيل الـ API أو إعادة المحاولة لاحقاً.</span>
          </div>
        )}
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
          <select value={category} onChange={handleCategoryChange} className="filter-select">
            <option value="الكل">الكل</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="filter-label">نوع العقار:</label>
          <select value={propertyType} onChange={handlePropertyTypeChange} className="filter-select">
            <option value="الكل">الكل</option>
            {availablePropertyTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <label className="filter-label">المنطقة:</label>
          <select value={region} onChange={handleRegionChange} className="filter-select">
            <option value="الكل">الكل</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <label className="filter-label">الغرض:</label>
          <select value={purpose} onChange={handlePurposeChange} className="filter-select">
            <option value="الكل">الكل</option>
            {availablePurposes.map(p => (
              <option key={p} value={p}>{p === 'بيع' ? 'للبيع' : p === 'إيجار' ? 'للإيجار' : p}</option>
            ))}
          </select>

          <div className="results-count">
            <span>📋 عدد النتائج: <strong>{filteredCount}</strong></span>
          </div>
        </div>

        {loading && messages.length === 0 ? (
          <div className="loading">جاري تحميل الوحدات...</div>
        ) : (
          <>
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

                      <div className="card-header">
                        <div className="card-header-meta">{buildCardHeaderMeta(msg)}</div>
                        <div className="card-index">#{index + 1}</div>
                      </div>

                      <img
                        className="card-image"
                        src={getPropertyImageUrl(msg)}
                        alt={`${buildCompactCardTitle(msg, formatPurpose)}${msg.region && msg.region !== 'أخرى' ? ` - ${msg.region}` : ''}`}
                        loading="lazy"
                        onError={(e) => {
                          if (e.currentTarget.dataset.fallbackApplied !== 'true') {
                            e.currentTarget.dataset.fallbackApplied = 'true';
                            e.currentTarget.src = FALLBACK_PROPERTY_IMAGE;
                          }
                        }}
                      />

                      <div className="card-message">
                        {truncateCardMessage(msg.message)}
                      </div>

                      <div className="card-footer">
                        <div className="card-contact">
                          {isUserActive ? (
                            <>
                              {msg.sender_mobile && msg.sender_mobile !== 'N/A' && (
                                <a href={`tel:${msg.sender_mobile}`} className="card-phone" dir="ltr">
                                  📱 {msg.sender_mobile}
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="card-name">🔒 اشترك لرؤية رقم الوسيط</span>
                          )}
                        </div>
                        <div className="card-date">
                          🗓️ {msg.date_of_creation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div ref={loaderRef} className="infinite-loader">
              {loadingMore && hasMore && <span>جاري جلب المزيد...</span>}
              {!loadingMore && hasMore && (
                <button
                  type="button"
                  className="load-more-btn"
                  aria-label="تحميل المزيد من العقارات"
                  onClick={() => setPage(prev => prev + 1)}
                >
                  تحميل المزيد
                </button>
              )}
              {!hasMore && messages.length > 0 && <span>تم عرض كل النتائج.</span>}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <AppShell
      activeView={activeView}
      onViewChange={handleViewChange}
      user={user}
      onLogout={handleLogout}
      stats={stats}
      isAuthenticated={isAuthenticated}
      onShowLogin={handleShowLogin}
    >
      {renderPageContent()}

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
                  {selectedUnit.property_type && selectedUnit.property_type !== 'أخرى' && (
                    <div className="detail-info-item">
                      <span className="detail-label">نوع العقار</span>
                      <span className="detail-value">{selectedUnit.property_type}</span>
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

              {selectedUnit.ai_metadata && (selectedUnit.ai_metadata.area || selectedUnit.ai_metadata.price || selectedUnit.ai_metadata.district || (selectedUnit.ai_metadata.keywords && selectedUnit.ai_metadata.keywords.length > 0)) && (
                <div className="detail-section ai-extraction">
                  <h3>✨ استخراج ذكي (AI)</h3>
                  <div className="ai-metadata-grid">
                    {selectedUnit.ai_metadata.district && (
                      <div className="ai-meta-item">
                        <span className="ai-meta-label">المكان بالتفصيل</span>
                        <span className="ai-meta-value">{selectedUnit.ai_metadata.district}</span>
                      </div>
                    )}
                    {selectedUnit.ai_metadata.area && (
                      <div className="ai-meta-item">
                        <span className="ai-meta-label">المساحة</span>
                        <span className="ai-meta-value">{selectedUnit.ai_metadata.area} م²</span>
                      </div>
                    )}
                    {selectedUnit.ai_metadata.price && (
                      <div className="ai-meta-item">
                        <span className="ai-meta-label">السعر</span>
                        <span className="ai-meta-value">{Number(selectedUnit.ai_metadata.price).toLocaleString('ar-EG')} ج.م</span>
                      </div>
                    )}
                  </div>
                  {selectedUnit.ai_metadata.keywords && selectedUnit.ai_metadata.keywords.length > 0 && (
                    <div className="ai-keywords-list">
                      {selectedUnit.ai_metadata.keywords.map((kw, i) => (
                        <span key={i} className="ai-keyword-tag">#{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                    <div className="contact-info-card">
                      {selectedUnit.sender_name && (
                        <div className="sender-profile">
                          <div className="sender-avatar">
                            {selectedUnit.sender_name.charAt(0)}
                          </div>
                          <div className="sender-details">
                            <span className="sender-label">الوسيط</span>
                            <span className="sender-name" dir={/^[+\d\s()-]{7,}$/.test((selectedUnit.sender_name || '').trim()) ? 'ltr' : undefined}>{selectedUnit.sender_name}</span>
                          </div>
                        </div>
                      )}

                      {selectedUnit.sender_mobile && selectedUnit.sender_mobile !== 'N/A' ? (
                        <div className="contact-actions">
                          <div className="mobile-display">
                            <span className="mobile-label">رقم التواصل</span>
                            <span className="mobile-number" dir="ltr">{selectedUnit.sender_mobile}</span>
                          </div>
                          <div className="contact-buttons-group">
                            <a
                              href={`tel:${selectedUnit.sender_mobile}`}
                              className="contact-action-link call"
                              title="اتصال هاتفي"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                              </svg>
                              اتصال
                            </a>
                            {buildWhatsAppHref(selectedUnit.sender_mobile, selectedUnit.sender_name, selectedUnit) ? (
                              <a
                                href={buildWhatsAppHref(selectedUnit.sender_mobile, selectedUnit.sender_name, selectedUnit)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-action-link whatsapp"
                                title="تواصل واتساب"
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                واتساب
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="contact-no-phone">
                          <span>📵 رقم الهاتف غير متوفر</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="contact-hidden">
                      <span>🔒 اشتراكك غير مفعل. تواصل مع الإدارة لعرض معلومات التواصل</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section detail-meta">
                <span>🗓️ {selectedUnit.date_of_creation}</span>
              </div>
            </div>

            <div className="swipe-hint">
              <span>← اسحب للإغلاق →</span>
            </div>
          </div>
        </div>
      )}

      {isAdmin && showAdminDashboard && (
        <div className="unit-detail-overlay" onClick={closeAdminDashboard}>
          <div
            className="unit-detail-panel admin-dashboard-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="unit-detail-header">
              <button className="detail-close-btn" onClick={closeAdminDashboard}>
                ✕
              </button>
              <button className="detail-back-btn" onClick={closeAdminDashboard}>
                → رجوع
              </button>
              <h2 className="detail-title">⚙️ أدوات الإدارة</h2>
            </div>
            <div className="unit-detail-content">
              <AdminDashboard
                onClose={closeAdminDashboard}
                onImportSuccess={handleImportSuccess}
                initialOpenImport={openImportOnAdminOpen}
              />
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ تأكيد الحذف</h3>
            </div>
            <div className="modal-body">
              <p>هل أنت متأكد من حذف <b>{selectedMessages.size}</b> رسالة؟</p>
              <p className="modal-note">لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowDeleteConfirm(false)}>
                إلغاء
              </button>
              <button className="modal-btn danger" onClick={confirmDelete}>
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddProperty && (
        <div className="modal-overlay" onClick={() => setShowAddProperty(false)}>
          <div className="modal-content add-property-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ إضافة إعلان عقاري جديد</h3>
            </div>
            <form className="modal-body add-property-form" onSubmit={handleAddPropertySubmit}>
              <div className="form-group">
                <label htmlFor="ap-message" className="form-label">نص الإعلان *</label>
                <textarea
                  id="ap-message"
                  name="message"
                  className="form-textarea"
                  rows={4}
                  placeholder="اكتب تفاصيل العقار هنا..."
                  value={addPropertyForm.message}
                  onChange={handleAddPropertyChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ap-sender-name" className="form-label">اسم الوسيط</label>
                  <input
                    id="ap-sender-name"
                    type="text"
                    name="sender_name"
                    className="form-input"
                    placeholder="الاسم"
                    value={addPropertyForm.sender_name}
                    onChange={handleAddPropertyChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ap-sender-mobile" className="form-label">رقم الهاتف</label>
                  <input
                    id="ap-sender-mobile"
                    type="text"
                    name="sender_mobile"
                    className="form-input"
                    placeholder="رقم الموبايل"
                    value={addPropertyForm.sender_mobile}
                    onChange={handleAddPropertyChange}
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ap-category" className="form-label">نوع الإعلان</label>
                  <select id="ap-category" name="category" className="form-select" value={addPropertyForm.category} onChange={handleAddPropertyChange}>
                    {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ap-property-type" className="form-label">نوع العقار</label>
                  <select id="ap-property-type" name="property_type" className="form-select" value={addPropertyForm.property_type} onChange={handleAddPropertyChange}>
                    {availablePropertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ap-region" className="form-label">المنطقة</label>
                  <select id="ap-region" name="region" className="form-select" value={addPropertyForm.region} onChange={handleAddPropertyChange}>
                    <option value="أخرى">أخرى</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ap-purpose" className="form-label">الغرض</label>
                  <select id="ap-purpose" name="purpose" className="form-select" value={addPropertyForm.purpose} onChange={handleAddPropertyChange}>
                    {availablePurposes.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {addPropertyError && <p className="form-error">{addPropertyError}</p>}
              <div className="modal-actions">
                <button type="button" className="modal-btn cancel" onClick={() => setShowAddProperty(false)}>
                  إلغاء
                </button>
                <button type="submit" className="modal-btn primary" disabled={addPropertyLoading}>
                  {addPropertyLoading ? 'جاري الإضافة...' : 'إضافة الإعلان'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <InstallPrompt />

      {showScrollTop && (
        <button className="scroll-top-btn" onClick={scrollToTop} title="العودة للأعلى">
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
          </svg>
        </button>
      )}

      {showLoginModal && (
        <Login
          onLogin={handleLogin}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </AppShell>
  );
}

export default App;
