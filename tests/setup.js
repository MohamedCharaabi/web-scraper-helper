// import 'jest-webextension-mock';

global.document.createRange = () => ({
    setStart: () => { },
    setEnd: () => { },
    commonAncestorContainer: {
        nodeName: 'BODY',
        ownerDocument: document,
    },
});

// Mock window.getSelection
global.window.getSelection = () => ({
    removeAllRanges: () => { },
    addRange: () => { },
});

// Mock console methods for cleaner test output
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
};