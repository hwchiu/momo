import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BirthDataForm } from '../../src/components/BirthDataForm';

describe('BirthDataForm', () => {
  it('should render all form fields', () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('年')).toBeInTheDocument();
    expect(screen.getByLabelText('月')).toBeInTheDocument();
    expect(screen.getByLabelText('日')).toBeInTheDocument();
    expect(screen.getByLabelText('時')).toBeInTheDocument();
    expect(screen.getByLabelText('分')).toBeInTheDocument();
    expect(screen.getByLabelText('出生地點')).toBeInTheDocument();
  });

  it('should render the submit button with correct text', () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: '繪製星盤' })).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    render(<BirthDataForm onSubmit={vi.fn()} isLoading={true} />);
    const button = screen.getByRole('button', { name: '計算中...' });
    expect(button).toBeDisabled();
  });

  it('should show error when submitting without location', () => {
    const onSubmit = vi.fn();
    render(<BirthDataForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: '繪製星盤' }));

    expect(screen.getByText('請先選擇出生地點')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should update year input value', () => {
    render(<BirthDataForm onSubmit={vi.fn()} />);
    const yearInput = screen.getByLabelText('年') as HTMLInputElement;

    fireEvent.change(yearInput, { target: { value: '1995' } });
    expect(yearInput.value).toBe('1995');
  });
});
