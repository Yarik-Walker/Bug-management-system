const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Генерация JWT токена
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Проверка токена
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware для проверки авторизации
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }

  req.user = decoded;
  next();
}

// Middleware для проверки роли админа
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Требуются права администратора' });
  }
  next();
}

// Middleware для проверки роли куратора или админа
function requireCurator(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'curator') {
    return res.status(403).json({ error: 'Требуются права куратора или администратора' });
  }
  next();
}

// Middleware для проверки прав на редактирование багов (программист, куратор, админ)
function canEditBugs(req, res, next) {
  const allowedRoles = ['admin', 'curator', 'programmer'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Только программисты, кураторы и администраторы могут редактировать баги' });
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  requireAdmin,
  requireCurator,
  canEditBugs
};

