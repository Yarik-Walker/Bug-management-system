const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireAdmin, requireCurator, canEditBugs, generateToken } = require('./auth');
const { 
  initUsersFile, 
  findUserByUsername, 
  findUserById,
  createUser, 
  readUsers, 
  updateUser, 
  deleteUser, 
  verifyPassword 
} = require('./users');
const { createMagicLink, useMagicLink, initLinksFile } = require('./magicLinks');
const {
  initTasksFile,
  readTasks,
  createTask,
  updateTask,
  deleteTask,
  getTasksForTester,
  getTasksForCurator,
  getVerificationTaskForBug
} = require('./tasks');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'bugs.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация файла данных
async function initDataFile() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Ошибка инициализации файла данных:', error);
  }
}

// Чтение багов
async function readBugs() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Запись багов
async function writeBugs(bugs) {
  await fs.writeFile(DATA_FILE, JSON.stringify(bugs, null, 2));
}

// API Routes

// ========== АВТОРИЗАЦИЯ ==========

// Создать magic link для пользователя (только админ/куратор)
app.post('/api/auth/create-link', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    if (currentUser.role !== 'admin' && currentUser.role !== 'curator') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'ID пользователя обязателен' });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const token = await createMagicLink(userId);
    const baseUrl = req.protocol + '://' + req.get('host');
    const link = `${baseUrl}/login/${token}`;
    
    res.json({ link, token, expiresIn: '24 часа' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при создании ссылки' });
  }
});

// Вход по magic link
app.post('/api/auth/login-link', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Токен обязателен' });
    }

    const userId = await useMagicLink(token);
    if (!userId) {
      return res.status(401).json({ error: 'Недействительная или истекшая ссылка' });
    }

    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const jwtToken = generateToken(user);
    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        points: user.points || 0,
        bugsFound: user.bugsFound || 0,
        tasksCompleted: user.tasksCompleted || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

// Получить текущего пользователя
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email || '',
      points: user.points || 0,
      bugsFound: user.bugsFound || 0,
      tasksCompleted: user.tasksCompleted || 0,
      curatorId: user.curatorId || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
});

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только админ) ==========

// Получить всех пользователей (админ/куратор)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    const users = await readUsers();
    
    let filteredUsers = users;
    // Куратор видит только своих тестеров
    if (currentUser.role === 'curator') {
      filteredUsers = users.filter(u => u.curatorId === currentUser.id || u.id === currentUser.id);
    }
    
    const usersWithoutPasswords = filteredUsers.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      email: u.email || '',
      points: u.points || 0,
      bugsFound: u.bugsFound || 0,
      tasksCompleted: u.tasksCompleted || 0,
      curatorId: u.curatorId || null,
      createdAt: u.createdAt
    }));
    res.json(usersWithoutPasswords);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

// Создать нового пользователя (админ/куратор)
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    if (currentUser.role !== 'admin' && currentUser.role !== 'curator') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const { username, password, name, role, email, curatorId } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Имя пользователя обязательно' });
    }

    // Куратор может создавать только тестеров и назначать их себе
    const userRole = currentUser.role === 'curator' ? 'tester' : (role || 'tester');
    const assignedCuratorId = currentUser.role === 'curator' ? currentUser.id : (curatorId || null);

    const newUser = await createUser({ 
      username, 
      password: password || 'temp', 
      name, 
      role: userRole,
      email,
      curatorId: assignedCuratorId
    });
    res.status(201).json(newUser);
  } catch (error) {
    if (error.message.includes('уже существует')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Ошибка при создании пользователя' });
  }
});

// Обновить пользователя
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params.id, req.body);
    res.json(updatedUser);
  } catch (error) {
    if (error.message.includes('не найден')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});

