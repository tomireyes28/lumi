"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
export default function SessionBootstrap() {
  useEffect(() => {
    const refresh = () => {
      void useAuthStore.getState().refresh();
    };
    refresh();
    window.addEventListener("focus", refresh);
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("lumi-auth")
        : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      window.removeEventListener("focus", refresh);
      channel?.close();
    };
  }, []);
  return null;
}
