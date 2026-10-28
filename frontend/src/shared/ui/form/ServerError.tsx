import { useEffect, useRef, type ReactNode } from 'react';

interface ServerErrorProps {
  readonly messages: readonly string[];
  readonly takeFocus: boolean;
  readonly children?: ReactNode;
}

const ServerError = ({ messages, takeFocus, children }: ServerErrorProps) => {
  const region = useRef<HTMLDivElement>(null);
  const text = messages.join('\n');
  useEffect(() => {
    if (takeFocus && text !== '') region.current?.focus();
  }, [takeFocus, text]);
  if (messages.length === 0) return null;
  return (
    <div ref={region} className="form-server-error" role="alert" tabIndex={-1}>
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
      {children}
    </div>
  );
};

export default ServerError;
