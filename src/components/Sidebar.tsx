"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Cake, 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Package, 
  ShoppingCart, 
  Settings,
  LogOut,
  Box,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useSettings } from "@/context/SettingsContext";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, role: "admin" },
  { name: "Pedidos", href: "/orders", icon: ShoppingCart },
  { name: "Cotizador", href: "/quotes", icon: BookOpen },
  { name: "Clientes (CRM)", href: "/clients", icon: Users },
  { name: "Catálogo", href: "/catalog", icon: Package },
  { name: "Inventario", href: "/inventory", icon: Box },
  { name: "Configuración", href: "/settings", icon: Settings, role: "admin" },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const { settings, profile } = useSettings();
  const storeName = settings?.store_name || "SweetERP";
  const userRole = profile?.role || "admin";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      {/* Logo Area */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <Cake className="w-6 h-6 text-primary" />
          </div>
          <span className="font-bold text-xl text-foreground line-clamp-1 truncate" title={storeName}>{storeName}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-2 -mr-2 text-muted-foreground hover:bg-secondary rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.role && item.role !== userRole) return null;
          
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + '/'));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Area / Logout */}
      <div className="p-4 border-t border-border">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all font-medium text-sm text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
