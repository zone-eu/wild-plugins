import type {
  AnalyzerEventHandler,
  ApiCallback,
  AnyRecord,
  ApiServer,
  DoneCallback,
  Envelope,
  GelfEmitter,
  GelfMessage,
  Hook,
  HookAction,
  Logger,
  PluginDefinition,
  PluginHandlerOptions,
  PluginInstanceContext,
  PluginConfigInput,
  PluginDatabase,
  PluginQueue,
  RewriteEventHandler,
  RewriteFilterFunc,
  SmtpResponseError,
  StreamEventHandler,
  StreamFilterFunc,
  MessageInfo,
  MongoDbLike,
  RedisLike,
  ValidatedAddressList,
  PluginsConfig
} from "./types";
import Headers = require("@zone-eu/mailsplit/lib/headers");
import type { Readable, Writable } from "node:stream";

declare class PluginInstance implements PluginInstanceContext {
  constructor(manager: PluginHandler, options: PluginDefinition);
  manager: PluginHandler;
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

declare class PluginHandler {
  constructor(options?: PluginHandlerOptions);
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
  load(done: DoneCallback): NodeJS.Immediate | void;
  preparePlugins(pluginData?: PluginsConfig): PluginDefinition[];
  addHook(title: string | undefined, name: string, action: HookAction): void;
  runRewriteHooks(envelope: Envelope, splitter: Readable, output: Writable): void;
  runStreamHooks(envelope: Envelope, splitter: Readable, output: Writable): void;
  runAnalyzerHooks(envelope: Envelope, source: Readable, output: Writable): void;
  runHooksAsync(name: string, args: unknown[]): Promise<void>;
  runHooks(name: string, args: unknown[], done: DoneCallback): void;
  runHooks(name: string, args: unknown[]): Promise<void>;
  loggelf(message: string | GelfMessage): void;
  remotelog(id: unknown, seq: unknown, action: string, data?: AnyRecord): void;
  addAPIEndpoint(name: string, method: string, path: string, callback: ApiCallback): void;
}

export = PluginHandler;
