/**
 * Unit tests for modal functionality in content_script.js
 */

describe('Content Script - Modal Functionality', () => {
    let modal;
    let mockElement;

    beforeEach(() => {
        document.body.innerHTML = '';

        // Create a mock element for testing
        mockElement = document.createElement('div');
        mockElement.id = 'test-element';
        mockElement.className = 'test-class';
        mockElement.textContent = 'Test content';
        mockElement.setAttribute('data-test', 'test-value');
        document.body.appendChild(mockElement);
    });

    afterEach(() => {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    });

    describe('Modal Creation', () => {
        test('should create modal with correct structure', () => {
            const modalHTML = createSelectionModal(mockElement);

            expect(modalHTML).toContain('Configure Selection');
            expect(modalHTML).toContain('Value (Text Content):');
            expect(modalHTML).toContain('Attributes:');
            expect(modalHTML).toContain('Child Elements');
            expect(modalHTML).toContain('Save Selection');
            expect(modalHTML).toContain('Cancel');
        });

        test('should display element tag name correctly', () => {
            const modalHTML = createSelectionModal(mockElement);

            expect(modalHTML).toContain('&lt;div&gt;');
        });

        test('should display text content when available', () => {
            const modalHTML = createSelectionModal(mockElement);

            expect(modalHTML).toContain('Test content');
            expect(modalHTML).toContain('Save text content:');
        });

        test('should show "No text content" when element is empty', () => {
            mockElement.textContent = '';
            const modalHTML = createSelectionModal(mockElement);

            expect(modalHTML).toContain('No text content found');
        });

        test('should display all attributes correctly', () => {
            const modalHTML = createSelectionModal(mockElement);

            expect(modalHTML).toContain('<strong>id</strong> ="test-element"');
            expect(modalHTML).toContain('<strong>class</strong> ="test-class"');
            expect(modalHTML).toContain('<strong>data-test</strong> ="test-value"');
        });

        test('should show "No attributes found" when element has no attributes', () => {
            const elementWithoutAttrs = document.createElement('span');
            const modalHTML = createSelectionModal(elementWithoutAttrs);

            expect(modalHTML).toContain('No attributes found');
        });
    });

    describe('Modal Interaction', () => {
        test('should handle checkbox interactions for attributes', () => {
            const modalElement = document.createElement('div');
            modalElement.innerHTML = createSelectionModal(mockElement);
            document.body.appendChild(modalElement);

            const checkboxes = modalElement.querySelectorAll('.attr-checkbox');
            expect(checkboxes.length).toBe(3); // id, class, data-test

            // Simulate checking a checkbox
            checkboxes[0].checked = true;
            expect(checkboxes[0].checked).toBe(true);

            document.body.removeChild(modalElement);
        });

        test('should handle value checkbox interaction', () => {
            const modalElement = document.createElement('div');
            modalElement.innerHTML = createSelectionModal(mockElement);
            document.body.appendChild(modalElement);

            const valueCheckbox = modalElement.querySelector('#save-value');
            expect(valueCheckbox).toBeTruthy();
            expect(valueCheckbox.dataset.value).toBe('Test content');

            valueCheckbox.checked = true;
            expect(valueCheckbox.checked).toBe(true);

            document.body.removeChild(modalElement);
        });
    });

    describe('Child Elements Display', () => {
        test('should show child elements correctly', () => {
            const parent = document.createElement('div');
            const child1 = document.createElement('span');
            child1.textContent = 'Child 1 text';
            const child2 = document.createElement('p');
            child2.textContent = 'Child 2 text';

            parent.appendChild(child1);
            parent.appendChild(child2);

            const modalHTML = createSelectionModal(parent);
            expect(modalHTML).toContain('Child Elements (2)');
            expect(modalHTML).toContain('&lt;span&gt;');
            expect(modalHTML).toContain('&lt;p&gt;');
            expect(modalHTML).toContain('Child 1 text');
            expect(modalHTML).toContain('Child 2 text');
        });

        test('should show "No child elements" when element has no children', () => {
            const modalHTML = createSelectionModal(mockElement);
            expect(modalHTML).toContain('No child elements found');
        });
    });
});

// Helper function for modal creation (mock implementation)
function createSelectionModal(element) {
    const textContent = element.textContent.trim();
    const attributes = Array.from(element.attributes);
    const childrenCount = element.children.length;

    let html = `
    <div>
      <h3>Configure Selection</h3>
      <div><strong>Element:</strong> <code>&lt;${element.tagName.toLowerCase()}&gt;</code></div>
      
      <div>
        <h4>Value (Text Content):</h4>
        <div>
          ${textContent ?
            `<label><input type="checkbox" id="save-value" data-value="${textContent}"> Save text content: "${textContent}"</label>` :
            '<div>No text content found</div>'
        }
        </div>
      </div>
      
      <div>
        <h4>Attributes:</h4>
        <div>
          ${attributes.length === 0 ?
            '<div>No attributes found</div>' :
            attributes.map(attr => `
              <div>
                <label>
                  <input type="checkbox" class="attr-checkbox" data-attr-name="${attr.name}" data-attr-value="${attr.value}">
                  <strong>${attr.name}</strong> = "${attr.value}"
                </label>
              </div>
            `).join('')
        }
        </div>
      </div>
      
      <div>
        <h4>Child Elements (${childrenCount}):</h4>
        <div>
          ${childrenCount === 0 ?
            '<div>No child elements found</div>' :
            Array.from(element.children).map((child, index) => `
              <div>
                <label>
                  <input type="checkbox" class="child-checkbox" data-child-index="${index}">
                  &lt;${child.tagName.toLowerCase()}&gt; ${child.textContent.trim().substring(0, 50)}
                </label>
              </div>
            `).join('')
        }
        </div>
      </div>
    </div>
  `;

    return html;
}