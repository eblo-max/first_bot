/**
 * Скрипт для ручной очистки тестовых пользователей
 * Используется только при необходимости, не запускается автоматически!
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

/**
 * Очистка тестовых пользователей
 */
const cleanupTestUsers = async () => {
    try {
        console.log('🧹 Начинаем очистку тестовых пользователей...');

        // Подключаемся к MongoDB
        await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/criminal-bluff', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Подключение к MongoDB установлено');

        // Показываем текущее количество пользователей
        const totalUsers = await User.countDocuments();
        console.log(`📊 Общее количество пользователей: ${totalUsers}`);

        // Ищем тестовых пользователей (очень строгие критерии!)
        const testUserQuery = {
            $or: [
                { telegramId: { $regex: /^guest_\d+$/ } },    // Только точный паттерн guest_123
                { telegramId: { $regex: /^test_token_/ } },   // Только токены начинающиеся с test_token_
                {
                    $and: [
                        { firstName: 'Test' },
                        { lastName: 'User' },
                        { telegramId: { $lt: 100000 } }  // Только маленькие ID (явно тестовые)
                    ]
                }
            ]
        };

        // Показываем каких пользователей найдем для удаления
        const testUsers = await User.find(testUserQuery).select('telegramId firstName lastName createdAt').limit(10);

        if (testUsers.length === 0) {
            console.log('✅ Тестовые пользователи не найдены');
            return;
        }

        console.log('🔍 Найдены следующие тестовые пользователи:');
        testUsers.forEach(user => {
            console.log(`   - ID: ${user.telegramId}, Имя: ${user.firstName} ${user.lastName}, Создан: ${user.createdAt}`);
        });

        const totalTestUsers = await User.countDocuments(testUserQuery);
        console.log(`📊 Всего тестовых пользователей для удаления: ${totalTestUsers}`);

        // ВНИМАНИЕ: Требуем подтверждения!
        console.log('⚠️  ВНИМАНИЕ: Сейчас будут удалены тестовые пользователи!');
        console.log('⚠️  Убедитесь, что среди них нет реальных пользователей!');
        console.log('⚠️  Для продолжения запустите скрипт с флагом --confirm');

        // Проверяем наличие флага подтверждения
        if (!process.argv.includes('--confirm')) {
            console.log('❌ Операция отменена. Для выполнения добавьте флаг --confirm');
            return;
        }

        // Удаляем тестовых пользователей
        const result = await User.deleteMany(testUserQuery);
        console.log(`✅ Удалено тестовых пользователей: ${result.deletedCount}`);

        // Показываем новое количество пользователей
        const remainingUsers = await User.countDocuments();
        console.log(`📊 Пользователей осталось: ${remainingUsers}`);

    } catch (error) {
        console.error('❌ Ошибка при очистке тестовых пользователей:', error);
    } finally {
        // Закрываем соединение
        await mongoose.connection.close();
        console.log('✅ Соединение с MongoDB закрыто');
        process.exit(0);
    }
};

// Запускаем только если скрипт вызван напрямую
if (require.main === module) {
    cleanupTestUsers().catch(console.error);
}

module.exports = { cleanupTestUsers }; 