import { useId, type ReactNode } from 'react';
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

const TextField = ({
  label,
  registration,
  messages,
  autoComplete,
  type = 'text',
  hint,
  adornment,
}: TextFieldProps) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorsId = `${id}-errors`;
  const invalid = messages.length > 0;
  const describedBy = [hint === undefined ? '' : hintId, invalid ? errorsId : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className="form-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="form-control">
        <input
          id={id}
          className="form-input"
          type={type}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy || undefined}
          {...registration}
        />
        {adornment}
      </div>
      {hint === undefined ? null : (
        <p id={hintId} className="form-hint">
          {hint}
        </p>
      )}
      {invalid ? (
        <ul id={errorsId} className="form-errors">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default TextField;
