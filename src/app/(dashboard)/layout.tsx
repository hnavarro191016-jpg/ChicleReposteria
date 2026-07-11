import { DashboardLayout } from "@/components/DashboardLayout";
import { SettingsProvider } from "@/context/SettingsContext";
import { RoleGuard } from "@/components/RoleGuard";

export default function DashboardRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <RoleGuard>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </RoleGuard>
    </SettingsProvider>
  );
}
