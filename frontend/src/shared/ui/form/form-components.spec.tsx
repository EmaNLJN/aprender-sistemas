import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import PasswordField from './PasswordField';
import ServerError from './ServerError';
import TextField from './TextField';

interface HarnessProps {
  readonly messages: readonly string[];
  readonly hint?: string;
}

const Harness = ({ messages, hint }: HarnessProps) => {
  const { register } = useForm<{ email: string; password: string }>();
  return (
    <form>
      <TextField
        label="Email"
        type="email"
        autoComplete="username"
        registration={register('email')}
        messages={messages}
        hint={hint}
      />
      <PasswordField
        label="Contraseña"
        autoComplete="current-password"
        registration={register('password')}
        messages={[]}
      />
    </form>
  );
};

describe('TextField', () => {
  it('labels its input and leaves it valid without messages', () => {
    render(<Harness messages={[]} />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('autocomplete', 'username');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('marks the input and describes it with its hint and every message', () => {
    render(
      <Harness
        messages={['No puede contener tu nombre.', 'Es una contraseña muy usada: elegí otra.']}
        hint="Entre 15 y 64 caracteres."
      />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      /Entre 15 y 64 caracteres\..*No puede contener tu nombre\..*Es una contraseña muy usada: elegí otra\./,
    );
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'No puede contener tu nombre.',
      'Es una contraseña muy usada: elegí otra.',
    ]);
  });

  it('accepts a pasted value', async () => {
    const user = userEvent.setup();
    render(<Harness messages={[]} />);
    await user.click(screen.getByLabelText('Email'));
    await user.paste('ana@x.com');
    expect(screen.getByLabelText('Email')).toHaveValue('ana@x.com');
  });
});

describe('PasswordField', () => {
  it('hides the password and shows it on demand without sending the form', async () => {
    const user = userEvent.setup();
    render(<Harness messages={[]} />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(input).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(input).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Mostrar' })).toHaveAttribute('type', 'button');
  });
});

describe('ServerError', () => {
  it('leaves no alert in the document without messages', () => {
    render(<ServerError messages={[]} takeFocus />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces every message, keeps its action and takes the focus when asked', () => {
    render(
      <ServerError messages={['La sesión cambió de cuenta: recargá la página.']} takeFocus>
        <button type="button">Recargar</button>
      </ServerError>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('La sesión cambió de cuenta: recargá la página.');
    expect(alert).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
  });

  it('leaves the focus alone when a field has an error', () => {
    render(<ServerError messages={['Hay datos que corregir.']} takeFocus={false} />);
    expect(screen.getByRole('alert')).not.toHaveFocus();
  });
});
