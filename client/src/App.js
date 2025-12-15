import React, { useState, useEffect } from 'react';
import './App.css';
import BugList from './components/BugList';
import BugForm from './components/BugForm';
import BugDetails from './components/BugDetails';
import Stats from './components/Stats';
import MagicLinkLogin from './components/MagicLinkLogin';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import Tasks from './components/Tasks';
import { useAuth } from './contexts/AuthContext';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function App() {
  const { user, logout, loading, isAdmin, isCurator } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [selectedBug, setSelectedBug] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [currentView, setCurrentView] = useState('bugs'); // bugs, profile, tasks
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ status: 'all', priority: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const [createTaskHandler, setCreateTaskHandler] = useState(null);

  useEffect(() => {
    if (user) {
      fetchBugs();
      fetchStats();
    }
  }, [user]);

  const fetchBugs = async () => {
    try {
      const response = await axios.get(`${API_URL}/bugs`);
      setBugs(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке багов:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
    }
  };

  const handleCreateBug = async (bugData) => {
    try {
      await axios.post(`${API_URL}/bugs`, bugData);
      fetchBugs();
      fetchStats();
      setShowForm(false);
    } catch (error) {
      console.error('Ошибка при создании бага:', error);
      alert('Ошибка при создании бага');
    }
  };

  const handleUpdateBug = async (id, bugData) => {
    try {
      await axios.put(`${API_URL}/bugs/${id}`, bugData);
      fetchBugs();
      fetchStats();
      // Если баг стал решен, обновляем выбранный баг для показа информации о задании проверки
      if (bugData.status === 'resolved') {
        const response = await axios.get(`${API_URL}/bugs/${id}`);
        setSelectedBug(response.data);
      } else {
        setSelectedBug(null);
      }
    } catch (error) {
      console.error('Ошибка при обновлении бага:', error);
      alert('Ошибка при обновлении бага');
    }
  };

  const handleDeleteBug = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить этот баг?')) {
      try {
        await axios.delete(`${API_URL}/bugs/${id}`);
        fetchBugs();
        fetchStats();
        setSelectedBug(null);
      } catch (error) {
        console.error('Ошибка при удалении бага:', error);
        alert('Ошибка при удалении бага');
      }
    }
  };

  const filteredBugs = bugs.filter(bug => {
    const matchesStatus = filter.status === 'all' || bug.status === filter.status;
    const matchesPriority = filter.priority === 'all' || bug.priority === filter.priority;
    const matchesSearch = searchTerm === '' || 
      bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <MagicLinkLogin />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>🐛 Система управления багами</h1>
          <span className="user-info">
            {user.name || user.username} ({user.role === 'admin' ? 'Админ' : 
            user.role === 'curator' ? 'Куратор' : 
            user.role === 'programmer' ? 'Программист' : 'Тестер'}) • {user.points || 0} ⭐
          </span>
        </div>
        <div className="header-right">
          <div className="nav-buttons">
            <button 
              className={`btn btn-nav ${currentView === 'bugs' ? 'active' : ''}`}
              onClick={() => setCurrentView('bugs')}
            >
              Баги
            </button>
            <button 
              className={`btn btn-nav ${currentView === 'tasks' ? 'active' : ''}`}
              onClick={() => setCurrentView('tasks')}
            >
              Задания
            </button>
            <button 
              className={`btn btn-nav ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => setCurrentView('profile')}
            >
              Профиль
            </button>
          </div>
          {(isAdmin() || isCurator()) && (
            <button className="btn btn-secondary" onClick={() => setShowAdminPanel(true)}>
              Управление
            </button>
          )}
          {currentView === 'bugs' && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              + Создать баг
            </button>
          )}
          {currentView === 'tasks' && (isAdmin() || isCurator()) && (
            <button className="btn btn-primary" onClick={() => {
              if (createTaskHandler) {
                createTaskHandler();
              }
            }}>
              + Создать задание
            </button>
          )}
          <button className="btn btn-secondary" onClick={logout}>
            Выйти
          </button>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'profile' && <Profile />}
        {currentView === 'tasks' && (
          <Tasks 
            onCreateClick={setCreateTaskHandler}
            onTaskCompleted={() => {
              fetchBugs();
              fetchStats();
            }}
          />
        )}
        {currentView === 'bugs' && (
          <>
            {stats && <Stats stats={stats} />}

            <div className="filters">
          <input
            type="text"
            placeholder="Поиск по названию или описанию..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="filter-select"
          >
            <option value="all">Все статусы</option>
            <option value="open">Открыт</option>
            <option value="in-progress">В работе</option>
            <option value="resolved">Решен</option>
            <option value="not-reproducible">Не воспроизводится</option>
            <option value="closed">Закрыт</option>
          </select>
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            className="filter-select"
          >
            <option value="all">Все приоритеты</option>
            <option value="high">Высокий</option>
            <option value="medium">Средний</option>
            <option value="low">Низкий</option>
          </select>
        </div>

        {showForm && (
          <BugForm
            onSubmit={handleCreateBug}
            onCancel={() => setShowForm(false)}
          />
        )}

        {selectedBug && (
          <BugDetails
            bug={selectedBug}
            onUpdate={handleUpdateBug}
            onDelete={handleDeleteBug}
            onClose={() => setSelectedBug(null)}
          />
        )}

            <BugList
              bugs={filteredBugs}
              onBugClick={setSelectedBug}
            />
          </>
        )}
      </main>

      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </div>
  );
}

export default App;

