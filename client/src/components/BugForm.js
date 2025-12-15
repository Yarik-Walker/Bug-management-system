import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './BugForm.css';

function BugForm({ bug, onSubmit, onCancel }) {
  const { isAdmin, user } = useAuth();
  const [formData, setFormData] = useState({
    title: bug?.title || '',
    description: bug?.description || '',
    status: bug?.status || 'open',
    priority: bug?.priority || 'medium',
    reporter: bug?.reporter || '',
    steps: bug?.steps || '',
    expectedResult: bug?.expectedResult || '',
    actualResult: bug?.actualResult || '',
    environment: bug?.environment || ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Пожалуйста, укажите название бага');
      return;
    }
    // При создании нового бага не передаем статус - он всегда будет 'open'
    const dataToSubmit = bug ? formData : { ...formData, status: 'open' };
    onSubmit(dataToSubmit);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{bug ? 'Редактировать баг' : 'Создать новый баг'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="bug-form">
          <div className="form-group">
            <label>Название бага *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Краткое описание проблемы"
            />
          </div>

          <div className="form-row">
            {bug && (
              <div className="form-group">
                <label>Статус</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {user?.role !== 'programmer' && <option value="open">Открыт</option>}
                  <option value="in-progress">В работе</option>
                  <option value="resolved">Решен</option>
                  <option value="not-reproducible">Не воспроизводится</option>
                  {isAdmin() && <option value="closed">Закрыт</option>}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Приоритет</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>

          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Подробное описание проблемы"
            />
          </div>

          <div className="form-group">
            <label>Шаги воспроизведения</label>
            <textarea
              name="steps"
              value={formData.steps}
              onChange={handleChange}
              rows="3"
              placeholder="1. Открыть страницу...&#10;2. Нажать на кнопку...&#10;3. ..."
            />
          </div>

          <div className="form-group">
            <label>Ожидаемый результат</label>
            <textarea
              name="expectedResult"
              value={formData.expectedResult}
              onChange={handleChange}
              rows="2"
              placeholder="Что должно произойти"
            />
          </div>

          <div className="form-group">
            <label>Фактический результат</label>
            <textarea
              name="actualResult"
              value={formData.actualResult}
              onChange={handleChange}
              rows="2"
              placeholder="Что происходит на самом деле"
            />
          </div>

          <div className="form-group">
            <label>Окружение</label>
            <input
              type="text"
              name="environment"
              value={formData.environment}
              onChange={handleChange}
              placeholder="Например: Chrome 120, Windows 11"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              {bug ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BugForm;

