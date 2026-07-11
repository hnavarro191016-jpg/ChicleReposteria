import { Sidebar } from "@/components/Sidebar";
import { SettingsProvider } from "@/context/SettingsContext";
import { RoleGuard } from "@/components/RoleGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <RoleGuard>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </RoleGuard>
    </SettingsProvider>
  );
}
