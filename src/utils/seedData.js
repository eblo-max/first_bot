const mongoose = require('mongoose');
const Story = require('../models/Story');
const { generateId } = require('./game');
const User = require('../models/User');
const seedStories = require('./seedStories');

/**
 * Тестовые данные историй для MongoDB
 */
const sampleStories = [
    {
        id: generateId(),
        title: 'Ограбление банка',
        content: 'Преступник ворвался в банк, угрожая кассиру пистолетом. Он забрал деньги и скрылся на машине, которая была припаркована прямо у входа. Через 20 минут полиция уже знала имя преступника и его адрес.',
        difficulty: 'easy',
        category: 'robbery',
        mistakes: [
            {
                id: generateId(),
                text: 'Преступник оставил отпечатки пальцев на стойке кассира',
                isCorrect: false,
                explanation: 'Отпечатки пальцев не могли привести к его идентификации так быстро.'
            },
            {
                id: generateId(),
                text: 'Преступник использовал собственный автомобиль с номерами',
                isCorrect: true,
                explanation: 'Использование собственного автомобиля с номерами - грубая ошибка. Камеры наблюдения легко зафиксировали номер, по которому полиция сразу определила владельца.'
            },
            {
                id: generateId(),
                text: 'Преступник не был в маске',
                isCorrect: false,
                explanation: 'Хотя отсутствие маски — ошибка, одно это не позволило бы полиции так быстро установить личность и адрес.'
            }
        ],
        timesPlayed: 0,
        createdAt: new Date()
    },
    {
        id: generateId(),
        title: 'Подделка счетов',
        content: 'Бухгалтер крупной компании создавал фиктивные счета от имени несуществующих поставщиков. Он переводил деньги на банковские счета, открытые на его двоюродного брата. За 3 года он похитил более 1 миллиона рублей.',
        difficulty: 'medium',
        category: 'fraud',
        mistakes: [
            {
                id: generateId(),
                text: 'Слишком маленькие суммы, не привлекающие внимания',
                isCorrect: false,
                explanation: 'Маленькие суммы обычно труднее отследить, это не ошибка, а скорее стратегия мошенника.'
            },
            {
                id: generateId(),
                text: 'Использование счетов родственника вместо анонимных',
                isCorrect: true,
                explanation: 'Использование банковских счетов родственника - грубая ошибка. При финансовом расследовании легко устанавливаются родственные связи, что сразу указывает на бухгалтера.'
            },
            {
                id: generateId(),
                text: 'Создание слишком большого количества фиктивных поставщиков',
                isCorrect: false,
                explanation: 'Количество поставщиков само по себе не является ошибкой, если документация оформлена правильно.'
            }
        ],
        timesPlayed: 0,
        createdAt: new Date()
    },
    {
        id: generateId(),
        title: 'Кража драгоценностей',
        content: 'Вор проник в дом через окно второго этажа, отключил сигнализацию и вскрыл сейф. Он украл драгоценности на сумму 5 миллионов рублей. Перед уходом он тщательно стер все отпечатки пальцев и вернул сигнализацию в рабочее состояние.',
        difficulty: 'hard',
        category: 'theft',
        mistakes: [
            {
                id: generateId(),
                text: 'Не заметил камеру наблюдения на улице',
                isCorrect: false,
                explanation: 'В описании нет информации о внешних камерах наблюдения, и это не объясняет, как вора могли идентифицировать по действиям внутри дома.'
            },
            {
                id: generateId(),
                text: 'Использовал мобильный телефон во время кражи',
                isCorrect: false,
                explanation: 'В истории нет упоминания об использовании телефона, и одно это вряд ли привело бы к поимке.'
            },
            {
                id: generateId(),
                text: 'Оставил следы ДНК, которые невозможно стереть',
                isCorrect: true,
                explanation: 'Даже если вор стер отпечатки пальцев, он мог оставить другие следы ДНК (волосы, частицы кожи, пот), которые гораздо труднее устранить. Современные методы экспертизы могут выявить ДНК даже с минимальных образцов.'
            }
        ],
        timesPlayed: 0,
        createdAt: new Date()
    },
    {
        id: generateId(),
        title: 'Загадочное отравление',
        content: 'Мужчина отравил своего делового партнера, подмешав в его кофе яд без вкуса и запаха. Отравление было рассчитано так, чтобы симптомы проявились только через 4 часа, когда отравитель уже имел бы алиби. Однако полиция все равно вышла на его след.',
        difficulty: 'hard',
        category: 'murder',
        mistakes: [
            {
                id: generateId(),
                text: 'Покупка яда была зафиксирована на банковской карте',
                isCorrect: false,
                explanation: 'Опытный преступник не стал бы покупать яд с использованием отслеживаемых платежных средств.'
            },
            {
                id: generateId(),
                text: 'Он забыл о камерах наблюдения в кафе',
                isCorrect: false,
                explanation: 'Хотя камеры могли бы зафиксировать его присутствие, одно это не доказывает факт отравления.'
            },
            {
                id: generateId(),
                text: 'Поиск информации о яде в интернете с личного устройства',
                isCorrect: true,
                explanation: 'Поиск информации о ядах, их действии и способах получения с личного устройства (компьютера или телефона) оставляет цифровой след. При расследовании история поисковых запросов становится серьезной уликой против подозреваемого.'
            }
        ],
        timesPlayed: 0,
        createdAt: new Date()
    },
    {
        id: generateId(),
        title: 'Взлом системы безопасности',
        content: 'Хакер взломал базу данных крупной компании и похитил личную информацию тысяч клиентов. Он использовал VPN и анонимные прокси-серверы, чтобы скрыть свой IP-адрес. Тем не менее, через месяц он был арестован.',
        difficulty: 'medium',
        category: 'other',
        mistakes: [
            {
                id: generateId(),
                text: 'Вход в свои социальные сети во время атаки',
                isCorrect: true,
                explanation: 'Вход в личные аккаунты социальных сетей во время использования VPN для кибератаки — критическая ошибка. Это создает прямую связь между анонимным сетевым трафиком и реальной личностью хакера.'
            },
            {
                id: generateId(),
                text: 'Недостаточно сложный пароль для проникновения в систему',
                isCorrect: false,
                explanation: 'Сложность пароля не имеет отношения к тому, как хакера могли отследить после успешного взлома.'
            },
            {
                id: generateId(),
                text: 'Использование одного и того же VPN-сервиса',
                isCorrect: false,
                explanation: 'Использование даже одного VPN-сервиса, если он не ведет логи и правильно настроен, обычно обеспечивает достаточную анонимность.'
            }
        ],
        timesPlayed: 0,
        createdAt: new Date()
    }
];

