"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCircle, Phone, Calendar, Package, AlertCircle, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [upsellOpportunities, setUpsellOpportunities] = useState<any[]>([]);

  useEffect(() => {
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    setLoading(true);
    
    // Fetch Client
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
      
    if (clientError) {
      alert("Error al cargar cliente: " + clientError.message);
      setLoading(false);
      return;
    }
    setClient(clientData);

    // Fetch Orders with Order Items
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
      
    if (!ordersError && ordersData) {
      setOrders(ordersData);
      
      // Calculate Upsell Opportunities (Orders from ~1 year ago: 350 to 365 days)
      const now = new Date();
      const opps = ordersData.filter(order => {
        const orderDate = new Date(order.created_at);
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // If the order is between 350 and 370 days old, it's a 1-year anniversary!
        return diffDays >= 350 && diffDays <= 370;
      });
      setUpsellOpportunities(opps);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return <div className="text-center py-20">Cliente no encontrado.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <Button variant="ghost" className="mb-2 -ml-4 text-muted-foreground hover:bg-secondary" onClick={() => router.push('/clients')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a Clientes
      </Button>
      
      {/* Client Profile Header */}
      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col md:flex-row gap-8 items-start md:items-center">
        <div className="w-24 h-24 bg-primary/10 rounded-[2rem] flex items-center justify-center shrink-0">
          <UserCircle className="w-12 h-12 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-3xl font-black text-foreground tracking-tight">{client.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> {client.phone}
              </div>
            )}
            {client.whatsapp && (
              <div className="flex items-center gap-2 text-green-600">
                <MessageCircle className="w-4 h-4" /> {client.whatsapp}
              </div>
            )}
            {client.birthdate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Cumpleaños: {new Date(client.birthdate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <div className="bg-secondary/50 p-6 rounded-3xl text-center min-w-[150px]">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Compras</p>
          <p className="text-2xl font-black text-foreground">
            ${orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Upsell Alerts */}
      {upsellOpportunities.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-bold flex items-center gap-2 text-orange-700 mb-4">
            <AlertCircle className="w-6 h-6" />
            ¡Oportunidad de Presencia Comercial!
          </h2>
          <div className="space-y-4">
            {upsellOpportunities.map(opp => (
              <div key={opp.id} className="bg-white p-5 rounded-2xl border border-orange-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-orange-900 font-medium">Hace casi un año (el {new Date(opp.created_at).toLocaleDateString()}), este cliente ordenó:</p>
                  <ul className="list-disc ml-5 mt-2 text-sm text-gray-600 font-medium">
                    {opp.order_items?.map((item: any) => (
                      <li key={item.id}>{item.custom_name}</li>
                    ))}
                  </ul>
                </div>
                {client.whatsapp && (
                  <Button 
                    onClick={() => {
                      const text = `¡Hola ${client.name}! Somos Chicle Repostería. Notamos que hace casi un año confiaste en nosotros para tu pedido. Queríamos saludarte y saber si tienes alguna próxima celebración en la que podamos endulzarte el día de nuevo. ¡Estamos a tus órdenes!`;
                      window.open(`https://wa.me/${client.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white gap-2 shrink-0 rounded-xl"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar Recordatorio
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History */}
      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground mb-6">
          <Package className="w-6 h-6 text-primary" />
          Historial de Pedidos ({orders.length})
        </h2>
        
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 bg-secondary/20 rounded-2xl border border-dashed border-border">
            Este cliente aún no tiene pedidos registrados.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-sm font-bold text-muted-foreground">Pedido #{order.id.slice(0,8)}</span>
                    <p className="text-foreground font-semibold mt-1">
                      Fecha: {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === 'Entregado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {order.status}
                    </span>
                    <p className="font-black text-foreground mt-2 text-lg">
                      ${order.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                
                {order.order_items && order.order_items.length > 0 && (
                  <div className="bg-secondary/30 p-4 rounded-xl">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Artículos</p>
                    <ul className="text-sm space-y-1 font-medium text-foreground">
                      {order.order_items.map((item: any) => (
                        <li key={item.id} className="flex justify-between">
                          <span>{item.quantity}x {item.custom_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
