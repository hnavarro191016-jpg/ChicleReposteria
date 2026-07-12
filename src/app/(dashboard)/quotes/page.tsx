"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, Download, CheckCircle, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteItem {
  id: string;
  description: string;
  price: number;
}

export default function QuotesPage() {
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  
  const pdfRef = useRef<HTMLDivElement>(null);

  const addItem = () => {
    if (!newItemDesc || !newItemPrice) return;
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        description: newItemDesc,
        price: parseFloat(newItemPrice)
      }
    ]);
    setNewItemDesc("");
    setNewItemPrice("");
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const generatePDF = async () => {
    if (typeof window === "undefined") return;
    // We dynamically import html2pdf so it only loads on the client
    const html2pdf = (await import("html2pdf.js" as any)).default;
    const element = pdfRef.current;
    
    // Hide the trash buttons momentarily before generating PDF
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

    // Restore trash buttons
    trashButtons?.forEach(btn => (btn as HTMLElement).style.display = 'flex');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Control Panel */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <FileText className="w-6 h-6 text-primary" />
              Generador de Cotizaciones
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Crea cotizaciones en PDF para enviarlas por WhatsApp.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              variant={isApproved ? "default" : "outline"}
              className={`flex-1 md:flex-none gap-2 ${isApproved ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}`}
              onClick={() => setIsApproved(!isApproved)}
            >
              <CheckCircle className="w-4 h-4" />
              {isApproved ? "Cotización Aprobada" : "Marcar como Aprobada"}
            </Button>
            <Button onClick={generatePDF} className="flex-1 md:flex-none gap-2 bg-primary hover:bg-primary/90 text-white">
              <Download className="w-4 h-4" />
              Descargar PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-foreground">Nombre del Cliente</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                placeholder="Ej. María Sánchez"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 ml-1 text-foreground">Fecha</label>
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>
        </div>

        <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50">
          <h3 className="font-semibold text-sm text-foreground">Agregar Conceptos</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              type="text"
              value={newItemDesc}
              onChange={e => setNewItemDesc(e.target.value)}
              placeholder="Descripción (ej. Pastel de Chocolate Fondant)"
              className="flex-1 px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <div className="flex gap-3">
              <div className="relative w-full md:w-32">
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
              <Button onClick={addItem} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground shrink-0 rounded-xl h-[42px]">
                <Plus className="w-5 h-5" />
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
                    // Fallback to text/icon if logo.png doesn't exist
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
              {isApproved && (
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
                    <tr key={item.id} className="border-b border-gray-100 group hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-gray-800 flex items-center gap-3 font-medium">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="trash-btn text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {item.description}
                      </td>
                      <td className="py-4 px-4 text-gray-800 text-right font-bold text-lg">
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
    </div>
  );
}
