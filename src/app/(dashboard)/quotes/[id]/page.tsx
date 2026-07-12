"use client";

import { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Download, CheckCircle, FileText, User, Phone, Calendar, Save, ArrowLeft, Loader2, Cake, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface QuoteItem {
  id?: string;
  description: string;
  price: number;
  local_id: string; // for UI tracking before save
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const supabase = createClient();
  const resolvedParams = use(params);
  const quoteId = resolvedParams.id;
  const isNew = quoteId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  // Client Details
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [clientBirthdate, setClientBirthdate] = useState("");
  
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [status, setStatus] = useState<"pending" | "approved" | "cancelled">("pending");
  
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemComments, setNewItemComments] = useState("");
  
  // Cake Builder Modal State
  const [showCakeModal, setShowCakeModal] = useState(false);
  const [cakeDesc, setCakeDesc] = useState("");
  const [cakePrice, setCakePrice] = useState("");
  const [cakePan, setCakePan] = useState("Vainilla");
  const [cakeRelleno, setCakeRelleno] = useState("Chocolate");
  const [cakeBetun, setCakeBetun] = useState("Chantilly");
  const [cakeComments, setCakeComments] = useState("");

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNew) {
      fetchQuote();
    }
  }, [quoteId]);

  const fetchQuote = async () => {
    setLoading(true);
    const { data: quote } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quoteId)
      .single();
      
    if (quote) {
      setClientName(quote.client_name || "");
      setClientPhone(quote.client_phone || "");
      setClientWhatsapp(quote.client_whatsapp || "");
      setClientBirthdate(quote.client_birthdate || "");
      setStatus(quote.status);
      if (quote.created_at) {
        setDate(new Date(quote.created_at).toISOString().split("T")[0]);
      }
      
      const { data: quoteItems } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true });
        
      if (quoteItems) {
        setItems(quoteItems.map(i => ({
          id: i.id,
          description: i.description,
          price: i.price,
          local_id: Math.random().toString(36).substr(2, 9)
        })));
      }
    }
    setLoading(false);
  };

  const addItem = () => {
    if (!newItemDesc || !newItemPrice) return;
    
    let finalDesc = newItemDesc;
    if (newItemComments.trim()) {
      finalDesc += `\n• Notas: ${newItemComments.trim()}`;
    }

    setItems([
      ...items,
      {
        local_id: Math.random().toString(36).substr(2, 9),
        description: finalDesc,
        price: parseFloat(newItemPrice)
      }
    ]);
    setNewItemDesc("");
    setNewItemPrice("");
    setNewItemComments("");
  };

  const addCakeItem = () => {
    if (!cakeDesc || !cakePrice) {
      alert("Por favor ponle nombre y precio al pastel.");
      return;
    }
    
    let formattedDesc = `${cakeDesc}\n• Pan: ${cakePan}\n• Relleno: ${cakeRelleno}\n• Betún: ${cakeBetun}`;
    if (cakeComments.trim()) {
      formattedDesc += `\n• Notas extra: ${cakeComments.trim()}`;
    }
    
    setItems([
      ...items,
      {
        local_id: Math.random().toString(36).substr(2, 9),
        description: formattedDesc,
        price: parseFloat(cakePrice)
      }
    ]);
    
    setShowCakeModal(false);
    setCakeDesc("");
    setCakePrice("");
    setCakePan("Vainilla");
    setCakeRelleno("Chocolate");
    setCakeBetun("Chantilly");
    setCakeComments("");
  };

  const removeItem = (local_id: string) => {
    setItems(items.filter(i => i.local_id !== local_id));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const saveQuote = async () => {
    if (!clientName.trim()) {
      alert("El nombre del cliente es obligatorio.");
      return;
    }
    setSaving(true);

    let currentQuoteId = quoteId;

    if (isNew) {
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          client_name: clientName,
          client_phone: clientPhone,
          client_whatsapp: clientWhatsapp,
          client_birthdate: clientBirthdate || null,
          total_amount: total,
          status: status
        })
        .select("id")
        .single();
        
      if (error) {
        alert("Error al guardar: " + error.message);
        setSaving(false);
        return;
      }
      currentQuoteId = data.id;
    } else {
      await supabase
        .from("quotes")
        .update({
          client_name: clientName,
          client_phone: clientPhone,
          client_whatsapp: clientWhatsapp,
          client_birthdate: clientBirthdate || null,
          total_amount: total,
          status: status
        })
        .eq("id", currentQuoteId);
        
      await supabase.from("quote_items").delete().eq("quote_id", currentQuoteId);
    }

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        quote_id: currentQuoteId,
        description: item.description,
        price: item.price
      }));
      await supabase.from("quote_items").insert(itemsToInsert);
    }

    setSaving(false);
    if (isNew) {
      router.push(`/quotes/${currentQuoteId}`);
    } else {
      alert("Cotización guardada correctamente.");
    }
  };

  const toggleApprove = async () => {
    const newStatus = status === "approved" ? "pending" : "approved";
    setStatus(newStatus);
    
    if (newStatus === "approved") {
      setShowRegisterModal(true);
    }
  };

  const registerClientToCRM = async () => {
    const { error } = await supabase
      .from("clients")
      .insert({
        name: clientName,
        phone: clientPhone,
        whatsapp: clientWhatsapp,
        birthdate: clientBirthdate || null,
      });
      
    if (error) {
      alert("Error al registrar cliente: " + error.message);
    } else {
      alert("¡Cliente registrado exitosamente en el CRM!");
      setShowRegisterModal(false);
    }
  };

  const generatePDF = async () => {
    if (typeof window === "undefined") return;
    const html2pdf = (await import("html2pdf.js" as any)).default;
    const element = pdfRef.current;
    
    const trashButtons = element?.querySelectorAll('.trash-btn');
    trashButtons?.forEach(btn => (btn as HTMLElement).style.display = 'none');

    const opt = {
      margin: 0.5,
      filename: `Cotizacion_${clientName.replace(/\s+/g, '_') || 'Chicle'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    await html2pdf().set(opt).from(element).save();

    trashButtons?.forEach(btn => (btn as HTMLElement).style.display = 'flex');
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      {/* Control Panel */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Button variant="ghost" className="mb-2 -ml-4 text-muted-foreground hover:bg-secondary" onClick={() => router.push('/quotes')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Cotizaciones
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-6 h-6 text-primary" />
              {isNew ? "Nueva Cotización" : "Editar Cotización"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={saveQuote} 
              disabled={saving}
              className="flex-1 md:flex-none gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </Button>
            <Button 
              variant={status === "approved" ? "default" : "outline"}
              className={`flex-1 md:flex-none gap-2 ${status === "approved" ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}`}
              onClick={toggleApprove}
            >
              <CheckCircle className="w-4 h-4" />
              {status === "approved" ? "Aprobada" : "Marcar Aprobada"}
            </Button>
            <Button onClick={generatePDF} className="flex-1 md:flex-none gap-2 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20">
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-foreground">Cliente *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                placeholder="Nombre completo"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-foreground">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-foreground">WhatsApp</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
              <input 
                type="text" 
                value={clientWhatsapp}
                onChange={e => setClientWhatsapp(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-foreground">Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="p-5 bg-muted/30 rounded-xl space-y-4 border border-border/50">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-foreground">Conceptos de la Cotización</h3>
            <Button 
              onClick={() => setShowCakeModal(true)}
              className="bg-pink-100 hover:bg-pink-200 text-pink-700 shadow-sm border border-pink-200 gap-2 h-9"
            >
              <Cake className="w-4 h-4" />
              Armar Pastel
            </Button>
          </div>
          
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text"
                value={newItemDesc}
                onChange={e => setNewItemDesc(e.target.value)}
                placeholder="Concepto (ej. Letrero extra)"
                className="flex-[2] px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
              />
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input 
                  type="number"
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text"
                  value={newItemComments}
                  onChange={e => setNewItemComments(e.target.value)}
                  placeholder="Comentarios o peticiones especiales (Opcional)"
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                />
              </div>
              <Button onClick={addItem} className="bg-primary hover:bg-primary/90 text-white md:w-32 rounded-xl h-[42px] gap-2">
                <Plus className="w-4 h-4" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Area */}
      <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-border overflow-x-auto">
        <div ref={pdfRef} className="min-w-[600px] text-black bg-white p-4">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-pink-200 pb-6 mb-8">
            <div className="flex items-center gap-6">
              {/* Logo Box */}
              <div className="w-24 h-24 bg-pink-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-pink-100 shadow-sm">
                <img 
                  src="/logo.png" 
                  alt="Chicle Repostería" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlYzQ4OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LThhMiAyIDAgMCAwLTItMkg2YTIgMiAwIDAgMC0yIDJ2OCIvPjxwYXRoIGQ9Ik00IDE2cy41LTEgMi0xIDIuNSAyIDQgMiAyLjUtMiA0LTIgMi41IDIgNCAyIDItMSA0LTEiLz48cGF0aCBkPSJNMTEgMTNoMnoiLz48cGF0aCBkPSJNMTAgOWEyIDIgMCAxIDAtNCswIi8+PC9zdmc+';
                  }} 
                />
              </div>
              <div>
                <h2 className="text-3xl font-black text-pink-500 tracking-tighter">CHICLE</h2>
                <h3 className="text-xl font-bold text-gray-700 tracking-widest uppercase mt-1">Repostería</h3>
                <p className="text-sm text-gray-500 mt-2 font-medium">Cotización de Servicios</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">Fecha: <span className="font-normal text-gray-600">{date}</span></p>
              <p className="text-sm font-bold text-gray-800 mt-1">Cliente: <span className="font-normal text-gray-600">{clientName || "________________"}</span></p>
              {clientPhone && <p className="text-sm text-gray-500 mt-1">Tel: {clientPhone}</p>}
              {status === "approved" && (
                <div className="mt-6 inline-block border-2 border-green-500 text-green-600 font-bold px-4 py-1.5 rounded-lg text-sm transform -rotate-12 shadow-sm bg-green-50">
                  ✓ APROBADA
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-3 px-4 font-bold text-gray-800 w-3/4 text-lg">Concepto</th>
                  <th className="py-3 px-4 font-bold text-gray-800 text-right text-lg">Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-gray-400 italic">No has agregado ningún concepto a la cotización.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.local_id} className="border-b border-gray-100 group hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-gray-800 flex items-start gap-3 font-medium">
                        <button 
                          onClick={() => removeItem(item.local_id)}
                          className="trash-btn mt-1 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="whitespace-pre-wrap">{item.description}</span>
                      </td>
                      <td className="py-4 px-4 text-gray-800 text-right font-bold text-lg align-top">
                        ${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end mt-8">
            <div className="w-1/2 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-semibold text-gray-800">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-black mt-4 pt-4 border-t-2 border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-pink-600">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-16 text-center text-sm font-medium text-gray-400 border-t-2 border-gray-100 pt-6">
            <p>Gracias por elegir Chicle Repostería.</p>
          </div>
        </div>
      </div>

      {/* Modal Creador de Pastel */}
      {showCakeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Cake className="w-6 h-6 text-pink-500" />
                Crea tu Pastel
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">Nombre del Pastel</label>
                <input 
                  type="text" 
                  value={cakeDesc}
                  onChange={e => setCakeDesc(e.target.value)}
                  placeholder="Ej. Pastel Chico Cumpleaños"
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-pink-500">Tipo de Pan</label>
                  <select 
                    value={cakePan} 
                    onChange={e => setCakePan(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  >
                    <option>Vainilla</option>
                    <option>Chocolate</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-1 text-pink-500">Tipo de Relleno</label>
                  <select 
                    value={cakeRelleno} 
                    onChange={e => setCakeRelleno(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  >
                    <option>Chocolate</option>
                    <option>Cajeta</option>
                    <option>Cremoso de Oreo</option>
                    <option>Cremoso de Lotus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-pink-500">Tipo de Betún</label>
                <select 
                  value={cakeBetun} 
                  onChange={e => setCakeBetun(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                >
                  <option>Chantilly</option>
                  <option>Mantequilla</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">Comentarios o Peticiones (Opcional)</label>
                <div className="relative w-full">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea 
                    value={cakeComments}
                    onChange={e => setCakeComments(e.target.value)}
                    placeholder="Ej. Sin nuez, letrero de 'Feliz Día', decoración rosa..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-h-[80px] resize-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-sm font-bold mb-1 text-foreground">Precio Acordado</label>
                <div className="relative w-full">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <input 
                    type="number"
                    value={cakePrice}
                    onChange={e => setCakePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 bg-background border-2 border-primary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-bold text-lg"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowCakeModal(false)}>
                Cancelar
              </Button>
              <Button onClick={addCakeItem} className="bg-primary hover:bg-primary/90 text-white px-6">
                Agregar Pastel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro de Cliente */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-foreground">¿Registrar en Base de Datos?</h3>
            </div>
            
            <p className="text-muted-foreground mb-6">
              Acabas de aprobar esta cotización. ¿Te gustaría guardar a <strong>{clientName}</strong> en tu base de datos oficial de Clientes (CRM) para futuros pedidos?
            </p>
            
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowRegisterModal(false)}>
                No, gracias
              </Button>
              <Button onClick={registerClientToCRM} className="bg-primary hover:bg-primary/90 text-white">
                Sí, Registrar Cliente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
