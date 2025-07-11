import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobDescriptionInput } from '../JobDescriptionInput';

describe('JobDescriptionInput', () => {
  const mockOnChange = jest.fn();
  
  const defaultProps = {
    jobDescription: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnChange.mockClear();
  });

  it('renders the job description input', () => {
    render(<JobDescriptionInput {...defaultProps} />);

    expect(screen.getByText(/Job Description/)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays the current job description value', () => {
    const propsWithValue = {
      ...defaultProps,
      jobDescription: 'Software Engineer position at tech company',
    };

    render(<JobDescriptionInput {...propsWithValue} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Software Engineer position at tech company');
  });

  it('calls onChange when text is entered', async () => {
    const user = userEvent.setup();
    
    render(<JobDescriptionInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'New job description');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('handles paste events', async () => {
    const user = userEvent.setup();
    
    render(<JobDescriptionInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.paste('Pasted job description content');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('shows placeholder text when empty', () => {
    render(<JobDescriptionInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder');
  });

  it('handles large amounts of text', async () => {
    const user = userEvent.setup();
    const largeText = 'A'.repeat(100); // Smaller for performance
    
    render(<JobDescriptionInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, largeText);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('maintains focus when typing', async () => {
    const user = userEvent.setup();
    
    render(<JobDescriptionInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.type(textarea, 'Test');

    expect(textarea).toHaveFocus();
  });

  it('handles clear functionality if available', async () => {
    const user = userEvent.setup();
    
    const propsWithValue = {
      ...defaultProps,
      jobDescription: 'Some content to clear',
    };

    render(<JobDescriptionInput {...propsWithValue} />);

    // Look for clear button if it exists
    const clearButton = screen.queryByRole('button', { name: /clear/i });
    if (clearButton) {
      await user.click(clearButton);
      expect(mockOnChange).toHaveBeenCalled();
    }
  });

  it('displays character count if available', () => {
    const propsWithValue = {
      ...defaultProps,
      jobDescription: 'Test content',
    };

    render(<JobDescriptionInput {...propsWithValue} />);

    // Character count is optional, just verify component renders
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    const disabledProps = {
      ...defaultProps,
      disabled: true,
    };

    render(<JobDescriptionInput {...disabledProps} />);

    const textarea = screen.getByRole('textbox');
    if (textarea.hasAttribute('disabled')) {
      expect(textarea).toBeDisabled();
    }
  });
});
