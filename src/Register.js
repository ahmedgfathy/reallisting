import React, { useState } from 'react';
import { apiCall } from './apiConfig';
import './Register.css';

function Register({ onRegister, onSwitchToLogin, onBackToHome }) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate mobile number
    if (!/^01[0-9]{9}$/.test(mobile)) {
      setError('رقم الموبايل يجب أن يبدأ بـ 01 ويتكون من 11 رقم');
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمة المرور غير متطابقة');
      return;
    }

    setLoading(true);

    try {
      const data = await auth.register(mobile, password);

      if (data.success) {
        onRegister(data.user);
      } else {
        setError(data.error || 'فشل التسجيل');
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper">
        {/* Left side - Registration Form */}
        <div className="register-form-section">
          <div className="register-box">
            <div className="register-header">
              <h1>🏠 تسجيل وسيط جديد</h1>
              <p>إنشاء حساب وسيط عقاري</p>
            </div>

            <form onSubmit={handleSubmit} className="register-form">
              {error && <div className="register-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="mobile">رقم الموبايل</label>
                <input
                  type="tel"
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01xxxxxxxxx"
                  required
                  autoComplete="tel"
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
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                  required
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="register-btn" disabled={loading}>
                {loading ? 'جاري التسجيل...' : 'تسجيل حساب جديد'}
              </button>
            </form>

            <div className="register-footer">
              <p>لديك حساب بالفعل؟{' '}
                <button onClick={onSwitchToLogin} className="link-btn">
                  تسجيل الدخول
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

        {/* Right side - Subscription Info */}
        <div className="subscription-section">
          <div className="subscription-box">
            <div className="subscription-header">
              <h2>💎 اشتراك الوسيط</h2>
              <p>رسوم الاشتراك الشهري</p>
              <p className="no-commission">بدون أي عمولات - حرية كاملة</p>
              <div className="price-tag">200 جنيه</div>
            </div>

            <div className="payment-methods">
              <h3>طرق الدفع:</h3>

              <div className="payment-option vodafone">
                <div className="payment-icon">📱</div>
                <div className="payment-details">
                  <h4>فودافون كاش</h4>
                  <p className="payment-number" dir="ltr">01002778090</p>
                  <span className="payment-note">حول المبلغ واتصل بنا للتفعيل</span>
                </div>
              </div>

              <div className="payment-divider">أو</div>

              <div className="payment-option instapay">
                <div className="payment-icon">💳</div>
                <div className="payment-details">
                  <h4>انستاباي</h4>
                  <a
                    href="https://ipn.eg/S/ahmedgfathy/instapay/5tPwH1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="instapay-link"
                  >
                    اضغط هنا للدفع عبر انستاباي
                  </a>
                  <div className="instapay-account">
                    <span>ahmedgfathy@instapay</span>
                  </div>
                  <span className="payment-note powered-by">Powered by InstaPay</span>
                </div>
              </div>
            </div>

            <div className="subscription-note">
              <p>⚠️ بعد الدفع، سيتم تفعيل حسابك خلال 24 ساعة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
