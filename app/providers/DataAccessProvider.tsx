/**
 * Provides the correct DataProvider (offline or online) based on the current
 * operation mode and active sync peer. Consumed via useDataAccess() hook.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useSelector } from "@xstate/react"
import * as SecureStore from "expo-secure-store"
import { useQueryClient } from "@tanstack/react-query"
import database from "@/db"
import { operationModeStore, type OperationMode } from "@/store/operationMode"
import { createCloudTransport } from "@/rpc/transport"
import Peer from "@/models/Peer"
import type { DataProvider } from "../../types/data"
import { createOfflineProvider } from "./offlineProvider"
import { createRpcProvider } from "./rpcProvider"
import { deriveProviderKind, type ProviderKind } from "./deriveProvider"

type DataAccessContextValue = {
  mode: OperationMode
  provider: DataProvider
  isOnline: boolean
}

const DataAccessContext = createContext<DataAccessContextValue | null>(null)

/** Access the current DataProvider and mode. Must be used within DataAccessProvider. */
export function useDataAccess(): DataAccessContextValue {
  const ctx = useContext(DataAccessContext)
  if (!ctx) throw new Error("useDataAccess must be used within DataAccessProvider")
  return ctx
}

type Credentials = { authHeader: string; baseUrl: string }

/** Load auth credentials from SecureStore. Prefers Bearer token, falls back to Basic auth. */
async function loadCredentials(activePeer: Peer.T | null): Promise<Credentials> {
  console.log("[DataAccess] loadCredentials started")

  const token = await SecureStore.getItemAsync("provider_token")
  let authHeader = ""

  if (token) {
    authHeader = `Bearer ${token}`
    console.log("[DataAccess] Using Bearer token (length:", authHeader.length, ")")
  } else {
    const email = await SecureStore.getItemAsync("provider_email")
    const password = await SecureStore.getItemAsync("provider_password")
    if (email && password) {
      authHeader = `Basic ${btoa(`${email}:${password}`)}`
      console.log("[DataAccess] Falling back to Basic auth (length:", authHeader.length, ")")
    } else {
      console.warn("[DataAccess] No token or credentials — auth header NOT set")
    }
  }

  const baseUrl = activePeer ? (Peer.getUrl(activePeer) ?? "") : ""
  console.log("[DataAccess] baseUrl:", baseUrl || "(empty)")
  console.log("[DataAccess] loadCredentials complete")
  return { authHeader, baseUrl }
}

const offlineProvider = createOfflineProvider(database)

/** Build the DataProvider for a given ProviderKind and credentials. */
const buildProvider = (kind: ProviderKind, credentials: Credentials | null): DataProvider => {
  switch (kind) {
    case "rpc_hub":
      console.log("[DataAccess] Creating hub RPC provider")
      return createRpcProvider(async () => {
        const transport = await Peer.Hub.getTransport()
        if (!transport) throw new Error("No hub session")
        return transport
      })

    case "rpc_cloud": {
      const { authHeader, baseUrl } = credentials ?? { authHeader: "", baseUrl: "" }
      console.log(
        "[DataAccess] Creating cloud RPC provider — baseUrl:",
        baseUrl || "(empty)",
        "hasAuth:",
        authHeader.length > 0,
      )
      const getAuth = () => authHeader
      return createRpcProvider(async () => createCloudTransport(baseUrl, getAuth))
    }

    case "unknown":
      console.warn("[DataAccess] Unknown peer type — operations will fail")
      return createRpcProvider(async () => {
        throw new Error("Unknown peer type. Cannot establish connection.")
      })

    case "offline":
    default:
      return offlineProvider
  }
}

export function DataAccessProvider({ children }: { children: React.ReactNode }) {
  const mode = useSelector(operationModeStore, (s) => s.context.mode)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [activePeer, setActivePeer] = useState<Peer.T | null>(null)
  const queryClient = useQueryClient()

  const providerKind = deriveProviderKind(mode, activePeer)

  // Clear all cached data when mode or active peer changes
  useEffect(() => {
    queryClient.clear()
  }, [mode, activePeer?.id])

  // Resolve active peer when mode is online
  useEffect(() => {
    if (mode === "online") {
      Peer.DB.resolveActive().then(setActivePeer)
    } else {
      setActivePeer(null)
    }
  }, [mode])

  // Load credentials when mode is online and active peer is resolved
  useEffect(() => {
    if (mode === "online") {
      console.log("[DataAccess] Mode is online — loading credentials")
      loadCredentials(activePeer).then(setCredentials)
    } else {
      setCredentials(null)
    }
  }, [mode, activePeer])

  const provider = useMemo(
    () => buildProvider(providerKind, credentials),
    [providerKind, credentials],
  )

  const isOnline = providerKind === "rpc_cloud" || providerKind === "rpc_hub"

  const value = useMemo(
    () => ({ mode, provider, isOnline }),
    [mode, provider, isOnline],
  )

  return <DataAccessContext.Provider value={value}>{children}</DataAccessContext.Provider>
}
