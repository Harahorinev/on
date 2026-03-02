import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('рендерится без падения и показывает главную', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Расписание' })).toBeInTheDocument();
  });
});
