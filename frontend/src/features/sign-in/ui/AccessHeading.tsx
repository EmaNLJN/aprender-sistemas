import type { ReactNode } from 'react';

interface AccessHeadingProps {
  readonly level: 1 | 2;
  readonly children: ReactNode;
}

const AccessHeading = ({ level, children }: AccessHeadingProps) =>
  level === 1 ? (
    <h1 className="access-title">{children}</h1>
  ) : (
    <h2 className="access-title">{children}</h2>
  );

export default AccessHeading;
