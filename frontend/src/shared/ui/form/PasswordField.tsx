import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import TextField from './TextField';

interface PasswordFieldProps {
  readonly label: string;
  readonly registration: UseFormRegisterReturn;
  readonly messages: readonly string[];
  readonly autoComplete: 'current-password' | 'new-password';
  readonly hint?: string;
}

const PasswordField = ({
  label,
  registration,
  messages,
  autoComplete,
  hint,
}: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      registration={registration}
      messages={messages}
      autoComplete={autoComplete}
      hint={hint}
      type={visible ? 'text' : 'password'}
      adornment={
        <button
          type="button"
          className="text-button form-reveal"
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      }
    />
  );
};

export default PasswordField;
