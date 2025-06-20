# 📊 Скрипты управления статистикой пользователей

## Обзор

Набор утилит для управления статистикой пользователей в игре "Криминальный Блеф". Позволяет сбрасывать, проверять и восстанавливать данные пользователей.

## 🔧 Доступные скрипты

### 1. Проверка статистики
```bash
npm run stats:check
# или
node scripts/check-stats.js
```

**Что делает:**
- Показывает список всех пользователей
- Отображает статистику по каждому пользователю
- Выводит общую статистику системы
- Показывает топ-5 пользователей

**Пример вывода:**
```
👥 СПИСОК ПОЛЬЗОВАТЕЛЕЙ:
1. username123 (ID: 12345)
   🔍 Расследования: 25 | 💯 Очки: 1200 | 🎯 Точность: 85%
   🏆 Достижения: 8 | 📊 Уровень: 3 | 👤 Ранг: Детектив

📈 ОБЩАЯ СТАТИСТИКА:
👥 Всего пользователей: 15
📊 Пользователей с активностью: 12
🏆 Общее количество достижений: 45
```

### 2. Безопасный сброс статистики (с подтверждением)
```bash
npm run stats:reset
# или
node scripts/reset-user-stats.js
```

**Что делает:**
- Создает автоматический бэкап всех данных
- Просит подтверждение перед сбросом
- Сбрасывает статистику всех пользователей
- Сохраняет основные данные (telegramId, username, etc.)

**Сбрасываемые данные:**
- Все очки и расследования
- Уровень (сброс до 1)
- Достижения
- История игр
- Серии успехов
- Статистика точности

**Сохраняемые данные:**
- telegramId
- username, firstName, lastName
- Дата регистрации
- Основные настройки профиля

### 3. Принудительный сброс (без подтверждения)
```bash
npm run stats:force-reset
# или
node scripts/force-reset-stats.js
```

**⚠️ ВНИМАНИЕ:** Мгновенно сбрасывает статистику БЕЗ создания бэкапа и БЕЗ подтверждения!

**Используйте только:**
- Для тестирования
- В development окружении
- Когда уверены в необходимости сброса

### 4. Восстановление из бэкапа
```bash
npm run stats:restore <backup-file>
# или
node scripts/reset-user-stats.js restore backup-users-1234567890.json
```

**Что делает:**
- Восстанавливает статистику из указанного файла бэкапа
- Находит пользователей по telegramId
- Восстанавливает все сохраненные данные

## 📁 Файлы бэкапов

Автоматически создаются файлы с именами:
```
backup-users-1703123456789.json
```

Формат: `backup-users-<timestamp>.json`

### Структура бэкапа:
```json
{
  "timestamp": "2023-12-20T10:30:45.123Z",
  "totalUsers": 15,
  "users": [
    {
      "telegramId": "12345",
      "username": "username123",
      "stats": { ... },
      "achievements": [ ... ],
      "gamesHistory": [ ... ],
      "rank": "Детектив"
    }
  ]
}
```

## 🛡️ Безопасность

### Рекомендации:
1. **Всегда используйте безопасный сброс** (`stats:reset`) в production
2. **Сохраняйте бэкапы** в безопасном месте
3. **Тестируйте восстановление** после каждого сброса
4. **Проверяйте статистику** (`stats:check`) после операций

### Переменные окружения:
Скрипты используют:
- `MONGO_URL` - основная переменная для подключения к MongoDB
- `MONGODB_URI` - альтернативная переменная

## 🚀 Примеры использования

### Полный цикл сброса и проверки:
```bash
# 1. Проверить текущее состояние
npm run stats:check

# 2. Сделать безопасный сброс (с бэкапом)
npm run stats:reset
# Ввести "yes" для подтверждения

# 3. Проверить результат
npm run stats:check

# 4. При необходимости восстановить
npm run stats:restore backup-users-1703123456789.json
```

### Быстрый сброс для тестирования:
```bash
# Принудительный сброс (только для разработки!)
npm run stats:force-reset

# Проверка результата
npm run stats:check
```

## ⚙️ Технические детали

### Что сбрасывается:
```javascript
{
  'stats.investigations': 0,
  'stats.solvedCases': 0,
  'stats.totalScore': 0,
  'stats.accuracy': 0,
  'stats.perfectGames': 0,
  'stats.winStreak': 0,
  'stats.maxWinStreak': 0,
  'stats.fastestGame': 0,
  'stats.averageTime': 0,
  'stats.totalQuestions': 0,
  'stats.dailyStreakCurrent': 0,
  'stats.dailyStreakBest': 0,
  'stats.level': 1,
  'stats.experience': 0,
  'stats.reputation': 0,
  'achievements': [],
  'gamesHistory': [],
  'rank': 'Новичок',
  'lastSeen': new Date()
}
```

### Производительность:
- **Безопасный сброс**: ~5-10 секунд для 100 пользователей
- **Принудительный сброс**: ~1-2 секунды для 100 пользователей  
- **Проверка статистики**: ~1-3 секунды для 100 пользователей

## 🔄 Логирование

Все скрипты выводят подробную информацию:
- ✅ Успешные операции
- ❌ Ошибки и проблемы  
- 📊 Статистика и результаты
- ⏳ Прогресс выполнения
- 💾 Информация о бэкапах

## 📞 Поддержка

При проблемах проверьте:
1. Переменные окружения (`.env`)
2. Подключение к MongoDB
3. Права доступа к файлам
4. Корректность путей к бэкапам

Логи содержат детальную информацию об ошибках. 