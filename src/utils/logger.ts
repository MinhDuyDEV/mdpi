// Minimal leveled logger for the mdpi CLI.
// Respects --quiet (suppress all) and --verbose (show debug).

type Level = "debug" | "info" | "warn" | "error";

const WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let threshold: Level = "info";

export function setLogLevel(level: Level): void {
  threshold = level;
}

function emit(level: Level, message: string): void {
  if (WEIGHT[level] < WEIGHT[threshold]) return;
  const tag =
    level === "error" ? "error:" : level === "warn" ? "warn:" : level === "debug" ? "debug:" : "";
  if (level === "error") console.error(tag ? `${tag} ${message}` : message);
  else console.log(tag ? `${tag} ${message}` : message);
}

export const logger = {
  debug: (msg: string) => emit("debug", msg),
  info: (msg: string) => emit("info", msg),
  warn: (msg: string) => emit("warn", msg),
  error: (msg: string) => emit("error", msg),
};