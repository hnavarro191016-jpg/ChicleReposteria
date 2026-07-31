"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Calendar, ChevronRight, Clock, CheckCircle2, Package, Loader2, X, Tag, Trash2, Cake, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useSettings } from "@/context/SettingsContext";

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
  const { settings } = useSettings();
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
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  interface OrderItem {
    local_id: string;
    product_id: string | null;
    custom_name: string | null;
    quantity: number;
    price: number;
  }
  const [orderItemsCart, setOrderItemsCart] = useState<OrderItem[]>([]);
  
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showCakeModal, setShowCakeModal] = useState(false);
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState("");
  const [catalogQuantity, setCatalogQuantity] = useState(1);
  const [catalogComments, setCatalogComments] = useState("");
  
  // Custom Cake State
  const [customCake, setCustomCake] = useState({
    name: "",
    pan: "Vainilla",
    relleno: "Chocolate",
    betun: "Chantilly",
    comments: "",
    price: "",
    quantity: 1
  });

  const [catalogExtras, setCatalogExtras] = useState({
    is3Leches: false,
    cakeFlavor: "Vainilla",
    isFilled: false,
  });
  
  const [formData, setFormData] = useState({
    client_id: "",
    delivery_date: "",
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
      .select("id, name, price, category, image_url")
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
          quantity,
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

  const deleteOrder = async (orderId: string) => {
    if (!confirm("¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.")) return;
    
    // Primero eliminamos los items del pedido por si no hay CASCADE configurado
    await supabase.from("order_items").delete().eq("order_id", orderId);
    
    // Luego eliminamos el pedido
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    
    if (!error) {
      fetchOrders();
    } else {
      alert("Error al eliminar el pedido: " + error.message);
    }
  };

  const getTotalAmount = () => {
    return orderItemsCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const addCatalogItem = () => {
    if (!selectedCatalogProductId) return;
    const product = products.find(p => p.id === selectedCatalogProductId);
    if (!product) return;

    let basePrice = parseFloat(product.price) || 0;
    let finalDesc = product.name;

    if (product.category === "Pasteles") {
      if (catalogExtras.is3Leches) {
        finalDesc += " (3 Leches)";
        basePrice += settings?.tres_leches_extra_price || 5;
      }
      if (catalogExtras.cakeFlavor !== "N/A") {
        finalDesc += ` (${catalogExtras.cakeFlavor})`;
      }
    } else if (product.category === "Galletas") {
      if (catalogExtras.isFilled) {
        finalDesc += " (Rellena)";
        basePrice += settings?.cookie_filling_extra_price || 5;
      }
    }

    if (catalogComments.trim()) {
      finalDesc += `\n• Notas extra: ${catalogComments.trim()}`;
    }

    setOrderItemsCart([
      ...orderItemsCart,
      {
        local_id: Math.random().toString(36).substr(2, 9),
        product_id: product.id,
        custom_name: finalDesc,
        price: basePrice,
        quantity: catalogQuantity
      }
    ]);

    setShowCatalogModal(false);
    setSelectedCatalogProductId("");
    setCatalogComments("");
    setCatalogQuantity(1);
    setCatalogExtras({
      is3Leches: false,
      cakeFlavor: "Vainilla",
      isFilled: false,
    });
  };

  const addCustomCakeItem = () => {
    if (!customCake.name || !customCake.price) {
      alert("Por favor ponle nombre y precio al pastel.");
      return;
    }
    
    let formattedDesc = `${customCake.name}\n• Pan: ${customCake.pan}\n• Relleno: ${customCake.relleno}\n• Betún: ${customCake.betun}`;
    if (customCake.comments.trim()) {
      formattedDesc += `\n• Notas extra: ${customCake.comments.trim()}`;
    }
    
    setOrderItemsCart([
      ...orderItemsCart,
      {
        local_id: Math.random().toString(36).substr(2, 9),
        product_id: null,
        custom_name: formattedDesc,
        price: parseFloat(customCake.price),
        quantity: customCake.quantity
      }
    ]);
    
    setShowCakeModal(false);
    setCustomCake({
      name: "",
      pan: "Vainilla",
      relleno: "Chocolate",
      betun: "Chantilly",
      comments: "",
      price: "",
      quantity: 1
    });
  };

  const removeOrderItem = (local_id: string) => {
    setOrderItemsCart(orderItemsCart.filter(i => i.local_id !== local_id));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItemsCart.length === 0) {
      alert("Agrega al menos un producto al pedido.");
      return;
    }
    setIsSubmitting(true);
    
    const finalTotal = getTotalAmount();

    // 1. Create the Main Order
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        client_id: formData.client_id,
        delivery_date: new Date(formData.delivery_date).toISOString(),
        total_amount: finalTotal,
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

    // 2. Create the Order Items
    if (newOrder) {
      const inserts = orderItemsCart.map(item => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        custom_name: item.custom_name,
        quantity: item.quantity,
        unit_price: item.price
      }));
      await supabase.from("order_items").insert(inserts);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
    setFormData({ client_id: "", delivery_date: "", advance_payment: "", notes: "" });
    setOrderItemsCart([]);
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
                    const itemsText = order.order_items?.length > 1 
                      ? `${order.order_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)} artículos en total`
                      : (order.order_items?.[0] ? `${order.order_items[0].quantity}x ${order.order_items[0].custom_name?.split('\\n')[0] || order.order_items[0].catalog_products?.name || 'Producto'}` : 'Pedido sin detalle');

                    return (
                    <div 
                      key={order.id} 
                      onClick={() => setSelectedOrder(order)}
                      className="bg-card p-5 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    >
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
                      
                      <div className="flex items-center gap-1 text-sm font-medium text-primary mb-2 line-clamp-1">
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{itemsText}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Entrega: {new Date(order.delivery_date).toLocaleDateString()}
                      </div>

                      {/* Botones de acción rápida para avanzar el estado */}
                      <div className="pt-3 border-t border-border/50 flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-muted-foreground">Anticipo: ${(order.advance_payment || 0).toFixed(2)}</span>
                        
                        <div className="flex gap-1">
                          {order.status === 'Pendiente' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }} variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600" title="Eliminar pedido">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          {order.status === 'Pendiente' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'Produccion'); }} variant="ghost" className="h-8 px-2 text-primary hover:bg-primary/10">
                              Producir <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                          {order.status === 'Produccion' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'Listo'); }} variant="ghost" className="h-8 px-2 text-purple-600 hover:bg-purple-100">
                              Terminar <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                          {order.status === 'Listo' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'Entregado'); }} variant="ghost" className="h-8 px-2 text-green-600 hover:bg-green-100">
                              Entregar <CheckCircle2 className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
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
              }}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Nuevo Pedido</h2>
            
            <form onSubmit={handleCreateOrder} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 ml-1">Cliente *</label>
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
                  <label className="block text-sm font-medium mb-1.5 ml-1">Fecha y Hora de Entrega *</label>
                  <input 
                    type="datetime-local" 
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </div>

              <div className="bg-secondary/10 p-5 rounded-2xl border border-border/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Conceptos del Pedido
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      onClick={() => setShowCatalogModal(true)}
                      className="bg-primary hover:bg-primary/90 text-white shadow-sm gap-2 h-9"
                    >
                      <Search className="w-4 h-4" />
                      Catálogo
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setShowCakeModal(true)}
                      className="bg-pink-100 hover:bg-pink-200 text-pink-700 shadow-sm border border-pink-200 gap-2 h-9"
                    >
                      <Plus className="w-4 h-4" />
                      Personalizado
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {orderItemsCart.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No hay productos agregados al pedido.
                    </div>
                  ) : (
                    orderItemsCart.map((item) => (
                      <div key={item.local_id} className="flex justify-between items-start p-3 bg-background border border-border rounded-xl shadow-sm">
                        <div className="flex-1 pr-4">
                          <p className="text-sm font-bold whitespace-pre-wrap">{item.custom_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">Cantidad: {item.quantity} x ${(item.price).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="font-bold text-primary">${(item.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          <button 
                            type="button"
                            onClick={() => removeOrderItem(item.local_id)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {orderItemsCart.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-bold text-muted-foreground">Total Calculado:</span>
                    <span className="text-xl font-black text-foreground">${getTotalAmount().toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
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
                <label className="block text-sm font-medium mb-1.5 ml-1">Notas del Pedido (Opcional)</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white mt-6 shadow-lg shadow-primary/25"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Crear Pedido"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal De Catálogo (Visual) */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-4xl rounded-3xl p-6 shadow-2xl border border-border flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4 shrink-0">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Search className="w-6 h-6 text-primary" />
                Catálogo de Productos
              </h3>
              <button onClick={() => setShowCatalogModal(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => {
                      setSelectedCatalogProductId(p.id);
                      setCatalogExtras({ is3Leches: false, cakeFlavor: "Vainilla", isFilled: false });
                    }}
                    className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${selectedCatalogProductId === p.id ? 'border-primary ring-4 ring-primary/20 scale-[1.02] shadow-xl' : 'border-border/50 hover:border-primary/50 hover:shadow-md bg-card'}`}
                  >
                    <div className="aspect-[4/3] bg-secondary/30 relative">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <Package className="w-10 h-10 opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold text-primary">
                        {p.category}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-sm text-foreground line-clamp-1">{p.name}</h4>
                      <p className="text-primary font-black mt-1">${p.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedCatalogProductId && (
              <div className="mt-6 pt-6 border-t border-border shrink-0 bg-secondary/10 p-4 rounded-2xl">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <label className="block text-xs font-bold mb-1 text-muted-foreground uppercase">Cantidad</label>
                        <div className="flex items-center bg-background border border-border rounded-xl overflow-hidden">
                          <button 
                            type="button"
                            onClick={() => setCatalogQuantity(Math.max(1, catalogQuantity - 1))}
                            className="px-3 py-2 bg-secondary/30 hover:bg-secondary/60 text-foreground font-bold transition-colors select-none"
                          >
                            -
                          </button>
                          <input 
                            type="number"
                            min="1"
                            value={catalogQuantity || ""}
                            onChange={(e) => setCatalogQuantity(parseInt(e.target.value) || 1)}
                            className="w-full px-0 py-2 bg-transparent text-center font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button 
                            type="button"
                            onClick={() => setCatalogQuantity(catalogQuantity + 1)}
                            className="px-3 py-2 bg-secondary/30 hover:bg-secondary/60 text-foreground font-bold transition-colors select-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {products.find(p => p.id === selectedCatalogProductId)?.category === "Pasteles" && (
                        <div className="flex-1 flex gap-4">
                          <div className="flex items-center gap-2 mt-4">
                            <input 
                              type="checkbox" 
                              id="catIs3Leches"
                              checked={catalogExtras.is3Leches}
                              onChange={(e) => setCatalogExtras(prev => ({...prev, is3Leches: e.target.checked}))}
                              className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                            />
                            <label htmlFor="catIs3Leches" className="text-sm font-bold text-foreground">3 Leches (+${settings?.tres_leches_extra_price || 5})</label>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-bold mb-1 text-muted-foreground uppercase">Sabor</label>
                            <select 
                              value={catalogExtras.cakeFlavor}
                              onChange={e => setCatalogExtras(prev => ({...prev, cakeFlavor: e.target.value}))}
                              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="N/A">Sin especificar</option>
                              <option value="Vainilla">Vainilla</option>
                              <option value="Chocolate">Chocolate</option>
                              <option value="Red Velvet">Red Velvet</option>
                            </select>
                          </div>
                        </div>
                      )}
                      
                      {products.find(p => p.id === selectedCatalogProductId)?.category === "Galletas" && (
                        <div className="flex items-center gap-2 mt-4">
                          <input 
                            type="checkbox" 
                            id="catIsFilled"
                            checked={catalogExtras.isFilled}
                            onChange={(e) => setCatalogExtras(prev => ({...prev, isFilled: e.target.checked}))}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                          <label htmlFor="catIsFilled" className="text-sm font-bold text-foreground">Rellena (+${settings?.cookie_filling_extra_price || 5})</label>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative w-full">
                      <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text"
                        value={catalogComments}
                        onChange={e => setCatalogComments(e.target.value)}
                        placeholder="Comentarios o dedicatoria (Opcional)..."
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-end shrink-0">
                    <Button onClick={addCatalogItem} className="bg-primary hover:bg-primary/90 text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                      Agregar al Pedido
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Armar Pastel Personalizado */}
      {showCakeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border">
            <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Cake className="w-6 h-6 text-pink-500" />
                Armar Pastel
              </h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">Descripción / Nombre</label>
                <select 
                  value={customCake.name}
                  onChange={e => setCustomCake({...customCake, name: e.target.value})}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                >
                  <option value="">Selecciona el tamaño...</option>
                  <option value="Pastel mini">Pastel mini</option>
                  <option value="Pastel chico">Pastel chico</option>
                  <option value="Pastel mediano">Pastel mediano</option>
                  <option value="Pastel grande">Pastel grande</option>
                  <option value="Pastel XL">Pastel XL</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-pink-500">Tipo de Pan</label>
                  <select 
                    value={customCake.pan}
                    onChange={e => setCustomCake({...customCake, pan: e.target.value})}
                    className="w-full px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option>Vainilla</option>
                    <option>Chocolate</option>
                    <option>Red Velvet</option>
                    <option>Zanahoria</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-pink-500">Relleno</label>
                  <select 
                    value={customCake.relleno}
                    onChange={e => setCustomCake({...customCake, relleno: e.target.value})}
                    className="w-full px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option>Chocolate</option>
                    <option>Fresa</option>
                    <option>Cajeta</option>
                    <option>Queso Crema</option>
                    <option>Sin Relleno</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-pink-500">Betún</label>
                  <select 
                    value={customCake.betun}
                    onChange={e => setCustomCake({...customCake, betun: e.target.value})}
                    className="w-full px-3 py-2 bg-pink-50/50 border border-pink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option>Chantilly</option>
                    <option>Buttercream</option>
                    <option>Fondant</option>
                    <option>Queso</option>
                    <option>Merengue</option>
                    <option>Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">Cantidad</label>
                  <div className="flex items-center bg-background border border-border rounded-xl overflow-hidden w-32">
                    <button 
                      type="button"
                      onClick={() => setCustomCake({...customCake, quantity: Math.max(1, customCake.quantity - 1)})}
                      className="px-3 py-2 bg-secondary/30 hover:bg-secondary/60 text-foreground font-bold transition-colors select-none"
                    >
                      -
                    </button>
                    <input 
                      type="number"
                      min="1"
                      value={customCake.quantity || ""}
                      onChange={(e) => setCustomCake({...customCake, quantity: parseInt(e.target.value) || 1})}
                      className="w-full px-0 py-2 bg-transparent text-center font-bold focus:outline-none text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button 
                      type="button"
                      onClick={() => setCustomCake({...customCake, quantity: customCake.quantity + 1})}
                      className="px-3 py-2 bg-secondary/30 hover:bg-secondary/60 text-foreground font-bold transition-colors select-none"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-foreground">Precio Unitario ($)</label>
                  <input 
                    type="number" 
                    value={customCake.price}
                    onChange={e => setCustomCake({...customCake, price: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-foreground">Detalles Extra</label>
                <div className="relative w-full">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea 
                    value={customCake.comments}
                    onChange={e => setCustomCake({...customCake, comments: e.target.value})}
                    placeholder="Color rosa pastel, con perlas comestibles..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
              <Button variant="ghost" onClick={() => setShowCakeModal(false)}>
                Cancelar
              </Button>
              <Button onClick={addCustomCakeItem} className="bg-primary hover:bg-primary/90 text-white px-6">
                Agregar Pastel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalles del Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-[2.5rem] p-8 shadow-xl border border-border/50 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="absolute top-6 right-6 p-2 bg-secondary/50 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            
            <div className="mb-6 pr-8">
              <span className={`inline-flex mb-4 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md border items-center gap-1 ${StatusColor({status: selectedOrder.status})}`}>
                <StatusIcon status={selectedOrder.status} />
                {selectedOrder.status}
              </span>
              <h2 className="text-2xl font-bold text-foreground">{selectedOrder.clients?.name || 'Cliente Eliminado'}</h2>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 font-medium">
                <Calendar className="w-4 h-4" />
                Entrega: {new Date(selectedOrder.delivery_date).toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-secondary/20 rounded-2xl p-4 border border-border/50">
                <h4 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wider">Conceptos del Pedido</h4>
                <ul className="space-y-4">
                  {selectedOrder.order_items?.map((item: any, idx: number) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <Tag className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{item.custom_name || item.catalog_products?.name}</span>
                    </li>
                  ))}
                  {(!selectedOrder.order_items || selectedOrder.order_items.length === 0) && (
                    <span className="text-sm text-muted-foreground">Sin conceptos detallados</span>
                  )}
                </ul>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-bold text-sm text-muted-foreground mb-2 uppercase tracking-wider">Notas Adicionales</h4>
                  <p className="text-sm bg-secondary/30 p-4 rounded-2xl border border-border/50 whitespace-pre-wrap leading-relaxed">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="bg-primary/5 rounded-2xl p-5 border border-primary/20 flex justify-between items-center mt-8">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Anticipo</p>
                  <p className="text-xl font-bold">${(selectedOrder.advance_payment || 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary uppercase mb-1">Costo Total</p>
                  <p className="text-3xl font-bold text-primary">${(selectedOrder.total_amount || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
