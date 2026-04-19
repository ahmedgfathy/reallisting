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

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
          <h1>🏠 كونتابو</h1>
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
      </div>
    </div>
  );
}

export default Login;
