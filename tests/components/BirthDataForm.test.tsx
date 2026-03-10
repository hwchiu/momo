import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BirthDataForm } from '../../src/components/BirthDataForm';

describe('BirthDataForm', () => {
  it('should render all form fields', () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);

    expect(screen.getByDisplayValue('2026-03-04')).toBeInTheDocument(); // date input
    expect(screen.getByDisplayValue('04:26')).toBeInTheDocument(); // time input
    expect(screen.getByPlaceholderText('城市名稱')).toBeInTheDocument();
  });

  it('should render the submit button with correct text', () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /製作星盤/ })).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    render(<BirthDataForm onSubmit={vi.fn()} isLoading={true} />);
    const button = screen.getByRole('button', { name: /推算中/ });
    expect(button).toBeDisabled();
  });

  it('should update date input value', () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);
    const dateInput = screen.getByDisplayValue('2026-03-04') as HTMLInputElement;

    fireEvent.change(dateInput, { target: { value: '1990-06-15' } });
    expect(dateInput.value).toBe('1990-06-15');
  });

  it('should call onSubmit when form is submitted', () => {
    const onSubmit = vi.fn();
    render(<BirthDataForm onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole('button', { name: /製作星盤/ }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
