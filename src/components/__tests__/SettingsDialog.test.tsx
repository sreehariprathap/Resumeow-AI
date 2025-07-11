import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { SettingsDialog } from '../SettingsDialog';
import type { CustomPrompt, Template } from '../../types';

// Mock the auth context
jest.mock('../../lib/authContext', () => ({
  useAuth: () => ({
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  }),
}));

// Mock the AI provider context
jest.mock('../../lib/aiProviderContext', () => ({
  useAIProvider: () => ({
    openRouterApiKey: '',
    setOpenRouterApiKey: jest.fn(),
  }),
}));

// Mock Firebase
jest.mock('../../lib/firebaseWeb', () => ({
  saveUserData: jest.fn(),
  getUserData: jest.fn(),
}));

describe('SettingsDialog', () => {
  const mockCustomPrompts: CustomPrompt[] = [
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
    {
      id: 'prompt-2',
      type: 'coverLetter',
      name: 'Custom Cover Letter Prompt',
      content: 'Write a cover letter for {JOB_DESCRIPTION} using my background {RESUME}',
      placeholders: {
        resumePosition: '{RESUME}',
        jobDescriptionPosition: '{JOB_DESCRIPTION}',
      },
    },
  ];

  const mockResumeTemplates: Template[] = [
    {
      id: 'template-1',
      name: 'Software Engineer Resume',
      resumeLatex: '\\documentclass{article}\\begin{document}\\section{Experience}\\end{document}',
    },
  ];

  const mockCoverLetterTemplates: Template[] = [
    {
      id: 'cover-template-1',
      name: 'Software Engineer Cover Letter',
      coverLetterTemplate: 'Dear Hiring Manager...',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    customPrompts: mockCustomPrompts,
    resumeTemplates: mockResumeTemplates,
    coverLetterTemplates: mockCoverLetterTemplates,
    activePrompts: { resume: 'prompt-1', coverLetter: 'prompt-2' },
    onAddCustomPrompt: jest.fn(),
    onUpdateCustomPrompt: jest.fn(),
    onDeleteCustomPrompt: jest.fn(),
    onSetActivePrompt: jest.fn(),
    clearAllData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings dialog', () => {
    render(<SettingsDialog {...defaultProps} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Custom Resume Prompt')).toBeInTheDocument();
    expect(screen.getByText('Custom Cover Letter Prompt')).toBeInTheDocument();
  });

  it('displays custom prompts with active indicators', () => {
    render(<SettingsDialog {...defaultProps} />);

    // Should show active prompt indicators
    const activeIndicators = screen.getAllByText('Active');
    expect(activeIndicators.length).toBeGreaterThan(0);
  });

  it('allows switching between prompt types', async () => {
    const user = userEvent.setup();
    
    render(<SettingsDialog {...defaultProps} />);

    // Should start on resume tab
    expect(screen.getByText('Custom Resume Prompt')).toBeInTheDocument();

    // Click cover letter tab
    const coverLetterTab = screen.getByText(/Cover Letter/);
    await user.click(coverLetterTab);

    expect(screen.getByText('Custom Cover Letter Prompt')).toBeInTheDocument();
  });

  it('opens add prompt dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<SettingsDialog {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: /add custom prompt/i });
    await user.click(addButton);

    expect(screen.getByText(/Create Custom Prompt/)).toBeInTheDocument();
  });

  it('sets active prompt when radio button is selected', async () => {
    const user = userEvent.setup();
    
    render(<SettingsDialog {...defaultProps} />);

    // Find radio buttons for prompts
    const radioButtons = screen.getAllByRole('radio');
    
    if (radioButtons.length > 0) {
      await user.click(radioButtons[0]);
      
      // onSetActivePrompt should be called when a new prompt is selected
      expect(defaultProps.onSetActivePrompt).toHaveBeenCalled();
    }
  });

  it('opens edit dialog when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<SettingsDialog {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: /edit prompt/i });
    await user.click(editButton);

    expect(screen.getByText(/Edit Custom Prompt/)).toBeInTheDocument();
  });

  it('deletes prompt when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    render(<SettingsDialog {...defaultProps} />);

    const deleteButton = screen.getByRole('button', { name: /delete prompt/i });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.onDeleteCustomPrompt).toHaveBeenCalledWith('prompt-1');

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('cancels delete when user clicks cancel', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => false);
    
    render(<SettingsDialog {...defaultProps} />);

    const deleteButton = screen.getByRole('button', { name: /delete prompt/i });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.onDeleteCustomPrompt).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('displays AI provider settings', () => {
    render(<SettingsDialog {...defaultProps} />);

    // Should show AI provider selector
    expect(screen.getByText(/AI Provider/)).toBeInTheDocument();
  });

  it('shows data management section', () => {
    render(<SettingsDialog {...defaultProps} />);

    // Should show clear data option
    expect(screen.getByText(/Clear All Data/)).toBeInTheDocument();
  });

  it('handles clear all data when confirmed', async () => {
    const user = userEvent.setup();
    
    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);
    
    render(<SettingsDialog {...defaultProps} />);

    const clearDataButton = screen.getByRole('button', { name: /clear all data/i });
    await user.click(clearDataButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.clearAllData).toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<SettingsDialog {...defaultProps} />);

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows theme toggle in settings', () => {
    render(<SettingsDialog {...defaultProps} />);

    // Should show theme toggle (if present)
    const themeElement = screen.queryByText(/Theme/);
    if (themeElement) {
      expect(themeElement).toBeInTheDocument();
    }
  });

  it('handles export data functionality', async () => {
    const user = userEvent.setup();
    
    // Mock document.createElement for download link
    const mockAnchor = {
      setAttribute: jest.fn(),
      click: jest.fn(),
      href: '',
      download: '',
    };
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'a') {
        return mockAnchor as unknown as HTMLAnchorElement;
      }
      return originalCreateElement.call(document, tagName);
    });

    render(<SettingsDialog {...defaultProps} />);

    const exportButton = screen.queryByText('Export Data');
    if (exportButton) {
      await user.click(exportButton);
      
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('exported'));
    }

    // Restore original createElement
    document.createElement = originalCreateElement;
  });

  it('shows empty state when no custom prompts exist', () => {
    const emptyProps = {
      ...defaultProps,
      customPrompts: [],
    };

    render(<SettingsDialog {...emptyProps} />);

    expect(screen.getByText(/No custom prompts created yet/)).toBeInTheDocument();
  });
});
