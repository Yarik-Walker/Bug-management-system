const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const LINKS_FILE = path.join(__dirname, 'data', 'magicLinks.json');
const LINK_EXPIRY_HOURS = 1; // Ссылка действительна 24 часа

// Инициализация файла
async function initLinksFile() {
  const dataDir = path.dirname(LINKS_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
    try {
      await fs.access(LINKS_FILE);
    } catch {
      await fs.writeFile(LINKS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Ошибка инициализации файла magic links:', error);
  }
}

// Чтение ссылок
async function readLinks() {
  try {
    const data = await fs.readFile(LINKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Запись ссылок
async function writeLinks(links) {
  await fs.writeFile(LINKS_FILE, JSON.stringify(links, null, 2));
}

// Создание magic link для пользователя
async function createMagicLink(userId) {
  await initLinksFile();
  const links = await readLinks();
  
  // Удаляем старые ссылки для этого пользователя
  const filteredLinks = links.filter(link => link.userId !== userId || new Date(link.expiresAt) > new Date());
  
  const token = uuidv4();
  const magicLink = {
    id: uuidv4(),
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + LINK_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
    used: false
  };
  
  filteredLinks.push(magicLink);
  await writeLinks(filteredLinks);
  
  return token;
}

// Проверка и использование magic link
async function useMagicLink(token) {
  await initLinksFile();
  const links = await readLinks();
  
  const link = links.find(l => l.token === token && !l.used);
  
  if (!link) {
    return null;
  }
  
  // Проверка срока действия
  if (new Date(link.expiresAt) < new Date()) {
    return null;
  }
  
  // Помечаем как использованную
  const index = links.findIndex(l => l.id === link.id);
  links[index].used = true;
  links[index].usedAt = new Date().toISOString();
  await writeLinks(links);
  
  return link.userId;
}

// Очистка старых ссылок
async function cleanupExpiredLinks() {
  const links = await readLinks();
  const now = new Date();
  const activeLinks = links.filter(link => new Date(link.expiresAt) > now);
  await writeLinks(activeLinks);
}

module.exports = {
  initLinksFile,
  createMagicLink,
  useMagicLink,
  cleanupExpiredLinks
};

