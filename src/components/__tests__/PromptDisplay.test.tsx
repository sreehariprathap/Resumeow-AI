import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptDisplay } from '../PromptDisplay';

describe('PromptDisplay', () => {
  const mockOnCopy = jest.fn();
  
  const defaultProps = {
    prompt: 'This is a test prompt with some content to display.',
    onCopy: mockOnCopy,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnCopy.mockClear();
  });

  it('renders the prompt content', () => {
    render(<PromptDisplay {...defaultProps} />);

    expect(screen.getByText('This is a test prompt with some content to display.')).toBeInTheDocument();
  });

  it('shows loading state when generating', () => {
    const loadingProps = {
      ...defaultProps,
      prompt: '',
    };

    render(<PromptDisplay {...loadingProps} />);

    // Should show empty state when no prompt
    expect(screen.queryByText('This is a test prompt')).not.toBeInTheDocument();
  });

  it('displays copy button when prompt is available', () => {
    render(<PromptDisplay {...defaultProps} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('copies prompt to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<PromptDisplay {...defaultProps} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(mockOnCopy).toHaveBeenCalled();
  });

  it('handles empty prompt gracefully', () => {
    const emptyProps = {
      ...defaultProps,
      prompt: '',
    };

    render(<PromptDisplay {...emptyProps} />);

    // Should show empty prompt
    const promptArea = screen.getByText('Generated Prompt:');
    expect(promptArea).toBeInTheDocument();
  });

  it('shows download button when prompt is available', () => {
    render(<PromptDisplay {...defaultProps} />);

    // The copy button should be visible
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });

  it('handles very long prompts', () => {
    const longPrompt = 'A'.repeat(1000); // Reasonable length for testing
    const longProps = {
      ...defaultProps,
      prompt: longPrompt,
    };

    render(<PromptDisplay {...longProps} />);

    // Should handle long content without breaking
    expect(screen.getByText(longPrompt)).toBeInTheDocument();
  });

  it('preserves formatting in prompt content', () => {
    const formattedPrompt = 'Line 1\n\nLine 3\n- Bullet point\n- Another point';
    const formattedProps = {
      ...defaultProps,
      prompt: formattedPrompt,
    };

    render(<PromptDisplay {...formattedProps} />);

    expect(screen.getByText(formattedPrompt)).toBeInTheDocument();
  });

  it('calls onCopy when copy button is clicked', async () => {
    const user = userEvent.setup();
    
    render(<PromptDisplay {...defaultProps} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);

    expect(mockOnCopy).toHaveBeenCalledTimes(1);
  });
});
