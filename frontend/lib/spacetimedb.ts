import type { Identity } from "spacetimedb";
import { DbConnection } from "../src/module_bindings/index.ts";

const HOST = resolveHost(getRequiredEnv("VITE_SPACETIMEDB_HOST"));
const DATABASE_NAME = getRequiredEnv("VITE_SPACETIMEDB_DB_NAME");
const TOKEN_KEY = `${HOST}/${DATABASE_NAME}/auth_token`;

export interface ConnectionCallbacks {
  onConnected?: (connection: DbConnection, identity: Identity) => void;
  onDisconnected?: (error: Error | null) => void;
  onError?: (error: Error) => void;
}

export function connectToSpacetimeDB(
  callbacks: ConnectionCallbacks = {},
): DbConnection {
  const savedToken = localStorage.getItem(TOKEN_KEY) ?? undefined;

  return DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(DATABASE_NAME)
    .withToken(savedToken)
    .onConnect((connection, identity, token) => {
      localStorage.setItem(TOKEN_KEY, token);
      callbacks.onConnected?.(connection, identity);
    })
    .onConnectError((_ctx, error) => callbacks.onError?.(error))
    .onDisconnect((_ctx, error) => callbacks.onDisconnected?.(error ?? null))
    .build();
}

export function forgetSpacetimeDBToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function getRequiredEnv(name: string): string {
  const env = import.meta.env[name];
  if (env === undefined) {
    throw new Error(`Missing required env: ${name}`);
  }
  return env;
}

function resolveHost(configuredHost: string): string {
  if (configuredHost !== "auto") return configuredHost;

  const location = globalThis.location;
  if (location === undefined) return "http://127.0.0.1:3000";

  return `${location.protocol}//${location.hostname}:3000`;
}
