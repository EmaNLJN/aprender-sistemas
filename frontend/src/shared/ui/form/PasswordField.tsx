import type { FunctionComponent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface PasswordFieldProps {
  readonly label: string;
  readonly registration: UseFormRegisterReturn;
  readonly messages: readonly string[];
  readonly autoComplete: 'current-password' | 'new-password';
  readonly hint?: string;
}

const PasswordField: FunctionComponent<PasswordFieldProps> = () => null;

export default PasswordField;
