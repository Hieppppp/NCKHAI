import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="layout-container">
      <Sidebar />
      
      <div className="content-wrapper">
        <Header />
        <main className="page-content">
          {children}
        </main>
      </div>

      <style>{`
        .layout-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--surface);
        }

        .content-wrapper {
          flex: 1;
          margin-left: 280px; /* Width of Sidebar */
          padding: 1rem 2.5rem 2.5rem 2.5rem;
        }

        .page-content {
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
