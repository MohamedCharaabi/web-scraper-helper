/**
 * Unit tests for popup.js functionality
 */

// Mock the popup functions
const mockPopup = {
    selections: [],

    generatePythonScrapingCode: (selections, pageUrl) => {
        if (!selections || selections.length === 0) {
            return '';
        }

        const imports = `import requests
from bs4 import BeautifulSoup
import json

`;

        const mainFunction = `def scrape_website(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    data = []
    
`;

        const extractionLogic = selections.map(selection => {
            return `    # Extract ${selection.label}
    elements = soup.select('${selection.selector}')
    for element in elements:
        item = {'label': '${selection.label}'}
        ${selection.value ? `item['value'] = element.get_text(strip=True)` : ''}
        data.append(item)
`;
        }).join('');

        const footer = `
    return data

# Usage
url = "${pageUrl}"
result = scrape_website(url)
print(json.dumps(result, indent=2))
`;

        return imports + mainFunction + extractionLogic + footer;
    },

    displaySelections: (selections) => {
        if (!selections || selections.length === 0) {
            return '<div class="no-selections">No elements selected yet</div>';
        }

        return selections.map(selection => {
            let html = `
        <div class="selection-item">
          <div class="selection-label">${selection.label}</div>
          <div class="selection-element">&lt;${selection.tagName}&gt;</div>
      `;

            if (selection.value) {
                html += `<div class="selection-value"><strong>Value:</strong> "${selection.value}"</div>`;
            }

            if (selection.attributes && Object.keys(selection.attributes).length > 0) {
                html += '<div class="selection-attributes"><strong>Attributes:</strong><ul>';
                Object.entries(selection.attributes).forEach(([key, value]) => {
                    html += `<li>${key} = "${value}"</li>`;
                });
                html += '</ul></div>';
            }

            html += `<div class="selection-selector">${selection.selector}</div></div>`;
            return html;
        }).join('');
    }
};

describe('Popup - Code Generation', () => {
    beforeEach(() => {
        mockPopup.selections = [];
    });

    describe('generatePythonScrapingCode', () => {
        test('should generate basic Python code for simple selection', () => {
            const selections = [{
                label: 'title',
                selector: 'h1',
                tagName: 'h1',
                value: 'Page Title',
                attributes: {},
                children: []
            }];

            const code = mockPopup.generatePythonScrapingCode(selections, 'https://example.com');

            expect(code).toContain('import requests');
            expect(code).toContain('from bs4 import BeautifulSoup');
            expect(code).toContain('def scrape_website(url):');
            expect(code).toContain("soup.select('h1')");
            expect(code).toContain("item['value'] = element.get_text(strip=True)");
            expect(code).toContain('https://example.com');
        });

        test('should generate code with attributes when selected', () => {
            const selections = [{
                label: 'image',
                selector: 'img',
                tagName: 'img',
                value: '',
                attributes: { src: 'image.jpg', alt: 'Image' },
                children: []
            }];

            const code = mockPopup.generatePythonScrapingCode(selections, 'https://example.com');

            expect(code).toContain("element.get('src')");
            expect(code).toContain("element.get('alt')");
            expect(code).toContain("item['attributes'] = {}");
        });

        test('should generate code with children when selected', () => {
            const selections = [{
                label: 'container',
                selector: 'div.container',
                tagName: 'div',
                value: '',
                attributes: {},
                children: [{ tagName: 'span', text: 'Child text' }]
            }];

            const code = mockPopup.generatePythonScrapingCode(selections, 'https://example.com');

            expect(code).toContain("item['children'] = []");
            expect(code).toContain("element.select_one('span')");
        });

        test('should handle multiple selections', () => {
            const selections = [
                {
                    label: 'title',
                    selector: 'h1',
                    tagName: 'h1',
                    value: 'Title',
                    attributes: {},
                    children: []
                },
                {
                    label: 'description',
                    selector: 'p.description',
                    tagName: 'p',
                    value: 'Description',
                    attributes: {},
                    children: []
                }
            ];

            const code = mockPopup.generatePythonScrapingCode(selections, 'https://example.com');

            expect(code).toContain("soup.select('h1')");
            expect(code).toContain("soup.select('p.description')");
            expect(code).toContain("'label': 'title'");
            expect(code).toContain("'label': 'description'");
        });

        test('should handle empty selections', () => {
            const code = mockPopup.generatePythonScrapingCode([], 'https://example.com');
            expect(code).toBe('');
        });

        test('should include proper error handling', () => {
            const selections = [{
                label: 'test',
                selector: 'div',
                tagName: 'div',
                value: 'test',
                attributes: {},
                children: []
            }];

            const code = mockPopup.generatePythonScrapingCode(selections, 'https://example.com');

            expect(code).toContain('try:');
            expect(code).toContain('except requests.RequestException as e:');
            expect(code).toContain('print(f"Error fetching URL: {e}")');
        });
    });

    describe('displaySelections', () => {
        test('should display empty state when no selections', () => {
            const html = mockPopup.displaySelections([]);
            expect(html).toContain('No elements selected yet');
            expect(html).toHaveClass('no-selections');
        });

        test('should display single selection correctly', () => {
            const selections = [{
                label: 'test',
                selector: 'div',
                tagName: 'div',
                text: 'Test content',
                value: 'Test value',
                attributes: { id: 'test' },
                children: []
            }];

            const html = mockPopup.displaySelections(selections);

            expect(html).toContain('test');
            expect(html).toContain('&lt;div&gt;');
            expect(html).toContain('Test value');
            expect(html).toContain('id = "test"');
            expect(html).toContain('div');
        });

        test('should display multiple selections', () => {
            const selections = [
                {
                    label: 'title',
                    selector: 'h1',
                    tagName: 'h1',
                    text: 'Title text',
                    value: '',
                    attributes: {},
                    children: []
                },
                {
                    label: 'content',
                    selector: 'p',
                    tagName: 'p',
                    text: 'Content text',
                    value: 'Content value',
                    attributes: {},
                    children: []
                }
            ];

            const html = mockPopup.displaySelections(selections);

            expect(html).toContain('title');
            expect(html).toContain('content');
            expect(html).toContain('&lt;h1&gt;');
            expect(html).toContain('&lt;p&gt;');
        });

        test('should handle long text truncation', () => {
            const longText = 'a'.repeat(100);
            const selections = [{
                label: 'test',
                selector: 'div',
                tagName: 'div',
                text: longText,
                value: '',
                attributes: {},
                children: []
            }];

            const html = mockPopup.displaySelections(selections);

            expect(html).toContain('a'.repeat(80));
            expect(html).toContain('...');
        });
    });
});