import React, { useCallback, useEffect, useState } from 'react';
import { apiCall } from './apiConfig';
import './AdminDashboard.css';

const adminAPI = {
  getUsers: async () => {
    const res = await apiCall('/api/admin/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  updateUserStatus: async (userId, isActive) => {
    const res = await apiCall(`/api/admin/${userId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ isActive })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  }, // Corrected: Moved the comma inside the object to separate properties
  importMessagesBatch: async (messages, fileName) => {
    const res = await apiCall('/api/import-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ messages, fileName })
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to import batch');
    }
    return res.json();
  }
};

// WhatsApp parsing logic (moved from server)
function parseWhatsAppText(text) {
  // Remove invisible Unicode directional/formatting characters that WhatsApp
  // (especially Arabic locale) embeds in exported files (LRM, RLM, BOM, etc.)
  text = text.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');

  // Normalize Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and Extended Arabic-Indic
  // digits (used in Farsi/Urdu: ۰۱۲۳۴۵۶۷۸۹) to ASCII digits (0-9)
  text = text.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660));
  text = text.replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));

  const lines = text.split('\n');
  const parsedMessages = [];

  // Flexible WhatsApp format: captures [Date, Time] Name: Message OR Date, Time - Name: Message
  // Supports various date separators (/ or .), English & Arabic numerals, 24-hour and 12-hour (AM/PM or ص/م)
  const messageRegex = new RegExp('^\\[?([\\d/. \\s-]+)[,،]\\s*([\\d:\\s]+(?:[AP]M?|[\\u0645\\u0635])?)\\]?\\s*[-:]?\\s*([^:]+):\\s*(.+)$', 'i');

  let currentMessage = null;

  for (const line of lines) {
    const match = line.match(messageRegex);

    if (match) {
      if (currentMessage) parsedMessages.push(currentMessage);

      const [, date, time, sender, messageText] = match;

      let messageDate;
      try {
        // Try simple split first for common formats
        const dateParts = date.trim().split(/[./-]/).map(p => parseInt(p, 10));
        let day, month, year;

        if (dateParts[0] > 1000) { // YYYY/MM/DD
          year = dateParts[0]; month = dateParts[1] - 1; day = dateParts[2];
        } else { // DD/MM/YYYY
          day = dateParts[0]; month = dateParts[1] - 1; year = dateParts[2];
          if (year < 100) year += 2000;
        }

        const timeParts = time.trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([AP]M|ص|م))?/i);
        let hours = parseInt(timeParts[1], 10);
        const minutes = parseInt(timeParts[2], 10);
        const seconds = timeParts[3] ? parseInt(timeParts[3], 10) : 0;
        const ampm = timeParts[4]?.toLowerCase();

        if (ampm === 'pm' || ampm === 'م') {
          if (hours < 12) hours += 12;
        } else if (ampm === 'am' || ampm === 'ص') {
          if (hours === 12) hours = 0;
        }

        messageDate = new Date(year, month, day, hours, minutes, seconds);
        if (isNaN(messageDate.getTime())) throw new Error();
      } catch (e) {
        messageDate = new Date(); // Fallback to current
      }

      currentMessage = {
        sender: sender.trim(),
        message: messageText.trim(),
        date: messageDate.toISOString()
      };
    } else if (currentMessage && line.trim()) {
      currentMessage.message += '\n' + line;
    }
  }

  if (currentMessage) parsedMessages.push(currentMessage);
  return parsedMessages;
}

function AdminDashboard({ onClose, onImportSuccess }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deduplicating, setDeduplicating] = useState(false);
  const [dedupeReport, setDedupeReport] = useState(null);
  const [resetRequests, setResetRequests] = useState([]);
  const [processingReset, setProcessingReset] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [subscriptionModal, setSubscriptionModal] = useState(null);
  const [subscriptionDays, setSubscriptionDays] = useState('30');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importMode, setImportMode] = useState('file'); // 'file' or 'text'
  const [importText, setImportText] = useState('');
  const [aiUsedInBatch, setAiUsedInBatch] = useState(false);
  const [importLog, setImportLog] = useState([]); // Real-time AI logs

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
      const data = await adminAPI.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadResetRequests = useCallback(async () => {
    // Reset requests are not currently prioritized in Appwrite migration
    setResetRequests([]);
  }, []);

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
      const result = await adminAPI.updateUserStatus(userId, true);
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
      const response = await apiCall('/api/admin?path=deduplicate', {
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
      const response = await apiCall('/api/admin?path=reset-requests', {
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
      const response = await apiCall('/api/admin?path=reset-requests', {
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

  const handleSetSubscription = async (mobile) => {
    if (!token || !subscriptionDays) return;
    try {
      const response = await apiCall('/api/admin?path=subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mobile, days: parseInt(subscriptionDays) })
      });
      const result = await response.json();
      if (response.ok) {
        setSubscriptionModal(null);
        setSubscriptionDays('30');
        await loadUsers();
      } else {
        setError(result.error || 'فشل في تعيين الاشتراك');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.txt')) {
        setError('الرجاء اختيار ملف نصي (.txt)');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImportWhatsApp = async () => {
    // Validate input based on import mode
    if (!token) {
      setError('لا يوجد تصريح صالح');
      return;
    }

    if (importMode === 'file' && !selectedFile) {
      setError('الرجاء اختيار ملف للاستيراد');
      return;
    }

    if (importMode === 'text' && !importText.trim()) {
      setError('الرجاء إدخال نص للاستيراد');
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);
    setUploadProgress(0);

    try {
      let fileContent;
      let filename;

      if (importMode === 'file') {
        // Read file content
        fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(selectedFile);
        });
        filename = selectedFile.name;
      } else {
        // Use text directly
        fileContent = importText;
        filename = `text_import_${Date.now()}.txt`;
      }

      setUploadProgress(10);

      // Parse messages on client side
      let parsedMessages = [];
      try {
        parsedMessages = parseWhatsAppText(fileContent);
      } catch (e) {
        throw new Error('فشل في تحليل ملف المحادثة. تأكد من التنسيق.');
      }

      if (parsedMessages.length === 0) {
        throw new Error('لم يتم العثور على رسائل في الملف. تأكد من التنسيق الصحيح.');
      }

      setUploadProgress(20);

      // Batch processing for AI feedback
      const BATCH_SIZE = 10;
      const batches = [];
      for (let i = 0; i < parsedMessages.length; i += BATCH_SIZE) {
        batches.push(parsedMessages.slice(i, i + BATCH_SIZE));
      }

      let totalImported = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      let localAiUsed = false;
      setImportLog([]); // Clear previous log

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        try {
          const result = await adminAPI.importMessagesBatch(batch, filename);
          totalImported += result.imported;
          totalSkipped += result.skipped;

          if (result.aiUsed) {
            localAiUsed = true;
            setAiUsedInBatch(true);
          }

          // Update log with latest classifications
          if (result.classifications) {
            setImportLog(prev => [...result.classifications.slice(-5), ...prev].slice(0, 15));
          }
        } catch (err) {
          console.error('Batch import failed:', err);
          totalErrors += batch.length;
        }

        // Update progress (20% to 100%)
        const progress = 20 + Math.round(((i + 1) / batches.length) * 80);
        setUploadProgress(progress);
      }

      setUploadProgress(100);

      // Format result
      const formattedResult = {
        success: true,
        message: `تمت المعالجة بنجاح. استيراد: ${totalImported}، تخطي: ${totalSkipped}`,
        stats: {
          totalParsed: parsedMessages.length,
          imported: totalImported,
          skipped: totalSkipped,
          errors: totalErrors,
          sendersCreated: 0
        }
      };

      setImportResult({ ...formattedResult, aiUsed: localAiUsed });
      setSelectedFile(null);
      setImportText('');
      setShowImportModal(false);

      if (totalImported > 0 && onImportSuccess) {
        onImportSuccess();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
      setUploadProgress(0);
    }
  };

  const calculateRemainingDays = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    if (diff < 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="admin-dashboard">
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
        <button
          type="button"
          className="admin-import-btn"
          onClick={() => setShowImportModal(true)}
        >
          📥 استيراد من واتساب
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
                <th>نهاية الاشتراك</th>
                <th>الأيام المتبقية</th>
                <th>الدور</th>
                <th>تاريخ التسجيل</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const remaining = calculateRemainingDays(user.subscriptionEndDate);
                const isExpired = remaining !== null && remaining === 0;
                return (
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
                    <td>
                      <div className="subscription-date">
                        {user.subscriptionEndDate ? (
                          <>
                            📅 {formatDate(user.subscriptionEndDate)}
                            {isExpired && <span className="expired-badge">منتهي</span>}
                          </>
                        ) : (
                          <span style={{ color: '#999' }}>غير محدد</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {remaining !== null ? (
                        <span className={`days-remaining ${remaining <= 3 ? 'days-warning' : remaining === 0 ? 'days-expired' : ''}`}>
                          {remaining === 0 ? '⏰ منتهي' : `⏳ ${remaining} يوم`}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>{user.role === 'admin' ? 'مدير' : 'وسيط'}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleString('ar-EG') : '—'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="subscription-btn"
                          onClick={() => setSubscriptionModal(user.mobile)}
                        >
                          ⏱️ اشتراك
                        </button>
                        {!user.isActive && (
                          <button
                            type="button"
                            className="activate-btn"
                            onClick={() => handleActivate(user.id)}
                            disabled={updatingId === user.id}
                          >
                            {updatingId === user.id ? '...' : 'تفعيل'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {subscriptionModal && (
        <div className="subscription-modal-overlay" onClick={() => setSubscriptionModal(null)}>
          <div className="subscription-modal" onClick={e => e.stopPropagation()}>
            <h3>⏱️ تعيين مدة الاشتراك</h3>
            <p>للمستخدم: {subscriptionModal}</p>
            <div className="subscription-input-group">
              <label>عدد الأيام:</label>
              <input
                type="number"
                min="1"
                value={subscriptionDays}
                onChange={e => setSubscriptionDays(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="subscription-presets">
              <button onClick={() => setSubscriptionDays('7')}>أسبوع</button>
              <button onClick={() => setSubscriptionDays('30')}>شهر</button>
              <button onClick={() => setSubscriptionDays('90')}>3 أشهر</button>
              <button onClick={() => setSubscriptionDays('180')}>6 أشهر</button>
              <button onClick={() => setSubscriptionDays('365')}>سنة</button>
            </div>
            <div className="subscription-modal-actions">
              <button className="subscription-confirm-btn" onClick={() => handleSetSubscription(subscriptionModal)}>
                ✅ تأكيد وتفعيل
              </button>
              <button className="subscription-cancel-btn" onClick={() => setSubscriptionModal(null)}>
                ❌ إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="import-modal-overlay" onClick={() => {
          setShowImportModal(false);
          setSelectedFile(null);
          setImportText('');
          setImportMode('file');
        }}>
          <div className="import-modal" onClick={e => e.stopPropagation()}>
            <h3>📥 استيراد من واتساب</h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
              اختر طريقة الاستيراد (تنسيق: [التاريخ، الوقت] الاسم: الرسالة)
            </p>

            {/* Import mode tabs */}
            <div className="import-mode-tabs">
              <button
                className={`import-tab ${importMode === 'file' ? 'active' : ''}`}
                onClick={() => setImportMode('file')}
                disabled={importing}
              >
                📁 رفع ملف
              </button>
              <button
                className={`import-tab ${importMode === 'text' ? 'active' : ''}`}
                onClick={() => setImportMode('text')}
                disabled={importing}
              >
                📝 لصق نص
              </button>
            </div>

            {importMode === 'file' ? (
              <div className="file-upload-area">
                <input
                  type="file"
                  id="whatsapp-file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  disabled={importing}
                  style={{ display: 'none' }}
                />
                <label htmlFor="whatsapp-file" className="file-upload-label">
                  <i className="fas fa-file-upload"></i>
                  <span>{selectedFile ? selectedFile.name : 'اختر ملف TXT'}</span>
                </label>
                {selectedFile && (
                  <div className="selected-file-info">
                    <span>📄 {selectedFile.name}</span>
                    <span className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-import-area">
                <textarea
                  className="import-textarea"
                  placeholder={`الصق نص محادثة واتساب هنا...\n\nمثال:\n[01/01/24, 10:30] أحمد: شقة للبيع\n[01/01/24, 10:31] محمد: 01012345678`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  disabled={importing}
                />
                {importText && (
                  <div className="text-info">
                    <span>📝 عدد الأحرف: {importText.length.toLocaleString('ar-EG')}</span>
                  </div>
                )}
              </div>
            )}

            {importing && uploadProgress > 0 && (
              <div className="upload-progress-container">
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>

                {importLog.length > 0 && (
                  <div className="import-live-log">
                    <div className="log-header">📡 تصنيفات ذكية مباشرة:</div>
                    <div className="log-entries">
                      {importLog.map((log, i) => (
                        <div key={i} className="log-entry">
                          <span className="log-msg">{log.msg}</span>
                          <span className="log-badge region">{log.region}</span>
                          <span className="log-badge type">{log.type}</span>
                          <span className="log-badge purpose">{log.purpose}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="import-modal-actions">
              <button
                className="import-confirm-btn"
                onClick={handleImportWhatsApp}
                disabled={importing || (importMode === 'file' ? !selectedFile : !importText.trim())}
              >
                {importing ? (aiUsedInBatch ? '⏳ جاري التصنيف بذكاء Gemini...' : '⏳ جاري الاستيراد...') : '✅ استيراد'}
              </button>
              <button
                className="import-cancel-btn"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportText('');
                  setImportMode('file');
                }}
                disabled={importing}
              >
                ❌ إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {importResult && (
        <div className="import-result-overlay" onClick={() => setImportResult(null)}>
          <div className="import-result-box" onClick={e => e.stopPropagation()}>
            <h3>✅ نتيجة الاستيراد</h3>
            <div className="import-stats">
              <div className="import-stat">
                <span className="import-label">إجمالي الرسائل المستخرجة:</span>
                <span className="import-value">{importResult.stats?.totalParsed || 0}</span>
              </div>
              <div className="import-stat">
                <span className="import-label">تم استيرادها بنجاح:</span>
                <span className="import-value import-success">{importResult.stats?.imported || 0}</span>
              </div>
              <div className="import-stat">
                <span className="import-label">المرسلين الجدد:</span>
                <span className="import-value">{importResult.stats?.sendersCreated || 0}</span>
              </div>
              {importResult.stats?.errors > 0 && (
                <div className="import-stat">
                  <span className="import-label">الأخطاء:</span>
                  <span className="import-value import-error">{importResult.stats.errors}</span>
                </div>
              )}
              {importResult.aiUsed && (
                <div className="import-stat" style={{ gridColumn: '1 / -1', background: '#e1f5fe', borderRight: '4px solid #03a9f4' }}>
                  <span className="import-label" style={{ color: '#01579b' }}>✨ جودة البيانات ممتازة:</span>
                  <span className="import-value" style={{ color: '#01579b' }}>تم التصنيف بواسطة ذكاء Google Gemini</span>
                </div>
              )}
            </div>
            <p className="import-message">✅ {importResult.message}</p>
            <button className="import-close-btn" onClick={() => setImportResult(null)}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
