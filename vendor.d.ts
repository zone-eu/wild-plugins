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

declare module "@zone-eu/zone-mta/lib/mail-queue" {
  import type { EventEmitter } from "node:events";
  import type { Readable } from "node:stream";
  import type { Db, GridFSBucket, UpdateFilter } from "mongodb";
  import type { AnyRecord, DoneCallback, Envelope } from "./types";

  type QueueCallback<T = void> = (err?: Error | null, result?: T) => void;

  interface QueueDelivery extends AnyRecord {
    id: string;
    seq: string;
    recipient?: string;
    domain?: string;
    sendingZone?: string;
    sessionId?: string;
    queued?: Date;
    created?: Date;
    locked?: boolean;
    lockTime?: number;
    assigned?: string;
    _lock?: string;
  }

  interface QueueShiftOptions extends AnyRecord {
    domain?: string;
    toDomainOnly?: boolean;
    lockOwner?: string | false;
    getDomainConfig?: (domain: string, key: string) => unknown;
  }

  interface QueueInfo extends AnyRecord {
    meta: Envelope | AnyRecord | false;
    messages: AnyRecord[];
  }

  interface QueueCountResult {
    entries: Array<{ key: string; value: number }>;
    rows: number;
  }

  interface QueueListEntry {
    id: string;
    zone: string;
    recipient: string;
    created: string;
    queued: string;
    deferred: number;
  }

  class MailQueue {
    constructor(options?: AnyRecord);
    options: AnyRecord;
    instanceId: string;
    mongodb: Db | false;
    gridstore: GridFSBucket | false;
    closing: boolean;
    garbageTimer: NodeJS.Timeout | null;
    queueCounterTimer?: NodeJS.Timeout | null;
    seqIndex: { get(): string };
    maildrop: unknown;
    cache: AnyRecord;
    locks: AnyRecord;

    store(
      id: string | false | null | undefined,
      stream: Readable,
      callback: QueueCallback<string>
    ): void;
    setMeta(id: string, data: Envelope | AnyRecord, callback: DoneCallback): void;
    getMeta(
      id: string,
      callback: QueueCallback<Envelope | AnyRecord | false>
    ): void;
    retrieve(id: string): Readable;
    push(
      id: string,
      envelope: Envelope,
      callback: QueueCallback<string>
    ): EventEmitter | NodeJS.Immediate | void;
    shift(
      zone: string,
      options: QueueShiftOptions,
      callback: QueueCallback<QueueDelivery | false>
    ): void;
    shift(
      zone: string,
      callback: QueueCallback<QueueDelivery | false>
    ): void;
    remove(id: string, seq: string | false | null | undefined, callback: DoneCallback): void;
    update(
      id: string,
      seq: string | false | null | undefined,
      update: UpdateFilter<QueueDelivery> | AnyRecord,
      callback: QueueCallback<number>
    ): void;
    getDelivery(
      id: string | number,
      seq: string,
      callback: QueueCallback<QueueDelivery | false>
    ): void;
    releaseDelivery(
      delivery: QueueDelivery,
      callback: QueueCallback<boolean>
    ): void;
    releaseDeliveryAsync(delivery: QueueDelivery): Promise<boolean>;
    deferDelivery(
      delivery: QueueDelivery,
      ttl: number,
      responseData: AnyRecord,
      callback: QueueCallback<boolean>
    ): void;
    getInfo(id: string, callback: QueueCallback<QueueInfo | false>): void;
    removeMessage(id: string, callback: QueueCallback<boolean>): void;
    clearGarbage(): Promise<void>;
    checkGarbage(): void;
    queueCounterUpdate(): void;
    startPeriodicCheck(): void;
    stopPeriodicCheck(): void;
    listQueued(
      zone: string,
      type: "queued" | "deferred",
      sort: AnyRecord | false | null | undefined,
      start: number | false | null | undefined,
      maxItems: number,
      callback: QueueCallback<QueueListEntry[]>
    ): void;
    count(
      zones: string | string[],
      type: "queued" | "deferred",
      callback: QueueCallback<QueueCountResult>
    ): void;
    stop(): void;
    init(callback: QueueCallback<boolean>): void;
    generateId(callback: QueueCallback<string>): void;
  }

  export = MailQueue;
}
