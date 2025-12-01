/**
 * Unit tests for content_script.js functionality
 */

// Mock the content script functions
const mockContentScript = {
    selectedElements: new Map(),
    isSelecting: false,
    currentLabel: '',

    // Mock DOM element creation
    createMockElement: (tagName, attributes = {}, textContent = '') => {
        const element = document.createElement(tagName);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        element.textContent = textContent;
        return element;
    },

    // Test element ID generation
    generateElementId: (element) => {
        const path = [];
        let current = element;

        while (current && current !== document.body) {
            const tag = current.tagName.toLowerCase();
            const id = current.id ? `#${current.id}` : '';
            const classes = current.className ? `.${current.className.split(' ').join('.')}` : '';
            const index = Array.from(current.parentNode?.children || []).indexOf(current);

            path.unshift(`${tag}${id}${classes}:nth-child(${index + 1})`);
            current = current.parentNode;
        }

        return path.join(' > ');
    },

    // Test CSS selector generation
    generateSelector: (element) => {
        if (element.id) {
            return `#${element.id}`;
        }

        const path = [];
        let current = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
                selector += `#${current.id}`;
                path.unshift(selector);
                break;
            }

            if (current.className) {
                selector += `.${current.className.split(' ').join('.')}`;
            }

            const siblings = Array.from(current.parentNode?.children || []);
            const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);

            if (sameTagSiblings.length > 1) {
                const index = sameTagSiblings.indexOf(current) + 1;
                selector += `:nth-of-type(${index})`;
            }

            path.unshift(selector);
            current = current.parentNode;
        }

        return path.join(' > ');
    }
};

describe('Content Script - Element Selection', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        mockContentScript.selectedElements.clear();
        mockContentScript.isSelecting = false;
        mockContentScript.currentLabel = '';
    });

    describe('generateElementId', () => {
        test('should generate correct ID for simple element', () => {
            const element = mockContentScript.createMockElement('div');
            document.body.appendChild(element);

            const id = mockContentScript.generateElementId(element);
            expect(id).toBe('div:nth-child(1)');
        });

        test('should generate correct ID for element with ID', () => {
            const element = mockContentScript.createMockElement('div', { id: 'test-id' });
            document.body.appendChild(element);

            const id = mockContentScript.generateElementId(element);
            expect(id).toBe('div#test-id:nth-child(1)');
        });

        test('should generate correct ID for nested element', () => {
            const parent = mockContentScript.createMockElement('div', { id: 'parent' });
            const child = mockContentScript.createMockElement('span', { class: 'child-class' });
            parent.appendChild(child);
            document.body.appendChild(parent);

            const id = mockContentScript.generateElementId(child);
            expect(id).toContain('span.child-class:nth-child(1)');
            expect(id).toContain('div#parent:nth-child(1)');
        });

        test('should handle element with multiple classes', () => {
            const element = mockContentScript.createMockElement('div', {
                class: 'class1 class2 class3'
            });
            document.body.appendChild(element);

            const id = mockContentScript.generateElementId(element);
            expect(id).toContain('.class1.class2.class3');
        });
    });

    describe('generateSelector', () => {
        test('should generate ID selector for element with ID', () => {
            const element = mockContentScript.createMockElement('div', { id: 'unique-id' });
            document.body.appendChild(element);

            const selector = mockContentScript.generateSelector(element);
            expect(selector).toBe('#unique-id');
        });

        test('should generate class selector for element with class', () => {
            const element = mockContentScript.createMockElement('div', { class: 'test-class' });
            document.body.appendChild(element);

            const selector = mockContentScript.generateSelector(element);
            expect(selector).toBe('div.test-class');
        });

        test('should generate nth-of-type selector for multiple similar elements', () => {
            const parent = document.createElement('div');
            const child1 = mockContentScript.createMockElement('p');
            const child2 = mockContentScript.createMockElement('p');
            parent.appendChild(child1);
            parent.appendChild(child2);
            document.body.appendChild(parent);

            const selector = mockContentScript.generateSelector(child2);
            expect(selector).toBe('p:nth-of-type(2)');
        });

        test('should handle complex nested structure', () => {
            const container = mockContentScript.createMockElement('div', { class: 'container' });
            const parent = mockContentScript.createMockElement('div', { class: 'parent' });
            const child = mockContentScript.createMockElement('span', { class: 'child' });

            parent.appendChild(child);
            container.appendChild(parent);
            document.body.appendChild(container);

            const selector = mockContentScript.generateSelector(child);
            expect(selector).toContain('span.child');
            expect(selector).toContain('div.parent');
            expect(selector).toContain('div.container');
        });
    });

    describe('Element Selection Logic', () => {
        test('should handle element with href attribute (image example)', () => {
            const img = mockContentScript.createMockElement('img', {
                href: 'https://example.com/images/12.png',
                alt: 'preview'
            });
            document.body.appendChild(img);

            const selector = mockContentScript.generateSelector(img);
            expect(selector).toBe('img');

            // Test that attributes are accessible
            expect(img.getAttribute('href')).toBe('https://example.com/images/12.png');
            expect(img.getAttribute('alt')).toBe('preview');
        });

        test('should handle span with text content', () => {
            const span = mockContentScript.createMockElement('span', {}, 'Hello there');
            document.body.appendChild(span);

            expect(span.textContent).toBe('Hello there');
            expect(span.tagName.toLowerCase()).toBe('span');
        });

        test('should handle empty text content', () => {
            const div = mockContentScript.createMockElement('div', {}, '');
            document.body.appendChild(div);

            expect(div.textContent).toBe('');
        });

        test('should handle whitespace text content', () => {
            const div = mockContentScript.createMockElement('div', {}, '   \n\t  ');
            document.body.appendChild(div);

            expect(div.textContent).toBe('   \n\t  ');
        });
    });

    describe('Selection Storage', () => {
        test('should store selection data correctly', () => {
            const element = mockContentScript.createMockElement('div', { id: 'test' }, 'Test content');
            document.body.appendChild(element);

            const selectionData = {
                label: 'test-label',
                selector: '#test',
                tagName: 'div',
                text: 'Test content',
                html: element.outerHTML,
                attributes: { id: 'test' },
                children: [],
                value: 'Test content',
                timestamp: new Date().toISOString()
            };

            mockContentScript.selectedElements.set('test-key', selectionData);

            expect(mockContentScript.selectedElements.has('test-key')).toBe(true);
            expect(mockContentScript.selectedElements.get('test-key').label).toBe('test-label');
            expect(mockContentScript.selectedElements.get('test-key').value).toBe('Test content');
        });

        test('should handle multiple selections', () => {
            const element1 = mockContentScript.createMockElement('div', { id: 'el1' });
            const element2 = mockContentScript.createMockElement('span', { id: 'el2' });
            document.body.appendChild(element1);
            document.body.appendChild(element2);

            mockContentScript.selectedElements.set('key1', { label: 'label1', selector: '#el1' });
            mockContentScript.selectedElements.set('key2', { label: 'label2', selector: '#el2' });

            expect(mockContentScript.selectedElements.size).toBe(2);
            expect(Array.from(mockContentScript.selectedElements.keys())).toEqual(['key1', 'key2']);
        });
    });
});