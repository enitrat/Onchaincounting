import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dashboard } from './Dashboard';
import { Reports } from './Reports';
import { MonthlyInvoices } from './MonthlyInvoices';

type View = 'dashboard' | 'invoices' | 'withdrawals' | 'reports';

const navigationItems: { id: View; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'withdrawals', label: 'Withdrawals' },
    { id: 'reports', label: 'Reports' },
];

export function Layout() {
  const [currentView, setCurrentView] = useState('overview');

  const renderContent = () => {
    switch (currentView) {
        case 'dashboard':
            return <Dashboard />;
        case 'invoices':
            return <MonthlyInvoices />;
        case 'withdrawals':
            // TODO: Implement MonthlyWithdrawals component
            return <div>Withdrawals (Coming Soon)</div>;
        case 'reports':
            return <Reports />;
        default:
            return <Dashboard />;
    }
};

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 w-full border-b bg-background z-50">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex h-14 items-center justify-between">
            <span className="font-bold">CryptAccounting</span>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? 'secondary' : 'outline'}
                  onClick={() => setCurrentView(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-14 w-full bg-background border-b z-40">
        <div className="container mx-auto max-w-5xl px-4">
          <nav className="grid grid-cols-2 gap-2 p-4">
              {navigationItems.map((item) => (
                  <Button
                      key={item.id}
                      variant={currentView === item.id ? "secondary" : "outline"}
                      className={cn(
                          "justify-start",
                          currentView === item.id && "bg-muted font-medium"
                      )}
                      onClick={() => setCurrentView(item.id)}
                  >
                      {item.label}
                  </Button>
              ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full mt-14 md:mt-14">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          {renderContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto max-w-5xl px-4 py-6 md:flex md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              Built with shadcn/ui. The source code is available on{" "}
              <a
                href="https://github.com/yourusername/cryptaccounting"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-4"
              >
                GitHub
              </a>
              .
            </p>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground md:mt-0 md:text-right">
            © {new Date().getFullYear()} CryptAccounting. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}