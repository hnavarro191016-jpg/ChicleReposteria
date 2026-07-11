"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Calendar, ChevronRight, Clock, CheckCircle2, Package, Loader2, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

// Status definitions for the Kanban board
const STATUSES = ["Pendiente", "Produccion", "Listo", "Entregado"];

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "Pendiente": return <Clock className="w-4 h-4 text-orange-500" />;
    case "Produccion": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "Listo": return <Package className="w-4 h-4 text-purple-500" />;
    case "Entregado": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const StatusColor = ({ status }: { status: string }) => {
  switch (status) {
    case "Pendiente": return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900/30";
    case "Produccion": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30";
    case "Listo": return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-900/30";
    case "Entregado": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-900/30";
    default: return "bg-secondary text-secondary-foreground";
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "calendar">("kanban");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalStep, setModalStep] = useState<number>(1);
  const [orderIngredients, setOrderIngredients] = useState<any[]>([]);
  
  
  const [orderType, setOrderType] = useState<"catalog" | "custom">("catalog");
  
  const [formData, setFormData] = useState({
    client_id: "",
    product_id: "",
    custom_name: "",
    delivery_date: "",
    total_amount: "",
    advance_payment: "",
    notes: ""
  });

  const supabase = createClient();

  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchProducts();
  }, []);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });
    if (data) setClients(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("catalog_products")
      .select("id, name, price")
      .order("name", { ascending: true });
    if (data) setProducts(data);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        clients ( name ),
        order_items (
          product_id,
          custom_name,
          catalog_products ( name )
        )
      `)
      .order("delivery_date", { ascending: true });
    
    if (data) setOrders(data);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    let updateData: any = { status: newStatus };
    
    if (newStatus === "Entregado") {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        updateData.advance_payment = order.total_amount;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);
      
    if (!error) fetchOrders();
  };

  // Helper to prefill price when a catalog product is selected
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setFormData({
      ...formData,
      product_id: productId,
      total_amount: product ? product.price.toString() : formData.total_amount
    });
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngredients = [...orderIngredients];
    newIngredients[index].quantity_used = value;
    setOrderIngredients(newIngredients);
  };

  const handleRemoveIngredientRow = (index: number) => {
    const newIngredients = [...orderIngredients];
    newIngredients.splice(index, 1);
    setOrderIngredients(newIngredients);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalStep === 1 && orderType === "catalog" && formData.product_id) {
      // Transition to Step 2: Fetch recipe
      setIsSubmitting(true);
      const { data: recipeData } = await supabase
        .from("recipes")
        .select("*, inventory_items(name, unit, stock, cost)")
        .eq("product_id", formData.product_id);

      if (recipeData && recipeData.length > 0) {
        setOrderIngredients(recipeData.map(r => ({
          inventory_item_id: r.inventory_item_id,
          name: r.inventory_items?.name,
          unit: r.inventory_items?.unit,
          stock: r.inventory_items?.stock,
          cost: r.inventory_items?.cost,
          quantity_used: r.quantity // Default to recipe quantity
        })));
      } else {
        setOrderIngredients([]);
      }
      setIsSubmitting(false);
      setModalStep(2);
      return;
    }

    setIsSubmitting(true);
    
    // 1. Create the Main Order
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        client_id: formData.client_id,
        delivery_date: new Date(formData.delivery_date).toISOString(),
        total_amount: parseFloat(formData.total_amount),
        advance_payment: parseFloat(formData.advance_payment || "0"),
        notes: formData.notes || null,
        status: "Pendiente"
      })
      .select()
      .single();

    if (orderError) {
      alert("Error guardando pedido: " + orderError.message);
      setIsSubmitting(false);
      return;
    }

    // 2. Create the Order Item
    if (newOrder) {
      await supabase
        .from("order_items")
        .insert({
          order_id: newOrder.id,
          product_id: orderType === "catalog" ? formData.product_id : null,
          custom_name: orderType === "custom" ? formData.custom_name : null,
          quantity: 1,
          unit_price: parseFloat(formData.total_amount)
        });

      // 3. Save Order Ingredients & Deduct Inventory (if Step 2 was used)
      if (modalStep === 2 && orderIngredients.length > 0) {
        const validIngredients = orderIngredients.filter(ing => parseFloat(ing.quantity_used) > 0);
        
        if (validIngredients.length > 0) {
          // Insert into order_ingredients history
          const inserts = validIngredients.map(ing => ({
            order_id: newOrder.id,
            inventory_item_id: ing.inventory_item_id,
            quantity_used: parseFloat(ing.quantity_used)
          }));
          await supabase.from("order_ingredients").insert(inserts);

          // Deduct from inventory_items
          for (const ing of validIngredients) {
            const newStock = (ing.stock || 0) - parseFloat(ing.quantity_used);
            await supabase
              .from("inventory_items")
              .update({ stock: newStock })
              .eq("id", ing.inventory_item_id);
          }
        }
      }
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setModalStep(1);
    setFormData({ client_id: "", product_id: "", custom_name: "", delivery_date: "", total_amount: "", advance_payment: "", notes: "" });
    fetchOrders();
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    
    // Group orders by date (YYYY-MM-DD)
    const ordersByDate: Record<string, any[]> = {};
    orders.forEach(o => {
      const d = new Date(o.delivery_date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!ordersByDate[dateStr]) ordersByDate[dateStr] = [];
      ordersByDate[dateStr].push(o);
    });

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border border-transparent"></div>);
    }
    
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOrders = ordersByDate[dateStr] || [];
      const isToday = dateStr === todayStr;

      days.push(
        <div key={i} className={`min-h-[120px] p-2 border border-border/40 rounded-xl flex flex-col gap-1 ${isToday ? 'bg-primary/5 border-primary/30 shadow-inner' : 'bg-background hover:bg-secondary/20'}`}>
          <div className="text-right mb-1">
            <span className={`text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'bg-primary text-white shadow-md' : 'text-muted-foreground'}`}>{i}</span>
          </div>
          {dayOrders.map(o => {
            let bg = "bg-secondary";
            if (o.status === "Pendiente") bg = "bg-orange-100 text-orange-700";
            if (o.status === "Produccion") bg = "bg-blue-100 text-blue-700";
            if (o.status === "Listo") bg = "bg-purple-100 text-purple-700";
            if (o.status === "Entregado") bg = "bg-green-100 text-green-700";

            return (
              <div key={o.id} className={`text-xs p-1.5 rounded-lg truncate ${bg} border border-black/5 cursor-pointer`} onClick={() => { setSearchTerm(o.clients?.name || ""); setViewMode("kanban"); }}>
                <span className="font-bold">{new Date(o.delivery_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span className="ml-1 opacity-90">{o.clients?.name}</span>
              </div>
            )
          })}
        </div>
      );
    }

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
      <div className="min-w-[700px]">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="rounded-xl">Mes Anterior</Button>
          <h2 className="text-2xl font-bold text-center capitalize">{monthNames[month]} {year}</h2>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="rounded-xl">Siguiente Mes</Button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2 text-center font-bold text-muted-foreground text-sm">
          <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days}
        </div>
      </div>
    );
  };

  // Group orders by status
  const ordersByStatus = STATUSES.map(status => ({
    status,
    items: orders.filter(o => o.status === status && (
      o.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Gestor de Pedidos</h1>
          <p className="text-muted-foreground mt-1 text-lg">Administra tus ventas y entregas en tiempo real.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setViewMode(viewMode === "kanban" ? "calendar" : "kanban")}
            variant="outline" className="rounded-xl h-12 px-6 border-border hover:bg-secondary gap-2"
          >
            <Calendar className="w-5 h-5" />
            <span className="font-semibold">{viewMode === "kanban" ? "Ver Calendario" : "Ver Kanban"}</span>
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl h-12 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Nuevo Pedido</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm flex items-center gap-3">
        <div className="bg-secondary/50 p-2 rounded-xl">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <input 
          type="text" 
          placeholder="Buscar por cliente o notas del pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* View Content */}
      {viewMode === "kanban" ? (
        <div className="flex-1 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 h-full">
          {ordersByStatus.map(column => (
            <div key={column.status} className="flex flex-col bg-secondary/20 rounded-3xl p-4 border border-border/40">
              
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  {column.status}
                  <span className="text-xs font-semibold bg-background px-2 py-1 rounded-full text-muted-foreground shadow-sm">
                    {column.items.length}
                  </span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {loading ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : column.items.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-border/50 rounded-2xl">
                    <p className="text-xs text-muted-foreground font-medium">Sin pedidos</p>
                  </div>
                ) : (
                  column.items.map(order => {
                    const item = order.order_items?.[0];
                    const productName = item?.catalog_products?.name || item?.custom_name || 'Pedido sin detalle';

                    return (
                    <div key={order.id} className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-grab">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border flex items-center gap-1 ${StatusColor({status: order.status})}`}>
                          <StatusIcon status={order.status} />
                          {order.status}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          ${(order.total_amount || 0).toFixed(2)}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-foreground text-lg mb-1">{order.clients?.name || 'Cliente Eliminado'}</h4>
                      
                      <div className="flex items-center gap-1 text-sm font-medium text-primary mb-2">
                        <Tag className="w-3.5 h-3.5" />
                        {productName}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Entrega: {new Date(order.delivery_date).toLocaleDateString()}
                      </div>

                      {/* Botones de acción rápida para avanzar el estado */}
                      <div className="pt-3 border-t border-border/50 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Anticipo: ${(order.advance_payment || 0).toFixed(2)}</span>
                        
                        {order.status === 'Pendiente' && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'Produccion')} variant="ghost" className="h-8 px-2 text-primary hover:bg-primary/10">
                            Producir <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                        {order.status === 'Produccion' && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'Listo')} variant="ghost" className="h-8 px-2 text-purple-600 hover:bg-purple-100">
                            Terminar <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                        {order.status === 'Listo' && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'Entregado')} variant="ghost" className="h-8 px-2 text-green-600 hover:bg-green-100">
                            Entregar <CheckCircle2 className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )})
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : (
        <div className="flex-1 pb-4 bg-card rounded-3xl border border-border/50 p-6 overflow-x-auto shadow-sm">
          {renderCalendar()}
        </div>
      )}

      {/* Modal Nuevo Pedido */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setModalStep(1);
              }}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Nuevo Pedido {modalStep === 2 && "(Paso 2: Producción)"}</h2>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              
              {modalStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4 bg-secondary/30 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOrderType("catalog")}
                  className={`py-2 text-sm font-semibold rounded-lg transition-colors ${orderType === 'catalog' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  De Catálogo
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("custom")}
                  className={`py-2 text-sm font-semibold rounded-lg transition-colors ${orderType === 'custom' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                >
                  Personalizado
                </button>
              </div>

              {orderType === "catalog" ? (
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Producto</label>
                  <select 
                    value={formData.product_id}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required={orderType === "catalog"}
                  >
                    <option value="">Selecciona un producto del catálogo...</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name} (${product.price})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">¿Qué pastel es?</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Pastel de Bodas 3 Pisos"
                    value={formData.custom_name}
                    onChange={(e) => setFormData({...formData, custom_name: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required={orderType === "custom"}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Cliente</label>
                <select 
                  value={formData.client_id}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                >
                  <option value="">Selecciona un cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Fecha y Hora de Entrega</label>
                <input 
                  type="datetime-local" 
                  value={formData.delivery_date}
                  onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Costo Total ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Anticipo Dejado ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    value={formData.advance_payment}
                    onChange={(e) => setFormData({...formData, advance_payment: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Notas (Dedicatoria, Sabores extras...)</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-24"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white mt-6"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (orderType === "catalog" ? "Continuar a Receta" : "Crear Pedido")}
              </Button>
              </>
            )}

            {modalStep === 2 && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <p className="text-sm text-muted-foreground mb-4">
                  Al confirmar, estos ingredientes se descontarán automáticamente de tu inventario. Ajusta las cantidades si es necesario.
                </p>
                
                <div className="space-y-3 mb-6">
                  {orderIngredients.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-border/50 rounded-xl text-center">
                      <p className="text-muted-foreground font-medium text-sm">Este producto no tiene una receta registrada en el catálogo. No se descontarán insumos.</p>
                    </div>
                  ) : (
                    orderIngredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-secondary/20 p-3 rounded-xl border border-border/50">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{ing.name}</p>
                          <p className="text-xs text-muted-foreground">Stock actual: {ing.stock} {ing.unit}</p>
                        </div>
                        <div className="w-28 relative">
                          <input 
                            type="number"
                            step="0.01"
                            value={ing.quantity_used}
                            onChange={(e) => handleIngredientChange(idx, e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm pr-8"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                            {ing.unit}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                {orderIngredients.length > 0 && (
                  <div className="bg-primary/5 p-4 rounded-xl mb-6 border border-primary/20 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Costo de Insumos:</span>
                      <span className="font-semibold text-foreground">
                        ${orderIngredients.reduce((sum, ing) => sum + ((parseFloat(ing.quantity_used) || 0) * (ing.cost || 0)), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Precio de Venta:</span>
                      <span className="font-semibold text-foreground">
                        ${parseFloat(formData.total_amount || "0").toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-primary/10">
                      <span className="text-primary font-bold">Ganancia Estimada:</span>
                      <span className="font-black text-primary text-lg">
                        ${(parseFloat(formData.total_amount || "0") - orderIngredients.reduce((sum, ing) => sum + ((parseFloat(ing.quantity_used) || 0) * (ing.cost || 0)), 0)).toFixed(2)}
                        <span className="text-xs ml-2 font-medium opacity-70">
                          ({formData.total_amount && parseFloat(formData.total_amount) > 0 ? 
                            Math.round(((parseFloat(formData.total_amount || "0") - orderIngredients.reduce((sum, ing) => sum + ((parseFloat(ing.quantity_used) || 0) * (ing.cost || 0)), 0)) / parseFloat(formData.total_amount)) * 100) 
                            : 0}%)
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6 pt-4 border-t border-border/50">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setModalStep(1)}
                    className="flex-1 rounded-xl h-12"
                  >
                    Atrás
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-[2] rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Finalizar Pedido"}
                  </Button>
                </div>
              </div>
            )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
