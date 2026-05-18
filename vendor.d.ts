declare module "msgpack-js" {
  export function encode(data: unknown): Buffer;
  export function decode(data: Buffer): unknown;
}

declare module "gelf" {
  class Gelf {
    constructor(options?: Record<string, any>);
    emit(event: string, entry: Record<string, any>): void;
  }

  export = Gelf;
}

declare module "punycode.js" {
  export function toASCII(domain: string): string;
  export function toUnicode(domain: string): string;
}
