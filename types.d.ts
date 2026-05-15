import type { Transform, Readable, Writable } from "node:stream";
import type Headers from "@zone-eu/mailsplit/lib/headers";
import type {
  HeaderLine,
  MimeNode,
  RewriterNode,
  StreamerNode,
} from "@zone-eu/mailsplit/lib/types";
import type { Db } from "mongodb";
import type Redis, { RedisOptions } from "ioredis";

export type AnyRecord = Record<string, any>;
export type DoneCallback = (err?: Error | null) => void;
export type MaybePromise<T = void> = T | Promise<T>;

export interface LoggerLike {
  info(...args: any[]): void;
  error(...args: any[]): void;
  verbose(...args: any[]): void;
}

export interface GelfLike {
  emit(event: string, entry: AnyRecord): void;
}

export interface RemoteLogOptions {
  protocol: "udp4" | "udp6";
  port: number;
  host?: string;
}

export interface GelfOptions {
  enabled?: boolean;
  options?: AnyRecord;
  component?: string;
  hostname?: string;
}

export interface LogOptions {
  gelf?: GelfOptions;
  remote?: RemoteLogOptions;
}

export type MongoDatabaseLike = Db;
export type RedisConnectionLike = Redis;
export type RedisConnectionOptions = RedisOptions;

export interface QueueConfig {
  connection: RedisConnectionOptions;
  prefix: string;
}

export interface PluginDatabase extends AnyRecord {
  database?: MongoDatabaseLike | false;
  gridfs?: MongoDatabaseLike | false;
  users?: MongoDatabaseLike | false;
  senderDb?: MongoDatabaseLike | false;
  redis?: RedisConnectionLike;
  redisConfig?: RedisConnectionOptions;
  queueConf?: QueueConfig;
  [key: string]: any;
}

export interface PluginConfig {
  enabled?: boolean | string | Array<boolean | string>;
  ordering?: number;
  path?: string;
  [key: string]: any;
}

export type PluginConfigInput = true | PluginConfig;
export type PluginsConfig = Record<string, PluginConfigInput | false | null | undefined>;

export interface PluginHandlerOptions {
  context?: string;
  corePluginsPath?: string;
  pluginsPath?: string;
  plugins?: PluginsConfig;
  logger?: LoggerLike;
  db?: PluginDatabase;
  config?: AnyRecord;
  log?: LogOptions;
}

export interface PluginModule {
  title?: string;
  init(plugin: PluginInstanceLike, done: DoneCallback): MaybePromise;
}

export interface PluginDefinition {
  key: string;
  path: string;
  ordering: number;
  config: PluginConfigInput;
  title?: string;
  module?: PluginModule;
  db?: PluginDatabase;
  logger?: LoggerLike;
  log?: LogOptions;
}

export interface RemoteLogEntry extends AnyRecord {
  id: unknown;
  seq?: unknown;
  action?: string;
}

export interface ParsedEnvelope {
  from: string | false;
  to: string[];
  cc: string[];
  bcc: string[];
  replyTo: string | false;
  sender: string | false;
}

export interface DkimEnvelopeInfo extends AnyRecord {
  hashAlgo?: string;
  bodyHash?: string;
}

export interface RspamdResponse extends AnyRecord {
  default?: {
    score?: string | number;
    action?: string;
    [key: string]: any;
  };
  tests?: string[];
}

export interface VirusScanResult extends AnyRecord {
  clean: boolean;
  response?: string;
}

export interface EnvelopeAttachment {
  name?: string | false;
  type?: string | false;
  bytes: number;
  hash: string;
}

export interface Envelope extends AnyRecord {
  id?: string;
  sessionId?: string;
  interface?: string;
  from?: string;
  to?: string[];
  origin?: string | false;
  originhost?: string | false;
  transhost?: string | false;
  transtype?: string;
  user?: string | false;
  userId?: string;
  passwordType?: string;
  time?: number;
  tls?: string | AnyRecord;
  sendingZone?: string;
  deferDelivery?: number;
  date?: string;
  parsedEnvelope?: ParsedEnvelope;
  messageId?: string;
  headers?: Headers | HeaderLine[];
  envelopeFromHeader?: boolean;
  dkim?: DkimEnvelopeInfo;
  bodySize?: number;
  parentId?: string;
  reason?: string;
  looped?: boolean;
  fbl?: string;
  spam?: RspamdResponse;
  ignoreSpamScore?: boolean;
  virus?: VirusScanResult;
  attachments?: EnvelopeAttachment[];
  sourceMd5?: string;
}

