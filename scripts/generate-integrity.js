/**
 * Генератор integrity хешей для внешних ресурсов
 * Автоматически генерирует SRI (Subresource Integrity) хеши
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class IntegrityGenerator {
    constructor() {
        this.resources = [
            {
                url: 'https://telegram.org/js/telegram-web-app.js',
                type: 'script',
                description: 'Telegram WebApp API'
            },
            {
                url: 'https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&display=swap',
                type: 'stylesheet',
                description: 'Google Fonts - Roboto Condensed'
            }
        ];
    }

    /**
     * Загружает ресурс и вычисляет SRI хеш
     */
    async fetchAndHash(url) {
        return new Promise((resolve, reject) => {
            console.log(`🔍 Загружаем: ${url}`);

            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode} для ${url}`));
                    return;
                }

                const chunks = [];

                response.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                response.on('end', () => {
                    const content = Buffer.concat(chunks);

                    // Генерируем хеши для разных алгоритмов
                    const sha256 = crypto.createHash('sha256').update(content).digest('base64');
                    const sha384 = crypto.createHash('sha384').update(content).digest('base64');
                    const sha512 = crypto.createHash('sha512').update(content).digest('base64');

                    resolve({
                        url,
                        size: content.length,
                        hashes: {
                            sha256: `sha256-${sha256}`,
                            sha384: `sha384-${sha384}`,
                            sha512: `sha512-${sha512}`
                        },
                        // Рекомендуемый хеш (SHA-384 - оптимальный баланс)
                        recommended: `sha384-${sha384}`
                    });
                });

            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Генерирует integrity хеши для всех ресурсов
     */
    async generateHashes() {
        console.log('🛡️  Генерируем integrity хеши для внешних ресурсов...\n');

        const results = [];

        for (const resource of this.resources) {
            try {
                const result = await this.fetchAndHash(resource.url);
                results.push({
                    ...resource,
                    ...result
                });

                console.log(`✅ ${resource.description}:`);
                console.log(`   Размер: ${result.size} bytes`);
                console.log(`   SHA-384: ${result.hashes.sha384}`);
                console.log('');

            } catch (error) {
                console.error(`❌ Ошибка для ${resource.url}:`, error.message);
            }
        }

        return results;
    }

    /**
     * Создает HTML код с integrity атрибутами
     */
    generateHTML(results) {
        console.log('📝 HTML код с integrity атрибутами:\n');

        results.forEach(resource => {
            if (resource.type === 'script') {
                console.log(`<!-- ${resource.description} -->`);
                console.log(`<script src="${resource.url}"`);
                console.log(`        integrity="${resource.recommended}"`);
                console.log(`        crossorigin="anonymous"></script>\n`);
            } else if (resource.type === 'stylesheet') {
                console.log(`<!-- ${resource.description} -->`);
                console.log(`<link href="${resource.url}"`);
                console.log(`      rel="stylesheet"`);
                console.log(`      integrity="${resource.recommended}"`);
                console.log(`      crossorigin="anonymous">\n`);
            }
        });
    }

    /**
     * Сохраняет результаты в JSON файл
     */
    async saveResults(results) {
        const outputPath = path.join(process.cwd(), 'integrity-hashes.json');

        const output = {
            generated: new Date().toISOString(),
            description: 'SRI (Subresource Integrity) хеши для внешних ресурсов',
            resources: results.map(r => ({
                url: r.url,
                type: r.type,
                description: r.description,
                size: r.size,
                integrity: r.recommended,
                allHashes: r.hashes
            }))
        };

        await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
        console.log(`💾 Результаты сохранены в: ${outputPath}`);
    }

    /**
     * Запускает полный процесс генерации
     */
    async run() {
        try {
            const results = await this.generateHashes();

            if (results.length > 0) {
                this.generateHTML(results);
                await this.saveResults(results);

                console.log('🎉 Генерация integrity хешей завершена успешно!');
                console.log('\n📋 Следующие шаги:');
                console.log('1. Скопируйте HTML код выше и обновите ваши HTML файлы');
                console.log('2. Протестируйте сайт, чтобы убедиться что все работает');
                console.log('3. Периодически обновляйте хеши при изменении ресурсов');
            } else {
                console.log('⚠️  Не удалось сгенерировать хеши для ресурсов');
            }

        } catch (error) {
            console.error('❌ Ошибка при генерации:', error);
            process.exit(1);
        }
    }
}

// Запускаем генератор
if (require.main === module) {
    const generator = new IntegrityGenerator();
    generator.run();
}

module.exports = IntegrityGenerator; 