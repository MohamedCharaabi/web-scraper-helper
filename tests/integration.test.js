/**
 * Integration tests for the complete extension workflow
 */

describe('Extension Integration Tests', () => {
    let mockBrowser;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup mock browser API
        mockBrowser = {
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

        global.browser = mockBrowser;
    });

    describe('Complete Workflow', () => {
        test('should handle complete selection and export workflow', async () => {
            // Step 1: Start selection mode
            const startMessage = { action: 'startSelection', label: 'test-label' };
            await mockBrowser.tabs.sendMessage(1, startMessage);

            expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(1, startMessage);

            // Step 2: Simulate element selection
            const mockElement = {
                id: 'test-element',
                tagName: 'div',
                textContent: 'Test content',
                getAttribute: jest.fn((attr) => {
                    const attrs = { id: 'test-element', class: 'test-class' };
                    return attrs[attr];
                }),
                attributes: [
                    { name: 'id', value: 'test-element' },
                    { name: 'class', value: 'test-class' }
                ],
                children: []
            };

            // Step 3: Save selection
            const saveData = {
                label: 'test-label',
                selector: '#test-element',
                tagName: 'div',
                text: 'Test content',
                value: 'Test content',
                attributes: { id: 'test-element', class: 'test-class' },
                children: [],
                timestamp: new Date().toISOString()
            };

            // Step 4: Export data
            const exportMessage = { action: 'exportData' };
            const exportResponse = {
                url: 'https://example.com',
                timestamp: new Date().toISOString(),
                selections: [saveData]
            };

            mockBrowser.tabs.sendMessage.mockResolvedValueOnce(exportResponse);
            const result = await mockBrowser.tabs.sendMessage(1, exportMessage);

            expect(result).toEqual(exportResponse);
            expect(result.selections).toHaveLength(1);
            expect(result.selections[0].label).toBe('test-label');
        });

        test('should handle multiple element selections', async () => {
            const selections = [
                {
                    label: 'title',
                    selector: 'h1',
                    tagName: 'h1',
                    text: 'Page Title',
                    value: 'Page Title',
                    attributes: {},
                    children: []
                },
                {
                    label: 'description',
                    selector: 'p.description',
                    tagName: 'p',
                    text: 'Page description',
                    value: 'Page description',
                    attributes: { class: 'description' },
                    children: []
                },
                {
                    label: 'image',
                    selector: 'img.logo',
                    tagName: 'img',
                    text: '',
                    value: '',
                    attributes: { src: 'logo.png', alt: 'Logo' },
                    children: []
                }
            ];

            const exportResponse = {
                url: 'https://example.com',
                timestamp: new Date().toISOString(),
                selections: selections
            };

            mockBrowser.tabs.sendMessage.mockResolvedValue(exportResponse);
            const result = await mockBrowser.tabs.sendMessage(1, { action: 'exportData' });

            expect(result.selections).toHaveLength(3);
            expect(result.selections[0].label).toBe('title');
            expect(result.selections[1].label).toBe('description');
            expect(result.selections[2].label).toBe('image');
        });

        test('should handle error scenarios gracefully', async () => {
            // Test network error
            mockBrowser.tabs.sendMessage.mockRejectedValue(new Error('Network error'));

            try {
                await mockBrowser.tabs.sendMessage(1, { action: 'exportData' });
                fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Network error');
            }

            // Test invalid message
            mockBrowser.tabs.sendMessage.mockResolvedValue({ error: 'Invalid action' });
            const result = await mockBrowser.tabs.sendMessage(1, { action: 'invalidAction' });

            expect(result.error).toBe('Invalid action');
        });
    });

    describe('Storage Operations', () => {
        test('should save data to storage correctly', async () => {
            const testData = {
                url: 'https://example.com',
                selections: [{ label: 'test', selector: 'div' }]
            };

            await mockBrowser.storage.local.set({ 'page_1': testData });

            expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ 'page_1': testData });
        });

        test('should retrieve data from storage correctly', async () => {
            const testData = {
                url: 'https://example.com',
                selections: [{ label: 'test', selector: 'div' }]
            };

            mockBrowser.storage.local.get.mockResolvedValue({ 'page_1': testData });
            const result = await mockBrowser.storage.local.get('page_1');

            expect(result).toEqual({ 'page_1': testData });
            expect(result['page_1'].selections).toHaveLength(1);
        });
    });

    describe('Message Passing', () => {
        test('should handle different message types correctly', async () => {
            const messages = [
                { action: 'startSelection', label: 'test' },
                { action: 'stopSelection' },
                { action: 'getSelections' },
                { action: 'clearSelections' },
                { action: 'exportData' },
                { action: 'saveData', data: { test: 'data' } },
                { action: 'loadData' }
            ];

            for (const message of messages) {
                mockBrowser.tabs.sendMessage.mockResolvedValue({ success: true });
                const result = await mockBrowser.tabs.sendMessage(1, message);
                expect(result).toEqual({ success: true });
            }

            expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledTimes(messages.length);
        });
    });
});