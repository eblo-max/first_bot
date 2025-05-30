/**
 * Скрипт оптимизации фронтенда
 * Минификация HTML, CSS, JavaScript и анализ размера бандла
 */

const fs = require('fs').promises;
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');
const CleanCSS = require('clean-css');

class FrontendOptimizer {
    constructor() {
        this.publicDir = path.join(process.cwd(), 'public');
        this.distDir = path.join(process.cwd(), 'dist');
        this.stats = {
            originalSize: 0,
            optimizedSize: 0,
            files: {
                html: { original: 0, optimized: 0, count: 0 },
                css: { original: 0, optimized: 0, count: 0 },
                js: { original: 0, optimized: 0, count: 0 }
            }
        };
    }

    /**
     * Настройки минификации HTML
     */
    getHTMLOptions() {
        return {
            removeComments: true,
            removeCommentsFromCDATA: true,
            removeCDATASectionsFromCDATA: true,
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeRedundantAttributes: true,
            preventAttributesEscaping: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            removeOptionalTags: false,
            removeIgnored: false,
            removeEmptyElements: false,
            lint: false,
            keepClosingSlash: false,
            caseSensitive: false,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: false
        };
    }

    /**
     * Настройки минификации JavaScript
     */
    getJSOptions() {
        return {
            compress: {
                drop_console: process.env.NODE_ENV === 'production',
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
                passes: 2
            },
            mangle: {
                toplevel: false,
                safari10: true
            },
            format: {
                comments: false
            },
            sourceMap: process.env.NODE_ENV !== 'production'
        };
    }

    /**
     * Настройки минификации CSS
     */
    getCSSOptions() {
        return {
            level: 2,
            returnPromise: false,
            format: 'beautify'
        };
    }

