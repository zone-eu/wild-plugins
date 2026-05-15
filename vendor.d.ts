declare module "msgpack-js" {
  export function encode(data: unknown): Buffer;
  export function decode(data: Buffer): unknown;
}

declare module "gelf" {
  import type { AnyRecord } from "./types";

  class Gelf {
    constructor(options?: AnyRecord);
    emit(event: string, entry: AnyRecord): void;
  }

  export = Gelf;
}

declare module "punycode.js" {
  export function toASCII(domain: string): string;
  export function toUnicode(domain: string): string;
}
