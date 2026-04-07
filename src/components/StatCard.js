import React from 'react';
import './StatCard.css';

function StatCard({ icon, label, value, color, trend }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color }}>
      <div className="stat-card-icon">
        {icon}
      </div>
      <div className="stat-card-body">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
        {trend !== undefined && (
          <span className={`stat-card-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default StatCard;
