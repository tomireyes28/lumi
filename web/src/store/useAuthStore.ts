import { publicUserSchema } from "@/lib/contracts";
import { create } from "zustand";
export type User = import("@/lib/contracts").PublicUserDto;
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  clear: () => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
function removeLegacy() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("lumi_token");
    localStorage.removeItem("lumi_user");
    document.cookie = "lumi_token=; Path=/; Max-Age=0; SameSite=Lax";
  }
}
function broadcast() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("lumi-auth");
    channel.postMessage("changed");
    channel.close();
  }
}
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => {
    removeLegacy();
    set({ user, isAuthenticated: true });
    broadcast();
  },
  clear: () => {
    removeLegacy();
    set({ user: null, isAuthenticated: false });
  },
  refresh: async () => {
    removeLegacy();
    if (!window.location.pathname.startsWith("/dashboard")) return;
    try {
      const response = await fetch("/api/backend/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        get().clear();
        if (window.location.pathname.startsWith("/dashboard"))
          window.location.replace("/");
        return;
      }
      if (response.ok) {
        const payload: unknown = await response.json();
        const user = publicUserSchema.parse(payload);
        set({ user, isAuthenticated: true });
      }
    } catch {
      /* A transient failure does not confirm logout. */
    }
  },
  logout: async () => {
    const response = await fetch("/api/backend/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok && response.status !== 401)
      throw new Error("No se pudo cerrar la sesión. Reintentá.");
    get().clear();
    broadcast();
  },
}));
