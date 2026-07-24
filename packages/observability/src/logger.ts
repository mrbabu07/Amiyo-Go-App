import pino from "pino";

export function createLogger(service: string, level = "info") {
  return pino({
    name: service,
    level,
    redact: {
      paths: ["req.headers.authorization", "*.password", "*.token", "*.secret", "*.privateKey"],
      censor: "[REDACTED]"
    }
  });
}
