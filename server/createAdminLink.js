const { initUsersFile, readUsers } = require('./users');
const { initLinksFile, createMagicLink } = require('./magicLinks');

async function createAdminLink() {
  try {
    // Инициализируем файлы
    await initUsersFile();
    await initLinksFile();
    
    // Находим админа
    const users = await readUsers();
    const admin = users.find(u => u.role === 'admin');
    
    if (!admin) {
      console.error('❌ Администратор не найден!');
      process.exit(1);
    }
    
    // Создаем magic link
    const token = await createMagicLink(admin.id);
    
    // Формируем ссылку
    const link = `http://localhost:3000/login/${token}`;
    
    console.log('\n✅ Magic link для администратора создан!\n');
    console.log('📋 Информация:');
    console.log(`   Пользователь: ${admin.name} (${admin.username})`);
    console.log(`   Ссылка действительна: 1 час`);
    console.log(`   Одноразовая: да\n`);
    console.log('🔗 Ссылка для входа:');
    console.log(`   ${link}\n`);
    console.log('💡 Скопируйте ссылку и откройте в браузере\n');
    
  } catch (error) {
    console.error('❌ Ошибка при создании ссылки:', error.message);
    process.exit(1);
  }
}

// Запускаем скрипт
createAdminLink();

