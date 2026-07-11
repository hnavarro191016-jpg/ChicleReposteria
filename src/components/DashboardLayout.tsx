"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar when route changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center px-4 z-40 shadow-sm">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg ml-3 text-foreground">ERP Chicle</span>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 shadow-2xl md:shadow-none ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto pt-16 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
          {children}
        </div>
      </main>
    </div>
  );
}
