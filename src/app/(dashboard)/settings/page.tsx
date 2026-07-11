"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  Save,
  Shield,
  Loader2,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { settings, profile, loading: contextLoading, refreshSettings } = useSettings();
  
  const [activeTab, setActiveTab] = useState<"general" | "users">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [storeName, setStoreName] = useState("");
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    // Redirect if not admin
    if (!contextLoading && profile?.role !== "admin") {
      router.push("/orders");
    }
  }, [profile, contextLoading, router]);

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name);
    }
  }, [settings]);

  useEffect(() => {
    if (activeTab === "users" && profile?.role === "admin") {
      fetchUsers();
    }
  }, [activeTab, profile]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
    if (data) setUsersList(data);
    setLoadingUsers(false);
  };

  const saveGeneralSettings = async () => {
    setIsSaving(true);
    if (settings?.id) {
      await supabase.from("business_settings").update({ store_name: storeName }).eq("id", settings.id);
    } else {
      await supabase.from("business_settings").insert({ store_name: storeName });
    }
    await refreshSettings();
    setIsSaving(false);
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    if (userId === profile?.id) {
      alert("No puedes quitarte el rol de Admin a ti mismo.");
      return;
    }
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    fetchUsers();
  };

  if (contextLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  if (profile?.role !== "admin") return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Configuración</h1>
          <p className="text-muted-foreground mt-1 text-lg">Administra los detalles de tu negocio y equipo de trabajo.</p>
        </div>
      </div>

      <div className="flex gap-2 bg-secondary/30 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${activeTab === "general" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Building2 className="w-4 h-4" /> Negocio
        </button>
        <button 
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${activeTab === "users" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="w-4 h-4" /> Cuentas y Accesos
        </button>
      </div>

      <div className="flex-1 pb-4">
        {activeTab === "general" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border/50 p-6 md:p-8 shadow-sm max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Detalles de la Pastelería</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Nombre del Negocio</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  placeholder="Ej. SweetERP"
                />
                <p className="text-sm text-muted-foreground mt-2">Este nombre aparecerá en el menú lateral y futuras facturas.</p>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button 
                  onClick={saveGeneralSettings}
                  disabled={isSaving}
                  className="rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 font-semibold"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "users" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Permisos de Usuarios
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Los roles "Staff" no pueden ver el Dashboard financiero ni Configuración.</p>
              </div>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/5 text-muted-foreground text-sm">
                    <th className="font-semibold p-4">ID (Cuenta)</th>
                    <th className="font-semibold p-4">Nombre / Detalles</th>
                    <th className="font-semibold p-4">Nivel de Acceso</th>
                    <th className="font-semibold p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {loadingUsers ? (
                    <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                  ) : usersList.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No hay perfiles sincronizados aún.</td></tr>
                  ) : (
                    usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary/5 transition-colors">
                        <td className="p-4">
                          <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-muted-foreground">{user.id.substring(0, 8)}...</span>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold">{user.full_name || "Usuario sin nombre"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Sincronizado el {new Date(user.created_at).toLocaleDateString()}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-primary/10 text-primary' : user.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {user.role === 'admin' ? 'Administrador' : user.role === 'staff' ? 'Staff' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {user.role === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => changeUserRole(user.id, 'staff')} className="rounded-lg border-primary/20 hover:bg-primary/10 text-primary h-8">
                                  Aprobar (Staff)
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => changeUserRole(user.id, 'admin')} className="rounded-lg border-primary/20 hover:bg-primary/10 text-primary h-8">
                                  Hacer Admin
                                </Button>
                              </>
                            )}
                            {user.role === 'staff' && (
                              <Button size="sm" variant="outline" onClick={() => changeUserRole(user.id, 'admin')} className="rounded-lg border-primary/20 hover:bg-primary/10 text-primary h-8">
                                Hacer Admin
                              </Button>
                            )}
                            {user.role === 'admin' && (
                              <Button size="sm" variant="outline" onClick={() => changeUserRole(user.id, 'staff')} className="rounded-lg hover:bg-orange-100 text-orange-700 h-8" disabled={user.id === profile?.id}>
                                Degradar a Staff
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
