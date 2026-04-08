import React, { useState, useMemo } from 'react';
import BrokerCard from '../components/BrokerCard';
import './BrokersPage.css';

function BrokersPage({ messages, isUserActive, buildWhatsAppHref }) {
  const [search, setSearch] = useState('');

  const brokers = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    const map = {};
    messages.forEach(msg => {
      const key = msg.sender_mobile || msg.sender_name || 'unknown';
      if (!map[key]) {
        map[key] = {
          name: msg.sender_name || 'غير معروف',
          phone: msg.sender_mobile && msg.sender_mobile !== 'N/A' ? msg.sender_mobile : '',
          count: 0
        };
      }
      map[key].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [messages]);

  const filtered = useMemo(() => {
    if (!search.trim()) return brokers;
    const q = search.toLowerCase();
    return brokers.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.phone.includes(q)
    );
  }, [brokers, search]);

  return (
    <div className="brokers-page">
      <div className="brokers-page-header">
        <h1>الوسطاء</h1>
        <span className="brokers-count">{brokers.length} وسيط</span>
      </div>

      <div className="brokers-search">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="brokers-search-icon">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="بحث بالاسم أو الرقم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="brokers-search-input"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="brokers-empty">
          <p>لا توجد نتائج</p>
        </div>
      ) : (
        <div className="brokers-grid">
          {filtered.map((broker, i) => (
            <BrokerCard key={i} broker={broker} isUserActive={isUserActive} buildWhatsAppHref={buildWhatsAppHref} />
          ))}
        </div>
      )}
    </div>
  );
}

export default BrokersPage;
