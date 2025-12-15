import React, { useState } from 'react';
import BugForm from './BugForm';
import { useAuth } from '../contexts/AuthContext';
import './BugDetails.css';

function BugDetails({ bug, onUpdate, onDelete, onClose }) {
  const { canEditBugs, isAdmin, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (bugData) => {
    onUpdate(bug.id, bugData);
    setIsEditing(false);
  };

  const handleQuickStatusChange = (newStatus) => {
    onUpdate(bug.id, { ...bug, status: newStatus });
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

  if (isEditing) {
    return (
      <BugForm
        bug={bug}
        onSubmit={handleUpdate}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bug-details" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{bug.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="bug-details-content">
          <div className="bug-details-header">
            <div className="bug-badges">
              <span className={`badge status-badge ${getStatusClass(bug.status)}`}>
                {getStatusLabel(bug.status)}
              </span>
              <span className={`badge priority-badge ${getPriorityClass(bug.priority)}`}>
                {getPriorityLabel(bug.priority)}
              </span>
            </div>
          </div>

          {canEditBugs() && (bug.status !== 'closed' && bug.status !== 'not-reproducible' || isAdmin()) && (
            <div className="quick-status-actions">
              <h3>Быстрая смена статуса:</h3>
              <div className="status-buttons">
                {user?.role !== 'programmer' && (
                  <button
                    className={`status-btn ${bug.status === 'open' ? 'active' : ''}`}
                    onClick={() => handleQuickStatusChange('open')}
                    disabled={bug.status === 'open'}
                  >
                    Открыт
                  </button>
                )}
                <button
                  className={`status-btn ${bug.status === 'in-progress' ? 'active' : ''}`}
                  onClick={() => handleQuickStatusChange('in-progress')}
                  disabled={bug.status === 'in-progress'}
                >
                  В работе
                </button>
                <button
                  className={`status-btn ${bug.status === 'resolved' ? 'active' : ''}`}
                  onClick={() => handleQuickStatusChange('resolved')}
                  disabled={bug.status === 'resolved'}
                >
                  Решен
                </button>
                <button
                  className={`status-btn ${bug.status === 'not-reproducible' ? 'active' : ''}`}
                  onClick={() => handleQuickStatusChange('not-reproducible')}
                  disabled={bug.status === 'not-reproducible'}
                >
                  Не воспроизводится
                </button>
                {isAdmin() && (
                  <button
                    className={`status-btn ${bug.status === 'closed' ? 'active' : ''}`}
                    onClick={() => handleQuickStatusChange('closed')}
                    disabled={bug.status === 'closed'}
                  >
                    Закрыт
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bug-details-section">
            <h3>Описание</h3>
            <p>{bug.description || 'Не указано'}</p>
          </div>

          {bug.steps && (
            <div className="bug-details-section">
              <h3>Шаги воспроизведения</h3>
              <pre className="bug-steps">{bug.steps}</pre>
            </div>
          )}

          {bug.expectedResult && (
            <div className="bug-details-section">
              <h3>Ожидаемый результат</h3>
              <p>{bug.expectedResult}</p>
            </div>
          )}

          {bug.actualResult && (
            <div className="bug-details-section">
              <h3>Фактический результат</h3>
              <p>{bug.actualResult}</p>
            </div>
          )}

          {bug.environment && (
            <div className="bug-details-section">
              <h3>Окружение</h3>
              <p>{bug.environment}</p>
            </div>
          )}

          {bug.status === 'resolved' && bug.verificationTask && (
            <div className="bug-details-section verification-info">
              <h3>🔍 Проверка бага</h3>
              <div className="verification-status">
                {bug.verificationTask.status === 'completed' ? (
                  <p className="verification-completed">✅ Баг проверен и будет закрыт</p>
                ) : bug.verificationTask.status === 'in-progress' ? (
                  <p className="verification-in-progress">⏳ Проверка в процессе</p>
                ) : (
                  <p className="verification-pending">⏸️ Ожидает проверки тестером</p>
                )}
              </div>
            </div>
          )}

          <div className="bug-details-meta">
            <div className="meta-item">
              <strong>Тестер:</strong> {bug.reporter || 'Не указано'}
            </div>
            <div className="meta-item">
              <strong>Создан:</strong> {new Date(bug.createdAt).toLocaleString('ru-RU')}
            </div>
            {bug.updatedAt !== bug.createdAt && (
              <div className="meta-item">
                <strong>Обновлен:</strong> {new Date(bug.updatedAt).toLocaleString('ru-RU')}
              </div>
            )}
            {bug.closedAt && (
              <div className="meta-item">
                <strong>Закрыт:</strong> {new Date(bug.closedAt).toLocaleString('ru-RU')}
              </div>
            )}
          </div>

          <div className="bug-details-section">
            <h3>📋 История изменений статуса</h3>
            {bug.statusHistory && bug.statusHistory.length > 0 ? (
              <div className="status-history">
                {bug.statusHistory.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="status-history-item">
                    <div className="status-history-status">
                      <span className={`badge status-badge ${getStatusClass(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                    </div>
                    <div className="status-history-info">
                      <span className="status-history-user">{entry.changedBy}</span>
                      <span className="status-history-date">
                        {new Date(entry.changedAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>История изменений пока пуста</p>
            )}
          </div>

          <div className="bug-details-section">
            <h3>👥 Работали с багом</h3>
            {bug.workedBy && bug.workedBy.length > 0 ? (
              <div className="worked-by-list">
                {bug.workedBy.map((worker, idx) => (
                  <div key={idx} className="worked-by-item">
                    <span className="worker-name">{worker.userName}</span>
                    <span className="worker-dates">
                      {new Date(worker.firstWorkedAt).toLocaleDateString('ru-RU')} - {new Date(worker.lastWorkedAt).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#666', fontStyle: 'italic' }}>Пока никто не работал с этим багом</p>
            )}
          </div>

          {(bug.status !== 'closed' && bug.status !== 'not-reproducible' || isAdmin()) && canEditBugs() && (
            <div className="bug-details-actions">
              <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                Редактировать
              </button>
              <button className="btn btn-danger" onClick={() => onDelete(bug.id)}>
                Удалить
              </button>
            </div>
          )}
          {(bug.status === 'closed' || bug.status === 'not-reproducible') && !isAdmin() && (
            <div className="bug-details-info">
              <p style={{ color: '#666', fontStyle: 'italic' }}>
                Закрытые баги может редактировать только администратор
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BugDetails;

