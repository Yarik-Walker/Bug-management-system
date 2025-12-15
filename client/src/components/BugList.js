import React from 'react';
import './BugList.css';

function BugList({ bugs, onBugClick }) {
  const getStatusClass = (status) => {
    const statusMap = {
      'open': 'status-open',
      'in-progress': 'status-progress',
      'resolved': 'status-resolved',
      'not-reproducible': 'status-not-reproducible',
      'closed': 'status-closed'
    };
    return statusMap[status] || '';
  };

  const getPriorityClass = (priority) => {
    const priorityMap = {
      'high': 'priority-high',
      'medium': 'priority-medium',
      'low': 'priority-low'
    };
    return priorityMap[priority] || '';
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'open': 'Открыт',
      'in-progress': 'В работе',
      'resolved': 'Решен',
      'not-reproducible': 'Не воспроизводится',
      'closed': 'Закрыт'
    };
    return statusMap[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const priorityMap = {
      'high': 'Высокий',
      'medium': 'Средний',
      'low': 'Низкий'
    };
    return priorityMap[priority] || priority;
  };

  if (bugs.length === 0) {
    return (
      <div className="empty-state">
        <p>Багов не найдено</p>
      </div>
    );
  }

  return (
    <div className="bug-list">
      {bugs.map(bug => (
        <div
          key={bug.id}
          className={`bug-card ${getPriorityClass(bug.priority)}`}
          onClick={() => onBugClick(bug)}
        >
          <div className="bug-card-header">
            <h3 className="bug-title">{bug.title}</h3>
            <div className="bug-badges">
              <span className={`badge status-badge ${getStatusClass(bug.status)}`}>
                {getStatusLabel(bug.status)}
              </span>
              <span className={`badge priority-badge ${getPriorityClass(bug.priority)}`}>
                {getPriorityLabel(bug.priority)}
              </span>
            </div>
          </div>
          {bug.description && (
            <p className="bug-description">{bug.description}</p>
          )}
          <div className="bug-meta">
            <span className="bug-reporter">👤 {bug.reporter}</span>
            <span className="bug-date">
              {new Date(bug.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BugList;

