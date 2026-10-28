import type { FunctionComponent, ReactNode } from 'react';

interface ServerErrorProps {
  readonly messages: readonly string[];
  readonly takeFocus: boolean;
  readonly children?: ReactNode;
}

const ServerError: FunctionComponent<ServerErrorProps> = () => null;

export default ServerError;
