declare module "node-imap" {
  import { EventEmitter } from "events";

  interface Box {
    name: string;
  }

  class Connection extends EventEmitter {
    constructor(config: Record<string, unknown>);
    connect(): void;
    openBox(
      mailbox: string,
      readOnly: boolean,
      cb: (err: Error | null, box?: Box) => void
    ): void;
    search(
      criteria: unknown[],
      cb: (err: Error | null, results?: number[]) => void
    ): void;
    fetch(source: number | number[], options: { bodies: string }): EventEmitter;
    end(): void;
  }

  export = Connection;
}
