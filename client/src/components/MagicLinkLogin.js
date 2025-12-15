import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

function MagicLinkLogin() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginByLink } = useAuth();

  // Проверяем токен из URL
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'login' && pathParts[2]) {
      setToken(pathParts[2]);
      handleLogin(pathParts[2]);
    }
  }, []);

  const handleLogin = async (linkToken) => {
    setError('');
    setLoading(true);

    const result = await loginByLink(linkToken);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Введите токен из ссылки');
      return;
    }
    await handleLogin(token);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🐛 Система управления багами</h1>
        <h2>Вход по ссылке</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label>Токен из ссылки</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoFocus
              placeholder="Вставьте токен из ссылки"
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <div className="login-info">
          <p>Получите ссылку для входа у администратора или куратора</p>
        </div>
      </div>
    </div>
  );
}

export default MagicLinkLogin;

