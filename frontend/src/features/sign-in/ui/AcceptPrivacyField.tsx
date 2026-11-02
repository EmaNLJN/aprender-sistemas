import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface AcceptPrivacyFieldProps {
  readonly registration: UseFormRegisterReturn;
  readonly messages: readonly string[];
  onRead(): void;
}

const AcceptPrivacyField = ({ registration, messages, onRead }: AcceptPrivacyFieldProps) => {
  const id = useId();
  const invalid = messages.length > 0;
  return (
    <div className="form-field">
      <div className="form-check">
        <input
          id={id}
          type="checkbox"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-errors` : undefined}
          {...registration}
        />
        <label htmlFor={id}>Leí y acepto el aviso de privacidad</label>
        <button type="button" className="text-button" onClick={onRead}>
          Leer el aviso
        </button>
      </div>
      {invalid ? (
        <ul id={`${id}-errors`} className="form-errors">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default AcceptPrivacyField;