    /**
     * Создает директорию если не существует
     */
    async ensureDir(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Получает размер файла
     */
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    /**
     * Минификация HTML файлов
     */
    async minifyHTMLFiles() {
        const htmlFiles = ['index.html', 'game.html', 'profile.html'];

        for (const file of htmlFiles) {
            const inputPath = path.join(this.publicDir, file);
            const outputPath = path.join(this.distDir, file);

            try {
                const content = await fs.readFile(inputPath, 'utf8');
                const originalSize = content.length;

                const minified = await minifyHTML(content, this.getHTMLOptions());
                const optimizedSize = minified.length;

                await fs.writeFile(outputPath, minified);

                this.stats.files.html.original += originalSize;
                this.stats.files.html.optimized += optimizedSize;
                this.stats.files.html.count++;

                console.log(`✅ ${file}: ${originalSize} → ${optimizedSize} байт (${Math.round((1 - optimizedSize / originalSize) * 100)}% сжатие)`);
            } catch (error) {
                
            }
        }
    }

    /**
     * Минификация JavaScript файлов
     */
    async minifyJSFiles() {
        const jsFiles = [
            'app.js', 'crime-app.js', 'profile.js', 'achievement-system.js',
            'game-interface.js', 'game-state.js', 'debug.js', 'logger.js'
        ];

        for (const file of jsFiles) {
            const inputPath = path.join(this.publicDir, file);
            const outputPath = path.join(this.distDir, file);

            try {
                const content = await fs.readFile(inputPath, 'utf8');
                const originalSize = content.length;

                const result = await minifyJS(content, this.getJSOptions());
                const minified = result.code;
                const optimizedSize = minified.length;

                await fs.writeFile(outputPath, minified);

                // Сохраняем source map если не production
                if (result.map && process.env.NODE_ENV !== 'production') {
                    await fs.writeFile(outputPath + '.map', result.map);
                }

                this.stats.files.js.original += originalSize;
                this.stats.files.js.optimized += optimizedSize;
                this.stats.files.js.count++;

                console.log(`✅ ${file}: ${originalSize} → ${optimizedSize} байт (${Math.round((1 - optimizedSize / originalSize) * 100)}% сжатие)`);
            } catch (error) {
                
            }
        }
    }

    /**
     * Минификация CSS файлов
     */
    async minifyCSSFiles() {
        const cssFiles = ['profile.css'];
        const cleanCSS = new CleanCSS(this.getCSSOptions());

        for (const file of cssFiles) {
            const inputPath = path.join(this.publicDir, file);
            const outputPath = path.join(this.distDir, file);

            try {
                const content = await fs.readFile(inputPath, 'utf8');
                const originalSize = content.length;

                const result = cleanCSS.minify(content);
                const minified = result.styles;
                const optimizedSize = minified.length;

                await fs.writeFile(outputPath, minified);

                this.stats.files.css.original += originalSize;
                this.stats.files.css.optimized += optimizedSize;
                this.stats.files.css.count++;

                console.log(`✅ ${file}: ${originalSize} → ${optimizedSize} байт (${Math.round((1 - optimizedSize / originalSize) * 100)}% сжатие)`);
            } catch (error) {
                
            }
        }
    }

    /**
     * Копирует остальные файлы
     */
    async copyOtherFiles() {
        const otherFiles = [
            // Добавьте другие файлы которые нужно просто скопировать
        ];

        for (const file of otherFiles) {
            const inputPath = path.join(this.publicDir, file);
            const outputPath = path.join(this.distDir, file);

            try {
                await fs.copyFile(inputPath, outputPath);
                
            } catch (error) {
                
            }
        }
    }

    /**
     * Анализ размера бандла
     */
    generateBundleAnalysis() {
        const { files } = this.stats;
        const totalOriginal = files.html.original + files.css.original + files.js.original;
        const totalOptimized = files.html.optimized + files.css.optimized + files.js.optimized;
        const compressionRatio = Math.round((1 - totalOptimized / totalOriginal) * 100);

        const analysis = {
            summary: {
                originalSize: `${Math.round(totalOriginal / 1024)} KB`,
                optimizedSize: `${Math.round(totalOptimized / 1024)} KB`,
                compression: `${compressionRatio}%`,
                targetSize: '150 KB',
                status: totalOptimized <= 150 * 1024 ? 'PASSED ✅' : 'FAILED ❌'
            },
            breakdown: {
                html: {
                    files: files.html.count,
                    original: `${Math.round(files.html.original / 1024)} KB`,
                    optimized: `${Math.round(files.html.optimized / 1024)} KB`,
                    compression: files.html.original > 0 ? `${Math.round((1 - files.html.optimized / files.html.original) * 100)}%` : '0%'
                },
                css: {
                    files: files.css.count,
                    original: `${Math.round(files.css.original / 1024)} KB`,
                    optimized: `${Math.round(files.css.optimized / 1024)} KB`,
                    compression: files.css.original > 0 ? `${Math.round((1 - files.css.optimized / files.css.original) * 100)}%` : '0%'
                },
                js: {
                    files: files.js.count,
                    original: `${Math.round(files.js.original / 1024)} KB`,
                    optimized: `${Math.round(files.js.optimized / 1024)} KB`,
                    compression: files.js.original > 0 ? `${Math.round((1 - files.js.optimized / files.js.original) * 100)}%` : '0%'
                }
            }
        };

        return analysis;
    }

    /**
     * Основной метод оптимизации
     */
    async optimize() {
        
        const startTime = Date.now();

        try {
            // Создаем dist директорию
            await this.ensureDir(this.distDir);

            // Минификация файлов
            
            await this.minifyHTMLFiles();

            await this.minifyJSFiles();

            await this.minifyCSSFiles();

            await this.copyOtherFiles();

            // Генерируем анализ
            const analysis = this.generateBundleAnalysis();

            // Сохраняем отчет
            await fs.writeFile(
                path.join(this.distDir, 'bundle-analysis.json'),
                JSON.stringify(analysis, null, 2)
            );

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            // Выводим результаты
            
            console.log('═'.repeat(50));

            console.log(`   HTML: ${analysis.breakdown.html.files} файлов | ${analysis.breakdown.html.original} → ${analysis.breakdown.html.optimized} (${analysis.breakdown.html.compression})`);
            console.log(`   CSS:  ${analysis.breakdown.css.files} файлов | ${analysis.breakdown.css.original} → ${analysis.breakdown.css.optimized} (${analysis.breakdown.css.compression})`);
            console.log(`   JS:   ${analysis.breakdown.js.files} файлов | ${analysis.breakdown.js.original} → ${analysis.breakdown.js.optimized} (${analysis.breakdown.js.compression})`);

        } catch (error) {
            console.error('❌ Ошибка при оптимизации:', error);
            process.exit(1);
        }
    }
}

// Запускаем оптимизацию если скрипт вызван напрямую
async function main() {
    const optimizer = new FrontendOptimizer();
    await optimizer.optimize();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { FrontendOptimizer }; 