// Изменить баллы пользователя (начисление/снятие)
app.post('/api/users/:id/points', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    if (typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({ error: 'Укажите количество баллов (положительное для начисления, отрицательное для снятия)' });
    }
    
    const user = await findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const currentPoints = user.points || 0;
    const newPoints = Math.max(0, currentPoints + amount); // Не позволяем уйти в минус
    
    const updatedUser = await updateUser(req.params.id, { 
      points: newPoints 
    });
    
    res.json({ 
      user: updatedUser, 
      change: amount,
      previousPoints: currentPoints,
      newPoints: newPoints,
      reason: reason || 'Ручное изменение'
    });
  } catch (error) {
    if (error.message.includes('не найден')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Ошибка при изменении баллов' });
  }
});

// Удалить пользователя
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ message: 'Пользователь удален' });
  } catch (error) {
    if (error.message.includes('не найден')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Ошибка при удалении пользователя' });
  }
});

// ========== БАГИ ==========

// Получить все баги (требуется авторизация)
app.get('/api/bugs', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    const bugs = await readBugs();
    
    let filteredBugs = bugs;
    // Куратор видит только баги своих тестеров
    if (currentUser.role === 'curator') {
      const testers = await readUsers();
      const testerIds = testers.filter(t => t.curatorId === currentUser.id).map(t => t.id);
      filteredBugs = bugs.filter(b => testerIds.includes(b.reporterId));
    } else if (currentUser.role === 'tester') {
      // Тестер видит свои баги и баги со статусом "решено", для которых есть задания проверки
      // Но не видит закрытые баги
      const allTasks = await readTasks();
      const verificationBugIds = allTasks
        .filter(t => t.taskType === 'bug-verification' && (!t.assignedTo || t.assignedTo === currentUser.id))
        .map(t => t.bugId)
        .filter(id => id !== null && id !== undefined);
      
      filteredBugs = bugs.filter(b => {
        // Не показываем закрытые баги
        if (b.status === 'closed' || b.status === 'not-reproducible') {
          return false;
        }
        // Показываем свои баги или решенные баги с заданиями проверки
        return b.reporterId === currentUser.id || 
               (b.status === 'resolved' && verificationBugIds.includes(b.id));
      });
    } else if (currentUser.role === 'programmer') {
      // Программист не видит закрытые баги
      filteredBugs = bugs.filter(b => b.status !== 'closed' && b.status !== 'not-reproducible');
    }
    // Админ видит все баги
    
    res.json(filteredBugs);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении багов' });
  }
});

// Получить баг по ID
app.get('/api/bugs/:id', authenticateToken, async (req, res) => {
  try {
    const bugs = await readBugs();
    const bug = bugs.find(b => b.id === req.params.id);
    if (!bug) {
      return res.status(404).json({ error: 'Баг не найден' });
    }
    
    // Инициализируем историю статусов для старых багов
    if (!bug.statusHistory || bug.statusHistory.length === 0) {
      bug.statusHistory = [{
        status: bug.status,
        changedBy: bug.reporter || 'Система',
        changedById: bug.reporterId || null,
        changedAt: bug.createdAt || bug.updatedAt
      }];
    }
    
    // Инициализируем список работавших для старых багов
    if (!bug.workedBy) {
      bug.workedBy = [];
    }
    
    // Если баг решен, проверяем наличие задания проверки
    if (bug.status === 'resolved') {
      const verificationTask = await getVerificationTaskForBug(bug.id);
      if (verificationTask) {
        bug.verificationTask = {
          id: verificationTask.id,
          status: verificationTask.status,
          assignedTo: verificationTask.assignedTo
        };
      }
    }
    
    res.json(bug);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении бага' });
  }
});

