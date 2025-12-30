import React, { useCallback, useEffect, useState } from 'react';
import './AdminDashboard.css';

function AdminDashboard({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

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
      const response = await fetch('http://localhost:3001/api/admin/users', {
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

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleActivate = async (userId) => {
    if (!token) {
      setError('لا يوجد تصريح صالح. الرجاء تسجيل الدخول مرة أخرى.');
      return;
    }

    setUpdatingId(userId);
    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}/status`, {
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
        </div>

        {error && <div className="admin-dashboard-error">⚠️ {error}</div>}

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
