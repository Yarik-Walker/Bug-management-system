const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Инициализация файла пользователей
async function initUsersFile() {
  const dataDir = path.dirname(USERS_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(USERS_FILE);
      // Проверяем, есть ли хотя бы один админ
      const users = await readUsers();
      const hasAdmin = users.some(u => u.role === 'admin');
      if (!hasAdmin) {
        // Создаем дефолтного админа
        const defaultAdmin = {
          id: uuidv4(),
          username: 'admin',
          password: await bcrypt.hash('admin123', 10),
          role: 'admin',
          name: 'Администратор',
          email: '',
          curatorId: null,
          points: 0,
          bugsFound: 0,
          tasksCompleted: 0,
          createdAt: new Date().toISOString()
        };
        users.push(defaultAdmin);
        await writeUsers(users);
        console.log('Создан дефолтный админ: username=admin, password=admin123');
      }
    } catch {
      // Файл не существует, создаем с дефолтным админом
      const defaultAdmin = {
        id: uuidv4(),
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        name: 'Администратор',
        email: '',
        curatorId: null,
        points: 0,
        bugsFound: 0,
        tasksCompleted: 0,
        createdAt: new Date().toISOString()
      };
      await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin], null, 2));
      console.log('Создан дефолтный админ: username=admin, password=admin123');
    }
  } catch (error) {
    console.error('Ошибка инициализации файла пользователей:', error);
  }
}

// Чтение пользователей
async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Запись пользователей
async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Поиск пользователя по username
async function findUserByUsername(username) {
  const users = await readUsers();
  return users.find(u => u.username === username);
}

// Поиск пользователя по ID
async function findUserById(id) {
  const users = await readUsers();
  return users.find(u => u.id === id);
}

// Создание нового пользователя
async function createUser(userData) {
  const users = await readUsers();
  
  // Проверка на существующего пользователя
  if (await findUserByUsername(userData.username)) {
    throw new Error('Пользователь с таким именем уже существует');
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const newUser = {
    id: uuidv4(),
    username: userData.username,
    password: hashedPassword,
    role: userData.role || 'tester',
    name: userData.name || userData.username,
    email: userData.email || '',
    curatorId: userData.curatorId || null, // ID куратора для тестера
    points: 0, // Баллы тестера
    bugsFound: 0, // Количество найденных багов
    tasksCompleted: 0, // Количество выполненных заданий
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeUsers(users);
  return { ...newUser, password: undefined }; // Не возвращаем пароль
}

// Обновление пользователя
async function updateUser(id, userData) {
  const users = await readUsers();
  const index = users.findIndex(u => u.id === id);
  
  if (index === -1) {
    throw new Error('Пользователь не найден');
  }

  const updatedUser = { ...users[index] };
  
  if (userData.password) {
    updatedUser.password = await bcrypt.hash(userData.password, 10);
  }
  if (userData.name !== undefined) updatedUser.name = userData.name;
  if (userData.role !== undefined) updatedUser.role = userData.role;
  if (userData.email !== undefined) updatedUser.email = userData.email;
  if (userData.curatorId !== undefined) updatedUser.curatorId = userData.curatorId;
  if (userData.points !== undefined) updatedUser.points = userData.points;
  if (userData.bugsFound !== undefined) updatedUser.bugsFound = userData.bugsFound;
  if (userData.tasksCompleted !== undefined) updatedUser.tasksCompleted = userData.tasksCompleted;
  
  updatedUser.updatedAt = new Date().toISOString();
  users[index] = updatedUser;
  
  await writeUsers(users);
  return { ...updatedUser, password: undefined };
}

// Удаление пользователя
async function deleteUser(id) {
  const users = await readUsers();
  const filteredUsers = users.filter(u => u.id !== id);
  
  if (users.length === filteredUsers.length) {
    throw new Error('Пользователь не найден');
  }
  
  await writeUsers(filteredUsers);
}

// Проверка пароля
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  initUsersFile,
  readUsers,
  findUserByUsername,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword
};

