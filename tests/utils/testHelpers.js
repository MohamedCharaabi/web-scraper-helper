/**
 * Test utilities and helpers
 */

export const createMockElement = (config = {}) => {
    const {
        tagName = 'div',
        id = '',
        className = '',
        textContent = '',
        attributes = {},
        children = []
    } = config;

    const element = document.createElement(tagName);

    if (id) element.id = id;
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    children.forEach(childConfig => {
        const child = createMockElement(childConfig);
        element.appendChild(child);
    });

    return element;
};

export const createMockSelection = (config = {}) => {
    const {
        label = 'test-label',
        selector = 'div',
        tagName = 'div',
        text = 'test text',
        value = '',
        attributes = {},
        children = [],
        timestamp = new Date().toISOString()
    } = config;

    return {
        label,
        selector,
        tagName,
        text,
        value,
        attributes,
        children,
        timestamp,
        id: `test-${Date.now()}-${Math.random()}`
    };
};

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const waitFor = (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const check = () => {
            if (condition()) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                setTimeout(check, 100);
            }
        };

        check();
    });
};

export const mockBrowserAPI = () => {
    return {
        tabs: {
            query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
            sendMessage: jest.fn().mockResolvedValue({ success: true })
        },
        runtime: {
            sendMessage: jest.fn().mockResolvedValue({ data: [] }),
            onMessage: {
                addListener: jest.fn()
            }
        },
        storage: {
            local: {
                set: jest.fn().mockResolvedValue(),
                get: jest.fn().mockResolvedValue({})
            }
        }
    };
};