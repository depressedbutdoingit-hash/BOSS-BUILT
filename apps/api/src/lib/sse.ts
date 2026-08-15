import type { Response } from "express";

export function initSSE(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const close = () => {
    try {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch {
      /* client gone */
    }
  };

  return { send, close };
}
