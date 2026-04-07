import React, { useState } from 'react';
import { apiCall } from './apiConfig';

export default function TestAIBlock() {
  const [apiResponse, setApiResponse] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleTestAIConnection() {
    setLoading(true);
    setApiResponse('جاري الاختبار...');

    try {
      const res = await apiCall('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          message: 'بيت للبيع بالحي 14 مساحة 159 متر 3 أدوار للتواصل 01555691189',
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setApiResponse(`خطأ HTTP ${res.status}: ${errorText}`);
        return;
      }

      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setApiResponse(`خطأ: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 16, padding: '12px 16px', background: '#f0f4ff', borderRadius: 8, border: '1px solid #c7d7ff', direction: 'rtl' }}>
      <div style={{ marginBottom: 8, fontWeight: 'bold', fontSize: 14, color: '#1a3a6e' }}>🤖 اختبار اتصال الذكاء الاصطناعي</div>
      <button
        onClick={handleTestAIConnection}
        disabled={loading}
        style={{
          background: loading ? '#aaa' : '#1a73e8',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '8px 18px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 'bold',
        }}
      >
        {loading ? '⏳ جاري الاختبار...' : '🧪 اختبار AI'}
      </button>
      {apiResponse && (
        <pre style={{
          marginTop: 10,
          background: '#1e1e2e',
          color: '#a6e3a1',
          padding: '10px 14px',
          borderRadius: 6,
          fontSize: 12,
          overflowX: 'auto',
          maxHeight: 300,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          direction: 'ltr',
          textAlign: 'left',
        }}>
          {apiResponse}
        </pre>
      )}
    </div>
  );
}