export interface MessageInfo {
  keys?(): AnyRecord;
  format?(): string;
}

export interface SmtpResponseError extends Error {
  responseCode?: number;
}

export interface Hook {
  title?: string;
  name: string;
  action: HookAction;
}

export type HookAction = (...args: any[]) => MaybePromise;
export type RewriteFilterFunc = (envelope: Envelope, node: MimeNode) => boolean;
export type RewriteEventHandler = (
  envelope: Envelope,
  node: RewriterNode["node"],
  decoder: RewriterNode["decoder"],
  encoder: RewriterNode["encoder"]
) => void;
export type StreamFilterFunc = (envelope: Envelope, node: MimeNode) => boolean;
export type StreamEventHandler = (
  envelope: Envelope,
  node: StreamerNode["node"],
  decoder: StreamerNode["decoder"],
  done: StreamerNode["done"]
) => void;
export type AnalyzerEventHandler = (
  envelope: Envelope,
  source: Readable,
  output: Writable
) => void;
export type ApiCallback = (...args: any[]) => any;

export interface PluginInstanceLike {
  manager: PluginHandlerLike;
  options: PluginDefinition;
  logger: LoggerLike;
  db: PluginDatabase;
  config: PluginConfigInput | AnyRecord;
  mongodb?: MongoDatabaseLike | false;
  redis?: RedisConnectionLike;
  gelf: GelfLike;
  addHook(name: string, action: HookAction): void;
  addRewriteHook(filterFunc: RewriteFilterFunc, eventHandler: RewriteEventHandler): void;
  addStreamHook(filterFunc: StreamFilterFunc, eventHandler: StreamEventHandler): void;
  addAnalyzerHook(eventHandler: AnalyzerEventHandler): void;
  addAPI(method: string, path: string, callback: ApiCallback): void;
  getQueue(): unknown;
  validateAddress(headers: Headers, key: string): ValidatedAddressList;
  drop(
    envelope: Envelope | string,
    description?: string,
    messageInfo?: MessageInfo | string,
    responseText?: string
  ): Error;
  reject(
    envelope: Envelope | string,
    description?: string,
    messageInfo?: MessageInfo | string,
    responseText?: string
  ): SmtpResponseError;
  remotelog(id: unknown, seq: unknown, action: string, data?: AnyRecord): void;
  loggelf(message: string | GelfMessage): void;
}

export interface ApiServerLike {
  server?: Record<string, (path: string, callback: ApiCallback) => unknown>;
}

export interface PluginHandlerLike {
  options: PluginHandlerOptions;
  queue: unknown;
  hooks: Map<string, Hook[]>;
  rewriters: Set<{
    title?: string;
    filterFunc: RewriteFilterFunc;
    eventHandler: RewriteEventHandler;
  }>;
  streamers: Set<{
    title?: string;
    filterFunc: StreamFilterFunc;
    eventHandler: StreamEventHandler;
  }>;
  analyzers: Set<{
    title?: string;
    eventHandler: AnalyzerEventHandler;
  }>;
  context: string;
  corePluginsPath: string;
  pluginsPath: string;
  logger: LoggerLike;
  loaded: PluginDefinition[];
  plugins: PluginDefinition[];
  gelf: GelfLike;
  apiServer?: ApiServerLike;
  addHook(title: string | undefined, name: string, action: HookAction): void;
  remotelog(id: unknown, seq: unknown, action: string, data?: AnyRecord): void;
  loggelf(message: string | GelfMessage): void;
}

export interface GelfMessage extends AnyRecord {
  short_message?: string;
  facility?: string;
  host?: string;
  timestamp?: number;
  _component?: string;
}

export interface ParsedAddress {
  name?: string;
  address: string;
}

export interface ParsedAddressGroup {
  name: string;
  group: ParsedAddress[];
}

export type ParsedAddressEntry = ParsedAddress | ParsedAddressGroup;
export type AddressInput = string | ParsedAddress | ParsedAddressGroup | AddressInput[];
export type NormalizedAddress = string | ParsedAddress;
export type NestedArray<T> = T | NestedArray<T>[];

export interface ValidatedAddressList {
  addresses: ParsedAddress[];
  set(...addresses: AddressInput[]): void;
}

export interface RatioItem extends AnyRecord {
  ratio?: number;
}

export type StreamLike = Transform;
