/**
 * Типизированная система заполнения базы данных тестовыми данными
 */

import mongoose from 'mongoose';
const Story = require('../models/Story');
const User = require('../models/User');
const { generateId } = require('./game');

// Импорт типов из определений
type Difficulty = 'easy' | 'medium' | 'hard';
type CrimeType = 'murder' | 'robbery' | 'fraud' | 'theft' | 'cybercrime' | 'other';

interface Mistake {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation: string;
}

interface SampleStory {
    id: string;
    title: string;
    content: string;
    difficulty: Difficulty;
    category: CrimeType;
    mistakes: Mistake[];
    timesPlayed: number;
    createdAt: Date;
}

interface UserGame {
    date: Date;
    correctAnswers: number;
    totalQuestions: number;
    score: number;
}

interface UserWithGameHistory {
    gameHistory: UserGame[];
    stats: {
        investigations: number;
        solvedCases: number;
        totalQuestions: number;
        totalScore: number;
        winStreak: number;
        maxWinStreak: number;
        accuracy: number;
    };
    updateRank: () => void;
    save: () => Promise<void>;
}

/**
 * Тестовые данные историй для MongoDB
 */
const sampleStories: SampleStory[] = [
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
        category: 'cybercrime',
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
const migrateUserStats = async (): Promise<void> => {
    try {
        console.log('🔄 Начинаем миграцию статистики пользователей...');

        const users: UserWithGameHistory[] = await User.find({});
        console.log(`📊 Найдено пользователей для миграции: ${users.length}`);

        for (const user of users) {
            if (!user.gameHistory || user.gameHistory.length === 0) {
                console.log(`⚠️ Пользователь без игровой истории, пропускаем`);
                continue;
            }

            // Пересчитываем статистику с нуля на основе gameHistory
            let totalCorrectAnswers = 0;
            let totalQuestions = 0;
            let totalScore = 0;
            let currentStreak = 0;
            let maxStreak = 0;

            // Проходим по всем играм в хронологическом порядке
            const sortedGames = user.gameHistory.sort((a: UserGame, b: UserGame) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );

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
            console.log(`✅ Обновлена статистика пользователя с ${user.gameHistory.length} играми`);
        }

        console.log('✨ Миграция статистики завершена успешно!');
    } catch (error) {
        console.error('❌ Ошибка при миграции:', error);
        throw error;
    }
};

/**
 * Заполнение базы данных тестовыми данными
 */
const seedDatabase = async (): Promise<void> => {
    try {
        console.log('🌱 Начинаем процесс заполнения базы данных...');

        // ЗАПУСКАЕМ МИГРАЦИЮ ДЛЯ ПЕРЕСЧЕТА СТАТИСТИКИ
        console.log('📊 Пересчитываем статистику пользователей...');
        await migrateUserStats();

        // ВАЖНО: ОТКЛЮЧАЕМ АВТОМАТИЧЕСКОЕ УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ПРИ КАЖДОМ ЗАПУСКЕ СЕРВЕРА!
        // Это может удалять реальных пользователей и ломать авторизацию

        /*
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
        console.log(`🗑️ Удалено тестовых пользователей: ${deletedUsers.deletedCount}`);
        */

        // Показываем количество пользователей в базе
        const realUsersCount = await User.countDocuments();
        console.log(`📊 Пользователей в базе данных: ${realUsersCount}`);

        // Проверяем количество историй в базе
        const storyCount = await Story.countDocuments();
        console.log(`📚 Историй в базе данных: ${storyCount}`);

        // Если историй мало, загружаем новые
        if (storyCount < 20) {
            console.log('📖 Загружаем дополнительные истории...');

            // Загружаем истории из отдельного файла
            const seedStories = require('./seedStories');
            await seedStories();

            console.log('✅ Истории успешно загружены');
        } else {
            console.log('✅ Достаточно историй в базе данных');
        }

        console.log('🎉 Процесс заполнения базы данных завершен!');
    } catch (error) {
        console.error('❌ Ошибка при заполнении базы тестовыми данными:', error);
        throw error;
    }
};

export default seedDatabase;
module.exports = seedDatabase; 