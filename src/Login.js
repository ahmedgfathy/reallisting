import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin, onSwitchToRegister, onBackToHome }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      </div>
    </div>
  );
}

export default Login;