// Создать новый баг
app.post('/api/bugs', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    const bugs = await readBugs();
    
    // Определяем баллы за баг в зависимости от приоритета
    const pointsMap = {
      'high': 10,
      'medium': 5,
      'low': 2
    };
    const points = pointsMap[req.body.priority] || 5;
    
    const newBug = {
      id: uuidv4(),
      title: req.body.title,
      description: req.body.description || '',
      status: 'open', // При создании баг всегда имеет статус 'open'
      priority: req.body.priority || 'medium',
      reporter: user.name || user.username,
      reporterId: req.user.id,
      points: points, // Баллы за этот баг
      steps: req.body.steps || '',
      expectedResult: req.body.expectedResult || '',
      actualResult: req.body.actualResult || '',
      environment: req.body.environment || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory: [{
        status: 'open',
        changedBy: user.name || user.username,
        changedById: req.user.id,
        changedAt: new Date().toISOString()
      }],
      workedBy: [] // Кто работал с багом
    };
    bugs.push(newBug);
    await writeBugs(bugs);
    
    // Начисляем баллы тестеру
    if (user.role === 'tester') {
      user.points = (user.points || 0) + points;
      user.bugsFound = (user.bugsFound || 0) + 1;
      await updateUser(user.id, { points: user.points, bugsFound: user.bugsFound });
    }
    
    res.status(201).json(newBug);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при создании бага' });
  }
});

// Обновить баг (только программист, куратор, админ)
app.put('/api/bugs/:id', authenticateToken, canEditBugs, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    const bugs = await readBugs();
    const index = bugs.findIndex(b => b.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Баг не найден' });
    }
    
    const oldBug = bugs[index];
    
    // Проверяем, закрыт ли баг (closed или not-reproducible)
    const isClosed = oldBug.status === 'closed' || oldBug.status === 'not-reproducible';
    if (isClosed && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Закрытые баги может редактировать только администратор' });
    }
    
    // Программист не может ставить статус "Закрыт"
    if (req.body.status === 'closed' && currentUser.role === 'programmer') {
      return res.status(403).json({ error: 'Программист не может закрывать баги. Используйте статус "Не воспроизводится" или "Решен"' });
    }
    
    // Программист не может ставить статус "Открыт"
    if (req.body.status === 'open' && currentUser.role === 'programmer') {
      return res.status(403).json({ error: 'Программист не может возвращать баги в статус "Открыт"' });
    }
    
    const wasResolved = oldBug.status === 'resolved';
    const isNowResolved = req.body.status === 'resolved';
    const isNotReproducible = req.body.status === 'not-reproducible';
    const statusChanged = req.body.status && req.body.status !== oldBug.status;
    
    // Если статус меняется на "Не воспроизводится", устанавливаем дату закрытия, но статус остается "not-reproducible"
    if (isNotReproducible && oldBug.status !== 'not-reproducible') {
      req.body.closedAt = new Date().toISOString();
      req.body.closedReason = 'not-reproducible'; // Сохраняем причину закрытия
    }
    
    // Обновляем историю статусов
    const statusHistory = oldBug.statusHistory || [{
      status: oldBug.status,
      changedBy: oldBug.reporter || 'Система',
      changedById: oldBug.reporterId || null,
      changedAt: oldBug.createdAt
    }];
    
    if (statusChanged) {
      statusHistory.push({
        status: req.body.status,
        changedBy: currentUser.name || currentUser.username,
        changedById: currentUser.id,
        changedAt: new Date().toISOString()
      });
    }
    
    // Обновляем список тех, кто работал с багом
    let workedBy = oldBug.workedBy || [];
    if (statusChanged && !workedBy.find(w => w.userId === currentUser.id)) {
      workedBy.push({
        userId: currentUser.id,
        userName: currentUser.name || currentUser.username,
        firstWorkedAt: new Date().toISOString(),
        lastWorkedAt: new Date().toISOString()
      });
    } else if (statusChanged && workedBy.find(w => w.userId === currentUser.id)) {
      const workedByIndex = workedBy.findIndex(w => w.userId === currentUser.id);
      workedBy[workedByIndex].lastWorkedAt = new Date().toISOString();
    }
    
    bugs[index] = {
      ...bugs[index],
      ...req.body,
      id: req.params.id,
      updatedAt: new Date().toISOString(),
      statusHistory: statusHistory,
      workedBy: workedBy
    };
    
    await writeBugs(bugs);
    
    // Если баг только что стал "решен", создаем задание для проверки
    if (!wasResolved && isNowResolved) {
      const bug = bugs[index];
      // Создаем задание для проверки бага (любой может принять)
      const verificationTask = await createTask({
        title: `Проверка бага: ${bug.title}`,
        description: `Проверьте, что баг "${bug.title}" действительно исправлен. Если все работает корректно, подтвердите выполнение задания.`,
        createdBy: req.user.id,
        assignedTo: null, // Не назначаем - любой может принять
        priority: bug.priority,
        points: 2, // Небольшие баллы за проверку
        area: 'Проверка исправлений',
        taskType: 'bug-verification',
        bugId: bug.id
      });
      
      console.log(`Создано задание проверки для бага ${bug.id}`);
    }
    
    res.json(bugs[index]);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении бага' });
  }
});

