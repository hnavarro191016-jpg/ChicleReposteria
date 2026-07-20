"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileText, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function QuotesListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quotes")
      .select("*, quote_items(description)")
      .order("created_at", { ascending: false });
    
    if (data) {
      const mapped = data.map(q => {
        const isConverted = q.quote_items?.some((i: any) => i.description === "[SYSTEM_CONVERTED_FLAG]");
        return { ...q, status: isConverted ? "converted" : q.status };
      });
      setQuotes(mapped);
    }
    setLoading(false);
  };

  const filteredQuotes = quotes.filter(quote => 
    quote.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Aprobada</span>;
      case 'converted':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Pedido Realizado</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Cancelada</span>;
      default:
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pendiente</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground mt-1 text-lg">Administra tus presupuestos y cotizaciones para clientes.</p>
        </div>
        <Button 
          onClick={() => router.push('/quotes/new')}
          className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Nueva Cotización</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-all"
          />
        </div>
      </div>

      {/* Quotes List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No hay cotizaciones</h3>
          <p className="text-muted-foreground mb-6">Comienza creando tu primera cotización comercial.</p>
          <Button onClick={() => router.push('/quotes/new')} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
            Crear Cotización
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotes.map((quote) => (
            <div 
              key={quote.id} 
              onClick={() => router.push(`/quotes/${quote.id}`)}
              className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-primary/50"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                {getStatusBadge(quote.status)}
              </div>
              
              <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1">{quote.client_name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {new Date(quote.created_at).toLocaleDateString()}
              </p>
              
              <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="font-bold text-lg text-primary">
                  ${quote.total_amount?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
