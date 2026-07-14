"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle, Loader2, FileText, Calendar, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PublicQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const quoteId = resolvedParams.id;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [approving, setApproving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    try {
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();
        
      if (quoteError) throw quoteError;
      
      const { data: itemsData, error: itemsError } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId);
        
      if (itemsError) throw itemsError;
      
      setQuote(quoteData);
      setItems(itemsData || []);
    } catch (err: any) {
      console.error(err);
      setError("No se pudo cargar la cotización. Puede que el enlace sea incorrecto o haya expirado.");
    } finally {
      setLoading(false);
    }
  };

  const approveQuote = async () => {
    setApproving(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "approved" })
        .eq("id", quoteId);
        
      if (error) throw error;
      
      setQuote({ ...quote, status: "approved" });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      alert("Hubo un error al aprobar. Por favor inténtalo de nuevo.");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-pink-50/30">
        <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50/30 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Cotización no encontrada</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pink-50/30 font-sans selection:bg-pink-200 text-gray-800 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-10">
          <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-sm border-2 border-pink-100 overflow-hidden">
             <img src="/logo.png" alt="Chicle Logo" className="w-full h-full object-cover" 
                  onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlYzQ4OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LThhMiAyIDAgMCAwLTItMkg2YTIgMiAwIDAgMC0yIDJ2OCIvPjxwYXRoIGQ9Ik00IDE2cy41LTEgMi0xIDIuNSAyIDQgMiAyLjUtMiA0LTIgMi41IDIgNCAyIDItMSA0LTEiLz48cGF0aCBkPSJNMTEgMTNoMnoiLz48cGF0aCBkPSJNMTAgOWEyIDIgMCAxIDAtNCswIi8+PC9zdmc+'; }} 
             />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-pink-500 uppercase tracking-tight mt-4">Chicle Repostería</h1>
          <p className="text-gray-500 font-medium">Cotización de Pedido</p>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 text-green-700 p-6 rounded-3xl shadow-sm text-center animate-in zoom-in duration-300">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <h2 className="text-2xl font-bold mb-1">¡Cotización Aprobada!</h2>
            <p className="text-sm opacity-90">Tu pedido ha sido confirmado. Nos pondremos en contacto contigo muy pronto.</p>
          </div>
        )}

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-lg border-2 border-pink-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-pink-100 to-transparent opacity-50"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-8 border-b-2 border-pink-50">
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Cliente</p>
              <p className="text-xl font-bold text-gray-800">{quote.client_name}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Fecha</p>
              <p className="text-lg font-semibold text-gray-700 flex items-center md:justify-end gap-2">
                <Calendar className="w-4 h-4 text-pink-400" />
                {new Date(quote.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="relative z-10 mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Cake className="w-5 h-5 text-pink-500" />
              Conceptos Incluidos
            </h3>
            
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="font-medium text-gray-700 whitespace-pre-wrap flex-1">{item.description}</span>
                  <span className="font-bold text-gray-900 ml-4 shrink-0 text-lg">
                    ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 bg-pink-50 p-6 rounded-3xl flex justify-between items-center mb-8 border border-pink-100">
            <span className="text-gray-600 font-bold uppercase tracking-wider text-sm">Total a Pagar</span>
            <span className="text-3xl font-black text-pink-600">
              ${quote.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Action Area */}
          {!success && (
            <div className="relative z-10 pt-4">
              {quote.status === "pending" ? (
                <Button 
                  onClick={approveQuote} 
                  disabled={approving}
                  className="w-full py-7 text-lg rounded-2xl bg-pink-500 hover:bg-pink-600 text-white shadow-xl shadow-pink-200 transition-all active:scale-[0.98]"
                >
                  {approving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Sí, Aprobar Cotización"}
                </Button>
              ) : (
                <div className="bg-gray-100 border border-gray-200 text-gray-600 p-4 rounded-2xl text-center font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-gray-500" />
                  Esta cotización ya está aprobada
                </div>
              )}
              {quote.status === "pending" && (
                <p className="text-center text-xs text-gray-400 mt-4 font-medium">
                  Al aprobar esta cotización, confirmas que los conceptos y el total son correctos.
                </p>
              )}
            </div>
          )}
        </div>
        
        <p className="text-center text-gray-400 text-sm font-medium pt-8">
          Diseñado con ❤️ por Chicle Repostería
        </p>
      </div>
    </div>
  );
}