// Удалить баг (только программист, куратор, админ)
app.delete('/api/bugs/:id', authenticateToken, canEditBugs, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    const bugs = await readBugs();
    const bug = bugs.find(b => b.id === req.params.id);
    
    if (!bug) {
      return res.status(404).json({ error: 'Баг не найден' });
    }
    
    // Если баг закрыт (closed или not-reproducible), только админ может его удалить
    const isClosed = bug.status === 'closed' || bug.status === 'not-reproducible';
    if (isClosed && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Закрытые баги может удалять только администратор' });
    }
    
    const filteredBugs = bugs.filter(b => b.id !== req.params.id);
    await writeBugs(filteredBugs);
    res.json({ message: 'Баг удален' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении бага' });
  }
});

// Статистика
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    const bugs = await readBugs();
    
    let filteredBugs = bugs;
    // Куратор видит только баги своих тестеров
    if (currentUser.role === 'curator') {
      const testers = await readUsers();
      const testerIds = testers.filter(t => t.curatorId === currentUser.id).map(t => t.id);
      filteredBugs = bugs.filter(b => testerIds.includes(b.reporterId));
    } else if (currentUser.role === 'tester') {
      // Тестер видит только свои баги
      filteredBugs = bugs.filter(b => b.reporterId === currentUser.id);
    }
    // Программист, админ видят все баги (filteredBugs уже = bugs)
    
    const stats = {
      total: filteredBugs.length,
      open: filteredBugs.filter(b => b.status === 'open').length,
      inProgress: filteredBugs.filter(b => b.status === 'in-progress').length,
      resolved: filteredBugs.filter(b => b.status === 'resolved').length,
      closed: filteredBugs.filter(b => b.status === 'closed' || b.status === 'not-reproducible').length,
      high: filteredBugs.filter(b => b.priority === 'high' && b.status === 'open').length, // Только открытые с высоким приоритетом
      medium: filteredBugs.filter(b => b.priority === 'medium').length,
      low: filteredBugs.filter(b => b.priority === 'low').length
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});

// ========== ЗАДАНИЯ ==========

// Получить все задания
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    let tasks;
    
    if (currentUser.role === 'tester') {
      tasks = await getTasksForTester(currentUser.id);
    } else if (currentUser.role === 'curator') {
      tasks = await getTasksForCurator(currentUser.id);
    } else if (currentUser.role === 'programmer') {
      tasks = await readTasks();
    } else {
      tasks = await readTasks();
    }
    
    // Тестеры и программисты не видят задачи для закрытых багов
    if (currentUser.role === 'tester' || currentUser.role === 'programmer') {
      const bugs = await readBugs();
      const closedBugIds = bugs
        .filter(b => b.status === 'closed' || b.status === 'not-reproducible')
        .map(b => b.id);
      
      tasks = tasks.filter(t => {
        // Если это задание проверки бага, проверяем статус бага
        if (t.taskType === 'bug-verification' && t.bugId) {
          return !closedBugIds.includes(t.bugId);
        }
        // Для остальных заданий показываем
        return true;
      });
    }
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении заданий' });
  }
});

// Создать задание (куратор/админ)
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    if (currentUser.role !== 'admin' && currentUser.role !== 'curator') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const newTask = await createTask({
      ...req.body,
      createdBy: currentUser.id
    });
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при создании задания' });
  }
});

