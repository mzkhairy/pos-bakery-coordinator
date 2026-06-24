export const logger = {
  info: (msg: string, meta?: object) =>
    console.log(`[Coordinator] [INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: object) =>
    console.warn(`[Coordinator] [WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: object) =>
    console.error(`[Coordinator] [ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
};
