/**
 * Скрипт проверки безопасности проекта
 * Анализирует потенциальные уязвимости и проблемы безопасности
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const SCAN_EXTENSIONS = ['.js', '.html', '.css', '.json'];
const SENSITIVE_PATTERNS = {
    // API ключи и токены
    apiKeys: [
        /(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token)['":\s=]+['"]([^'"]{20,})['"]?/gi,
        /(?:token|secret|key)['":\s=]+['"]([A-Za-z0-9\-_]{20,})['"]?/gi,
        /(?:password|passwd|pwd)['":\s=]+['"]([^'"]{8,})['"]?/gi
    ],

    // Потенциально опасные функции
    dangerousFunctions: [
        /eval\s*\(/gi,
        /Function\s*\(/gi,
        /setTimeout\s*\(\s*['"][^'"]*['"]\s*,/gi,
        /setInterval\s*\(\s*['"][^'"]*['"]\s*,/gi,
        /document\.write\s*\(/gi,
        /innerHTML\s*=/gi,
        /outerHTML\s*=/gi
    ],

    // XSS уязвимости
    xssVectors: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript\s*:/gi,
        /on\w+\s*=/gi,
        /vbscript\s*:/gi,
        /data\s*:.*?base64/gi
    ],

    // SQL инъекции
    sqlInjection: [
        /(?:union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/gi,
        /--\s*$/gm,
        /\/\*.*?\*\//gi,
        /'\s*or\s*'.*?'\s*=\s*'/gi,
        /'\s*;\s*drop\s+table/gi
    ],

    // Небезопасные URL
    unsafeUrls: [
        /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
        /ftp:\/\//gi,
        /file:\/\//gi
    ],

    // Отладочная информация
    debugInfo: [
        /console\.(log|debug|info|warn|error)\s*\(/gi,
        /debugger\s*;?/gi,
        /alert\s*\(/gi,
        /confirm\s*\(/gi,
        /prompt\s*\(/gi
    ]
};

const SECURITY_HEADERS = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Referrer-Policy'
];

class SecurityScanner {
    constructor() {
        this.issues = [];
        this.scannedFiles = 0;
        this.totalFiles = 0;
    }

    /**
     * Добавляет проблему безопасности
     */
    addIssue(severity, type, message, file = null, line = null) {
        this.issues.push({
            severity,
            type,
            message,
            file,
            line,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Сканирует файл на предмет проблем безопасности
     */
    async scanFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');

            // Проверяем каждую категорию
            for (const [category, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
                for (const pattern of patterns) {
                    const matches = content.match(pattern);
                    if (matches) {
                        for (const match of matches) {
                            const lineNumber = this.findLineNumber(content, match);
                            this.addIssue(
                                this.getSeverity(category),
                                category,
                                `Найден потенциальный ${category}: ${match.substring(0, 50)}...`,
                                filePath,
                                lineNumber
                            );
                        }
                    }
                }
            }

            // Специальные проверки для .env файлов
            if (path.basename(filePath) === '.env') {
                this.checkEnvFile(content, filePath);
            }

            // Проверки для JavaScript файлов
            if (path.extname(filePath) === '.js') {
                this.checkJavaScriptSecurity(content, filePath);
            }

            // Проверки для HTML файлов
            if (path.extname(filePath) === '.html') {
                this.checkHTMLSecurity(content, filePath);
            }

            this.scannedFiles++;

        } catch (error) {
            this.addIssue('medium', 'file_error', `Ошибка чтения файла: ${error.message}`, filePath);
        }
    }

    /**
     * Определяет критичность проблемы
     */
    getSeverity(category) {
        const severityMap = {
            apiKeys: 'critical',
            dangerousFunctions: 'high',
            xssVectors: 'high',
            sqlInjection: 'critical',
            unsafeUrls: 'medium',
            debugInfo: 'low'
        };
        return severityMap[category] || 'medium';
    }

    /**
     * Находит номер строки для найденного совпадения
     */
    findLineNumber(content, match) {
        const index = content.indexOf(match);
        if (index === -1) return null;

        const beforeMatch = content.substring(0, index);
        return beforeMatch.split('\n').length;
    }

    /**
     * Проверяет .env файл на предмет проблем
     */
    checkEnvFile(content, filePath) {
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const lineNum = index + 1;

            // Проверяем пустые значения
            if (line.includes('=') && line.endsWith('=')) {
                this.addIssue('medium', 'env_security', 'Пустое значение переменной окружения', filePath, lineNum);
            }

            // Проверяем слабые пароли
            if (line.toLowerCase().includes('password') || line.toLowerCase().includes('secret')) {
                const value = line.split('=')[1];
                if (value && value.length < 12) {
                    this.addIssue('high', 'weak_password', 'Слабый пароль или секрет (менее 12 символов)', filePath, lineNum);
                }
            }

            // Проверяем использование HTTP вместо HTTPS
            if (line.includes('http://') && !line.includes('localhost') && !line.includes('127.0.0.1')) {
                this.addIssue('medium', 'insecure_protocol', 'Использование HTTP вместо HTTPS', filePath, lineNum);
            }
        });
    }

    /**
     * Проверяет JavaScript на безопасность
     */
    checkJavaScriptSecurity(content, filePath) {
        // Проверяем использование eval
        if (content.includes('eval(')) {
            this.addIssue('critical', 'dangerous_function', 'Использование eval() может привести к XSS', filePath);
        }

        // Проверяем прямое использование innerHTML
        if (content.includes('innerHTML') && !content.includes('textContent')) {
            this.addIssue('high', 'xss_risk', 'Использование innerHTML без санитизации', filePath);
        }

        // Проверяем отсутствие проверки CSRF токенов
        if (content.includes('fetch(') || content.includes('XMLHttpRequest')) {
            if (!content.includes('csrf') && !content.includes('token')) {
                this.addIssue('medium', 'csrf_risk', 'Отсутствует CSRF защита в AJAX запросах', filePath);
            }
        }
    }

    /**
     * Проверяет HTML на безопасность
     */
    checkHTMLSecurity(content, filePath) {
        // Проверяем inline скрипты
        const inlineScripts = content.match(/<script[^>]*>[^<]+<\/script>/gi);
        if (inlineScripts) {
            this.addIssue('medium', 'inline_script', `Найдено ${inlineScripts.length} inline скриптов`, filePath);
        }

        // Проверяем external скрипты без integrity
        const externalScripts = content.match(/<script[^>]*src=[^>]*>/gi);
        if (externalScripts) {
            externalScripts.forEach(script => {
                if (!script.includes('integrity=')) {
                    this.addIssue('medium', 'missing_integrity', 'External скрипт без integrity атрибута', filePath);
                }
            });
        }

        // Проверяем мета-теги безопасности
        const hasCSP = content.includes('Content-Security-Policy');
        if (!hasCSP) {
            this.addIssue('high', 'missing_csp', 'Отсутствует Content Security Policy', filePath);
        }
    }

    /**
     * Рекурсивно сканирует директорию
     */
    async scanDirectory(dirPath) {
        try {
            const items = await fs.readdir(dirPath);

            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stats = await fs.stat(fullPath);

                if (stats.isDirectory()) {
                    // Пропускаем node_modules и другие служебные папки
                    if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
                        await this.scanDirectory(fullPath);
                    }
                } else if (SCAN_EXTENSIONS.includes(path.extname(item).toLowerCase())) {
                    this.totalFiles++;
                    await this.scanFile(fullPath);
                }
            }
        } catch (error) {
            this.addIssue('medium', 'scan_error', `Ошибка сканирования директории: ${error.message}`, dirPath);
        }
    }

    /**
     * Проверяет конфигурацию Express сервера
     */
    async checkServerSecurity() {
        try {
            const serverPath = path.join(process.cwd(), 'src', 'index.js');
            const content = await fs.readFile(serverPath, 'utf8');

            // Проверяем наличие helmet
            if (!content.includes('helmet')) {
                this.addIssue('high', 'missing_helmet', 'Отсутствует Helmet middleware для безопасности', serverPath);
            }

            // Проверяем rate limiting
            if (!content.includes('rate') && !content.includes('limit')) {
                this.addIssue('high', 'missing_rate_limit', 'Отсутствует rate limiting', serverPath);
            }

            // Проверяем CORS настройки
            if (content.includes("origin: '*'")) {
                this.addIssue('medium', 'permissive_cors', 'Слишком разрешительные CORS настройки', serverPath);
            }

            // Проверяем использование HTTPS
            if (!content.includes('https') && content.includes('http')) {
                this.addIssue('medium', 'http_only', 'Сервер настроен только на HTTP', serverPath);
            }

        } catch (error) {
            this.addIssue('medium', 'server_check_error', `Ошибка проверки сервера: ${error.message}`);
        }
    }

    /**
     * Проверяет зависимости на уязвимости
     */
    async checkDependencies() {
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            const packageData = JSON.parse(packageContent);

            // Проверяем наличие lock файла
            try {
                await fs.access(path.join(process.cwd(), 'package-lock.json'));
            } catch {
                this.addIssue('medium', 'missing_lockfile', 'Отсутствует package-lock.json');
            }

            // Проверяем устаревшие зависимости (примерная проверка)
            const deps = { ...packageData.dependencies, ...packageData.devDependencies };
            const oldPackages = ['request', 'node-uuid', 'crypto'];

            for (const pkg of oldPackages) {
                if (deps[pkg]) {
                    this.addIssue('medium', 'outdated_package', `Устаревший пакет: ${pkg}`, packagePath);
                }
            }

        } catch (error) {
            this.addIssue('medium', 'deps_check_error', `Ошибка проверки зависимостей: ${error.message}`);
        }
    }

    /**
     * Генерирует отчет
     */
    generateReport() {
        const severityCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        // Подсчитываем проблемы по критичности
        this.issues.forEach(issue => {
            severityCounts[issue.severity]++;
        });

        const report = {
            summary: {
                totalFiles: this.totalFiles,
                scannedFiles: this.scannedFiles,
                totalIssues: this.issues.length,
                ...severityCounts
            },
            issues: this.issues.sort((a, b) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
            })
        };

        return report;
    }

    /**
     * Основной метод сканирования
     */
    async scan() {
        console.log('🔒 Начинаем проверку безопасности...\n');

        const startTime = Date.now();

        // Сканируем файлы проекта
        await this.scanDirectory(process.cwd());

        // Проверяем конфигурацию сервера
        await this.checkServerSecurity();

        // Проверяем зависимости
        await this.checkDependencies();

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        const report = this.generateReport();

        // Выводим отчет
        this.printReport(report, duration);

        return report;
    }

    /**
     * Выводит отчет в консоль
     */
    printReport(report, duration) {
        const { summary, issues } = report;

        console.log('📊 ОТЧЕТ ПО БЕЗОПАСНОСТИ');
        console.log('═'.repeat(50));
        console.log(`⏱️  Время сканирования: ${duration}с`);
        console.log(`📁 Просканировано файлов: ${summary.scannedFiles}/${summary.totalFiles}`);
        console.log(`🚨 Всего проблем: ${summary.totalIssues}`);
        console.log('');

        // Статистика по критичности
        console.log('🎯 По критичности:');
        console.log(`   🔴 Критичные: ${summary.critical}`);
        console.log(`   🟠 Высокие: ${summary.high}`);
        console.log(`   🟡 Средние: ${summary.medium}`);
        console.log(`   🟢 Низкие: ${summary.low}`);
        console.log('');

        // Детали проблем
        if (issues.length > 0) {
            console.log('🔍 НАЙДЕННЫЕ ПРОБЛЕМЫ:');
            console.log('─'.repeat(50));

            issues.forEach((issue, index) => {
                const severityEmoji = {
                    critical: '🔴',
                    high: '🟠',
                    medium: '🟡',
                    low: '🟢'
                };

                console.log(`${index + 1}. ${severityEmoji[issue.severity]} [${issue.severity.toUpperCase()}] ${issue.type}`);
                console.log(`   💬 ${issue.message}`);
                if (issue.file) {
                    console.log(`   📍 ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
                }
                console.log('');
            });
        } else {
            console.log('✅ Проблем безопасности не найдено!');
        }

        // Рекомендации
        if (summary.critical > 0 || summary.high > 0) {
            console.log('⚠️  РЕКОМЕНДАЦИИ:');
            console.log('─'.repeat(50));
            console.log('1. Немедленно исправьте критичные и высокие проблемы');
            console.log('2. Проведите code review для средних проблем');
            console.log('3. Настройте автоматические проверки безопасности');
            console.log('4. Регулярно обновляйте зависимости');
            console.log('5. Используйте инструменты статического анализа');
            console.log('');
        }
    }
}

// Запускаем сканирование если скрипт вызван напрямую
async function main() {
    const scanner = new SecurityScanner();
    const report = await scanner.scan();

    // Возвращаем код выхода в зависимости от найденных проблем
    if (report.summary.critical > 0) {
        process.exit(2); // Критичные проблемы
    } else if (report.summary.high > 0) {
        process.exit(1); // Высокие проблемы
    } else {
        process.exit(0); // Все в порядке
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { SecurityScanner }; 