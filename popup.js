// Popup script with code generation
document.addEventListener('DOMContentLoaded', function () {

    const labelInput = document.getElementById('label-input');
    const closePopupButton = document.getElementById('close-popup');
    const startButton = document.getElementById('start-selection');
    const stopButton = document.getElementById('stop-selection');
    const exportButton = document.getElementById('export-data');
    const clearButton = document.getElementById('clear-all');
    const generateCodeButton = document.getElementById('generate-code');
    const selectionsList = document.getElementById('selections-list');
    const countSpan = document.getElementById('count');
    const statusDiv = document.getElementById('status');

    let isSelecting = false;

    // Load saved data
    loadSelections();

    closePopupButton.addEventListener('click', closePopoup);
    startButton.addEventListener('click', startSelection);
    stopButton.addEventListener('click', stopSelection);
    exportButton.addEventListener('click', exportData);
    clearButton.addEventListener('click', clearAll);
    generateCodeButton.addEventListener('click', generatePythonCode);


    function closePopoup() {
        // Notify content script to hide any modals
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'hideSelectionModal'
            });
        }).finally(() => {
            window.close();
        });
    }

    function startSelection() {
        const label = labelInput.value.trim();
        if (!label) {
            showStatus('Please enter a label', 'error');
            return;
        }

        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'startSelection',
                label: label
            });
            isSelecting = true;
            updateUI();
            showStatus('Selection mode started', 'success');



        }).catch(error => {
            showStatus('Error: ' + error.message, 'error');
        });
    }

    function stopSelection() {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'stopSelection'
            });
            isSelecting = false;
            updateUI();
            showStatus('Selection mode stopped', 'success');
        }).catch(error => {
            showStatus('Error: ' + error.message, 'error');
        });
    }

    function loadSelections() {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'getSelections'
            }).then(response => {
                displaySelections(response || []);
            });
        });
    }

    function displaySelections(selections) {
        selectionsList.innerHTML = '';
        countSpan.textContent = selections.length;

        if (selections.length === 0) {
            selectionsList.innerHTML = '<div class="no-selections">No elements selected yet</div>';
            return;
        }

        selections.forEach(selection => {
            const item = document.createElement('div');
            item.className = 'selection-item';

            let valueHtml = '';
            if (selection.value) {
                valueHtml = `<div class="selection-value"><strong>Value:</strong> "${selection.value}"</div>`;
            }

            let attributesHtml = '';
            if (selection.attributes && Object.keys(selection.attributes).length > 0) {
                attributesHtml = '<div class="selection-attributes"><strong>Attributes:</strong><ul>';
                Object.entries(selection.attributes).forEach(([key, value]) => {
                    attributesHtml += `<li>${key} = "${value}"</li>`;
                });
                attributesHtml += '</ul></div>';
            }

            let childrenHtml = '';
            if (selection.children && selection.children.length > 0) {
                childrenHtml = '<div class="selection-children"><strong>Children:</strong><ul>';
                selection.children.forEach(child => {
                    childrenHtml += `<li>&lt;${child.tagName}&gt; ${child.text.substring(0, 30)}${child.text.length > 30 ? '...' : ''}</li>`;
                });
                childrenHtml += '</ul></div>';
            }

            item.innerHTML = `
        <div class="selection-label">${selection.label}</div>
        <div class="selection-element">&lt;${selection.tagName}&gt;</div>
        ${valueHtml}
        <div class="selection-text">${selection.text.substring(0, 80)}${selection.text.length > 80 ? '...' : ''}</div>
        ${attributesHtml}
        ${childrenHtml}
        <div class="selection-selector">${selection.selector}</div>
      `;
            selectionsList.appendChild(item);
        });
    }

    function exportData() {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'exportData'
            }).then(response => {
                if (response) {
                    const dataStr = JSON.stringify(response, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `web-scraper-data-${Date.now()}.json`;
                    a.click();

                    URL.revokeObjectURL(url);
                    showStatus('Data exported successfully', 'success');
                }
            });
        });
    }

    function generatePythonCode() {
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            browser.tabs.sendMessage(tabs[0].id, {
                action: 'getSelections'
            }).then(response => {
                if (response && response.length > 0) {
                    const pythonCode = generatePythonScrapingCode(response, tabs[0].url);
                    const blob = new Blob([pythonCode], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `web_scraper_${Date.now()}.py`;
                    a.click();

                    URL.revokeObjectURL(url);
                    showStatus('Python code generated successfully', 'success');
                } else {
                    showStatus('No selections found to generate code', 'error');
                }
            });
        });
    }

    function generatePythonScrapingCode(selections, pageUrl) {
        const imports = `import requests
from bs4 import BeautifulSoup
import json
from typing import Dict, List, Optional

`;

        const headers = `def get_html_content(url: str) -> Optional[str]:
    """Fetch HTML content from the given URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"Error fetching URL: {e}")
        return None

`;

        const mainFunction = `def scrape_website(url: str) -> Dict:
    """Scrape website using predefined selectors"""
    html_content = get_html_content(url)
    if not html_content:
        return {"error": "Failed to fetch HTML content"}
    
    soup = BeautifulSoup(html_content, 'html.parser')
    scraped_data = []
    
`;


        const extractionLogic = selections.map(selection => {
            const label = selection.label.replace(/[^a-zA-Z0-9_]/g, '_');
            const selector = selection.selector;

            let extractionCode = `    # Extract ${selection.label} elements\n`;
            extractionCode += `    ${label}_elements = soup.select('${selector}')\n`;
            extractionCode += `    for element in ${label}_elements:\n`;
            extractionCode += `        item = {"label": "${selection.label}", "selector": "${selector}"}\n`;

            // Add value extraction if selected
            if (selection.value) {
                extractionCode += `        # Extract text content\n`;
                extractionCode += `        text_content = element.get_text(strip=True)\n`;
                extractionCode += `        if text_content:\n`;
                extractionCode += `            item["value"] = text_content\n`;
            }

            // Add attributes extraction if selected
            if (selection.attributes && Object.keys(selection.attributes).length > 0) {
                extractionCode += `        # Extract attributes\n`;
                extractionCode += `        item["attributes"] = {}\n`;
                Object.entries(selection.attributes).forEach(([attrName, attrValue]) => {
                    extractionCode += `        ${attrName}_attr = element.get('${attrName}')\n`;
                    extractionCode += `        if ${attrName}_attr:\n`;
                    extractionCode += `            item["attributes"]["${attrName}"] = ${attrName}_attr\n`;
                });
            }

            // Add children extraction if selected
            if (selection.children && selection.children.length > 0) {
                extractionCode += `        # Extract children\n`;
                extractionCode += `        item["children"] = []\n`;
                selection.children.forEach(child => {
                    extractionCode += `        child_${child.tagName} = element.select_one('${child.tagName}')\n`;
                    extractionCode += `        if child_${child.tagName}:\n`;
                    extractionCode += `            item["children"].append({\n`;
                    extractionCode += `                "tagName": "${child.tagName}",\n`;
                    extractionCode += `                "text": child_${child.tagName}.get_text(strip=True)\n`;
                    extractionCode += `            })\n`;
                });
            }

            extractionCode += `        scraped_data.append(item)\n\n`;
            return extractionCode;
        }).join('');

        const footer = `    return {
        "url": url,
        "timestamp": "${new Date().toISOString()}",
        "selections": scraped_data
    }

`;

        const execution = `if __name__ == "__main__":
    # Target URL
    url = "${pageUrl}"
    
    print(f"Scraping: {url}")
    result = scrape_website(url)
    
    # Save results to JSON file
    if "error" not in result:
        output_file = "scraped_data.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Scraping completed! Data saved to {output_file}")
        print(f"Found {len(result['selections'])} items")
    else:
        print(f"Scraping failed: {result['error']}")
`;

        return imports + headers + mainFunction + extractionLogic + footer + execution;
    }

    function clearAll() {
        if (confirm('Are you sure you want to clear all selections?')) {
            browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                browser.tabs.sendMessage(tabs[0].id, {
                    action: 'clearSelections'
                });
                loadSelections();
                showStatus('All selections cleared', 'success');
            });
        }
    }

    function updateUI() {
        startButton.disabled = isSelecting;
        stopButton.disabled = !isSelecting;
        labelInput.disabled = isSelecting;
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }, 3000);
    }

    // Handle messages from content script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'saveData') {
            browser.storage.local.set({
                [`page_${sender.tab.id}`]: message.data
            });
        } else if (message.action === 'loadData') {
            return browser.storage.local.get(`page_${sender.tab.id}`).then(result => {
                return result[`page_${sender.tab.id}`] || null;
            });
        }
    });

    updateUI();
});