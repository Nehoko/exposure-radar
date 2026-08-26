export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface ConnectionStatusProps {
  status: ConnectionState;
  identity?: string;
  error?: string;
}

const labels: Record<ConnectionState, string> = {
  connecting: "Connecting",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Connection failed",
};

export default function ConnectionStatus(
  { status, identity, error }: ConnectionStatusProps,
) {
  return (
    <div
      class={`connection-status connection-${status}`}
      role={status === "error" ? "alert" : "status"}
      aria-live="polite"
      title={error}
    >
      <span class="connection-dot" aria-hidden="true" />
      <span class="connection-copy">
        <strong>{labels[status]}</strong>
        <span>
          {status === "connected"
            ? identity ? `${identity.slice(0, 8)}…` : "Live data ready"
            : error ?? "Opening a live connection"}
        </span>
      </span>
    </div>
  );
}
