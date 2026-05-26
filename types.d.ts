import type {
  AnalyzerEventHandler,
  AnyRecord,
  DatabaseConnections,
  DoneCallback,
  GelfEmitter,
  GelfMessage,
  Hook,
  HookAction,
  Logger,
  MailQueueLike,
  MaybePromise,
  RewriteEventHandler,
  RewriteFilterFunc,
  StreamEventHandler,
  StreamFilterFunc,
  ZoneMtaPluginTools,
} from "@zone-eu/types";

export type * from "@zone-eu/types";
export type {
  AnalyzerEventHandler,
  AddressInput,
  AnyRecord,
  ApiSession,
  BounceDelivery,
  DatabaseConnections,
  DeliveryEnvelope,
  DkimEnvelopeInfo,
  Db,
  DoneCallback,
  Envelope,
  EnvelopeAddressList,
  EnvelopeAttachment,
  EnvelopeHeaders,
  GelfEmitter,
  GelfMessage,
  GridFSBucket,
  Headers,
  Hook,
  HookAction,
  HookHandler,
  Logger,
  MailDropLike,
  MailQueueLike,
  MaybePromise,
  MessageHeadersEnvelope,
  MessageHookEnvelope,
  MessageInfo,
  MessageInfoFields,
  MongoClientLike,
  MongoCollectionLike,
  MongoDbLike,
  MongoGridFSBucketLike,
  NestedArray,
  NormalizedAddress,
  ParsedAddress,
  ParsedAddressEntry,
  ParsedAddressGroup,
  ParsedEnvelope,
  QueueCallback,
  QueueConfig,
  QueueCountResult,
  QueueDelayedOptions,
  QueueDelivery,
  QueueInfo,
  QueueListEntry,
  QueueReleaseData,
  QueueRouting,
  QueueShiftOptions,
  QueueStatus,
  Redis,
  RedisLike,
  RedisOptions,
  RedisOptionsLike,
  RemoteLogEntry,
  RewriteEventHandler,
  RewriteFilterFunc,
  RspamdDefaultResult,
  RspamdResponse,
  SenderConnectOptions,
  SenderConnection,
  SenderDelivery,
  SenderDeliveryError,
  SenderDeliveryInfo,
  SendingZone,
  SharedHookArgumentMap,
  SharedHookHandler,
  SharedHookName,
  SharedHookRegistrar,
  SharedPluginTools,
  SharedStreamHookRegistrar,
  SmtpAddress,
  SmtpAuth,
  SmtpEnvelope,
  SmtpInterface,
  SmtpResponseError,
  SmtpSession,
  SniData,
  StreamEventHandler,
  StreamFilterFunc,
  UpdateFilter,
  UpdateFilterLike,
  ValidatedAddressList,
  VirusScanResult,
  ZoneMtaHookArgumentMap,
  ZoneMtaHookHandler,
  ZoneMtaHookName,
  ZoneMtaHookRegistrar,
  ZoneMtaHookRunner,
  ZoneMtaPluginModule,
  ZoneMtaPluginTools,
} from "@zone-eu/types";

export type PluginQueue = Partial<MailQueueLike> & AnyRecord;
export type MailQueue = MailQueueLike;

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

export type PluginDatabase = DatabaseConnections;

export interface PluginConfig extends AnyRecord {
  enabled?: boolean | string | Array<boolean | string>;
  ordering?: number;
  path?: string;
}

export type PluginConfigInput = true | PluginConfig;
export type PluginsConfig = Record<
  string,
  PluginConfigInput | false | null | undefined
>;

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

export type ApiCallback = (...args: unknown[]) => unknown;
export type ApiRouteRegistrar = (
  path: string,
  ...handlers: ApiCallback[]
) => unknown;

export interface PluginInstanceContext
  extends Omit<ZoneMtaPluginTools, "addHook" | "getQueue"> {
  manager: PluginHandlerContext;
  options: PluginDefinition;
  addHook(name: string, action: HookAction): void;
  getQueue(): PluginQueue | false;
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
  [method: string]: ApiRouteRegistrar | undefined;
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

export interface RatioItem extends Record<string, unknown> {
  ratio?: number;
}
