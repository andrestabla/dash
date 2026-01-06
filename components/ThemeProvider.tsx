"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface BrandingSettings {
    brand_primary_color?: string;
    brand_secondary_color?: string;
    brand_logo_url?: string;
    brand_favicon_url?: string;
    brand_login_bg?: string;
}

const ThemeContext = createContext<{
    theme: Theme;
    toggleTheme: () => void;
    branding: BrandingSettings;
}>({
    theme: "light",
    toggleTheme: () => { },
    branding: {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("light");
    const [branding, setBranding] = useState<BrandingSettings>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle("dark", savedTheme === "dark");
        } else {
            document.documentElement.classList.remove("dark");
        }

        // Fetch Branding
        fetch('/api/settings/public')
            .then(res => res.json())
            .then(data => {
                setBranding(data);
                if (data.brand_primary_color) {
                    document.documentElement.style.setProperty('--primary', data.brand_primary_color);
                    // Override gradient to use the selected solid color
                    document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${data.brand_primary_color} 0%, ${data.brand_primary_color} 100%)`);
                }
                if (data.brand_secondary_color) {
                    document.documentElement.style.setProperty('--secondary', data.brand_secondary_color);
                }
                if (data.brand_favicon_url) {
                    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
                    link.type = 'image/x-icon';
                    link.rel = 'shortcut icon';
                    link.href = data.brand_favicon_url;
                    document.getElementsByTagName('head')[0].appendChild(link);
                }
            })
            .catch(err => console.error("Failed to load branding", err));

        setMounted(true);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
    };

    if (!mounted) return <>{children}</>;

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, branding }}>
            {children}
        </ThemeContext.Provider>
    );
}
