import React from 'react';
import './FilterPanel.css';

function FilterPanel({ filters, values, onChange, onReset, resultCount }) {
  const activeCount = Object.entries(values).filter(([k, v]) => v !== 'الكل' && k !== 'search').length;

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <span className="filter-panel-title">
          الفلاتر
          {activeCount > 0 && <span className="filter-active-badge">{activeCount}</span>}
        </span>
        {activeCount > 0 && (
          <button className="filter-reset-btn" onClick={onReset}>مسح الكل</button>
        )}
        {resultCount !== undefined && (
          <span className="filter-result-count">{resultCount} نتيجة</span>
        )}
      </div>
      <div className="filter-panel-body">
        {filters.map(filter => (
          <div key={filter.key} className="filter-item">
            <label className="filter-item-label">{filter.label}</label>
            <select
              className="filter-item-select"
              value={values[filter.key] || 'الكل'}
              onChange={e => onChange(filter.key, e.target.value)}
            >
              <option value="الكل">الكل</option>
              {filter.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FilterPanel;
