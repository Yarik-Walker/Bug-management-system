import React from 'react';
import './Stats.css';

function Stats({ stats }) {
  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-value">{stats.total}</div>
        <div className="stat-label">Всего багов</div>
      </div>
      <div className="stat-card status-open">
        <div className="stat-value">{stats.open}</div>
        <div className="stat-label">Открыто</div>
      </div>
      <div className="stat-card status-progress">
        <div className="stat-value">{stats.inProgress}</div>
        <div className="stat-label">В работе</div>
      </div>
      <div className="stat-card status-resolved">
        <div className="stat-value">{stats.resolved}</div>
        <div className="stat-label">Решено</div>
      </div>
      <div className="stat-card status-closed">
        <div className="stat-value">{stats.closed}</div>
        <div className="stat-label">Закрыто</div>
      </div>
      <div className="stat-card priority-high">
        <div className="stat-value">{stats.high}</div>
        <div className="stat-label">Высокий приоритет</div>
      </div>
    </div>
  );
}

export default Stats;

