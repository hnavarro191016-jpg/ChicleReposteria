"use client";

import { useState, useEffect } from "react";
import { Plus, Search, UserCircle, Phone, Calendar, X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    birthdate: "",
  });

  const supabase = createClient();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setClients(data);
    setLoading(false);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Al ser Single-Tenant, simplemente insertamos al cliente sin tenant_id
    const { error } = await supabase
      .from("clients")
      .insert({
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        birthdate: formData.birthdate || null,
      });

    setIsSubmitting(false);

    if (error) {
      alert("Error guardando cliente: " + error.message);
    } else {
      setIsModalOpen(false);
      setFormData({ name: "", phone: "", whatsapp: "", birthdate: "" });
      fetchClients();
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro que deseas eliminar al cliente "${name}"?`)) return;

    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      // 23503 is the PostgreSQL code for foreign key violation
      if (error.code === '23503') {
        alert(`No puedes eliminar a ${name} porque tiene pedidos o cotizaciones ligadas a su nombre. Por seguridad financiera, esto está bloqueado. (Tip: Puedes editar su nombre a "INACTIVO - ${name}").`);
      } else {
        alert("Error al eliminar cliente: " + error.message);
      }
    } else {
      fetchClients();
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Clientes (CRM)</h1>
          <p className="text-muted-foreground mt-1 text-lg">Gestiona la información y preferencias de tus clientes.</p>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Nuevo Cliente</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
        <div className="bg-secondary/50 p-2 rounded-xl">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <input 
          type="text" 
          placeholder="Buscar por nombre, teléfono o notas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-3xl border border-dashed border-border">
          <p className="text-muted-foreground">No tienes clientes registrados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group relative">
              
              <button 
                onClick={() => handleDeleteClient(client.id, client.name)}
                className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar Cliente"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="text-right mr-10">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compras</span>
                  <p className="text-lg font-bold text-foreground">${(client.total_spent || 0).toFixed(2)}</p>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-1">{client.name}</h3>
              
              <div className="space-y-2 mt-4">
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Phone className="w-4 h-4 text-primary/70" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.birthdate && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="w-4 h-4 text-primary/70" />
                    <span>Cumpleaños: {new Date(client.birthdate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-border/50 flex gap-2">
                <Link href={`/clients/${client.id}`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl border-border hover:bg-secondary">
                    Ver Detalles
                  </Button>
                </Link>
                {client.whatsapp && (
                  <a 
                    href={`https://wa.me/${client.whatsapp.replace(/\D/g,'')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full h-full rounded-xl border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400">
                      WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Agregar Cliente</h2>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Nombre del Cliente</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Teléfono</label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">WhatsApp</label>
                  <input 
                    type="tel" 
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Cumpleaños</label>
                <input 
                  type="date" 
                  value={formData.birthdate}
                  onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white mt-6"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cliente"}
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