/**
 * Миграция для пересчета статистики всех пользователей
 */
const migrateUserStats = async () => {
    try {
        console.log('Запуск миграции для пересчета статистики пользователей...');

        const users = await User.find({});
        console.log(`Найдено пользователей для миграции: ${users.length}`);

        for (const user of users) {
            if (!user.gameHistory || user.gameHistory.length === 0) {
                console.log(`Пользователь ${user.telegramId} не имеет истории игр - пропускаем`);
                continue;
            }

            console.log(`Мигрируем пользователя: ${user.telegramId}, игр в истории: ${user.gameHistory.length}`);

            // Пересчитываем статистику с нуля на основе gameHistory
            let totalCorrectAnswers = 0;
            let totalQuestions = 0;
            let totalScore = 0;
            let currentStreak = 0;
            let maxStreak = 0;

            // Проходим по всем играм в хронологическом порядке
            const sortedGames = user.gameHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

            for (const game of sortedGames) {
                totalCorrectAnswers += game.correctAnswers || 0;
                totalQuestions += game.totalQuestions || 0;
                totalScore += game.score || 0;

                // Считаем серии побед (только идеальные игры)
                if (game.correctAnswers === game.totalQuestions) {
                    currentStreak += 1;
                    if (currentStreak > maxStreak) {
                        maxStreak = currentStreak;
                    }
                } else {
                    currentStreak = 0;
                }
            }

            // Обновляем статистику
            user.stats.investigations = user.gameHistory.length;
            user.stats.solvedCases = totalCorrectAnswers;
            user.stats.totalQuestions = totalQuestions;
            user.stats.totalScore = totalScore;
            user.stats.winStreak = currentStreak;
            user.stats.maxWinStreak = maxStreak;
            user.stats.accuracy = totalQuestions > 0 ? Math.round((totalCorrectAnswers / totalQuestions) * 100) : 0;

            // Обновляем ранг
            user.updateRank();

            // Сохраняем
            await user.save();

            console.log(`Пользователь ${user.telegramId} обновлен:`, {
                investigations: user.stats.investigations,
                solvedCases: user.stats.solvedCases,
                totalQuestions: user.stats.totalQuestions,
                accuracy: user.stats.accuracy,
                winStreak: user.stats.winStreak,
                maxWinStreak: user.stats.maxWinStreak,
                totalScore: user.stats.totalScore
            });
        }

        console.log('Миграция завершена успешно!');
    } catch (error) {
        console.error('Ошибка при миграции:', error);
    }
};

/**
 * Заполнение базы данных тестовыми данными
 */
const seedDatabase = async () => {
    try {
        console.log('Проверяем необходимость заполнения базы тестовыми данными...');

        // ЗАПУСКАЕМ МИГРАЦИЮ ДЛЯ ПЕРЕСЧЕТА СТАТИСТИКИ
        console.log('Запускаем миграцию для пересчета статистики...');
        await migrateUserStats();

        // УДАЛЯЕМ ТОЛЬКО ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ, А НЕ ВСЕХ!
        console.log('Очищаем базу от тестовых пользователей...');

        // Удаляем только пользователей с тестовыми данными (гостевые аккаунты и тестовые пользователи)
        const testUserQuery = {
            $or: [
                { telegramId: { $regex: /^guest_/ } },  // Гостевые пользователи
                { telegramId: { $regex: /^test_/ } },   // Тестовые пользователи  
                { firstName: 'Test' },                  // Тестовые пользователи по имени
                { firstName: 'Гость' }                  // Гостевые пользователи
            ]
        };

        const deletedUsers = await User.deleteMany(testUserQuery);
        console.log(`Удалено тестовых пользователей из базы данных: ${deletedUsers.deletedCount}`);

        // Показываем количество реальных пользователей, которые остались
        const realUsersCount = await User.countDocuments();
        console.log(`Реальных пользователей в базе данных: ${realUsersCount}`);

        // Проверяем количество историй в базе
        const storyCount = await Story.countDocuments();
        console.log(`Найдено историй в базе: ${storyCount}`);

        // Если историй мало, загружаем новые
        if (storyCount < 20) {
            console.log('Загружаем истории в базу данных...');

            // Загружаем истории из отдельного файла
            await seedStories();

            console.log('Истории успешно загружены в базу данных');
        } else {
            console.log('База данных уже содержит достаточное количество историй');
        }

        console.log('Инициализация базы данных завершена');

    } catch (error) {
        console.error('Ошибка при заполнении базы тестовыми данными:', error);
    }
};

module.exports = seedDatabase; 