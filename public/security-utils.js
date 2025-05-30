/**
 * Утилиты безопасности для предотвращения XSS атак
 * Заменяет небезопасные innerHTML на sanitized варианты
 */

// Простая функция санитизации для HTML (без внешних зависимостей)
function sanitizeHtml(html) {
    if (!html) return '';

    // Создаем временный элемент для парсинга
    
    temp.textContent = html;

    // Разрешенные теги для контента
    const allowedTags = ['b', 'i', 'strong', 'em', 'span', 'div', 'p', 'br'];
    const allowedAttributes = ['class', 'id'];

    // Если это простой текст без HTML тегов, возвращаем как есть
    if (!html.includes('<')) {
        return html;
    }

    // Для содержимого с HTML тегами используем более строгую фильтрацию
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Безопасная установка HTML контента
function safeSetHTML(element, content) {
    if (!element) return;

    // Если контент содержит только текст, используем textContent
    if (!content || !content.includes('<')) {
        element.textContent = content;
        return;
    }

    // Для HTML контента используем санитизацию
    const sanitized = sanitizeHtml(content);
    element.textContent = sanitized;
}

// Безопасная установка атрибутов
function safeSetAttribute(element, attribute, value) {
    if (!element || !attribute) return;

    // Фильтруем опасные атрибуты
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
    if (dangerousAttrs.includes(attribute.toLowerCase())) {
        
        return;
    }

    // Для href и src проверяем URL
    if (['href', 'src', 'action'].includes(attribute.toLowerCase())) {
        if (value && !isValidUrl(value)) {
            
            return;
        }
    }

    element.setAttribute(attribute, value);
}

// Проверка безопасности URL
function isValidUrl(url) {
    if (!url) return false;

    // Разрешенные протоколы
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

    try {
        const urlObj = new URL(url, window.location.origin);
        return allowedProtocols.includes(urlObj.protocol);
    } catch (e) {
        // Если это относительный URL, считаем его безопасным
        return !url.includes('javascript:') && !url.includes('data:') && !url.includes('vbscript:');
    }
}

// Безопасное создание элементов с контентом
function createSafeElement(tagName, content, attributes = {}) {
    const element = document.createElement(tagName);

    if (content) {
        safeSetHTML(element, content);
    }

    Object.entries(attributes).forEach(([attr, value]) => {
        safeSetAttribute(element, attr, value);
    });

    return element;
}

// Безопасная очистка контейнера
function safeClearContainer(container) {
    if (!container) return;

    // Удаляем все дочерние элементы
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

// Безопасное добавление HTML в контейнер
function safeAppendHTML(container, htmlString) {
    if (!container || !htmlString) return;

    // Создаем DocumentFragment для безопасной вставки
    const fragment = document.createDocumentFragment();
    const wrapper = document.createElement('div');

    // Санитизируем HTML
    wrapper.textContent = htmlString;

    // Переносим содержимое в fragment
    while (wrapper.firstChild) {
        fragment.appendChild(wrapper.firstChild);
    }

    container.appendChild(fragment);
}

// Экспортируем утилиты
window.SecurityUtils = {
    sanitizeHtml,
    safeSetHTML,
    safeSetAttribute,
    isValidUrl,
    createSafeElement,
    safeClearContainer,
    safeAppendHTML
}; 