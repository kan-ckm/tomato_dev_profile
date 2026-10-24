"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

export type NavTab = "overview" | "projects";

interface TabNavigationContextValue {
  activeTab: NavTab;
  switchTab: (tab: NavTab) => void;
}

const TabNavigationContext = createContext<TabNavigationContextValue | null>(
  null
);

export function TabNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      return p.startsWith("/projects") ? "projects" : "overview";
    }
    return pathname?.startsWith("/projects") ? "projects" : "overview";
  });

  const switchTab = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    const targetUrl = tab === "projects" ? "/projects" : "/";
    if (typeof window !== "undefined" && window.location.pathname !== targetUrl) {
      window.history.pushState(null, "", targetUrl);
      document.title =
        tab === "projects" ? "TOMATODEVS — MY PROJECTS" : "TOMATODEVS — PROFILE";
    }
  }, []);

  // Đồng bộ khi người dùng bấm nút Back / Forward trên trình duyệt (PopState)
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      const tab: NavTab = p.startsWith("/projects") ? "projects" : "overview";
      setActiveTab(tab);
      document.title =
        tab === "projects" ? "TOMATODEVS — MY PROJECTS" : "TOMATODEVS — PROFILE";
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Đồng bộ khi pathname thay đổi từ bên ngoài (e.g. Next.js router)
  useEffect(() => {
    if (pathname) {
      const tab: NavTab = pathname.startsWith("/projects") ? "projects" : "overview";
      setActiveTab((prev) => (prev !== tab ? tab : prev));
    }
  }, [pathname]);

  return (
    <TabNavigationContext.Provider value={{ activeTab, switchTab }}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation() {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error(
      "useTabNavigation must be used within a TabNavigationProvider"
    );
  }
  return context;
}
