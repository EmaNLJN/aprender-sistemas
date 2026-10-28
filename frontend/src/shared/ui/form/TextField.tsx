import type { FunctionComponent, ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface TextFieldProps {
  readonly label: string;
  readonly registration: UseFormRegisterReturn;
  readonly messages: readonly string[];
  readonly autoComplete: string;
  readonly type?: 'text' | 'email' | 'password';
  readonly hint?: string;
  readonly adornment?: ReactNode;
}

const TextField: FunctionComponent<TextFieldProps> = () => null;

export default TextField;
