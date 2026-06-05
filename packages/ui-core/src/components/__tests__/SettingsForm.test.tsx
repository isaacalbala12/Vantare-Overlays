import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SettingsForm } from '../SettingsForm';

const SampleSchema = z.object({
  rowCount: z.number().int().min(5).max(40).default(20),
  showGaps: z.boolean().default(true),
  columns: z.enum(['position', 'name', 'car', 'class']).default('position'),
  opacity: z.number().min(0).max(1).default(1),
});

type SampleValues = z.infer<typeof SampleSchema>;

describe('SettingsForm', () => {
  it('renders number input for z.number field', () => {
    render(
      <SettingsForm schema={SampleSchema} values={{}} onChange={() => {}} />
    );

    const rowCountInput = screen.getByTestId('settings-field-rowCount');
    expect(rowCountInput).toBeDefined();
    expect((rowCountInput as HTMLInputElement).type).toBe('number');
  });

  it('renders checkbox for z.boolean field', () => {
    render(
      <SettingsForm schema={SampleSchema} values={{}} onChange={() => {}} />
    );

    const checkbox = screen.getByTestId('settings-field-showGaps');
    expect(checkbox).toBeDefined();
    expect((checkbox as HTMLInputElement).type).toBe('checkbox');
  });

  it('renders select for z.enum field', () => {
    render(
      <SettingsForm schema={SampleSchema} values={{}} onChange={() => {}} />
    );

    const select = screen.getByTestId('settings-field-columns');
    expect(select).toBeDefined();
    expect((select as HTMLSelectElement).type).toBe('select-one');
    expect((select as HTMLSelectElement).options.length).toBe(4);
  });

  it('fires onChange when a value changes', () => {
    const handleChange = () => {};
    render(
      <SettingsForm schema={SampleSchema} values={{}} onChange={handleChange} />
    );

    const rowCountInput = screen.getByTestId('settings-field-rowCount') as HTMLInputElement;
    fireEvent.change(rowCountInput, { target: { value: '10' } });
    expect(rowCountInput.value).toBe('10');
  });

  it('shows validation error for out-of-range values', () => {
    render(
      <SettingsForm schema={SampleSchema} values={{}} onChange={() => {}} />
    );

    const rowCountInput = screen.getByTestId('settings-field-rowCount') as HTMLInputElement;
    fireEvent.change(rowCountInput, { target: { value: '3' } });

    const error = screen.getByTestId('settings-error-rowCount');
    expect(error).toBeDefined();
    expect(error.textContent).not.toBe('');
  });

  it('save button calls onChange with current values', () => {
    const handleChange = () => {};
    render(
      <SettingsForm schema={SampleSchema} values={{}} onChange={handleChange} />
    );

    const saveButton = screen.getByTestId('settings-save');
    expect(saveButton).toBeDefined();
    fireEvent.click(saveButton);
  });
});
