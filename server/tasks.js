const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');

// Инициализация файла заданий
async function initTasksFile() {
  const dataDir = path.dirname(TASKS_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(TASKS_FILE);
    } catch {
      await fs.writeFile(TASKS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Ошибка инициализации файла заданий:', error);
  }
}

// Чтение заданий
async function readTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Запись заданий
async function writeTasks(tasks) {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// Создание задания
async function createTask(taskData) {
  await initTasksFile();
  const tasks = await readTasks();
  
  const newTask = {
    id: uuidv4(),
    title: taskData.title,
    description: taskData.description || '',
    createdBy: taskData.createdBy, // ID создателя (куратора или админа)
    assignedTo: taskData.assignedTo || null, // ID тестера (null если не назначено)
    status: 'pending', // pending, in-progress, completed, cancelled
    priority: taskData.priority || 'medium',
    points: taskData.points || 0, // Баллы за выполнение
    area: taskData.area || '', // Область тестирования
    deadline: taskData.deadline || null,
    bugId: taskData.bugId || null, // ID связанного бага (для заданий проверки)
    taskType: taskData.taskType || 'regular', // regular, bug-verification
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };
  
  tasks.push(newTask);
  await writeTasks(tasks);
  return newTask;
}

// Обновление задания
async function updateTask(id, taskData) {
  await initTasksFile();
  const tasks = await readTasks();
  const index = tasks.findIndex(t => t.id === id);
  
  if (index === -1) {
    throw new Error('Задание не найдено');
  }
  
  const updatedTask = {
    ...tasks[index],
    ...taskData,
    id, // Не позволяем менять ID
    updatedAt: new Date().toISOString()
  };
  
  // Если статус меняется на completed, устанавливаем completedAt
  if (taskData.status === 'completed' && tasks[index].status !== 'completed') {
    updatedTask.completedAt = new Date().toISOString();
  }
  
  tasks[index] = updatedTask;
  await writeTasks(tasks);
  return updatedTask;
}

// Удаление задания
async function deleteTask(id) {
  await initTasksFile();
  const tasks = await readTasks();
  const filteredTasks = tasks.filter(t => t.id !== id);
  
  if (tasks.length === filteredTasks.length) {
    throw new Error('Задание не найдено');
  }
  
  await writeTasks(filteredTasks);
}

// Получить задания для тестера
async function getTasksForTester(testerId) {
  await initTasksFile();
  const tasks = await readTasks();
  // Тестер видит свои назначенные задания и неназначенные задания проверки багов
  return tasks.filter(t => 
    t.assignedTo === testerId || 
    (t.taskType === 'bug-verification' && !t.assignedTo)
  );
}

// Получить задания куратора
async function getTasksForCurator(curatorId) {
  await initTasksFile();
  const tasks = await readTasks();
  return tasks.filter(t => t.createdBy === curatorId);
}

// Получить задание проверки для бага
async function getVerificationTaskForBug(bugId) {
  await initTasksFile();
  const tasks = await readTasks();
  return tasks.find(t => t.bugId === bugId && t.taskType === 'bug-verification');
}

module.exports = {
  initTasksFile,
  readTasks,
  createTask,
  updateTask,
  deleteTask,
  getTasksForTester,
  getTasksForCurator,
  getVerificationTaskForBug
};

