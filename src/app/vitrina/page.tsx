"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ShoppingCart, Send, Loader2, Cake, Plus, Minus, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VitrinaPage() {
  const [storeName, setStoreName] = useState("Cargando...");
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadStore() {
      // Load business name
      const { data: settings } = await supabase.from("business_settings").select("store_name").single();
      if (settings) {
        setStoreName(settings.store_name);
      } else {
        setStoreName("Pastelería");
      }

      // Load public catalog
      const { data: products } = await supabase
        .from("catalog_products")
        .select("*")
        .order("name");
      
      if (products) {
        setCatalog(products);
      }
      setLoading(false);
    }
    loadStore();
  }, []);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryDate) {
      alert("Por favor llena los campos obligatorios.");
      return;
    }
    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create client if not exists (or find by phone)
      let clientId = null;
      const { data: existingClients } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", customerPhone);
      
      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from("clients")
          .insert({ name: customerName, phone: customerPhone, email: "vitrina@web.com" })
          .select()
          .single();
        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }

      // 2. Create quote
      const totalAmount = 0; // Prices are hidden
      const { data: quote, error: quoteErr } = await supabase
        .from("quotes")
        .insert({
          client_id: clientId,
          status: "pending",
          delivery_date: new Date(deliveryDate).toISOString(),
          total_amount: totalAmount,
          notes: `[SOLICITUD WEB] ${details}`
        })
        .select()
        .single();
      
      if (quoteErr) throw quoteErr;

      // 3. Add items to quote_items
      const itemsToInsert = cart.map(item => ({
        quote_id: quote.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: 0,
        details: item.name
      }));

      const { error: itemsErr } = await supabase
        .from("quote_items")
        .insert(itemsToInsert);
      
      if (itemsErr) throw itemsErr;

      setOrderSuccess(true);
      setCart([]);
    } catch (error) {
      console.error(error);
      alert("Hubo un error al enviar tu solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdf2f8]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-[#fdf2f8]">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 mx-auto">
          <Send className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-4">¡Solicitud Enviada!</h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          Hemos recibido tu solicitud de cotización correctamente. Nos pondremos en contacto contigo al {customerPhone} a la brevedad.
        </p>
        <Button onClick={() => setOrderSuccess(false)} className="rounded-xl h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90">
          Volver a la Vitrina
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-2xl mx-auto min-h-[100dvh] relative">
      {/* Header */}
      <div className="bg-white px-6 py-8 rounded-b-3xl shadow-sm border-b border-pink-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, #ec4899 2px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4 border border-primary/20 shadow-inner relative z-10">
          <Cake className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight relative z-10">{storeName}</h1>
        <div className="mt-4 inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-1.5 rounded-full text-sm font-semibold relative z-10">
          <BookOpen className="w-4 h-4" /> Catálogo en Línea
        </div>
      </div>

      {/* Intro */}
      <div className="px-6 py-8 text-center">
        <p className="text-muted-foreground">Explora nuestros deliciosos productos, agrega lo que te guste y envíanos una solicitud para cotizarte sin compromiso. ¡Lo hacemos con amor!</p>
      </div>

      {/* Catalog Grid */}
      <div className="px-4 grid grid-cols-1 gap-4">
        {catalog.map(product => (
          <div key={product.id} className="bg-white rounded-3xl p-5 shadow-sm border border-pink-50 flex items-center gap-4">
            <div className="w-20 h-20 bg-pink-50 rounded-2xl flex items-center justify-center shrink-0 border border-pink-100">
              <Cake className="w-8 h-8 text-pink-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-foreground leading-tight">{product.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description || "Pastel delicioso"}</p>
              {product.category && (
                <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 bg-secondary text-secondary-foreground rounded-lg">{product.category}</span>
              )}
            </div>
            <Button size="icon" onClick={() => addToCart(product)} className="shrink-0 rounded-2xl w-12 h-12 shadow-md shadow-primary/20">
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        ))}
        {catalog.length === 0 && (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-pink-200">
            <p className="text-muted-foreground">El catálogo está vacío.</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-2xl mx-auto">
          <Button 
            onClick={() => setIsCartOpen(true)}
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-2xl shadow-primary/40 flex items-center justify-between px-6 bg-primary text-white hover:bg-primary/90"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1 rounded-xl text-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</div>
              <span>Ver Solicitud</span>
            </div>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl mx-auto rounded-t-3xl shadow-2xl h-[90dvh] flex flex-col relative animate-in slide-in-from-bottom-full duration-300">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                Tu Solicitud
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-secondary rounded-full text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Items */}
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-secondary/30 p-4 rounded-2xl">
                    <div className="flex-1 pr-4">
                      <p className="font-bold line-clamp-1">{item.name}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-border">
                      <button onClick={() => {
                        if (item.quantity === 1) removeItem(item.id);
                        else updateQuantity(item.id, -1);
                      }} className="w-8 h-8 flex items-center justify-center bg-secondary rounded-lg hover:bg-muted text-foreground">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-lg shadow-sm">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form */}
              <div className="bg-pink-50 p-6 rounded-3xl space-y-4 border border-pink-100">
                <h3 className="font-bold text-lg text-pink-900 mb-2">Tus Datos de Contacto</h3>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-pink-800">Nombre completo *</label>
                  <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-4 py-3 rounded-xl border-0 ring-1 ring-pink-200 focus:ring-2 focus:ring-primary shadow-sm text-foreground bg-white" placeholder="Ej. María Pérez" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-pink-800">WhatsApp *</label>
                  <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border-0 ring-1 ring-pink-200 focus:ring-2 focus:ring-primary shadow-sm text-foreground bg-white" placeholder="Ej. 8123456789" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-pink-800">Fecha de entrega deseada *</label>
                  <input type="date" required value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border-0 ring-1 ring-pink-200 focus:ring-2 focus:ring-primary shadow-sm text-foreground bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-pink-800">Detalles o comentarios (Opcional)</label>
                  <textarea value={details} onChange={e => setDetails(e.target.value)} className="w-full px-4 py-3 rounded-xl border-0 ring-1 ring-pink-200 focus:ring-2 focus:ring-primary shadow-sm text-foreground bg-white" rows={2} placeholder="Temática, colores, etc."></textarea>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border bg-white shrink-0">
              <Button disabled={isSubmitting || cart.length === 0} onClick={submitQuote} className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-white hover:bg-primary/90">
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Enviar Solicitud"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
