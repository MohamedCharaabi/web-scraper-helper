// Content script for element selection and labeling with attribute/child selection
(function () {
    let isSelecting = false;
    let selectedElements = new Map();
    let currentLabel = '';
    let hoverElement = null;
    let selectionModal = null;

    // Load saved selections from storage
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.action) {
            case 'startSelection':
                startSelectionMode(message.label);
                break;
            case 'stopSelection':
                stopSelectionMode();
                break;
            case 'getSelections':
                sendResponse(getSelections());
                break;
            case 'clearSelections':
                clearSelections();
                break;
            case 'exportData':
                sendResponse(exportData());
                break;
            case 'hideSelectionModal':
                hideSelectionModal();
                break;
        }
    });




    function startSelectionMode(label) {
        if (isSelecting) return;

        isSelecting = true;
        currentLabel = label;

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('click', handleClick, true);

        // Add selection mode indicator
        const indicator = document.createElement('div');
        indicator.id = 'selection-mode-indicator';
        indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: #2196F3;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      ">
        Selection Mode: ${label} - Click elements to configure selection
      </div>
    `;

        //remove existing indicator if any
        const existingIndicator = document.getElementById('selection-mode-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
            existingIndicator.replaceWith(indicator);
            return;
        }


        document.body.appendChild(indicator);


    }

    function stopSelectionMode() {
        isSelecting = false;

        document.removeEventListener('mouseover', handleMouseOver);
        document.removeEventListener('mouseout', handleMouseOut);
        document.removeEventListener('click', handleClick, true);

        const indicator = document.getElementById('selection-mode-indicator');
        if (indicator) {
            indicator.remove();
        }

        clearHoverEffects();
        hideSelectionModal();
    }

    function handleMouseOver(e) {
        if (!isSelecting) return;

        const element = e.target;
        if (element.id === 'selection-mode-indicator' || element.closest('#selection-modal')) return;

        hoverElement = element;
        element.style.outline = '2px solid #2196F3';
        element.style.cursor = 'pointer';
    }

    function handleMouseOut(e) {
        if (!isSelecting) return;

        const element = e.target;
        element.style.outline = '';
        element.style.cursor = '';
        hoverElement = null;
    }

    function handleClick(e) {
        if (!isSelecting) return;

        const element = e.target;
        if (element.id === 'selection-mode-indicator' || element.closest('#selection-modal')) return;

        e.preventDefault();
        e.stopPropagation();

        // Show selection modal instead of directly saving
        showSelectionModal(element);
    }

    function showSelectionModal(element) {
        hideSelectionModal(); // Hide any existing modal

        const modal = document.createElement('div');
        modal.id = 'selection-modal';
        modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #333;">Configure Selection</h3>
            <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
          </div>
          
          <div style="margin-bottom: 15px;">
            <strong>Element:</strong> <code>&lt;${element.tagName.toLowerCase()}&gt;</code>
          </div>
          
          <div id="value-section" style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #555;">Value (Text Content):</h4>
            <div id="value-content"></div>
          </div>
          
          <div id="attributes-section" style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #555;">Attributes:</h4>
            <div id="attributes-list"></div>
          </div>
          
          <div id="children-section" style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 10px 0; color: #555;">Child Elements (${element.children.length}):</h4>
            <div id="children-list"></div>
          </div>
          
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancel-selection" class="modal-btn modal-btn-secondary">Cancel</button>
            <button id="save-selection" class="modal-btn modal-btn-primary">Save Selection</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(modal);
        selectionModal = modal;

        // Populate value (text content)
        const valueContent = modal.querySelector('#value-content');
        const textValue = element.textContent.trim();

        if (textValue) {
            valueContent.innerHTML = `
        <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
          <input type="checkbox" id="save-value" data-value="${textValue}" style="margin-right: 8px;">
          <span><strong>Save text content:</strong> "${textValue}"</span>
        </label>
      `;
        } else {
            valueContent.innerHTML = '<div style="color: #888; font-style: italic;">No text content found</div>';
        }

        // Populate attributes
        const attributesList = modal.querySelector('#attributes-list');
        const attributes = Array.from(element.attributes);

        if (attributes.length === 0) {
            attributesList.innerHTML = '<div style="color: #888; font-style: italic;">No attributes found</div>';
        } else {
            attributes.forEach(attr => {
                const attrDiv = document.createElement('div');
                attrDiv.style.cssText = 'margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;';
                attrDiv.innerHTML = `
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" class="attr-checkbox" data-attr-name="${attr.name}" data-attr-value="${attr.value}" style="margin-right: 8px;">
            <span><strong>${attr.name}</strong> = "${attr.value}"</span>
          </label>
        `;
                attributesList.appendChild(attrDiv);
            });
        }

        // Populate children
        const childrenList = modal.querySelector('#children-list');

        if (element.children.length === 0) {
            childrenList.innerHTML = '<div style="color: #888; font-style: italic;">No child elements found</div>';
        } else {
            Array.from(element.children).forEach((child, index) => {
                const childDiv = document.createElement('div');
                childDiv.style.cssText = 'margin-bottom: 8px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;';
                childDiv.innerHTML = `
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" class="child-checkbox" data-child-index="${index}" style="margin-right: 8px;">
            <span>&lt;${child.tagName.toLowerCase()}&gt; ${child.textContent.trim().substring(0, 50)}${child.textContent.trim().length > 50 ? '...' : ''}</span>
          </label>
        `;
                childrenList.appendChild(childDiv);
            });
        }

        // Add event listeners
        modal.querySelector('#close-modal').addEventListener('click', hideSelectionModal);
        modal.querySelector('#cancel-selection').addEventListener('click', cancelSelection);
        modal.querySelector('#save-selection').addEventListener('click', () => saveSelection(element));

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideSelectionModal();
            }
        });
    }


    function cancelSelection() {
        hideSelectionModal();
        isSelecting = false;
    }

    function hideSelectionModal() {
        if (selectionModal) {
            selectionModal.remove();
            selectionModal = null;
        }
    }

    function saveSelection(element) {
        if (!selectionModal) return;

        // Get selected value (text content)
        const selectedValue = {};
        const valueCheckbox = selectionModal.querySelector('#save-value');
        if (valueCheckbox && valueCheckbox.checked) {
            selectedValue.text = valueCheckbox.dataset.value;
        }

        // Get selected attributes
        const selectedAttributes = {};
        const attrCheckboxes = selectionModal.querySelectorAll('.attr-checkbox:checked');
        attrCheckboxes.forEach(checkbox => {
            const name = checkbox.dataset.attrName;
            const value = checkbox.dataset.attrValue;
            selectedAttributes[name] = value;
        });

        // Get selected children
        const selectedChildren = [];
        const childCheckboxes = selectionModal.querySelectorAll('.child-checkbox:checked');
        childCheckboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.childIndex);
            selectedChildren.push({
                index: index,
                tagName: element.children[index].tagName.toLowerCase(),
                text: element.children[index].textContent.trim()
            });
        });

        const elementId = generateElementId(element);
        const selectionData = {
            label: currentLabel,
            selector: generateSelector(element),
            tagName: element.tagName.toLowerCase(),
            text: element.textContent.trim(),
            html: element.outerHTML,
            attributes: selectedAttributes,
            children: selectedChildren,
            timestamp: new Date().toISOString()
        };

        // Add value if selected
        if (selectedValue.text) {
            selectionData.value = selectedValue.text;
        }

        selectedElements.set(elementId, selectionData);

        // Visual feedback
        element.style.outline = '2px solid #4CAF50';
        setTimeout(() => {
            element.style.outline = '';
        }, 1000);

        hideSelectionModal();
        saveSelections();
        isSelecting = false;
    }

    function generateElementId(element) {
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
    }

    function generateSelector(element) {
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

    function getSelections() {
        return Array.from(selectedElements.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }

    function clearSelections() {
        selectedElements.clear();
        saveSelections();
    }

    function exportData() {
        const data = getSelections();
        return {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            selections: data
        };
    }

    function saveSelections() {
        const data = exportData();
        browser.runtime.sendMessage({
            action: 'saveData',
            data: data
        });
    }

    function clearHoverEffects() {
        if (hoverElement) {
            hoverElement.style.outline = '';
            hoverElement.style.cursor = '';
        }
    }

    // Initialize - load existing selections
    browser.runtime.sendMessage({ action: 'loadData' }).then(response => {
        if (response && response.data) {
            response.data.selections.forEach(selection => {
                selectedElements.set(selection.id, selection);
            });
        }
    });

})();