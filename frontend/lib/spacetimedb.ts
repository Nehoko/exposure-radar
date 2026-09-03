import type { Identity } from "spacetimedb";
import { DbConnection } from "../src/module_bindings/index.ts";

export interface SpacetimeDbConfig {
  host: string;
  port: string;
  databaseName: string;
}

export interface ConnectionCallbacks {
  onConnected?: (connection: DbConnection, identity: Identity) => void;
  onDisconnected?: (error: Error | null) => void;
  onError?: (error: Error) => void;
}

export function connectToSpacetimeDB(
  config: SpacetimeDbConfig,
  callbacks: ConnectionCallbacks = {},
): DbConnection {
  const host = resolveHost(config.host, config.port);
  const tokenKey = `${host}/${config.databaseName}/auth_token`;
  const savedToken = localStorage.getItem(tokenKey) ?? undefined;

  return DbConnection.builder()
    .withUri(host)
    .withDatabaseName(config.databaseName)
    .withToken(savedToken)
    .onConnect((connection, identity, token) => {
      localStorage.setItem(tokenKey, token);
      callbacks.onConnected?.(connection, identity);
    })
    .onConnectError((_ctx, error) => callbacks.onError?.(error))
    .onDisconnect((_ctx, error) => callbacks.onDisconnected?.(error ?? null))
    .build();
}

export function forgetSpacetimeDBToken(config: SpacetimeDbConfig): void {
  const host = resolveHost(config.host, config.port);
  localStorage.removeItem(`${host}/${config.databaseName}/auth_token`);
}

function resolveHost(configuredHost: string, configuredPort: string): string {
  if (configuredHost !== "auto") return configuredHost;

  const location = globalThis.location;
  if (location === undefined) return "http://127.0.0.1:3000";

  return `${location.protocol}//${location.hostname}:${configuredPort}`;
}
