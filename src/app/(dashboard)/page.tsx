"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Cake, 
  Calendar, 
  ChevronRight, 
  CreditCard, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  Users,
  Loader2,
  Filter,
  Gift,
  Receipt,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ventas: 0,
    inversion: 0,
    ganancia: 0,
    margen: 0,
    pedidosHoy: 0,
    entregasPendientes: 0,
    pagosPendientes: 0,
  });
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState("mes");
  const [upcomingOrders, setUpcomingOrders] = useState<any[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Fetch Orders
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        *, 
        clients(name),
        order_items(
          custom_name,
          catalog_products(name)
        ),
        order_ingredients(
          quantity_used,
          inventory_items(cost)
        )
      `)
      .order('delivery_date', { ascending: true });

    // Fetch Expenses
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('*');

    if (orders) setAllOrders(orders);
    if (expensesData) setAllExpenses(expensesData);

    // Fetch Low Stock Inventory
    const { data: inventoryData } = await supabase.from('inventory_items').select('*');
    if (inventoryData) {
      setLowStockItems(inventoryData.filter((item: any) => item.stock <= item.min_stock));
    }

    // Fetch Clients for birthdays
    const { data: clientsData } = await supabase.from('clients').select('id, name, whatsapp, birthdate');
    if (clientsData) {
      const today = new Date();
      const currentYear = today.getFullYear();
      
      const birthdays = clientsData
        .filter(c => c.birthdate)
        .map(c => {
          // Parse as local noon to avoid timezone shift
          const bday = new Date(c.birthdate + "T12:00:00");
          let nextBirthdayDate = new Date(currentYear, bday.getMonth(), bday.getDate());
          
          // If birthday already passed this year, set to next year
          if (nextBirthdayDate.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
            nextBirthdayDate.setFullYear(currentYear + 1);
          }
          
          const diffTime = nextBirthdayDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            ...c,
            daysUntil: diffDays,
            formattedDate: nextBirthdayDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
          };
        })
        .filter(c => c.daysUntil >= 0 && c.daysUntil <= 30) // Within 30 days
        .sort((a, b) => a.daysUntil - b.daysUntil);
        
      setUpcomingBirthdays(birthdays);
    }

    setLoading(false);
  };

  useEffect(() => {
    let filteredOrders = allOrders;
    let filteredExpenses = allExpenses;
    const now = new Date();
    
    if (dateFilter === "semana") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      filteredOrders = allOrders.filter(o => {
        const d = new Date(o.delivery_date);
        return d >= startOfWeek && d <= endOfWeek;
      });
      filteredExpenses = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= startOfWeek && d <= endOfWeek;
      });
    } else if (dateFilter === "mes") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filteredOrders = allOrders.filter(o => {
        const d = new Date(o.delivery_date);
        return d >= startOfMonth && d <= endOfMonth;
      });
      filteredExpenses = allExpenses.filter(e => {
        const d = new Date(e.date);
        return d >= startOfMonth && d <= endOfMonth;
      });
    }

    // Stats for delivered only (profits)
    const deliveredOrders = filteredOrders.filter(o => o.status === 'Entregado');
    const totalVentas = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    // Total Expenses based on tickets for the period
    const totalCost = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const netProfit = totalVentas - totalCost;
    const profitMargin = totalVentas > 0 ? (netProfit / totalVentas) * 100 : 0;

    // pending
    const entregas = filteredOrders.filter(o => o.status !== 'Entregado').length;
    const pagosPend = filteredOrders.filter(o => o.status !== 'Entregado' && o.total_amount > (o.advance_payment || 0)).length;

    setStats({
      ventas: totalVentas,
      inversion: totalCost,
      ganancia: netProfit,
      margen: profitMargin,
      pedidosHoy: filteredOrders.length,
      entregasPendientes: entregas,
      pagosPendientes: pagosPend,
    });

    // Upcoming orders list (ignores date filter to show what's truly upcoming)
    const pendingOrders = allOrders
      .filter(o => o.status !== 'Entregado')
      .slice(0, 5)
      .map(o => {
        let statusColor = "bg-secondary text-secondary-foreground";
        if (o.status === "Pendiente") statusColor = "bg-orange-100 text-orange-700";
        if (o.status === "Produccion") statusColor = "bg-blue-100 text-blue-700";
        if (o.status === "Listo") statusColor = "bg-purple-100 text-purple-700";

        const item = o.order_items?.[0];
        const productName = item?.catalog_products?.name || item?.custom_name || "Pedido sin detalle";

        return {
          id: o.id,
          title: productName,
          time: new Date(o.delivery_date).toLocaleString(),
          client: o.clients?.name || "Desconocido",
          status: o.status,
          color: statusColor,
        };
      });
    setUpcomingOrders(pendingOrders);

  }, [allOrders, allExpenses, dateFilter]);



  const dashboardStats = [
    { label: "Ventas Totales (Cobrado)", value: `$${stats.ventas.toFixed(2)}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Gastos (Tickets)", value: `$${stats.inversion.toFixed(2)}`, icon: Receipt, color: "text-orange-500", bg: "bg-orange-100" },
    { label: "Ganancia Neta", value: `$${stats.ganancia.toFixed(2)}`, icon: TrendingUp, color: "text-green-500", bg: "bg-green-100" },
    { label: "Pedidos Activos", value: stats.entregasPendientes.toString(), icon: Cake, color: "text-blue-500", bg: "bg-blue-100" },
    { label: "Por Cobrar", value: stats.pagosPendientes.toString(), icon: CreditCard, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Margen de Ganancia", value: `${stats.margen.toFixed(0)}%`, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-100" },
  ];

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 font-sans selection:bg-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Buenos días ☀️
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Tienes <span className="font-semibold text-primary">{stats.pedidosHoy} pedidos</span> en este periodo, con <span className="font-semibold text-primary">{stats.entregasPendientes} entregas activas</span>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center bg-card border border-border/50 rounded-2xl p-1 shadow-sm h-11">
              <Filter className="w-4 h-4 text-muted-foreground ml-3 mr-2 shrink-0" />
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none py-2 pr-4 text-foreground cursor-pointer h-full"
              >
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mes</option>
                <option value="historico">Histórico</option>
              </select>
            </div>
            <Link href="/orders">
              <Button className="rounded-2xl h-11 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 w-full sm:w-auto">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Ir a Pedidos
              </Button>
            </Link>
          </div>
        </motion.header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardStats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-3xl p-6 border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Orders View */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            <div className="bg-card rounded-3xl p-6 md:p-8 border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Cake className="text-primary w-6 h-6" />
                  Próximos Pedidos
                </h2>
                <Link href="/orders">
                  <Button variant="ghost" className="text-muted-foreground hover:text-primary rounded-xl">
                    Ver todos <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-4">
                {upcomingOrders.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-border/50 rounded-2xl">
                    <p className="text-muted-foreground font-medium">No hay pedidos pendientes. ¡Es hora de vender!</p>
                  </div>
                ) : (
                  upcomingOrders.map((order, i) => (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      key={order.id} 
                      className="group flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 rounded-2xl border border-border/50 hover:border-primary/20 bg-background/50 hover:bg-background transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4 mb-3 md:mb-0">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <span className="font-bold text-secondary-foreground">{order.client.charAt(0)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg line-clamp-1">{order.title}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Users className="w-3 h-3" /> {order.client}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 justify-between md:justify-end">
                        <div className="text-right">
                          <p className="text-sm font-medium">{order.time}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.color}`}>
                          {order.status}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Side Panel (Alerts & Inventory) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Clients Birthdays */}
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-6 relative">
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Gift className="w-5 h-5 text-primary" />
                  Cumpleaños Próximos
                </h2>
                <Link href="/clients">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                    Ver todos
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-4 relative">
                {upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/60">
                    <Gift className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>No hay cumpleaños próximos</p>
                  </div>
                ) : (
                  upcomingBirthdays.map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between p-4 bg-background border border-border/40 rounded-2xl hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="font-bold text-primary">{client.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.formattedDate}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${client.daysUntil <= 7 ? 'bg-orange-100 text-orange-700' : 'bg-secondary text-secondary-foreground'}`}>
                          {client.daysUntil === 0 ? '¡Hoy!' : `Faltan ${client.daysUntil} días`}
                        </span>
                        {client.whatsapp && (
                          <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 p-8 bg-gradient-to-bl from-orange-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-between mb-6 relative">
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Inventario Bajo
                </h2>
                <Link href="/inventory">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                    Ver almacén
                  </Button>
                </Link>
              </div>
              
              <div className="space-y-4 relative">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-secondary/20 rounded-2xl border border-dashed border-border/60">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>Todo en orden en almacén</p>
                  </div>
                ) : (
                  lowStockItems.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-background border border-orange-200/50 rounded-2xl hover:border-orange-300 transition-colors">
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-orange-600">
                          {item.quantity} {item.unit}
                        </span>
                        <p className="text-xs text-muted-foreground">Mín: {item.min_quantity}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
