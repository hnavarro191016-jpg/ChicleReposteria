"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();

    try {
      const formattedEmail = email.includes("@") ? email : `${email}@chicle.local`;
      const { data, error } = await supabase.auth.signUp({
        email: formattedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) throw error;
      
      if (!data.session) {
        setSuccess(true);
        setError("Cuenta creada. Por favor revisa tu bandeja de entrada o spam para confirmar tu correo antes de continuar.");
        return;
      }

      setSuccess(true);
      // Wait a bit and redirect to dashboard
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      console.error("Error en registro:", err);
      let msg = "Error al crear la cuenta.";
      if (err?.name === "AuthRetryableFetchError" || err?.message?.includes("fetch")) {
        msg = "Error de conexión con el servidor. Revisa tu internet o intenta de nuevo más tarde.";
      } else if (err?.message) {
        msg = err.message;
      } else if (typeof err === "string") {
        msg = err;
      } else {
        try { msg = JSON.stringify(err, Object.getOwnPropertyNames(err)); } catch(e){}
      }
      if (msg === "{}" || msg.includes("already registered")) {
        msg = "El correo ya está registrado o el servicio de autenticación falló.";
      }
      setError(msg);
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
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Cake className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground text-center">Nueva Cuenta</h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">Crea un perfil para acceder al ERP.</p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-xl mb-6 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-100 text-green-700 p-6 rounded-xl mb-6 text-center">
            <h3 className="font-bold text-lg mb-2">¡Cuenta Creada!</h3>
            <p className="text-sm">Redirigiendo al sistema...</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Nombre Completo</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 ml-1">Usuario</label>
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().trim().replace(/\s+/g, ''))}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Ej. hnavarro"
                required
              />
              <p className="text-xs text-muted-foreground ml-1 mt-1">Usa un nombre corto, sin espacios.</p>
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
                minLength={6}
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-xl h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear Cuenta"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary font-medium transition-colors">
            ¿Ya tienes cuenta? Inicia sesión aquí
          </Link>
        </div>

      </motion.div>
    </div>
  );
}
