import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';

// Simple React component for testing
const SimpleButton: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ 
  children, 
  onClick 
}) => (
  <button onClick={onClick} data-testid="simple-button">
    {children}
  </button>
);

const SimpleCard: React.FC<{ title: string; content: string }> = ({ title, content }) => (
  <div data-testid="simple-card">
    <h2>{title}</h2>
    <p>{content}</p>
  </div>
);

describe('Simple React Components', () => {
  describe('SimpleButton', () => {
    it('should render button with children', () => {
      render(<SimpleButton>Click me</SimpleButton>);
      
      const button = screen.getByTestId('simple-button');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Click me');
    });

    it('should render button with different text', () => {
      render(<SimpleButton>Submit</SimpleButton>);
      
      const button = screen.getByTestId('simple-button');
      expect(button.textContent).toBe('Submit');
    });
  });

  describe('SimpleCard', () => {
    it('should render card with title and content', () => {
      render(<SimpleCard title="Test Title" content="Test content here" />);
      
      const card = screen.getByTestId('simple-card');
      expect(card).toBeTruthy();
      
      const title = screen.getByText('Test Title');
      const content = screen.getByText('Test content here');
      
      expect(title).toBeTruthy();
      expect(content).toBeTruthy();
    });

    it('should handle different props', () => {
      render(
        <SimpleCard 
          title="AI Provider Settings" 
          content="Configure your AI provider settings here" 
        />
      );
      
      expect(screen.getByText('AI Provider Settings')).toBeTruthy();
      expect(screen.getByText('Configure your AI provider settings here')).toBeTruthy();
    });
  });

  describe('Multiple components', () => {
    it('should render multiple components together', () => {
      render(
        <div>
          <SimpleCard title="Welcome" content="Welcome to the app" />
          <SimpleButton>Get Started</SimpleButton>
        </div>
      );
      
      expect(screen.getByText('Welcome')).toBeTruthy();
      expect(screen.getByText('Welcome to the app')).toBeTruthy();
      expect(screen.getByText('Get Started')).toBeTruthy();
    });
  });
});
