import React, { useState } from 'react';
import { apiCall } from './apiConfig';
import './Login.css';

const auth = {
  login: async (username, password) => {
    const res = await apiCall('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mobile: username, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error };
  }
};

function Login({ onLogin, onSwitchToRegister, onBackToHome }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Forgot password state
  const [showReset, setShowReset] = useState(false);
  const [resetMobile, setResetMobile] = useState('');
  const [resetResult, setResetResult] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetResult(null);
    setResetLoading(true);
    try {
      const response = await apiCall('/api/auth?path=reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: resetMobile })
      });
      const data = await response.json();
      if (response.ok) {
        setResetResult({ success: true, message: data.message || 'تم إرسال الطلب' });
      } else {
        setResetResult({ success: false, error: data.error || 'فشل إعادة التعيين' });
      }
    } catch (err) {
      setResetResult({ success: false, error: 'خطأ في الاتصال بالخادم' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await auth.login(username, password);

      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🏠 ريل ليستنج</h1>
          <p>تسجيل الدخول</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">رقم الموبايل</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="01xxxxxxxxx"
              required
              autoComplete="username"
              dir="ltr"
              style={{ textAlign: 'left' }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">كلمة المرور</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button className="link-btn" style={{ color: '#4267B2', fontWeight: 'bold' }} onClick={() => { setShowReset(true); setResetResult(null); setResetMobile(''); }}>
            نسيت كلمة المرور؟
          </button>
        </div>
        <div className="login-footer">
          <p>ليس لديك حساب؟{' '}
            <button onClick={onSwitchToRegister} className="link-btn">
              تسجيل وسيط جديد
            </button>
          </p>
          <p style={{ marginTop: '10px' }}>
            <button onClick={onBackToHome} className="link-btn">
              🏠 العودة للصفحة الرئيسية
            </button>
          </p>
        </div>
        {/* Reset Password Dialog */}
        {showReset && (
          <div className="reset-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="reset-dialog" style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px rgba(0,0,0,0.13)', maxWidth: 340, width: '90vw', padding: 28, textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setShowReset(false)} style={{ position: 'absolute', left: 12, top: 12, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }} aria-label="إغلاق">×</button>
              <div style={{ marginBottom: 18 }}>
                <span style={{ fontSize: 28, color: '#4267B2', fontWeight: 700 }}>🔒</span>
                <h3 style={{ margin: '10px 0 0 0', fontSize: 20, color: '#222', fontWeight: 700 }}>إعادة تعيين كلمة المرور</h3>
                <div style={{ fontSize: 14, color: '#666', marginTop: 2 }}>أدخل رقم الموبايل المرتبط بحسابك</div>
              </div>
              <form onSubmit={handleResetPassword} style={{ marginBottom: 10 }}>
                <input
                  type="text"
                  placeholder="رقم الموبايل"
                  value={resetMobile}
                  onChange={e => setResetMobile(e.target.value)}
                  required
                  dir="ltr"
                  style={{
                    textAlign: 'left',
                    width: '100%',
                    padding: 10,
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #ccc',
                    marginBottom: 12
                  }}
                />
                <button type="submit" className="login-btn" disabled={resetLoading} style={{ width: '100%', fontSize: 17, borderRadius: 8, padding: '10px 0' }}>
                  {resetLoading ? 'جاري الإرسال...' : 'إرسال طلب إعادة التعيين'}
                </button>
              </form>
              {resetResult && resetResult.success && (
                <div className="reset-success" style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, margin: '10px 0 0 0', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 15, color: '#15803d', marginBottom: 6 }}>✅ تم إرسال الطلب بنجاح</div>
                  <div style={{ fontSize: 13, color: '#166534' }}>{resetResult.message}</div>
                </div>
              )}
              {resetResult && !resetResult.success && (
                <div className="login-error" style={{ marginTop: 10 }}>{resetResult.error}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
