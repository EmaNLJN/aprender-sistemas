import { useEffect, type ReactNode } from 'react';

interface AccessPageProps {
  setShellInert(inert: boolean): void;
  readonly children: ReactNode;
}

const AccessPage = ({ setShellInert, children }: AccessPageProps) => {
  useEffect(() => {
    setShellInert(true);
    return () => setShellInert(false);
  }, [setShellInert]);
  return (
    <div className="access-page">
      <main className="access-main">{children}</main>
    </div>
  );
};

export default AccessPage;
