import { Identity } from "spacetimedb";
import {
  DbConnection,
  ErrorContext,
  EventContext,
  tables,
} from "./module_bindings/index.ts";

const HOST = getEnv("SPACETIMEDB_HOST", "ws://localhost:3000");
const DB_NAME = getEnv("SPACETIMEDB_DB_NAME", "exposure-radar");

DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .onConnect((conn: DbConnection, identity: Identity, _token: string) => {
    console.log("Connected to SpacetimeDB!");
    console.log(`Identity: ${identity.toHexString().slice(0, 16)}...`);

    conn.db.person.onInsert((_ctx: EventContext, person) => {
      console.log(`New person: ${person.name}`);
    });

    conn
      .subscriptionBuilder()
      .subscribe(tables.person);
  })
  .onDisconnect(() => {
    console.log("Disconnected from SpacetimeDB");
  })
  .onConnectError((_ctx: ErrorContext, error: Error) => {
    console.error("Connection error:", error);
    Deno.exit(1);
  })
  .build();

function getEnv(name: string, defaultValue: string): string {
  return Deno.env.get(name) ?? defaultValue;
}
