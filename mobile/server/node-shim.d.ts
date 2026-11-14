// Minimal types for the few Node APIs the AI server uses. The app has no @types/node and
// this keeps it that way (no new dependency). Only what ai-server.ts touches is declared.
declare module 'node:http' {
  interface IncomingMessage {
    method?: string;
    url?: string;
    socket: { remoteAddress?: string };
    setEncoding(encoding: 'utf8'): void;
    on(event: 'data', listener: (chunk: string) => void): this;
    on(event: 'end', listener: () => void): this;
    destroy(): void;
  }
  interface ServerResponse {
    writableEnded: boolean;
    setHeader(name: string, value: string): void;
    writeHead(status: number, headers?: Record<string, string>): this;
    end(body?: string): void;
  }
  interface Server {
    listen(port: number, host: string, callback: () => void): void;
  }
  export function createServer(
    handler: (req: IncomingMessage, res: ServerResponse) => void,
  ): Server;
}
