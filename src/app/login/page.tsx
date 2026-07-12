"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();

    try {
      const formattedEmail = email.includes("@") ? email : `${email}@chicle.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password,
      });

      if (error) throw error;
      
      window.location.href = "/";
    } catch (err: any) {
      setError("Credenciales incorrectas o el usuario no existe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card w-full max-w-md rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border/50"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-sm border border-primary/20">
            <img 
              src="/logo.png" 
              alt="Chicle Repostería" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNlYzQ4OTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMjAgMjF2LThhMiAyIDAgMCAwLTItMkg2YTIgMiAwIDAgMC0yIDJ2OCIvPjxwYXRoIGQ9Ik00IDE2cy41LTEgMi0xIDIuNSAyIDQgMiAyLjUtMiA0LTIgMi41IDIgNCAyIDItMSA0LTEiLz48cGF0aCBkPSJNMTEgMTNoMnoiLz48cGF0aCBkPSJNMTAgOWEyIDIgMCAxIDAtNCswIi8+PC9zdmc+';
              }} 
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground text-center">¡Hola de nuevo!</h1>
          <p className="text-muted-foreground mt-2 text-center">Inicia sesión en tu cuenta de SweetERP.</p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-xl mb-6 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Usuario</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Ej. hnavarro"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar al Sistema"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/register" className="text-sm text-muted-foreground hover:text-primary font-medium transition-colors">
            ¿No tienes cuenta? Regístrate aquí
          </Link>
        </div>

      </motion.div>
    </div>
  );
}
