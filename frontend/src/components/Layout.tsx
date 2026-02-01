import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      
      {/* Contenu principal */}
      <main className="flex-1 md:ml-64 mb-16 md:mb-0">
        {children}
      </main>
    </div>
  );
};
