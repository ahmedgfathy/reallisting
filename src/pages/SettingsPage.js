import React from 'react';
import './SettingsPage.css';

function SettingsPage({ user, isAdmin, onShowAdminDashboard }) {
  return (
    <div className="settings-page">
      <h1 className="settings-title">الإعدادات</h1>

      <div className="settings-section">
        <h2 className="settings-section-title">معلومات الحساب</h2>
        {user ? (
          <div className="settings-profile-card">
            <div className="settings-avatar">
              {(user.username || 'م').charAt(0).toUpperCase()}
            </div>
            <div className="settings-user-details">
              <div className="settings-field">
                <span className="settings-field-label">اسم المستخدم</span>
                <span className="settings-field-value">{user.username}</span>
              </div>
              {user.email && (
                <div className="settings-field">
                  <span className="settings-field-label">البريد الإلكتروني</span>
                  <span className="settings-field-value">{user.email}</span>
                </div>
              )}
              <div className="settings-field">
                <span className="settings-field-label">الدور</span>
                <span className={`settings-role-badge ${user.role === 'admin' ? 'admin' : 'user'}`}>
                  {user.role === 'admin' ? '⚙️ مدير' : '👤 مستخدم'}
                </span>
              </div>
              <div className="settings-field">
                <span className="settings-field-label">الحالة</span>
                <span className={`settings-status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                  {user.isActive ? '✅ مشترك نشط' : '⏳ غير مشترك'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="settings-not-logged-in">
            <p>يرجى تسجيل الدخول لرؤية معلومات الحساب</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="settings-section">
          <h2 className="settings-section-title">إدارة المنصة والاستيراد</h2>
          <div className="settings-admin-actions">
            <button className="settings-admin-btn" onClick={onShowAdminDashboard}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
              </svg>
              فتح أدوات الاستيراد ولوحة التحكم
            </button>
          </div>
        </div>
      )}

      <div className="settings-section">
        <h2 className="settings-section-title">عن التطبيق</h2>
        <div className="settings-app-info">
          <div className="settings-field">
            <span className="settings-field-label">اسم التطبيق</span>
            <span className="settings-field-value">كونتابو | Contaboo</span>
          </div>
          <div className="settings-field">
            <span className="settings-field-label">الوصف</span>
            <span className="settings-field-value">منصة عربية حديثة لإدارة وعرض الإعلانات العقارية</span>
          </div>
          <div className="settings-field">
            <span className="settings-field-label">اللغة</span>
            <span className="settings-field-value">العربية</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
