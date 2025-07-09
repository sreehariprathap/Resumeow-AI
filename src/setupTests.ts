import '@testing-library/jest-dom';

// Mock Firebase
jest.mock('./lib/firebaseWeb', () => ({
  saveUserData: jest.fn(),
  getUserData: jest.fn(),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mocked-object-url'),
});

// Mock FileReader
Object.defineProperty(window, 'FileReader', {
  value: jest.fn(() => ({
    readAsText: jest.fn(),
    onload: jest.fn(),
    result: '',
  })),
});

// Mock document.createElement for download links
const originalCreateElement = document.createElement;
(document.createElement as jest.MockedFunction<typeof document.createElement>) = jest.fn((tagName) => {
  if (tagName === 'a') {
    return {
      setAttribute: jest.fn(),
      click: jest.fn(),
      href: '',
      download: '',
    } as unknown as HTMLElement;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: jest.fn(() => true),
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Global test utilities
interface GlobalWithTestUtils extends NodeJS.Global {
  createMockTemplate: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  createMockCustomPrompt: (overrides?: Record<string, unknown>) => Record<string, unknown>;
  createMockUser: (overrides?: Record<string, unknown>) => Record<string, unknown>;
}

(global as GlobalWithTestUtils).createMockTemplate = (overrides = {}) => ({
  id: 'test-template-1',
  name: 'Test Template',
  resumeLatex: '\\documentclass{article}\\begin{document}Test\\end{document}',
  ...overrides,
});

(global as GlobalWithTestUtils).createMockCustomPrompt = (overrides = {}) => ({
  id: 'test-prompt-1',
  type: 'resume',
  name: 'Test Prompt',
  content: 'Test prompt content with {JOB_DESCRIPTION} and {RESUME}',
  placeholders: {
    jobDescriptionPosition: '{JOB_DESCRIPTION}',
    resumePosition: '{RESUME}',
    optionalInstructionsPosition: '{OPTIONAL_INSTRUCTIONS}',
  },
  ...overrides,
});

// End of setup file
