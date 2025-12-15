import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Tasks.css';

const API_URL = 'http://localhost:5000/api';

function Tasks({ onCreateClick, onTaskCompleted }) {
  const { user, isCurator } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Передаем функцию открытия формы в родительский компонент
  useEffect(() => {
    if (onCreateClick) {
      onCreateClick(() => setShowForm(true));
    }
  }, [onCreateClick]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    points: 0,
    area: '',
    deadline: ''
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchTasks();
    fetchUsers(); // Загружаем всех пользователей для отображения имен
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке заданий:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      // Сохраняем всех пользователей для отображения имен
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
    }
  };
  
  const getUserName = (userId) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? (foundUser.name || foundUser.username) : 'Неизвестно';
  };
  
  const handleAcceptTask = async (taskId) => {
    try {
      await axios.post(`${API_URL}/tasks/${taskId}/accept`);
      fetchTasks();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при принятии задания');
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      // Если assignedTo пустое, отправляем null
      const taskData = {
        ...formData,
        assignedTo: formData.assignedTo || null
      };
      await axios.post(`${API_URL}/tasks`, taskData);
      fetchTasks();
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        points: 0,
        area: '',
        deadline: ''
      });
      setShowForm(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при создании задания');
    }
  };

  const handleUpdateTask = async (id, status) => {
    try {
      const task = tasks.find(t => t.id === id);
      const wasVerification = task && task.taskType === 'bug-verification';
      
      // Проверяем, может ли пользователь изменить статус
      const canEdit = user?.role === 'admin' || 
                      user?.role === 'curator' || 
                      user?.role === 'programmer' ||
                      (task?.assignedTo === user?.id && (status === 'in-progress' || status === 'completed'));
      
      if (!canEdit) {
        alert('Вы можете изменить статус только для принятых вами заданий');
        return;
      }
      
      await axios.put(`${API_URL}/tasks/${id}`, { status });
      fetchTasks();
      
      // Если это задание проверки бага и оно выполнено, обновляем список багов
      if (wasVerification && status === 'completed' && onTaskCompleted) {
        onTaskCompleted();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при обновлении задания');
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'Ожидает',
      'in-progress': 'В работе',
      'completed': 'Выполнено',
      'cancelled': 'Отменено'
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

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <h1>📋 Задания</h1>
      </div>

      {showForm && isCurator() && (
        <div className="task-form-card">
          <h2>Создать задание</h2>
          <form onSubmit={handleCreateTask}>
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Назначить тестеру (опционально)</label>
                <select
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                >
                  <option value="">Не назначено (любой может принять)</option>
                  {users.filter(u => u.role === 'tester').map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.username}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Приоритет</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
              <div className="form-group">
                <label>Баллы</label>
                <input
                  type="number"
                  name="points"
                  value={formData.points}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Область тестирования</label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleInputChange}
                placeholder="Например: Авторизация, Профиль"
              />
            </div>
            <div className="form-group">
              <label>Дедлайн</label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Отмена
              </button>
              <button type="submit" className="btn btn-primary">
                Создать
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tasks-list">
        {tasks.length === 0 ? (
          <div className="empty-state">Заданий нет</div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="task-card">
              <div className="task-header">
                <h3>{task.title}</h3>
                <div className="task-badges">
                  {task.taskType === 'bug-verification' && (
                    <span className="task-type-badge">🔍 Проверка бага</span>
                  )}
                  <span className={`status-badge status-${task.status}`}>
                    {getStatusLabel(task.status)}
                  </span>
                  <span className={`priority-badge priority-${task.priority}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                  {task.points > 0 && (
                    <span className="points-badge">+{task.points} баллов</span>
                  )}
                </div>
              </div>
              {task.description && (
                <p className="task-description">{task.description}</p>
              )}
              <div className="task-meta">
                {task.area && (
                  <span className="task-area">📍 {task.area}</span>
                )}
                {task.deadline && (
                  <span className="task-deadline">
                    📅 {new Date(task.deadline).toLocaleDateString('ru-RU')}
                  </span>
                )}
                {task.assignedTo ? (
                  <span className="task-assigned">👤 {getUserName(task.assignedTo)}</span>
                ) : (
                  <span className="task-unassigned">⏳ Не назначено</span>
                )}
              </div>
              {!task.assignedTo && task.status === 'pending' && (
                <div className="task-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAcceptTask(task.id)}
                  >
                    Принять задание
                  </button>
                </div>
              )}
              {task.assignedTo === user?.id && task.status !== 'completed' && (
                <div className="task-actions">
                  {task.status === 'pending' && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleUpdateTask(task.id, 'in-progress')}
                    >
                      Начать выполнение
                    </button>
                  )}
                  {task.status === 'in-progress' && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleUpdateTask(task.id, 'completed')}
                    >
                      Завершить
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Tasks;

