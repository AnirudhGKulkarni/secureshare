import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { Navbar } from './Navbar';
import { DashboardFooter } from './DashboardFooter';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="flex min-h-screen w-full bg-background">
      {isSuperAdmin ? <SuperAdminSidebar /> : <Sidebar />}
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
        <DashboardFooter />
      </div>
    </div>
  );
};
