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



    describe('displaySelections', () => {
        test('should display empty state when no selections', () => {
            const html = mockPopup.displaySelections([]);
            expect(html).toContain('No elements selected yet');
            expect(html).toContain('class="no-selections"');
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


    });
});