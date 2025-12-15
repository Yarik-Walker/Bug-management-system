import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const API_URL = 'http://localhost:5000/api';

function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'tester',
    email: ''
  });
  const [magicLinks, setMagicLinks] = useState({});
  const [pointsModal, setPointsModal] = useState({ show: false, user: null, amount: '', reason: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      alert('Ошибка при загрузке пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.username) {
      alert('Имя пользователя обязательно');
      return;
    }

    try {
      await axios.post(`${API_URL}/users`, formData);
      fetchUsers();
      setFormData({ username: '', password: '', name: '', role: 'tester', email: '' });
      setShowForm(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при создании пользователя');
    }
  };

  const handleCreateMagicLink = async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/auth/create-link`, { userId });
      const baseUrl = window.location.origin;
      const fullLink = `${baseUrl}/login/${response.data.token}`;
      setMagicLinks({ ...magicLinks, [userId]: fullLink });
      
      // Копируем в буфер обмена
      navigator.clipboard.writeText(fullLink);
      alert('Ссылка скопирована в буфер обмена!');
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при создании ссылки');
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role
    });
    setShowForm(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/users/${editingUser.id}`, formData);
      fetchUsers();
      setFormData({ username: '', password: '', name: '', role: 'tester' });
      setEditingUser(null);
      setShowForm(false);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при обновлении пользователя');
    }
  };

  const handlePointsChange = async (e) => {
    e.preventDefault();
    if (!pointsModal.amount || pointsModal.amount === '0') {
      alert('Укажите количество баллов');
      return;
    }
    
    try {
      const amount = parseInt(pointsModal.amount);
      await axios.post(`${API_URL}/users/${pointsModal.user.id}/points`, {
        amount,
        reason: pointsModal.reason
      });
      fetchUsers();
      setPointsModal({ show: false, user: null, amount: '', reason: '' });
      alert(`Баллы ${amount > 0 ? 'начислены' : 'сняты'} успешно!`);
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при изменении баллов');
    }
  };

  const openPointsModal = (user) => {
    setPointsModal({ show: true, user, amount: '', reason: '' });
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/users/${id}`);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Ошибка при удалении пользователя');
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content admin-panel">
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 Управление пользователями</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="admin-content">
          <button className="btn btn-primary" onClick={() => {
            setEditingUser(null);
            setFormData({ username: '', password: '', name: '', role: 'tester' });
            setShowForm(true);
          }}>
            + Создать пользователя
          </button>

          {showForm && (
            <div className="user-form-card">
              <h3>{editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}</h3>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                <div className="form-group">
                  <label>Имя пользователя *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={!!editingUser}
                    placeholder="username"
                  />
                </div>
                <div className="form-group">
                  <label>Пароль {editingUser ? '(оставьте пустым, чтобы не менять)' : '(необязательно, используется magic link)'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="password"
                  />
                </div>
                <div className="form-group">
                  <label>Имя</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Полное имя"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Роль</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="tester">Тестер</option>
                    <option value="programmer">Программист</option>
                    <option value="curator">Куратор</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingUser ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="users-list">
            <h3>Список пользователей ({users.length})</h3>
            {users.length === 0 ? (
              <p className="empty-state">Пользователей нет</p>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Имя пользователя</th>
                    <th>Имя</th>
                    <th>Роль</th>
                    <th>Баллы</th>
                    <th>Дата создания</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.name || '-'}</td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role === 'admin' ? 'Админ' : 
                           user.role === 'curator' ? 'Куратор' : 
                           user.role === 'programmer' ? 'Программист' : 'Тестер'}
                        </span>
                      </td>
                      <td>{user.points || 0} ⭐</td>
                      <td>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <button
                          className="btn-small btn-link"
                          onClick={() => handleCreateMagicLink(user.id)}
                          title="Создать ссылку для входа"
                        >
                          🔗
                        </button>
                        {magicLinks[user.id] && (
                          <div className="magic-link-display">
                            <input type="text" value={magicLinks[user.id]} readOnly />
                          </div>
                        )}
                        <button
                          className="btn-small btn-points"
                          onClick={() => openPointsModal(user)}
                          title="Изменить баллы"
                        >
                          ⭐
                        </button>
                        <button
                          className="btn-small btn-edit"
                          onClick={() => handleEditUser(user)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-small btn-delete"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {pointsModal.show && (
        <div className="modal-overlay" onClick={() => setPointsModal({ show: false, user: null, amount: '', reason: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Изменить баллы: {pointsModal.user?.name || pointsModal.user?.username}</h2>
              <button className="close-btn" onClick={() => setPointsModal({ show: false, user: null, amount: '', reason: '' })}>×</button>
            </div>
            <form onSubmit={handlePointsChange} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label>Текущие баллы: <strong>{pointsModal.user?.points || 0} ⭐</strong></label>
              </div>
              <div className="form-group">
                <label>Количество баллов *</label>
                <input
                  type="number"
                  value={pointsModal.amount}
                  onChange={(e) => setPointsModal({ ...pointsModal, amount: e.target.value })}
                  placeholder="Положительное для начисления, отрицательное для снятия"
                  required
                  autoFocus
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '1rem' }}
                />
                <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>Например: +10 для начисления, -5 для снятия</small>
              </div>
              <div className="form-group">
                <label>Причина (опционально)</label>
                <textarea
                  value={pointsModal.reason}
                  onChange={(e) => setPointsModal({ ...pointsModal, reason: e.target.value })}
                  rows="3"
                  placeholder="Укажите причину изменения баллов"
                  style={{ width: '100%', padding: '0.75rem', border: '2px solid #e0e0e0', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPointsModal({ show: false, user: null, amount: '', reason: '' })}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Применить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;