// Принять задание (назначить себе)
app.post('/api/tasks/:id/accept', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    const tasks = await readTasks();
    const task = tasks.find(t => t.id === req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }
    
    // Проверяем, что задание еще не назначено
    if (task.assignedTo && task.assignedTo !== currentUser.id) {
      return res.status(403).json({ error: 'Задание уже назначено другому пользователю' });
    }
    
    // Назначаем задание текущему пользователю
    const updatedTask = await updateTask(req.params.id, { 
      assignedTo: currentUser.id,
      status: task.status === 'pending' ? 'in-progress' : task.status // Если было pending, меняем на in-progress
    });
    
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при принятии задания' });
  }
});

// Обновить задание
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    const tasks = await readTasks();
    const task = tasks.find(t => t.id === req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Задание не найдено' });
    }

    // Пользователь может менять статус только если он принял это задание
    // Или если это куратор/админ/программист
    const canEdit = currentUser.role === 'admin' || 
                    currentUser.role === 'curator' || 
                    currentUser.role === 'programmer' ||
                    (task.assignedTo === currentUser.id && (req.body.status === 'in-progress' || req.body.status === 'completed'));
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Вы можете изменить статус только для принятых вами заданий' });
    }

    const updatedTask = await updateTask(req.params.id, req.body);
    
    // Если задание выполнено, начисляем баллы
    if (req.body.status === 'completed' && task.status !== 'completed') {
      const assignedUser = await findUserById(task.assignedTo);
      if (assignedUser) {
        // Начисляем баллы любому пользователю, который выполнил задание
        assignedUser.points = (assignedUser.points || 0) + (task.points || 0);
        if (assignedUser.role === 'tester') {
          assignedUser.tasksCompleted = (assignedUser.tasksCompleted || 0) + 1;
        }
        await updateUser(assignedUser.id, { 
          points: assignedUser.points, 
          tasksCompleted: assignedUser.tasksCompleted 
        });
      }
      
      // Если это задание проверки бага, закрываем баг
      if (task.taskType === 'bug-verification' && task.bugId) {
        const bugs = await readBugs();
        const bugIndex = bugs.findIndex(b => b.id === task.bugId);
        
        if (bugIndex !== -1) {
          bugs[bugIndex].status = 'closed';
          bugs[bugIndex].updatedAt = new Date().toISOString();
          bugs[bugIndex].closedAt = new Date().toISOString();
          await writeBugs(bugs);
          console.log(`Баг ${task.bugId} автоматически закрыт после проверки`);
        }
      }
    }
    
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при обновлении задания' });
  }
});

// Удалить задание
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const currentUser = await findUserById(req.user.id);
    if (currentUser.role !== 'admin' && currentUser.role !== 'curator') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    await deleteTask(req.params.id);
    res.json({ message: 'Задание удалено' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при удалении задания' });
  }
});

// Личный кабинет тестера
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    const bugs = await readBugs();
    const tasks = await readTasks();
    
    const userBugs = bugs.filter(b => b.reporterId === user.id);
    const userTasks = tasks.filter(t => t.assignedTo === user.id);
    
    const profile = {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email || '',
        role: user.role,
        points: user.points || 0,
        bugsFound: user.bugsFound || 0,
        tasksCompleted: user.tasksCompleted || 0
      },
      stats: {
        totalBugs: userBugs.length,
        openBugs: userBugs.filter(b => b.status === 'open').length,
        totalPoints: user.points || 0,
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter(t => t.status === 'completed').length,
        pendingTasks: userTasks.filter(t => t.status === 'pending').length
      },
      recentBugs: userBugs.slice(-5).reverse(),
      recentTasks: userTasks.slice(-5).reverse()
    };
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
});

// Запуск сервера
async function startServer() {
  await initDataFile();
  await initUsersFile();
  await initLinksFile();
  await initTasksFile();
  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });
}

startServer();

