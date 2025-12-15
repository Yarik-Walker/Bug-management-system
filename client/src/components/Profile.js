import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Profile.css';

const API_URL = 'http://localhost:5000/api';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/profile`);
      setProfile(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!profile) {
    return <div className="error">Ошибка загрузки профиля</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>👤 Личный кабинет</h1>
        <div className="user-badge">
          <span className={`role-badge role-${profile.user.role}`}>
            {profile.user.role === 'admin' ? 'Администратор' : 
             profile.user.role === 'curator' ? 'Куратор' : 
             profile.user.role === 'programmer' ? 'Программист' : 'Тестер'}
          </span>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-card points">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{profile.user.points}</div>
          <div className="stat-label">Баллов</div>
        </div>
        <div className="stat-card bugs">
          <div className="stat-icon">🐛</div>
          <div className="stat-value">{profile.user.bugsFound}</div>
          <div className="stat-label">Найдено багов</div>
        </div>
        <div className="stat-card tasks">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{profile.user.tasksCompleted}</div>
          <div className="stat-label">Выполнено заданий</div>
        </div>
      </div>

      <div className="profile-details">
        <div className="detail-section">
          <h2>Информация</h2>
          <div className="detail-item">
            <strong>Имя:</strong> {profile.user.name}
          </div>
          <div className="detail-item">
            <strong>Имя пользователя:</strong> {profile.user.username}
          </div>
          {profile.user.email && (
            <div className="detail-item">
              <strong>Email:</strong> {profile.user.email}
            </div>
          )}
        </div>

        <div className="detail-section">
          <h2>Статистика</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Всего багов:</span>
              <span className="stat-value">{profile.stats.totalBugs}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Открытых:</span>
              <span className="stat-value">{profile.stats.openBugs}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Всего заданий:</span>
              <span className="stat-value">{profile.stats.totalTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Выполнено:</span>
              <span className="stat-value">{profile.stats.completedTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">В ожидании:</span>
              <span className="stat-value">{profile.stats.pendingTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {profile.recentBugs.length > 0 && (
        <div className="recent-section">
          <h2>Последние баги</h2>
          <div className="bugs-list">
            {profile.recentBugs.map(bug => (
              <div key={bug.id} className="bug-item">
                <div className="bug-title">{bug.title}</div>
                <div className="bug-meta">
                  <span className={`priority-badge priority-${bug.priority}`}>
                    {bug.priority === 'high' ? 'Высокий' : 
                     bug.priority === 'medium' ? 'Средний' : 'Низкий'}
                  </span>
                  <span className="bug-points">+{bug.points} баллов</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.recentTasks.length > 0 && (
        <div className="recent-section">
          <h2>Последние задания</h2>
          <div className="tasks-list">
            {profile.recentTasks.map(task => (
              <div key={task.id} className="task-item">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span className={`status-badge status-${task.status}`}>
                    {task.status === 'completed' ? 'Выполнено' :
                     task.status === 'in-progress' ? 'В работе' : 'Ожидает'}
                  </span>
                  {task.points > 0 && (
                    <span className="task-points">+{task.points} баллов</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;

