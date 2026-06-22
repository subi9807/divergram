import type { ReactNode } from 'react';
import Layout from './Layout';

interface AppShellProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
  createModal?: ReactNode;
  searchModal?: ReactNode;
  editProfileModal?: ReactNode;
}

export default function AppShell({
  currentPage,
  onNavigate,
  children,
  createModal,
  searchModal,
  editProfileModal,
}: AppShellProps) {
  return (
    <>
      <Layout currentPage={currentPage} onNavigate={onNavigate}>
        {children}
      </Layout>
      {createModal}
      {searchModal}
      {editProfileModal}
    </>
  );
}
