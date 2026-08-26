import { useEffect, useState } from "preact/hooks";
import { connectToSpacetimeDB } from "../lib/spacetimedb.ts";
import { tables } from "../src/module_bindings/index.ts";

type Status = "connecting" | "connected" | "disconnected" | "error";

export default function SpacetimeStatus() {
  const [status, setStatus] = useState<Status>("connecting");
  const [identity, setIdentity] = useState<string>();
  const [peopleCount, setPeopleCount] = useState<bigint>(0n);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let disposed = false;

    const connection = connectToSpacetimeDB({
      onConnected(conn, identityHex) {
        if (disposed) return;
        setStatus("connected");
        setIdentity(identityHex);
        setErrorMessage(undefined);

        const updatePeopleCount = () => {
          setPeopleCount(conn.db.person.count());
        };

        conn.db.person.onInsert((ctx, _person) => {
          if (disposed) return;
          setPeopleCount(ctx.db.person.count());
        });
        conn.db.person.onDelete((ctx, _person) => {
          if (disposed) return;
          setPeopleCount(ctx.db.person.count());
        });
        conn.subscriptionBuilder()
          .onApplied(() => {
            if (disposed) return;
            updatePeopleCount();
          })
          .onError((ctx) => {
            if (disposed) return;
            setStatus("error");
            setErrorMessage(ctx.event?.message ?? "Subscription failed");
          })
          .subscribe(tables.person);
      },
      onDisconnected(error) {
        if (disposed) return;
        setStatus("disconnected");
        if (error) {
          setErrorMessage(error.message);
        }
      },
      onError(error) {
        if (disposed) return;
        setStatus("error");
        setErrorMessage(error.message);
      },
    });

    return () => {
      disposed = true;
      connection.disconnect();
    };
  }, []);

  const labels: Record<Status, string> = {
    connecting: "Connecting",
    connected: "Connected",
    disconnected: "Disconnected",
    error: "Connection failed",
  };

  return (
    <div
      class={`connection-status connection-${status}`}
      role={status === "error" ? "alert" : "status"}
      aria-live="polite"
      title={errorMessage}
    >
      <span class="connection-dot" aria-hidden="true" />
      <span class="connection-copy">
        <strong>{labels[status]}</strong>
        <span>
          {status === "connected"
            ? `${peopleCount} ${peopleCount === 1n ? "person" : "people"}${
              identity ? ` · ${identity.slice(0, 8)}…` : ""
            }`
            : errorMessage ?? "Opening a live connection"}
        </span>
      </span>
    </div>
  );
}
