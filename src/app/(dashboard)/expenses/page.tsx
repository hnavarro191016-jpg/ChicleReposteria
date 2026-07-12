"use client";

import { useState, useEffect } from "react";
import { Plus, Receipt, Calendar, Loader2, Trash2, X, Camera, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });

  const supabase = createClient();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });
    
    if (data) setExpenses(data);
    setLoading(false);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl.split(',')[1]); 
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setIsAnalyzing(true);
      
      try {
        const base64data = await compressImage(file);
        const response = await fetch('/api/analyze-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Image: base64data, mimeType: 'image/jpeg' })
        });
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            description: data.description && data.description !== "Desconocido" ? data.description : prev.description,
            amount: data.amount > 0 ? data.amount.toString() : prev.amount
          }));
        } else {
          const errText = await response.text();
          console.error("Error analizando:", errText);
          alert(`No pudimos leer automáticamente (Error: ${response.status}). Revisa manualmente.`);
        }
      } catch(e) {
        console.error("Fetch error:", e);
        alert("Ocurrió un error al enviar la imagen. Revisa tu conexión.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) return;

    setIsSubmitting(true);
    
    let finalImageUrl = null;
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(fileName, imageFile);
        
      if (uploadData && !uploadError) {
        const { data: publicUrlData } = supabase.storage.from('tickets').getPublicUrl(fileName);
        finalImageUrl = publicUrlData.publicUrl;
      }
    }

    const { error } = await supabase
      .from("expenses")
      .insert({
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        image_url: finalImageUrl
      });

    setIsSubmitting(false);

    if (error) {
      alert("Error guardando gasto: " + error.message);
    } else {
      setIsModalOpen(false);
      setImageFile(null);
      setFormData({ ...formData, description: "", amount: "" });
      fetchExpenses();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm(`¿Estás seguro que deseas eliminar este gasto? Esto afectará los cálculos financieros.`)) return;

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      alert("Error al eliminar gasto: " + error.message);
    } else {
      fetchExpenses();
    }
  };

  const totalGastos = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Receipt className="w-8 h-8 text-primary" />
            Gastos y Tickets
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Registra los tickets de tus compras para calcular tu ganancia real.</p>
        </div>
        
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Registrar Gasto</span>
        </Button>
      </div>

      <div className="bg-orange-100 rounded-3xl p-6 border border-orange-200 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-orange-800 font-bold text-sm uppercase tracking-wider">Gasto Acumulado (Histórico)</p>
          <p className="text-4xl font-black text-orange-600 mt-1">${totalGastos.toFixed(2)}</p>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Receipt className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No hay gastos registrados</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Comienza a registrar tus tickets del súper, insumos, y otros gastos operativos aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground font-semibold border-b border-border/50">
                <tr>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Descripción / Proveedor</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {expense.image_url ? (
                          <a href={expense.image_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0 border border-border/50 hover:bg-secondary transition-colors" title="Ver foto del ticket">
                            <ImageIcon className="w-4 h-4 text-primary" />
                          </a>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0 border border-border/10" title="Sin foto">
                            <Receipt className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                        <span className="font-semibold text-foreground">{expense.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-orange-600 text-lg">${parseFloat(expense.amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nuevo Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className="mb-8 pr-8">
              <h2 className="text-2xl font-bold text-foreground">Registrar Gasto</h2>
              <p className="text-muted-foreground mt-1 text-sm">Captura el ticket para sumarlo a los costos de operación.</p>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-5">
              
              {/* Image Scanner Input */}
              <div className="relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-secondary/20 p-6 flex flex-col items-center justify-center text-center">
                <input 
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {isAnalyzing ? (
                  <div className="flex flex-col items-center text-primary animate-pulse py-4">
                    <Sparkles className="w-8 h-8 mb-2 animate-bounce" />
                    <p className="font-bold text-sm">IA Leyendo Ticket...</p>
                  </div>
                ) : imageFile ? (
                  <div className="flex flex-col items-center text-primary py-2">
                    <ImageIcon className="w-8 h-8 mb-2 text-green-500" />
                    <p className="font-bold text-sm text-green-600">¡Foto lista para procesar!</p>
                    <p className="text-xs text-muted-foreground mt-1">Toca para cambiar</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground py-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-sm text-foreground">Tomar Foto del Ticket</p>
                    <p className="text-xs text-muted-foreground mt-1">Extraeremos el total mágicamente 🪄</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground ml-1">Fecha de Compra *</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full px-5 py-3.5 bg-secondary/30 border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-medium transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground ml-1">Descripción / Proveedor *</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ej. Ticket Sam's Club"
                  className="w-full px-5 py-3.5 bg-secondary/30 border border-border/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-medium transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-foreground ml-1">Monto Total *</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full pl-9 pr-5 py-3.5 bg-secondary/30 border-2 border-orange-500/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-foreground font-bold text-lg transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl h-12"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-[2] rounded-xl h-12 text-base font-semibold bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Ticket"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
