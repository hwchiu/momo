import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BirthDataForm } from '../../src/components/BirthDataForm';
import { DEFAULT_ORB_CONFIG } from '../../src/types/astro';

const defaultProps = {
  onSubmit: vi.fn(),
  orbConfig: DEFAULT_ORB_CONFIG,
  onOrbChange: vi.fn(),
};

describe('BirthDataForm', () => {
  it('should render all form fields', () => {
    render(<BirthDataForm {...defaultProps} />);

    expect(screen.getByDisplayValue('2026-03-04')).toBeInTheDocument(); // date input
    expect(screen.getByDisplayValue('04:26')).toBeInTheDocument(); // time input
    expect(screen.getByPlaceholderText('城市名稱')).toBeInTheDocument();
  });

  it('should render the submit button', () => {
    render(<BirthDataForm {...defaultProps} />);
    // Button text includes ✦ accent added in delight PR
    expect(screen.getByRole('button', { name: /製作星盤/ })).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    render(<BirthDataForm {...defaultProps} isLoading={true} />);
    const button = screen.getByRole('button', { name: /推算中/ });
    expect(button).toBeDisabled();
  });

  it('should update date input value', () => {
    render(<BirthDataForm {...defaultProps} />);
    const dateInput = screen.getByDisplayValue('2026-03-04') as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: '1990-06-15' } });
    expect(dateInput.value).toBe('1990-06-15');
  });

  it('should call onSubmit when form is submitted with valid data', () => {
    const onSubmit = vi.fn();
    render(<BirthDataForm {...defaultProps} onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole('button', { name: /製作星盤/ }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
