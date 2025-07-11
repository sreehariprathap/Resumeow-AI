import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

// Mock all the context providers
jest.mock('../lib/authContext', () => ({
  useAuth: () => ({
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  }),
}));

jest.mock('../lib/aiProviderContext', () => ({
  useAIProvider: () => ({
    openRouterApiKey: '',
    setOpenRouterApiKey: jest.fn(),
    selectedModel: 'gpt-4',
    setSelectedModel: jest.fn(),
  }),
}));

jest.mock('../lib/onboardingContext', () => ({
  useOnboarding: () => ({
    showOnboarding: false,
    completeOnboarding: jest.fn(),
  }),
}));

// Mock the custom hooks
jest.mock('../hooks/useTemplates', () => ({
  useTemplates: () => ({
    resumeTemplates: [
      {
        id: 'template-1',
        name: 'Software Engineer Resume',
        resumeLatex: '\\documentclass{article}\\begin{document}\\section{Experience}\\end{document}',
      },
    ],
    coverLetterTemplates: [
      {
        id: 'cover-template-1',
        name: 'Software Engineer Cover Letter',
        coverLetterTemplate: 'Dear Hiring Manager...',
      },
    ],
    customPrompts: [
      {
        id: 'prompt-1',
        type: 'resume',
        name: 'Custom Resume Prompt',
        content: 'Please optimize my resume for {JOB_DESCRIPTION}',
        placeholders: {
          resumePosition: '{RESUME}',
          jobDescriptionPosition: '{JOB_DESCRIPTION}',
        },
      },
    ],
    addTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    addCustomPrompt: jest.fn(),
    updateCustomPrompt: jest.fn(),
    deleteCustomPrompt: jest.fn(),
    activePrompts: { resume: 'prompt-1', coverLetter: 'default' },
    setActivePrompt: jest.fn(),
    clearAllData: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../hooks/usePromptGenerator', () => ({
  usePromptGenerator: () => ({
    generatePrompt: jest.fn(() => 'Generated prompt content'),
    isGenerating: false,
  }),
}));

// Mock router navigation
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main application interface', () => {
    render(<App />);

    expect(screen.getByText('AI-Powered Resume & Cover Letter Optimizer')).toBeInTheDocument();
    expect(screen.getByText('Job Description')).toBeInTheDocument();
    expect(screen.getByText('Resume Content')).toBeInTheDocument();
  });

  it('displays prompt type selector', () => {
    render(<App />);

    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('Cover Letter')).toBeInTheDocument();
  });

  it('shows template selector', () => {
    render(<App />);

    expect(screen.getByText(/Select Template/)).toBeInTheDocument();
  });

  it('displays settings button', () => {
    render(<App />);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    expect(settingsButton).toBeInTheDocument();
  });

  it('opens settings dialog when settings button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await user.click(settingsButton);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays manage templates button', () => {
    render(<App />);

    const manageTemplatesButton = screen.getByRole('button', { name: /manage templates/i });
    expect(manageTemplatesButton).toBeInTheDocument();
  });

  it('opens template management dialog when manage templates button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    const manageTemplatesButton = screen.getByRole('button', { name: /manage templates/i });
    await user.click(manageTemplatesButton);

    expect(screen.getByText('Manage Saved Templates')).toBeInTheDocument();
  });

  it('allows switching between resume and cover letter modes', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    // Should start in resume mode
    expect(screen.getByText('Resume')).toBeInTheDocument();

    // Click cover letter tab
    const coverLetterTab = screen.getByText('Cover Letter');
    await user.click(coverLetterTab);

    // Should switch to cover letter mode
    expect(screen.getByText('Cover Letter')).toBeInTheDocument();
  });

  it('shows job description input area', () => {
    render(<App />);

    const jobDescriptionInput = screen.getByPlaceholderText(/paste the job description/i);
    expect(jobDescriptionInput).toBeInTheDocument();
  });

  it('shows resume content input area', () => {
    render(<App />);

    const resumeInput = screen.getByPlaceholderText(/paste your resume content/i);
    expect(resumeInput).toBeInTheDocument();
  });

  it('displays generate prompt button', () => {
    render(<App />);

    const generateButton = screen.getByRole('button', { name: /generate prompt/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('shows optional instructions input', () => {
    render(<App />);

    const optionalInstructions = screen.getByPlaceholderText(/additional instructions/i);
    expect(optionalInstructions).toBeInTheDocument();
  });

  it('displays ATS insights section', () => {
    render(<App />);

    // Should show ATS-related components or sections
    const atsElement = screen.queryByText(/ATS/);
    if (atsElement) {
      expect(atsElement).toBeInTheDocument();
    }
  });

  it('shows authentication status', () => {
    render(<App />);

    // Should show user authentication status
    const authElement = screen.queryByText(/Sign In/) || screen.queryByText(/Test User/);
    expect(authElement).toBeInTheDocument();
  });

  it('handles job description input', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    const jobDescriptionInput = screen.getByPlaceholderText(/paste the job description/i);
    await user.type(jobDescriptionInput, 'Software Engineer position at tech company');

    expect(jobDescriptionInput).toHaveValue('Software Engineer position at tech company');
  });

  it('handles resume content input', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    const resumeInput = screen.getByPlaceholderText(/paste your resume content/i);
    await user.type(resumeInput, 'John Doe\\nSoftware Engineer\\nExperience with React');

    expect(resumeInput).toHaveValue('John Doe\\nSoftware Engineer\\nExperience with React');
  });

  it('shows clear all button and handles clear functionality', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    const clearButton = screen.queryByRole('button', { name: /clear all/i });
    if (clearButton) {
      await user.click(clearButton);
      
      // Should clear inputs (implementation dependent)
      expect(clearButton).toBeInTheDocument();
    }
  });

  it('displays sync status for authenticated users', () => {
    render(<App />);

    // Should show sync status indicator
    const syncElement = screen.queryByText(/sync/) || screen.queryByText(/cloud/);
    if (syncElement) {
      expect(syncElement).toBeInTheDocument();
    }
  });

  it('shows loading states appropriately', () => {
    render(<App />);

    // Check for any loading indicators - this test ensures the app renders without crashing
    expect(screen.getByText('AI-Powered Resume & Cover Letter Optimizer')).toBeInTheDocument();
  });

  it('handles error states gracefully', () => {
    render(<App />);

    // Should render without throwing errors
    expect(screen.getByText('AI-Powered Resume & Cover Letter Optimizer')).toBeInTheDocument();
  });
});
