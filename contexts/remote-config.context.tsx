"use client";

import { createContext, useContext, useState, type PropsWithChildren, useEffect } from "react";

import { useToast } from "@/hooks/use-toast";

interface RemoteConfigContext {
  jstzDexUrl?: string;
  jstzFaucetUrl?: string;
}

const RemoteConfigContext = createContext<RemoteConfigContext>({} as RemoteConfigContext);

export function RemoteConfigContextProvider({ children }: PropsWithChildren) {
  const { showToast } = useToast();
  const [jstzDexUrl, setJstzDexUrl] = useState("");
  const [jstzFaucetUrl, setJstzFaucetUrl] = useState("");

  useEffect(() => {
    void fetchRemoteConfig();
  }, []);


  function formatUrl(url: string) {
    return url.replace(/\/$/, "");
  }

  async function fetchRemoteConfig() {
    try {
      const rawData = await fetch("http://localhost:8080/remote-config");

      if (!rawData.ok) {
        throw new Error("Failed to fetch remote config");
      }

      const data = await rawData.json();

      console.log( data)

      if (data.error) {
        throw new Error(data.message);
      }

      const dexAddress = formatUrl(data.JSTZ_DEX_ADDRESS)
      const faucetAddress = formatUrl(data.JSTZ_FAUCET_ADDRESS)

      localStorage.setItem("remote-config", JSON.stringify({
        JSTZ_DEX_ADDRESS: dexAddress,
        JSTZ_FAUCET_ADDRESS: faucetAddress,
      }));

      setJstzDexUrl(dexAddress);
      setJstzFaucetUrl(faucetAddress);
    } catch (error) {
      console.error("Failed to fetch remote config:", error);
      if (error instanceof Error) {
        showToast(error.message, 500);
      }
    }
  }

  return (
    <RemoteConfigContext value={{ jstzDexUrl, jstzFaucetUrl }}>{children}</RemoteConfigContext>
  );
}

export function useRemoteConfigContext() {
  return useContext(RemoteConfigContext);
}
