import type {
  AnalyzerEventHandler,
  ApiCallback,
  AnyRecord,
  DoneCallback,
  Envelope,
  GelfLike,
  GelfMessage,
  Hook,
  HookAction,
  LoggerLike,
  PluginDefinition,
  PluginHandlerOptions,
  PluginInstanceLike,
  RewriteEventHandler,
  RewriteFilterFunc,
  SmtpResponseError,
  StreamEventHandler,
  StreamFilterFunc,
} from "./types";
import type Headers from "@zone-eu/mailsplit/lib/headers";
import type { Readable, Writable } from "node:stream";

declare class PluginInstance implements PluginInstanceLike {
  constructor(manager: PluginHandler, options: PluginDefinition);
  manager: PluginHandler;
  options: PluginDefinition;
  logger: LoggerLike;
  db: import("./types").PluginDatabase;
  config: import("./types").PluginConfigInput | AnyRecord;
  mongodb?: import("./types").MongoDatabaseLike | false;
  redis?: import("./types").RedisConnectionLike;
  gelf: GelfLike;
  addHook(name: string, action: HookAction): void;
  addRewriteHook(filterFunc: RewriteFilterFunc, eventHandler: RewriteEventHandler): void;
  addStreamHook(filterFunc: StreamFilterFunc, eventHandler: StreamEventHandler): void;
  addAnalyzerHook(eventHandler: AnalyzerEventHandler): void;
  addAPI(method: string, path: string, callback: ApiCallback): void;
  getQueue(): unknown;
  validateAddress(headers: Headers, key: string): import("./types").ValidatedAddressList;
  drop(
    envelope: Envelope | string,
    description?: string,
    messageInfo?: import("./types").MessageInfo | string,
    responseText?: string
  ): Error;
  reject(
    envelope: Envelope | string,
    description?: string,
    messageInfo?: import("./types").MessageInfo | string,
    responseText?: string
  ): SmtpResponseError;
  remotelog(id: unknown, seq: unknown, action: string, data?: AnyRecord): void;
  loggelf(message: string | GelfMessage): void;
}

declare class PluginHandler {
  constructor(options?: PluginHandlerOptions);
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
  apiServer?: import("./types").ApiServerLike;
  load(done: DoneCallback): NodeJS.Immediate | void;
  preparePlugins(pluginData?: import("./types").PluginsConfig): PluginDefinition[];
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
