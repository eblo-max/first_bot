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
 * Заполнение базы данных тестовыми данными
 */
const seedDatabase = async () => {
    try {
        console.log('Проверяем необходимость заполнения базы тестовыми данными...');

        // Проверяем наличие пользователей в базе
        const userCount = await User.countDocuments();

        // Если пользователей нет, создаем их
        if (userCount === 0) {
            console.log('База данных пуста, создаем тестовых пользователей...');

            // Массив тестовых пользователей
            const testUsers = [
                {
                    telegramId: '123456789',
                    username: 'marina_s',
                    firstName: 'Марина',
                    lastName: 'С.',
                    rank: 'ЭКСПЕРТ',
                    stats: {
                        investigations: 87,
                        solvedCases: 71,
                        winStreak: 4,
                        maxWinStreak: 7,
                        accuracy: 82,
                        totalScore: 8450
                    },
                    achievements: [
                        {
                            id: 'first_case',
                            name: 'Первое дело',
                            description: 'Проведено первое расследование',
                            unlockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 дней назад
                        },
                        {
                            id: 'rookie',
                            name: 'Новичок',
                            description: 'Проведено 5 расследований',
                            unlockedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'expert',
                            name: 'Эксперт',
                            description: 'Проведено 50 расследований',
                            unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'sharp_eye',
                            name: 'Меткий глаз',
                            description: 'Достигнута точность 80% минимум в 10 играх',
                            unlockedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'maniac',
                            name: 'Маньяк',
                            description: 'Набрано 1000 очков',
                            unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
                        }
                    ]
                },
                {
                    telegramId: '987654321',
                    username: 'viktor_p',
                    firstName: 'Виктор',
                    lastName: 'П.',
                    rank: 'СЛЕДОВАТЕЛЬ',
                    stats: {
                        investigations: 73,
                        solvedCases: 54,
                        winStreak: 2,
                        maxWinStreak: 5,
                        accuracy: 74,
                        totalScore: 7820
                    },
                    achievements: [
                        {
                            id: 'first_case',
                            name: 'Первое дело',
                            description: 'Проведено первое расследование',
                            unlockedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'rookie',
                            name: 'Новичок',
                            description: 'Проведено 5 расследований',
                            unlockedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'expert',
                            name: 'Эксперт',
                            description: 'Проведено 50 расследований',
                            unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'maniac',
                            name: 'Маньяк',
                            description: 'Набрано 1000 очков',
                            unlockedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
                        }
                    ]
                },
                {
                    telegramId: '555666777',
                    username: 'alex_k',
                    firstName: 'Александр',
                    lastName: 'К.',
                    rank: 'ДЕТЕКТИВ',
                    stats: {
                        investigations: 47,
                        solvedCases: 32,
                        winStreak: 5,
                        maxWinStreak: 5,
                        accuracy: 68,
                        totalScore: 6250
                    },
                    achievements: [
                        {
                            id: 'first_case',
                            name: 'Первое дело',
                            description: 'Проведено первое расследование',
                            unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'rookie',
                            name: 'Новичок',
                            description: 'Проведено 5 расследований',
                            unlockedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
                        }
                    ]
                },
                {
                    telegramId: '111222333',
                    username: 'dmitry_n',
                    firstName: 'Дмитрий',
                    lastName: 'Н.',
                    rank: 'ИНСПЕКТОР',
                    stats: {
                        investigations: 52,
                        solvedCases: 38,
                        winStreak: 1,
                        maxWinStreak: 4,
                        accuracy: 73,
                        totalScore: 5890
                    },
                    achievements: [
                        {
                            id: 'first_case',
                            name: 'Первое дело',
                            description: 'Проведено первое расследование',
                            unlockedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'rookie',
                            name: 'Новичок',
                            description: 'Проведено 5 расследований',
                            unlockedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'expert',
                            name: 'Эксперт',
                            description: 'Проведено 50 расследований',
                            unlockedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
                        }
                    ]
                },
                {
                    telegramId: '444555666',
                    username: 'anna_o',
                    firstName: 'Анна',
                    lastName: 'О.',
                    rank: 'ДЕТЕКТИВ',
                    stats: {
                        investigations: 38,
                        solvedCases: 25,
                        winStreak: 0,
                        maxWinStreak: 3,
                        accuracy: 66,
                        totalScore: 4120
                    },
                    achievements: [
                        {
                            id: 'first_case',
                            name: 'Первое дело',
                            description: 'Проведено первое расследование',
                            unlockedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
                        },
                        {
                            id: 'rookie',
                            name: 'Новичок',
                            description: 'Проведено 5 расследований',
                            unlockedAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000)
                        }
                    ]
                }
            ];

            // Добавляем регистрационные данные и историю игр для каждого пользователя
            testUsers.forEach(user => {
                user.registeredAt = new Date(Date.now() - (Math.floor(Math.random() * 30) + 10) * 24 * 60 * 60 * 1000);
                user.lastVisit = new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000);

                // Добавляем историю игр
                user.gameHistory = [];
                const gamesCount = user.stats.investigations;

                for (let i = 0; i < Math.min(gamesCount, 20); i++) {
                    // Расчет примерной даты игры, чтобы они были распределены равномерно
                    const gameDate = new Date(
                        user.registeredAt.getTime() +
                        (user.lastVisit.getTime() - user.registeredAt.getTime()) * (i / gamesCount)
                    );

                    // Расчет случайного количества правильных ответов и общего счета
                    const totalQuestions = Math.floor(Math.random() * 3) + 3; // От 3 до 5 вопросов
                    const correctAnswers = Math.floor(Math.random() * (totalQuestions + 1)); // От 0 до totalQuestions
                    const score = correctAnswers * (Math.floor(Math.random() * 50) + 150); // 150-200 очков за правильный ответ

                    user.gameHistory.push({
                        gameId: `game_${Date.now() - Math.floor(Math.random() * 1000000)}_${Math.floor(Math.random() * 10000)}`,
                        date: gameDate,
                        score,
                        correctAnswers,
                        totalQuestions
                    });
                }

                // Сортируем историю игр по дате (от новых к старым)
                user.gameHistory.sort((a, b) => b.date - a.date);
            });

            // Создаем пользователей в базе данных
            await User.insertMany(testUsers);

            console.log(`Успешно создано ${testUsers.length} тестовых пользователей.`);
        } else {
            console.log(`База данных уже содержит ${userCount} пользователей, пропускаем создание тестовых данных.`);
        }

        // Заполняем базу данных историями
        await seedStories();

    } catch (error) {
        console.error('Ошибка при заполнении базы данных тестовыми данными:', error);
    }
};

module.exports = seedDatabase; 