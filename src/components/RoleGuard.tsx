"use client";

import { useSettings } from "@/context/SettingsContext";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useSettings();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Si el usuario acaba de registrarse y está pendiente
  if (profile?.role === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="bg-card max-w-md w-full rounded-[2rem] p-8 border border-border/50 text-center shadow-lg">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Cuenta en Revisión</h2>
          <p className="text-muted-foreground mb-8">
            Tu cuenta ha sido creada exitosamente, pero el administrador debe autorizar tu acceso y asignarte un perfil antes de que puedas usar el sistema.
          </p>
          <button 
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="flex items-center justify-center gap-2 w-full bg-secondary hover:bg-secondary/80 text-foreground py-3 rounded-xl font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Si está autorizado, mostramos el Dashboard normal
  return <>{children}</>;
}
