import React, { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  Home, Menu, ListOrdered, Receipt, Users, Star, Ticket,
  Wallet, Store, Shield, ShieldBan, ShieldCheck, FileText,
  Settings, CreditCard, UsersRound, Globe, Upload, User,
  ChevronDown, ChevronRight, BookOpen, Percent, Megaphone, Palette
} from 'lucide-react';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  to?: string;
  children?: { label: string; to: string; icon: React.ElementType }[];
  isActive?: boolean;
}

const NavItem = ({ icon: Icon, label, to, children, isActive }: NavItemProps) => {
  const [isOpen, setIsOpen] = useState(isActive);
  const location = useLocation();

  if (children) {
    return (
      <div className="mb-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" />
            {label}
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        {isOpen && (
          <div className="mt-1 ml-4 pl-4 border-l border-slate-800 space-y-1">
            {children.map((child) => {
              const isChildActive = location.pathname === child.to;
              return (
                <Link
                  key={child.to}
                  to={child.to}
                  className={`flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isChildActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <child.icon className="w-4 h-4" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={to!}
      className={`flex items-center gap-3 px-4 py-2.5 mb-1 text-sm font-medium rounded-lg transition-colors ${
        isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );
};

export default function AdminLayout() {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-zinc-400">Loading...</div>;
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'support')) {
    return <Navigate to="/" replace />;
  }

  const isPathActive = (path: string) => location.pathname === path;
  const isPathPrefixActive = (prefix: string) => location.pathname.startsWith(prefix);
  const isSupport = profile.role === 'support';

  if (isSupport && location.pathname === '/admin') {
    return <Navigate to="/admin/orders/tickets" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f172a] border-r border-slate-800 flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white">
            <img src="/logo.png" alt="Rumble Hub" className="w-8 h-8 object-contain" />
            Rumble Hub
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            {!isSupport && (
              <>
                <NavItem icon={Home} label="Dashboard" to="/admin" isActive={location.pathname === '/admin'} />
                
                <NavItem 
                  icon={Menu} 
                  label="Products" 
                  isActive={isPathPrefixActive('/admin/products')}
                  children={[
                    { label: 'All Products', to: '/admin/products', icon: Menu },
                    { label: 'Keys/Inventory', to: '/admin/products/keys', icon: FileText },
                    { label: 'Instructions', to: '/admin/products/instructions', icon: BookOpen },
                  ]}
                />
              </>
            )}
            
            <NavItem 
              icon={ListOrdered} 
              label="Orders" 
              isActive={isPathPrefixActive('/admin/orders')}
              children={[
                ...(!isSupport ? [
                  { label: 'Invoices', to: '/admin/orders/invoices', icon: Receipt },
                  { label: 'Customers', to: '/admin/orders/customers', icon: Users },
                  { label: 'Promo Codes', to: '/admin/orders/promocodes', icon: Star },
                  { label: 'Feedbacks', to: '/admin/orders/feedbacks', icon: Star },
                ] : []),
                { label: 'Tickets', to: '/admin/orders/tickets', icon: Ticket },
              ]}
            />
          </div>

          {!isSupport && (
            <div>
              <NavItem 
                icon={Settings} 
                label="Settings" 
                isActive={isPathPrefixActive('/admin/settings')}
                children={[
                  { label: 'Discord', to: '/admin/settings/discord', icon: Settings },
                  { label: 'Payment Methods', to: '/admin/settings/payments', icon: CreditCard },
                  { label: 'Team', to: '/admin/settings/team', icon: UsersRound },
                  { label: 'Discounts', to: '/admin/settings/discounts', icon: Percent },
                  { label: 'Announcements', to: '/admin/settings/announcements', icon: Megaphone },
                  { label: 'Themes', to: '/admin/settings/themes', icon: Palette },
                ]}
              />
              <NavItem icon={User} label="Account" to="/profile" isActive={false} />
            </div>
          )}
          {isSupport && (
            <div>
              <NavItem icon={User} label="Account" to="/profile" isActive={false} />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-[#0f172a]/50 backdrop-blur-sm flex items-center px-8 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-white capitalize">
            {location.pathname.split('/').pop() || 'Dashboard'}
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
