"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Box, Scale, X, Loader2, Minus, TrendingUp, TrendingDown, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cost: "",
    supplier: "",
    stock: "0",
    min_stock: "0",
    unit: "Kg",
  });

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Modal State for Adjust Stock
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name", { ascending: true });
    
    if (data) setInventory(data);
    setLoading(false);
  };

  const openEditModal = (item: any) => {
    setEditingItemId(item.id);
    setFormData({
      name: item.name,
      cost: item.cost.toString(),
      supplier: item.supplier || "",
      stock: item.stock.toString(),
      min_stock: item.min_stock.toString(),
      unit: item.unit,
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      name: formData.name,
      cost: parseFloat(formData.cost),
      supplier: formData.supplier,
      stock: parseFloat(formData.stock),
      min_stock: parseFloat(formData.min_stock),
      unit: formData.unit,
    };

    let error;
    if (editingItemId) {
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update(payload)
        .eq("id", editingItemId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("inventory_items")
        .insert(payload);
      error = insertError;
    }

    setIsSubmitting(false);

    if (error) {
      alert("Error guardando ingrediente: " + error.message);
    } else {
      setIsModalOpen(false);
      setEditingItemId(null);
      setFormData({ name: "", cost: "", supplier: "", stock: "0", min_stock: "0", unit: "Kg" });
      fetchInventory();
    }
  };

  const openAdjustModal = (item: any) => {
    setSelectedItem(item);
    setAdjustAmount("");
    setIsAdjustModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !adjustAmount) return;

    setIsAdjusting(true);
    
    const amount = parseFloat(adjustAmount);
    const newStock = selectedItem.stock + amount;

    const { error } = await supabase
      .from("inventory_items")
      .update({ stock: newStock })
      .eq("id", selectedItem.id);

    setIsAdjusting(false);

    if (error) {
      alert("Error ajustando stock: " + error.message);
    } else {
      setIsAdjustModalOpen(false);
      setSelectedItem(null);
      fetchInventory();
    }
  };

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.supplier && i.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Inventario de Ingredientes</h1>
          <p className="text-muted-foreground mt-1 text-lg">Controla tus insumos, costos y evita quedarte sin stock.</p>
        </div>
        
        <Button 
          onClick={() => {
            setEditingItemId(null);
            setFormData({ name: "", cost: "", supplier: "", stock: "0", min_stock: "0", unit: "Kg" });
            setIsModalOpen(true);
          }}
          className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Nuevo Ingrediente</span>
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
        <div className="bg-secondary/50 p-2 rounded-xl">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <input 
          type="text" 
          placeholder="Buscar ingredientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Inventory Table/List */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden min-h-[300px]">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No tienes ingredientes registrados aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/30 text-muted-foreground text-sm uppercase tracking-wider font-semibold border-b border-border/50">
                  <th className="p-4 pl-6">Ingrediente</th>
                  <th className="p-4">Costo / Unidad</th>
                  <th className="p-4">Stock Actual</th>
                  <th className="p-4 text-right pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredInventory.map((item) => {
                  const isLowStock = item.stock <= item.min_stock;
                  
                  return (
                    <tr key={item.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                            <Box className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{item.name}</span>
                            {item.supplier && <span className="text-xs text-muted-foreground">Prov: {item.supplier}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">${(item.cost || 0).toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Scale className="w-3 h-3" />
                            por {item.unit}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{item.stock} <span className="text-muted-foreground font-normal text-sm">{item.unit}</span></span>
                          {isLowStock && (
                            <span className="text-xs text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-md w-fit mt-1">
                              ¡Stock Bajo!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right pr-6 flex justify-end gap-2 items-center">
                        <Button 
                          onClick={() => openAdjustModal(item)}
                          variant="outline" 
                          className="rounded-xl border-border hover:bg-secondary" 
                          size="sm"
                        >
                          Ajustar Stock
                        </Button>
                        <Button 
                          onClick={() => openEditModal(item)}
                          variant="ghost" 
                          className="rounded-xl text-muted-foreground hover:text-primary h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Ingrediente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">{editingItemId ? "Editar Ingrediente" : "Nuevo Ingrediente"}</h2>
            
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Nombre del Ingrediente</label>
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
                  <label className="block text-sm font-medium mb-1.5 ml-1">Costo Unitario ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Unidad de Medida</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Gramos">Gramos</option>
                    <option value="Litros">Litros</option>
                    <option value="Mililitros">Mililitros</option>
                    <option value="Piezas">Piezas</option>
                    <option value="Cajas">Cajas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Stock Actual</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Alerta de Stock Mínimo</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({...formData, min_stock: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Proveedor (Opcional)</label>
                <input 
                  type="text" 
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white mt-6"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingItemId ? "Actualizar Ingrediente" : "Guardar Ingrediente")}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Stock */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative">
            <button 
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h2 className="text-xl font-bold mb-2">Ajustar Stock</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Actualizar <strong className="text-foreground">{selectedItem.name}</strong>. Stock actual: {selectedItem.stock} {selectedItem.unit}.
            </p>
            
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">¿Cuánto vas a sumar o restar?</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01" 
                    placeholder="Ej: -2 para restar, 5 para sumar"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 pl-10"
                    required
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {parseFloat(adjustAmount) > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : parseFloat(adjustAmount) < 0 ? (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    ) : (
                      <Scale className="w-4 h-4" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 ml-1">Usa el signo menos (-) para descontar uso.</p>
              </div>
              
              <Button 
                type="submit" 
                disabled={isAdjusting || !adjustAmount}
                className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white mt-6"
              >
                {isAdjusting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Ajuste"}
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
