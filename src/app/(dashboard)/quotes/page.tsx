"use client";

import { useState, useEffect } from "react";
import { Calculator, Plus, Trash2, ArrowRight, DollarSign, Clock, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

interface InventoryItem {
  id: string;
  name: string;
  cost: number;
  unit: string;
}

interface QuoteItem {
  id: string;
  inventory_id: string;
  name: string;
  quantity: number;
  cost_per_unit: number;
  unit: string;
}

export default function QuotesPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Quote State
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [quantity, setQuantity] = useState("1");
  
  // Labor & Pricing State
  const [hoursWorked, setHoursWorked] = useState("0");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [salePrice, setSalePrice] = useState("0");

  const supabase = createClient();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase
      .from("inventory_items")
      .select("id, name, cost, unit")
      .order("name", { ascending: true });
    
    if (data) setInventory(data);
  };

  const addIngredient = () => {
    if (!selectedIngredient || !quantity) return;
    
    const item = inventory.find(i => i.id === selectedIngredient);
    if (!item) return;

    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      inventory_id: item.id,
      name: item.name,
      quantity: parseFloat(quantity),
      cost_per_unit: item.cost,
      unit: item.unit
    };

    setItems([...items, newItem]);
    setSelectedIngredient("");
    setQuantity("1");
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  // Calculations
  const totalMaterials = items.reduce((acc, item) => acc + (item.quantity * item.cost_per_unit), 0);
  const totalLabor = parseFloat(hoursWorked || "0") * parseFloat(hourlyRate || "0");
  const totalCost = totalMaterials + totalLabor;
  
  const finalPrice = parseFloat(salePrice || "0");
  const profit = finalPrice - totalCost;
  const profitMargin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Cotizador Inteligente</h1>
          <p className="text-muted-foreground mt-1 text-lg">Calcula costos reales, horas de trabajo y margen de ganancia.</p>
        </div>
        <Button className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2">
          <Calculator className="w-5 h-5" />
          <span className="font-semibold">Guardar Receta/Cotización</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Ingredients Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="bg-primary/10 text-primary p-2 rounded-lg"><Plus className="w-5 h-5" /></span>
              Agregar Ingredientes
            </h2>
            
            <div className="flex items-end gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Ingrediente</label>
                <select 
                  value={selectedIngredient}
                  onChange={(e) => setSelectedIngredient(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Selecciona un ingrediente del inventario...</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} (${item.cost.toFixed(2)} / {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Cantidad</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button onClick={addIngredient} className="rounded-xl h-[50px] px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80">
                Agregar
              </Button>
            </div>

            {/* List of added ingredients */}
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-2xl">
                  <p className="text-muted-foreground text-sm font-medium">No has agregado ingredientes a esta cotización.</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-background border border-border/50 p-4 rounded-2xl group hover:border-primary/30 transition-colors">
                    <div>
                      <h4 className="font-bold text-foreground">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.quantity} {item.unit} x ${item.cost_per_unit.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg">${(item.quantity * item.cost_per_unit).toFixed(2)}</span>
                      <button onClick={() => removeItem(item.id)} className="text-destructive/50 hover:text-destructive transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center px-2">
                <span className="text-muted-foreground font-semibold">Total Ingredientes:</span>
                <span className="text-xl font-bold">${totalMaterials.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="bg-blue-500/10 text-blue-500 p-2 rounded-lg"><Clock className="w-5 h-5" /></span>
              Mano de Obra
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Horas de Trabajo Estimadas</label>
                <input 
                  type="number" 
                  step="0.5"
                  min="0"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej. 2.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Tu Tarifa por Hora ($)</label>
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej. 150"
                />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center px-2">
              <span className="text-muted-foreground font-semibold">Costo Mano de Obra:</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">${totalLabor.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Strategy */}
        <div className="space-y-6">
          <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm sticky top-24">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-green-500/10 text-green-500 p-2 rounded-lg"><DollarSign className="w-5 h-5" /></span>
              Resumen Financiero
            </h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Insumos</span>
                <span className="font-semibold">${totalMaterials.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mano de Obra</span>
                <span className="font-semibold">${totalLabor.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                <span className="font-bold text-foreground">Costo Real Total</span>
                <span className="font-bold text-xl">${totalCost.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-2xl p-5 mb-6">
              <label className="block text-xs font-bold text-primary mb-2 uppercase tracking-wider">Precio de Venta al Público</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input 
                  type="number" 
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full bg-background border border-primary/20 rounded-xl py-4 pl-12 pr-4 text-2xl font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-inner"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className={`rounded-2xl p-5 border ${profit > 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/30'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold uppercase tracking-wider flex items-center gap-1 ${profit > 0 ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                  <Percent className="w-4 h-4" /> Margen de Ganancia
                </span>
              </div>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <span className={`text-3xl font-black ${profit > 0 ? 'text-green-600 dark:text-green-500' : 'text-orange-600 dark:text-orange-500'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block mb-0.5">Ganancia Neta</span>
                  <span className="font-bold text-lg text-foreground">${profit.toFixed(2)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
