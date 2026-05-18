import type { EventEmitter } from "node:events";
import type { Readable, Writable } from "node:stream";
import Headers = require("@zone-eu/mailsplit/lib/headers");
import type {
  HeaderLine,
  MimeNode,
  RewriterNode,
  StreamerNode,
} from "@zone-eu/mailsplit/lib/types";

export type AnyRecord = Record<string, any>;
export type DoneCallback = (err?: Error | null) => void;
export type MaybePromise<T = void> = T | Promise<T>;
export type QueueCallback<T = void> = (err?: Error | null, result?: T) => void;
export type PluginQueue = Partial<MailQueue> & AnyRecord;

export interface MongoCollectionLike extends AnyRecord {
  collectionName?: string;
  namespace?: string;
  aggregate(...args: any[]): any;
  bulkWrite(...args: any[]): any;
  countDocuments(...args: any[]): any;
  createIndex(...args: any[]): any;
  deleteMany(...args: any[]): any;
  deleteOne(...args: any[]): any;
  distinct(...args: any[]): any;
  drop(...args: any[]): any;
  find(...args: any[]): any;
  findOne(...args: any[]): any;
  findOneAndDelete(...args: any[]): any;
  findOneAndReplace(...args: any[]): any;
  findOneAndUpdate(...args: any[]): any;
  indexes(...args: any[]): any;
  insertMany(...args: any[]): any;
  insertOne(...args: any[]): any;
  rename(...args: any[]): any;
  replaceOne(...args: any[]): any;
  updateMany(...args: any[]): any;
  updateOne(...args: any[]): any;
  watch(...args: any[]): any;
}

export interface MongoDbLike extends AnyRecord {
  databaseName?: string;
  namespace?: string;
  options?: AnyRecord;
  admin(...args: any[]): any;
  aggregate(...args: any[]): any;
  collection(...args: any[]): MongoCollectionLike;
  collections(...args: any[]): any;
  command(...args: any[]): any;
  createCollection(...args: any[]): any;
  createIndex(...args: any[]): any;
  db(...args: any[]): MongoDbLike;
  dropCollection(...args: any[]): any;
  dropDatabase(...args: any[]): any;
  indexInformation(...args: any[]): any;
  listCollections(...args: any[]): any;
  profilingLevel(...args: any[]): any;
  removeUser(...args: any[]): any;
  renameCollection(...args: any[]): any;
  runCursorCommand(...args: any[]): any;
  setProfilingLevel(...args: any[]): any;
  stats(...args: any[]): any;
  watch(...args: any[]): any;
}

export interface MongoGridFSBucketLike extends AnyRecord {
  openDownloadStream(...args: any[]): Readable;
  openDownloadStreamByName(...args: any[]): Readable;
  openUploadStream(...args: any[]): Writable;
  openUploadStreamWithId(...args: any[]): Writable;
  delete(...args: any[]): any;
  drop(...args: any[]): any;
  find(...args: any[]): any;
  rename(...args: any[]): any;
}

export interface RedisLike extends AnyRecord {
  options?: RedisOptionsLike;
  status?: string;
  stream?: unknown;
  connector?: unknown;
  commandQueue?: unknown;
  offlineQueue?: unknown;
  condition?: unknown;
  isCluster?: boolean;
  connect(...args: any[]): any;
  disconnect(...args: any[]): any;
  duplicate(...args: any[]): RedisLike;
  defineCommand(...args: any[]): any;
  pipeline(...args: any[]): any;
  multi(...args: any[]): any;
  quit(...args: any[]): any;
  get(...args: any[]): any;
  set(...args: any[]): any;
  del(...args: any[]): any;
  exists(...args: any[]): any;
  expire(...args: any[]): any;
  hget(...args: any[]): any;
  hgetall(...args: any[]): any;
  hset(...args: any[]): any;
  incr(...args: any[]): any;
  publish(...args: any[]): any;
  subscribe(...args: any[]): any;
  unsubscribe(...args: any[]): any;
}

export interface RedisOptionsLike extends AnyRecord {
  host?: string;
  port?: number;
  path?: string;
  username?: string;
  password?: string;
  db?: number;
  keyPrefix?: string;
  tls?: AnyRecord;
  family?: number;
  connectTimeout?: number;
  commandTimeout?: number;
  enableOfflineQueue?: boolean;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number | null;
  retryStrategy?: (times: number) => number | void | null;
}

export type Db = MongoDbLike;
export type GridFSBucket = MongoGridFSBucketLike;
export type Redis = RedisLike;
export type RedisOptions = RedisOptionsLike;
export type UpdateFilterLike<T> = AnyRecord & Partial<T>;
export type UpdateFilter<T> = UpdateFilterLike<T>;

export interface QueueDelivery extends AnyRecord {
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

export interface QueueShiftOptions extends AnyRecord {
  domain?: string;
  toDomainOnly?: boolean;
  lockOwner?: string | false;
  getDomainConfig?: (domain: string, key: string) => unknown;
}

export interface QueueInfo extends AnyRecord {
  meta: Envelope | AnyRecord | false;
  messages: AnyRecord[];
}

export interface QueueCountResult {
  entries: Array<{ key: string; value: number }>;
  rows: number;
}

export interface QueueListEntry {
  id: string;
  zone: string;
  recipient: string;
  created: string;
  queued: string;
  deferred: number;
}

export interface MailQueue {
  options: AnyRecord;
  instanceId: string;
  mongodb: MongoDbLike | false;
  gridstore: MongoGridFSBucketLike | false;
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
  shift(zone: string, callback: QueueCallback<QueueDelivery | false>): void;
  remove(
    id: string,
    seq: string | false | null | undefined,
    callback: DoneCallback
  ): void;
  update(
    id: string,
    seq: string | false | null | undefined,
    update: UpdateFilterLike<QueueDelivery> | AnyRecord,
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
  connection: RedisOptionsLike;
  prefix: string;
}

export interface PluginDatabase extends AnyRecord {
  database?: MongoDbLike | false;
  gridfs?: MongoDbLike | false;
  users?: MongoDbLike | false;
  senderDb?: MongoDbLike | false;
  redis?: RedisLike;
  redisConfig?: RedisOptionsLike;
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
  mongodb?: MongoDbLike | false;
  redis?: RedisLike;
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
