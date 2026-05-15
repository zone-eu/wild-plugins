import type { Readable, Writable } from "node:stream";
import type Headers from "@zone-eu/mailsplit/lib/headers";
import type {
  HeaderLine,
  MimeNode,
  RewriterNode,
  StreamerNode,
} from "@zone-eu/mailsplit/lib/types";
import type { Db } from "mongodb";
import type Redis, { RedisOptions } from "ioredis";
import type ZoneMailQueue from "@zone-eu/zone-mta/lib/mail-queue";

export type AnyRecord = Record<string, any>;
export type DoneCallback = (err?: Error | null) => void;
export type MaybePromise<T = void> = T | Promise<T>;
export type PluginQueue = Partial<ZoneMailQueue> & AnyRecord;

export interface Logger {
  info(...args: any[]): void;
  error(...args: any[]): void;
  verbose(...args: any[]): void;
}

export interface GelfEmitter {
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

export interface QueueConfig {
  connection: RedisOptions;
  prefix: string;
}

export interface PluginDatabase extends AnyRecord {
  database?: Db | false;
  gridfs?: Db | false;
  users?: Db | false;
  senderDb?: Db | false;
  redis?: Redis;
  redisConfig?: RedisOptions;
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
  logger?: Logger;
  db?: PluginDatabase;
  config?: AnyRecord;
  log?: LogOptions;
}

export interface PluginModule {
  title?: string;
  init(plugin: PluginInstanceContext, done: DoneCallback): MaybePromise;
}

export interface PluginDefinition {
  key: string;
  path: string;
  ordering: number;
  config: PluginConfigInput;
  title?: string;
  module?: PluginModule;
  db?: PluginDatabase;
  logger?: Logger;
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
export type ApiRouteRegistrar = (
  path: string,
  ...handlers: ApiCallback[]
) => unknown;

export interface PluginInstanceContext {
  manager: PluginHandlerContext;
  options: PluginDefinition;
  logger: Logger;
  db: PluginDatabase;
  config: PluginConfigInput | AnyRecord;
  mongodb?: Db | false;
  redis?: Redis;
  gelf: GelfEmitter;
  addHook(name: string, action: HookAction): void;
  addRewriteHook(filterFunc: RewriteFilterFunc, eventHandler: RewriteEventHandler): void;
  addStreamHook(filterFunc: StreamFilterFunc, eventHandler: StreamEventHandler): void;
  addAnalyzerHook(eventHandler: AnalyzerEventHandler): void;
  addAPI(method: string, path: string, callback: ApiCallback): void;
  getQueue(): PluginQueue | false;
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

export interface ApiServer {
  server?: HttpRouteServer;
}

export interface HttpRouteServer extends AnyRecord {
  get: ApiRouteRegistrar;
  post: ApiRouteRegistrar;
  put: ApiRouteRegistrar;
  delete?: ApiRouteRegistrar;
  del?: ApiRouteRegistrar;
  patch?: ApiRouteRegistrar;
  head?: ApiRouteRegistrar;
  options?: ApiRouteRegistrar;
  opts?: ApiRouteRegistrar;
  [method: string]: any;
}

export interface PluginHandlerContext {
  options: PluginHandlerOptions;
  queue: PluginQueue | false;
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
  logger: Logger;
  loaded: PluginDefinition[];
  plugins: PluginDefinition[];
  gelf: GelfEmitter;
  apiServer?: ApiServer;
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
