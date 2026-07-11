"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface BusinessSettings {
  id: string;
  store_name: string;
  currency: string;
  tax_rate: number;
}

interface UserProfile {
  id: string;
  role: "admin" | "staff" | "pending";
  full_name: string | null;
}

interface SettingsContextType {
  settings: BusinessSettings | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  profile: null,
  loading: true,
  refreshSettings: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSettings = async () => {
    try {
      // Fetch Business Settings
      const { data: businessData } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (businessData) {
        setSettings(businessData);
      }

      // Fetch User Profile
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        } else {
          // Fallback if profile not created yet
          setProfile({
            id: userData.user.id,
            role: "admin", // fallback to admin so the owner isn't locked out before syncing
            full_name: userData.user.user_metadata?.full_name || null
          });
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, profile, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
