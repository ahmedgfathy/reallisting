import React, { useState } from 'react';
import './Login.css';

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
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: resetMobile })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setResetResult({ success: true, tempPassword: data.tempPassword });
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
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
          <h1>🏠 نظام العقارات</h1>
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
          <div className="reset-overlay">
            <div className="reset-dialog">
              <h3>إعادة تعيين كلمة المرور</h3>
              <form onSubmit={handleResetPassword}>
                <input
                  type="text"
                  placeholder="رقم الموبايل"
                  value={resetMobile}
                  onChange={e => setResetMobile(e.target.value)}
                  required
                  dir="ltr"
                  style={{ textAlign: 'left', width: '100%', marginBottom: 10 }}
                />
                <button type="submit" className="login-btn" disabled={resetLoading} style={{ width: '100%' }}>
                  {resetLoading ? 'جاري التحقق...' : 'توليد كلمة مرور مؤقتة'}
                </button>
              </form>
              {resetResult && resetResult.success && (
                <div className="reset-success">
                  <div>كلمة المرور المؤقتة:</div>
                  <div style={{ fontWeight: 'bold', fontSize: 22, direction: 'ltr', margin: '10px 0' }}>{resetResult.tempPassword}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>يرجى نسخها واستخدامها لتسجيل الدخول ثم تغييرها من صفحتك الشخصية</div>
                </div>
              )}
              {resetResult && !resetResult.success && (
                <div className="login-error" style={{ marginTop: 10 }}>{resetResult.error}</div>
              )}
              <button className="link-btn" style={{ marginTop: 15 }} onClick={() => setShowReset(false)}>إغلاق</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
