import React, { useCallback, useEffect, useState } from 'react';
import './AdminDashboard.css';

function AdminDashboard({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deduplicating, setDeduplicating] = useState(false);
  const [dedupeReport, setDedupeReport] = useState(null);
  const [resetRequests, setResetRequests] = useState([]);
  const [processingReset, setProcessingReset] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);

  const token = localStorage.getItem('token') || '';

  const loadUsers = useCallback(async () => {
    if (!token) {
      setError('لا يوجد تصريح صالح. الرجاء تسجيل الدخول مرة أخرى.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'فشل تحميل المستخدمين');
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadResetRequests = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/reset-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setResetRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load reset requests:', err);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
    loadResetRequests();
  }, [loadUsers, loadResetRequests]);

  const handleActivate = async (userId) => {
    if (!token) {
      setError('لا يوجد تصريح صالح. الرجاء تسجيل الدخول مرة أخرى.');
      return;
    }

    setUpdatingId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: true })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'تعذر تفعيل المستخدم');
      }

      const result = await response.json();
      if (result && result.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? result.user : u)));
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeduplicate = async () => {
    if (!token) {
      setError('لا يوجد تصريح صالح. الرجاء تسجيل الدخول مرة أخرى.');
      return;
    }

    const confirmed = window.confirm(
      'هل أنت متأكد من حذف الرسائل المكررة؟\n\nسيتم حذف الرسائل التي لها نفس:\n- اسم المرسل\n- رقم الموبايل\n- نص الرسالة\n\nهذا الإجراء لا يمكن التراجع عنه!'
    );

    if (!confirmed) return;

    setDeduplicating(true);
    setDedupeReport(null);
    setError(null);

    try {
      const response = await fetch('/api/admin/deduplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل في حذف المكررات');
      }

      setDedupeReport(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeduplicating(false);
    }
  };

  const handleApproveReset = async (mobile) => {
    if (!token) return;
    setProcessingReset(mobile);
    setGeneratedPassword(null);
    try {
      const response = await fetch('/api/admin/reset-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mobile, action: 'approve' })
      });
      const result = await response.json();
      if (response.ok) {
        setGeneratedPassword({ mobile, password: result.tempPassword });
        await loadResetRequests();
      } else {
        setError(result.error || 'فشل في توليد كلمة المرور');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingReset(null);
    }
  };

  const handleRejectReset = async (mobile) => {
    if (!token) return;
    setProcessingReset(mobile);
    try {
      const response = await fetch('/api/admin/reset-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mobile, action: 'reject' })
      });
      if (response.ok) {
        await loadResetRequests();
      } else {
        const result = await response.json();
        setError(result.error || 'فشل في رفض الطلب');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingReset(null);
    }
  };

  return (
    <div className="admin-dashboard-overlay" role="dialog" aria-modal="true">
      <div className="admin-dashboard">
        <div className="admin-dashboard-header">
          <h2>لوحة تحكم المشتركين</h2>
          <button type="button" className="admin-dashboard-close" onClick={onClose}>
            ✖
          </button>
        </div>

        <div className="admin-dashboard-actions">
          <button type="button" className="admin-dashboard-refresh" onClick={loadUsers} disabled={loading}>
            🔄 تحديث القائمة
          </button>
          <button 
            type="button" 
            className="admin-dedupe-btn" 
            onClick={handleDeduplicate} 
            disabled={deduplicating}
          >
            {deduplicating ? '⏳ جاري الحذف...' : '🗑️ حذف المكررات'}
          </button>
        </div>

        {dedupeReport && (
          <div className="admin-dedupe-report">
            <h3>📊 تقرير حذف المكررات</h3>
            <div className="dedupe-stats">
              <div className="dedupe-stat">
                <span className="dedupe-label">العدد الأصلي:</span>
                <span className="dedupe-value">{dedupeReport.originalCount?.toLocaleString('ar-EG')}</span>
              </div>
              <div className="dedupe-stat">
                <span className="dedupe-label">المكررات المحذوفة:</span>
                <span className="dedupe-value dedupe-removed">{dedupeReport.duplicatesRemoved?.toLocaleString('ar-EG')}</span>
              </div>
              <div className="dedupe-stat">
                <span className="dedupe-label">العدد الجديد:</span>
                <span className="dedupe-value dedupe-new">{dedupeReport.newTotalCount?.toLocaleString('ar-EG')}</span>
              </div>
            </div>
            <p className="dedupe-message">✅ {dedupeReport.message}</p>
            <button className="dedupe-close-btn" onClick={() => setDedupeReport(null)}>إغلاق التقرير</button>
          </div>
        )}

        {error && <div className="admin-dashboard-error">⚠️ {error}</div>}

        {resetRequests.length > 0 && (
          <div className="admin-reset-requests">
            <h3>🔐 طلبات إعادة تعيين كلمة المرور ({resetRequests.length})</h3>
            <div className="reset-requests-list">
              {resetRequests.map((req) => (
                <div key={req.id} className="reset-request-item">
                  <div className="reset-request-info">
                    <span className="reset-mobile">📱 {req.mobile}</span>
                    <span className="reset-time">{new Date(req.requested_at).toLocaleString('ar-EG')}</span>
                  </div>
                  <div className="reset-request-actions">
                    <button
                      className="reset-approve-btn"
                      onClick={() => handleApproveReset(req.mobile)}
                      disabled={processingReset === req.mobile}
                    >
                      {processingReset === req.mobile ? '⏳' : '✅ موافقة وتوليد'}
                    </button>
                    <button
                      className="reset-reject-btn"
                      onClick={() => handleRejectReset(req.mobile)}
                      disabled={processingReset === req.mobile}
                    >
                      ❌ رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {generatedPassword && (
          <div className="generated-password-overlay" onClick={() => setGeneratedPassword(null)}>
            <div className="generated-password-box" onClick={e => e.stopPropagation()}>
              <h3>🔑 كلمة المرور المؤقتة</h3>
              <p>للمستخدم: {generatedPassword.mobile}</p>
              <div className="temp-password-display">
                {generatedPassword.password}
              </div>
              <p style={{ fontSize: 12, color: '#666' }}>يرجى نسخها وإرسالها للمستخدم عبر واتساب أو الاتصال به</p>
              <button onClick={() => {
                navigator.clipboard.writeText(generatedPassword.password);
                alert('تم النسخ!');
              }}>📋 نسخ</button>
              <button onClick={() => setGeneratedPassword(null)}>إغلاق</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="admin-dashboard-loading">جاري تحميل المستخدمين...</div>
        ) : users.length === 0 ? (
          <div className="admin-dashboard-empty">لا يوجد مستخدمين مسجلين حالياً.</div>
        ) : (
          <div className="admin-dashboard-table-wrapper">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الحالة</th>
                  <th>الدور</th>
                  <th>تاريخ التسجيل</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.isActive ? 'user-active' : 'user-inactive'}>
                    <td>
                      <div className="admin-user-mobile">📱 {user.mobile}</div>
                      <div className="admin-user-id">#{user.id}</div>
                    </td>
                    <td>
                      {user.isActive ? (
                        <span className="status-badge status-active">مفعل</span>
                      ) : (
                        <span className="status-badge status-pending">غير مفعل</span>
                      )}
                    </td>
                    <td>{user.role === 'admin' ? 'مدير' : 'وسيط'}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleString('ar-EG') : '—'}</td>
                    <td>
                      {user.isActive ? (
                        <span className="already-active">✅ لديه صلاحية الوصول</span>
                      ) : (
                        <button
                          type="button"
                          className="activate-btn"
                          onClick={() => handleActivate(user.id)}
                          disabled={updatingId === user.id}
                        >
                          {updatingId === user.id ? '... جاري التفعيل' : 'تفعيل الاشتراك'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
