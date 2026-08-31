export const MARKET_DATA_USER_AGENT = "ExposureRadar/0.1";

export function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function secondsToMicros(value: unknown): bigint | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? BigInt(value) * 1_000_000n
    : undefined;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "request failed";
}
