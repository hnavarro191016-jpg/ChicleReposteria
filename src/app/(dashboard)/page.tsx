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
  Gift
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

    // Fetch Inventory
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('*');

    if (orders) setAllOrders(orders);
    
    if (inventory) {
      const alerts = inventory.filter(i => i.stock <= i.min_stock);
      setInventoryAlerts(alerts);
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
    if (allOrders.length === 0) return;

    let filteredOrders = allOrders;
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
    } else if (dateFilter === "mes") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      filteredOrders = allOrders.filter(o => {
        const d = new Date(o.delivery_date);
        return d >= startOfMonth && d <= endOfMonth;
      });
    }

    // Stats for delivered only (profits)
    const deliveredOrders = filteredOrders.filter(o => o.status === 'Entregado');
    const totalVentas = deliveredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    
    let totalCost = 0;
    deliveredOrders.forEach(o => {
      if (o.order_ingredients) {
        o.order_ingredients.forEach((ing: any) => {
          totalCost += (parseFloat(ing.quantity_used || "0") * (ing.inventory_items?.cost || 0));
        });
      }
    });

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

  }, [allOrders, dateFilter]);



  const dashboardStats = [
    { label: "Ventas Totales (Cobrado)", value: `$${stats.ventas.toFixed(2)}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
    { label: "Costo Insumos", value: `$${stats.inversion.toFixed(2)}`, icon: Package, color: "text-orange-500", bg: "bg-orange-100" },
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
            <div className="bg-gradient-to-br from-primary/10 to-secondary rounded-3xl p-6 border border-primary/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Package className="w-24 h-24" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground relative z-10">Alertas de Inventario</h3>
              <ul className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto">
                {inventoryAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-white/60 p-4 rounded-xl text-center">
                    Todo en orden. Tu inventario está sano. ✅
                  </p>
                ) : (
                  inventoryAlerts.map(item => (
                    <li key={item.id} className="flex items-center justify-between bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-destructive/20">
                      <span className="font-medium text-sm">{item.name} ({item.unit})</span>
                      <span className="text-destructive font-bold text-sm">{item.stock}</span>
                    </li>
                  ))
                )}
              </ul>
              <Link href="/inventory">
                <Button className="w-full mt-5 rounded-xl bg-white text-primary hover:bg-white/90 border border-primary/20">
                  Ver Inventario Completo
                </Button>
              </Link>
            </div>

            {/* Upcoming Birthdays Widget */}
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-3xl p-6 border border-pink-500/10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Gift className="w-24 h-24 text-pink-500" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-foreground relative z-10 flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-500" />
                Próximos Cumpleaños
              </h3>
              <ul className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto">
                {upcomingBirthdays.length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-white/60 p-4 rounded-xl text-center">
                    No hay cumpleaños próximos en los siguientes 30 días.
                  </p>
                ) : (
                  upcomingBirthdays.map((client, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-white/60 p-3 rounded-xl backdrop-blur-sm border border-pink-500/20">
                      <div>
                        <span className="font-bold text-sm block">{client.name}</span>
                        <span className="text-xs text-muted-foreground">{client.formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-pink-600 font-bold text-xs bg-pink-100 px-2 py-1 rounded-lg">
                          {client.daysUntil === 0 ? '¡Hoy!' : `Faltan ${client.daysUntil} d`}
                        </span>
                        {client.whatsapp && (
                          <a 
                            href={`https://wa.me/${client.whatsapp.replace(/\D/g,'')}?text=¡Hola ${client.name}! Vimos que se acerca tu cumpleaños y en Chicle Repostería queremos consentirte...`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-green-100 hover:bg-green-200 text-green-700 p-1.5 rounded-lg transition-colors"
                            title="Felicitar por WhatsApp"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"/></svg>
                          </a>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
