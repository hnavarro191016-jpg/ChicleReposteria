"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  Save,
  Shield,
  Loader2,
  Mail,
  Store,
  Copy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { settings, profile, loading: contextLoading, refreshSettings } = useSettings();
  
  const [activeTab, setActiveTab] = useState<"general" | "users" | "vitrina">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [tresLechesPrice, setTresLechesPrice] = useState("5.00");
  const [cookieFillingPrice, setCookieFillingPrice] = useState("5.00");
  
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
      if (settings.whatsapp_number) setWhatsappNumber(settings.whatsapp_number);
      if (settings.logo_url) setLogoUrl(settings.logo_url);
      if (settings.tres_leches_extra_price !== undefined) setTresLechesPrice(settings.tres_leches_extra_price.toString());
      if (settings.cookie_filling_extra_price !== undefined) setCookieFillingPrice(settings.cookie_filling_extra_price.toString());
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
    const dataToSave = {
      store_name: storeName,
      tres_leches_extra_price: parseFloat(tresLechesPrice) || 0,
      cookie_filling_extra_price: parseFloat(cookieFillingPrice) || 0,
    };
    if (settings?.id) {
      await supabase.from("business_settings").update(dataToSave).eq("id", settings.id);
    } else {
      await supabase.from("business_settings").insert(dataToSave);
    }
    await refreshSettings();
    setIsSaving(false);
  };

  const saveVitrinaSettings = async () => {
    setIsSaving(true);
    const dataToSave = {
      whatsapp_number: whatsappNumber,
      logo_url: logoUrl,
    };
    if (settings?.id) {
      await supabase.from("business_settings").update(dataToSave).eq("id", settings.id);
    }
    await refreshSettings();
    setIsSaving(false);
    alert("¡Configuración de Vitrina guardada!");
  };

  const changeUserRole = async (userId: string, newRole: string) => {
    if (userId === profile?.id) {
      alert("No puedes quitarte el rol de Admin a ti mismo.");
      return;
    }
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (userId === profile?.id) {
      alert("No puedes eliminarte a ti mismo.");
      return;
    }
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente a este usuario? Ya no podrá acceder al sistema.")) {
      await supabase.from("profiles").delete().eq("id", userId);
      fetchUsers();
    }
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
        <button 
          onClick={() => setActiveTab("vitrina")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all ${activeTab === "vitrina" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Store className="w-4 h-4" /> Mi Vitrina
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Costo Extra: Pan 3 Leches ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={tresLechesPrice}
                    onChange={(e) => setTresLechesPrice(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Se sumará al elegir un pastel de 3 Leches en una cotización.</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Costo Extra: Relleno de Galleta ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={cookieFillingPrice}
                    onChange={(e) => setCookieFillingPrice(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Se sumará al elegir una galleta rellena en una cotización.</p>
                </div>
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

        {activeTab === "vitrina" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border/50 p-6 md:p-8 shadow-sm max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Mi Vitrina Pública</h2>
                <p className="text-sm text-muted-foreground">Comparte tu catálogo en línea con tus clientes.</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-2xl border border-border space-y-4">
                <h3 className="font-bold text-foreground">Configuración de Vitrina</h3>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Teléfono de WhatsApp</label>
                  <input 
                    type="tel" 
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    placeholder="Ej. 8123456789"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Los pedidos de tu vitrina llegarán a este número.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">URL del Logotipo</label>
                  <input 
                    type="url" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    placeholder="Ej. https://mi-dominio.com/logo.png"
                  />
                  <p className="text-sm text-muted-foreground mt-2">Pega aquí el enlace directo a la imagen de tu logo.</p>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button 
                    onClick={saveVitrinaSettings} 
                    disabled={isSaving}
                    className="w-full rounded-xl h-12 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                    Guardar Configuración
                  </Button>
                </div>
              </div>

              <div className="bg-secondary/30 p-6 rounded-2xl border border-border">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-semibold text-foreground">Estado de la Vitrina</span>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Publicada
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Tu vitrina está activa y visible para tus clientes ✨</p>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3">
                    <span className="text-sm font-mono truncate text-muted-foreground">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/vitrina
                    </span>
                    <button 
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(window.location.origin + '/vitrina');
                          alert('¡Enlace copiado!');
                        }
                      }}
                      className="text-primary hover:text-primary/80 transition-colors"
                      title="Copiar enlace"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <a 
                    href="/vitrina" 
                    target="_blank"
                    className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-xl hover:bg-primary/20 transition-colors"
                    title="Ver como cliente"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100">
                <h3 className="font-bold text-pink-900 mb-2">Compartir en Redes</h3>
                <p className="text-sm text-pink-700 mb-4">Copia estos textos rápidos para mandarlos a tus clientes o ponerlos en tu biografía de Instagram.</p>
                
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-pink-200/50">
                    <p className="text-sm font-medium mb-2">Para WhatsApp:</p>
                    <p className="text-xs text-muted-foreground mb-2">"Aquí puedes ver todo lo que hago y pedirme desde tu celular 🧁<br/>{typeof window !== 'undefined' ? window.location.origin : ''}/vitrina"</p>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => navigator.clipboard.writeText(`Aquí puedes ver todo lo que hago y pedirme desde tu celular 🧁\n${window.location.origin}/vitrina`)}>Copiar texto</Button>
                  </div>
                </div>
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
                                <Button size="sm" variant="outline" onClick={() => deleteUser(user.id)} className="rounded-lg hover:bg-destructive/10 text-destructive border-destructive/20 h-8">
                                  Rechazar
                                </Button>
                              </>
                            )}
                            {user.role === 'staff' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => changeUserRole(user.id, 'admin')} className="rounded-lg border-primary/20 hover:bg-primary/10 text-primary h-8">
                                  Hacer Admin
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => deleteUser(user.id)} className="rounded-lg hover:bg-destructive/10 text-destructive border-destructive/20 h-8">
                                  Eliminar
                                </Button>
                              </>
                            )}
                            {user.role === 'admin' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => changeUserRole(user.id, 'staff')} className="rounded-lg hover:bg-orange-100 text-orange-700 h-8" disabled={user.id === profile?.id}>
                                  Degradar a Staff
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => deleteUser(user.id)} className="rounded-lg hover:bg-destructive/10 text-destructive border-destructive/20 h-8" disabled={user.id === profile?.id}>
                                  Eliminar
                                </Button>
                              </>
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
