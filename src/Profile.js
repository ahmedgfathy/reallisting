import React, { useState, useEffect } from 'react';
import './Profile.css';

function Profile({ onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setError('لا يوجد تصريح صالح');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'فشل في تحميل البيانات');
        }

        setUser(data.user);
        setName(data.user.name || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setUpdating(true);

    try {
      const body = {};
      if (name !== (user.name || '')) body.name = name;
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'فشل التحديث');
      }

      setSuccess('تم التحديث بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Update local user data
      if (name !== user.name) {
        setUser({ ...user, name });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="profile-overlay">
      <div className="profile-container">
        <div className="profile-header">
          <h2>الملف الشخصي</h2>
          <button className="profile-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="profile-loading">جاري التحميل...</div>
        ) : error && !user ? (
          <div className="profile-error">⚠️ {error}</div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            {success && <div className="profile-success">✅ {success}</div>}
            {error && <div className="profile-error">⚠️ {error}</div>}

            <div className="profile-field">
              <label>رقم الموبايل</label>
              <input
                type="text"
                value={user?.mobile || ''}
                disabled
                className="profile-input-disabled"
              />
              <small>لا يمكن تغيير رقم الموبايل</small>
            </div>

            <div className="profile-field">
              <label>الاسم (اختياري)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="أدخل اسمك"
                className="profile-input"
              />
            </div>

            <div className="profile-divider">
              <span>تغيير كلمة المرور</span>
            </div>

            <div className="profile-field">
              <label>كلمة المرور الحالية</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                className="profile-input"
              />
            </div>

            <div className="profile-field">
              <label>كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                className="profile-input"
                minLength={6}
              />
            </div>

            <div className="profile-field">
              <label>تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                className="profile-input"
              />
            </div>

            <button type="submit" className="profile-submit" disabled={updating}>
              {updating ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Profile;
