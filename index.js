"use strict";

const path = require("path");
const log = require("npmlog");
const mailsplit = require("@zone-eu/mailsplit");
const PassThrough = require("stream").PassThrough;
const addressTools = require("./src/address-tools");
const dgram = require("dgram");
const msgpack = require("msgpack-js");
const Gelf = require("gelf");
const os = require("os");

/**
 * @typedef {import("node:stream").Readable} Readable
 * @typedef {import("node:stream").Writable} Writable
 * @typedef {import("@zone-eu/mailsplit/lib/headers")} Headers
 * @typedef {import("./types").AnalyzerEventHandler} AnalyzerEventHandler
 * @typedef {import("./types").ApiCallback} ApiCallback
 * @typedef {import("./types").AnyRecord} AnyRecord
 * @typedef {import("./types").DoneCallback} DoneCallback
 * @typedef {import("./types").Envelope} Envelope
 * @typedef {import("./types").GelfMessage} GelfMessage
 * @typedef {import("./types").Hook} Hook
 * @typedef {import("./types").HookAction} HookAction
 * @typedef {import("./types").MessageInfo} MessageInfo
 * @typedef {import("./types").PluginDefinition} PluginDefinition
 * @typedef {import("./types").PluginHandlerOptions} PluginHandlerOptions
 * @typedef {import("./types").RewriteEventHandler} RewriteEventHandler
 * @typedef {import("./types").RewriteFilterFunc} RewriteFilterFunc
 * @typedef {import("./types").SmtpResponseError} SmtpResponseError
 * @typedef {import("./types").StreamEventHandler} StreamEventHandler
 * @typedef {import("./types").StreamFilterFunc} StreamFilterFunc
 * @typedef {import("./types").ValidatedAddressList} ValidatedAddressList
 */

/**
 * @param {Envelope | string} envelope
 * @returns {{ id: unknown, envelope: Envelope }}
 */
function getEnvelopeContext(envelope) {
  if (envelope && typeof envelope === "object") {
    return {
      id: envelope.id,
      envelope,
    };
  }

  return {
    id: envelope,
    envelope: {},
  };
}

class PluginInstance {
  /**
   * @param {PluginHandler} manager
   * @param {PluginDefinition} options
   */
  constructor(manager, options) {
    this.manager = manager;
    this.options = options || {};
    this.logger = manager.logger;
    this.db = options.db;
    this.config = options.config || {};
    this.mongodb = this.db.senderDb;
    this.redis = this.db.redis;

    this.gelf =
      this.options.log && this.options.log.gelf && this.options.log.gelf.enabled
        ? new Gelf(this.options.log.gelf.options)
        : {
            // placeholder
            /**
             * @param {string} ev
             * @param {AnyRecord} entry
             */
            emit: (ev, entry) =>
              this.logger.info(
                `Plugins/${process.pid}/GELF`,
                JSON.stringify(entry)
              ),
          };
  }

  /**
   * @param {string} name
   * @param {HookAction} action
   * @returns {void}
   */
  addHook(name, action) {
    this.manager.addHook(this.options.title, name, action);
  }

  /**
   * @param {RewriteFilterFunc} filterFunc
   * @param {RewriteEventHandler} eventHandler
   * @returns {void}
   */
  addRewriteHook(filterFunc, eventHandler) {
    this.manager.rewriters.add({
      title: this.options.title,
      filterFunc,
      eventHandler,
    });
  }

  /**
   * @param {StreamFilterFunc} filterFunc
   * @param {StreamEventHandler} eventHandler
   * @returns {void}
   */
  addStreamHook(filterFunc, eventHandler) {
    this.manager.streamers.add({
      title: this.options.title,
      filterFunc,
      eventHandler,
    });
  }

  /**
   * @param {AnalyzerEventHandler} eventHandler
   * @returns {void}
   */
  addAnalyzerHook(eventHandler) {
    this.manager.analyzers.add({
      title: this.options.title,
      eventHandler,
    });
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {ApiCallback} callback
   * @returns {void}
   */
  addAPI(method, path, callback) {
    this.manager.addAPIEndpoint(this.options.key, method, path, callback);
  }

  /**
   * @returns {unknown}
   */
  getQueue() {
    return this.manager.queue;
  }

  /**
   * @param {Headers} headers
   * @param {string} key
   * @returns {ValidatedAddressList}
   */
  validateAddress(headers, key) {
    return addressTools.validateAddress(headers, key);
  }

  /**
   * @param {Envelope | string} envelope
   * @param {string} [description]
   * @param {MessageInfo | string} [messageInfo]
   * @param {string} [responseText]
   * @returns {Error}
   */
  drop(envelope, description, messageInfo, responseText) {
    let envelopeContext = getEnvelopeContext(envelope);
    let id = envelopeContext.id;
    let envelopeData = envelopeContext.envelope;

    description = (description || "").toString().trim();
    /** @type {AnyRecord} */
    let keys;
    let info = /** @type {MessageInfo} */ (messageInfo);
    if (messageInfo && typeof info.keys === "function") {
      keys = info.keys();
    } else {
      keys = {};
    }
    if (messageInfo && typeof info.format === "function") {
      messageInfo = info.format();
    }
    messageInfo = (messageInfo || "").toString().trim();
    responseText = (responseText || "").toString();

    if (description) {
      keys.description = description;
    }

    if (responseText) {
      keys.responseText = responseText.substr(0, 312);
    }

    for (let key of [
      "interface",
      "originhost",
      "transhost",
      "transtype",
      "user",
    ]) {
      if (envelopeData[key] && !(key in keys)) {
        keys[key] = envelopeData[key];
      }
    }

    this.manager.remotelog(id, false, "DROP", keys);

    let msg =
      "%s DROP" +
      (description ? "[" + description + "]" : "") +
      (messageInfo ? " (" + messageInfo + ")" : "");
    this.logger.info(this.options.title, msg, id);

    responseText = responseText.replace(/^\d{3}\s+/, "");

    let err = new Error(responseText || "Message queued as " + id);
    err.name = "SMTPResponse";
    return err;
  }

  /**
   * @param {Envelope | string} envelope
   * @param {string} [description]
   * @param {MessageInfo | string} [messageInfo]
   * @param {string} [responseText]
   * @returns {SmtpResponseError}
   */
  reject(envelope, description, messageInfo, responseText) {
    let envelopeContext = getEnvelopeContext(envelope);
    let id = envelopeContext.id;
    let envelopeData = envelopeContext.envelope;

    description = (description || "").toString().trim();
    /** @type {AnyRecord} */
    let keys;
    let info = /** @type {MessageInfo} */ (messageInfo);
    if (messageInfo && typeof info.keys === "function") {
      keys = info.keys();
    } else {
      keys = {};
    }

    if (messageInfo && typeof info.format === "function") {
      messageInfo = info.format();
    }
    messageInfo = (messageInfo || "").toString().trim();
    responseText = (responseText || "").toString();

    if (description) {
      keys.description = description;
    }

    if (responseText) {
      keys.responseText = responseText.substr(0, 312);
    }

    ["interface", "originhost", "transhost", "transtype", "user"].forEach(
      (key) => {
        if (envelopeData[key] && !(key in keys)) {
          keys[key] = envelopeData[key];
        }
      }
    );

    this.manager.remotelog(id, false, "NOQUEUE", keys);

    let msg =
      "%s NOQUEUE" +
      (description ? "[" + description + "]" : "") +
      (messageInfo ? " (" + messageInfo + ")" : "");
    this.logger.info(this.options.title, msg, id);

    let code;
    responseText = responseText.replace(/^(\d{3})\s+/, (str, c) => {
      code = Number(c);
      return "";
    });

    /** @type {SmtpResponseError} */
    let err = new Error(responseText);
    err.name = "SMTPReject";
    err.responseCode = code || 550;

    return err;
  }

  /**
   * @param {unknown} id
   * @param {unknown} seq
   * @param {string} action
   * @param {AnyRecord} [data]
   * @returns {void}
   */
  remotelog(id, seq, action, data) {
    this.manager.remotelog(id, seq, action, data);
  }

  /**
   * @param {string | GelfMessage} message
   * @returns {void}
   */
  loggelf(message) {
    this.manager.loggelf(message);
  }
}

class PluginHandler {
  /**
   * @param {PluginHandlerOptions} [options]
   */
  constructor(options) {
    options = options || {};
    this.options = options;

    /** @type {unknown} */
    this.queue = false;

    /** @type {Map<string, Hook[]>} */
    this.hooks = new Map();
    /** @type {Set<{ title: string | undefined, filterFunc: RewriteFilterFunc, eventHandler: RewriteEventHandler }>} */
    this.rewriters = new Set();
    /** @type {Set<{ title: string | undefined, filterFunc: StreamFilterFunc, eventHandler: StreamEventHandler }>} */
    this.streamers = new Set();
    /** @type {Set<{ title: string | undefined, eventHandler: AnalyzerEventHandler }>} */
    this.analyzers = new Set();

    this.context = options.context || "receiver";

    this.corePluginsPath =
      options.corePluginsPath || path.join(process.cwd(), "plugins");
    this.pluginsPath =
      options.pluginsPath || path.join(process.cwd(), "plugins");

    this.logger = options.logger || log;

    /** @type {PluginDefinition[]} */
    this.loaded = [];

    this.plugins = this.preparePlugins(options.plugins);

    /** @type {import("./types").ApiServer | undefined} */
    this.apiServer = undefined;

    this.gelf =
      this.options.log && this.options.log.gelf && this.options.log.gelf.enabled
        ? new Gelf(this.options.log.gelf.options)
        : {
            // placeholder
            /**
             * @param {string} ev
             * @param {AnyRecord} entry
             */
            emit: (ev, entry) =>
              this.logger.info(
                `Plugins/${process.pid}/GELF`,
                JSON.stringify(entry)
              ),
          };
  }

  /**
   * @param {DoneCallback} done
   * @returns {NodeJS.Immediate | void}
   */
  load(done) {
    let curPos = 0;
    let loadNext = () => {
      if (curPos >= this.plugins.length) {
        return done();
      }

      let plugin = this.plugins[curPos++];
      if (!plugin) {
        return loadNext();
      }

      try {
        let loadStartTime = Date.now();
        if (plugin.path.indexOf("/") < 0 && plugin.path.indexOf("\\") < 0) {
          plugin.path = path.join(process.cwd(), "node_modules", plugin.path);
        }
        plugin.module = /** @type {import("./types").PluginModule} */ (require(plugin.path)); // eslint-disable-line global-require
        plugin.title =
          plugin.module.title ||
          (path.parse(plugin.path).name || "").replace(/^[a-z]|-+[a-z]/g, (m) =>
            m.replace(/[-]/g, "").toUpperCase()
          );

        if (!plugin.module || typeof plugin.module.init !== "function") {
          let loadTime = Date.now() - loadStartTime;
          this.logger.info(
            `Plugins/${this.context}/${process.pid}`,
            "Plugin %s from <%s> does not have an init method [load time %sms]",
            plugin.title,
            path.relative(process.cwd(), plugin.path),
            loadTime
          );
          // not much to do here
          return loadNext();
        }

        /** @type {Promise<void>} */
        let p = new Promise((resolve, reject) => {
          plugin.db = this.options.db;
          plugin.logger = this.logger;
          plugin.log = this.options.log;

          let f = plugin.module.init(
            new PluginInstance(this, plugin),
            // If the handler uses promises then this callback is never called
            (err) => {
              if (err) {
                return reject(err);
              }
              resolve();
            }
          );
          if (f instanceof Promise) {
            f.then(resolve, reject);
          }
        });

        return p
          .then(() => {
            let loadTime = Date.now() - loadStartTime;
            this.logger.info(
              `Plugins/${this.context}/${process.pid}`,
              "Initialized %s from <%s> [load time %sms]",
              plugin.title,
              path.relative(process.cwd(), plugin.path),
              loadTime
            );
            this.loaded.push(plugin);
          })
          .catch((err) => {
            let loadTime = Date.now() - loadStartTime;
            this.logger.error(
              `Plugins/${this.context}/${process.pid}`,
              "Failed loading plugin %s from <%s>: %s [load time %sms]",
              plugin.title,
              path.relative(process.cwd(), plugin.path),
              err.message,
              loadTime
            );
          })
          .finally(loadNext);
      } catch (E) {
        let err = /** @type {Error} */ (E);
        this.logger.error(
          `Plugins/${this.context}/${process.pid}`,
          "Failed loading plugin file <%s>: %s",
          path.relative(process.cwd(), plugin.path),
          err.message
        );
      }

      return loadNext();
    };

    return setImmediate(loadNext);
  }

  /**
   * @param {import("./types").PluginsConfig} [pluginData]
   * @returns {PluginDefinition[]}
   */
  preparePlugins(pluginData) {
    return Object.keys(pluginData || {})
      .map((key) => {
        if (!key) {
          return;
        }

        if (
          !pluginData[key] ||
          (pluginData[key] !== true && !pluginData[key].enabled)
        ) {
          // disabled
          return;
        }

        let pluginPath;
        if (/^[./]*modules\//.test(key)) {
          pluginPath = key.replace(/^[./]*modules\//, "");
        } else {
          pluginPath = path.resolve(
            /^[./]*core\//.test(key) ? this.corePluginsPath : this.pluginsPath,
            key
          );
        }

        let pluginConfig =
          pluginData[key] !== true
            ? pluginData[key]
            : {
                enabled: true,
                ordering: Infinity,
              };

        // Only load plugins with correct context. If context is not set then default to "main"
        let allowedContext = []
          .concat(pluginConfig.enabled || "receiver")
          .map((context) => {
            if (context === true) {
              return "*";
            }

            if (typeof context !== "string") {
              return "receiver";
            }

            return context.toString().toLowerCase().trim();
          });

        if (
          !allowedContext.includes(this.context) &&
          !allowedContext.includes("*")
        ) {
          return;
        }

        return {
          key,
          path: pluginPath,
          ordering: Number(pluginConfig.ordering) || Infinity,
          config: pluginData[key],
        };
      })
      .filter((plugin) => plugin)
      .sort((a, b) => a.ordering - b.ordering);
  }

  /**
   * @param {string | undefined} title
   * @param {string} name
   * @param {HookAction} action
   * @returns {void}
   */
  addHook(title, name, action) {
    name = (name || "").toString().toLowerCase().trim();
    let hook = {
      title,
      name,
      action,
    };
    if (!this.hooks.has(name)) {
      this.hooks.set(name, [hook]);
    } else {
      let existing = this.hooks.get(name);
      if (existing) {
        existing.push(hook);
      }
    }
  }

  /**
   * @param {Envelope} envelope
   * @param {Readable} splitter
   * @param {Writable} output
   * @returns {void}
   */
  runRewriteHooks(envelope, splitter, output) {
    let input = splitter;

    this.rewriters.forEach((hook) => {
      let rewriter = new mailsplit.Rewriter((node) =>
        hook.filterFunc(envelope, node)
      );

      rewriter.on("node", (data) => {
        hook.eventHandler(envelope, data.node, data.decoder, data.encoder);
      });

      /** @type {import("node:stream").Transform} */ (rewriter).once("error", (err) => {
        input.emit("error", err);
      });

      input.pipe(rewriter);

      input = rewriter;
    });

    input.once("error", (err) => {
      output.emit("error", err);
    });

    input.pipe(output);
  }

  /**
   * @param {Envelope} envelope
   * @param {Readable} splitter
   * @param {Writable} output
   * @returns {void}
   */
  runStreamHooks(envelope, splitter, output) {
    let input = splitter;
    this.streamers.forEach((hook) => {
      let streamer = new mailsplit.Streamer((node) =>
        hook.filterFunc(envelope, node)
      );
      let stream = input;

      streamer.on("node", (data) => {
        hook.eventHandler(envelope, data.node, data.decoder, data.done);
      });

      stream.once("error", (err) => {
        /** @type {import("node:stream").Transform} */ (streamer).emit("error", err);
      });

      stream.pipe(streamer);

      input = streamer;
    });

    input.once("error", (err) => {
      output.emit("error", err);
    });

    input.pipe(output);
  }

  /**
   * @param {Envelope} envelope
   * @param {Readable} source
   * @param {Writable} output
   * @returns {void}
   */
  runAnalyzerHooks(envelope, source, output) {
    let input = source;

    this.analyzers.forEach((hook) => {
      let analyzer = new PassThrough();
      let stream = input;
      hook.eventHandler(envelope, stream, analyzer);

      stream.once("error", (err) => {
        analyzer.emit("error", err);
      });

      input = analyzer;
    });

    input.once("error", (err) => {
      output.emit("error", err);
    });

    input.pipe(output);
  }

  /**
   * @param {string} name
   * @param {unknown[]} args
   * @returns {Promise<void>}
   */
  async runHooksAsync(name, args) {
    name = (name || "").toString().toLowerCase().trim();
    let hooks = this.hooks.get(name) || [];

    for (let hook of hooks) {
      if (!hook || typeof hook.action !== "function") {
        continue;
      }

      // allow both callbacks and promises as plugin handlers
      /** @type {Promise<void>} */
      let p = new Promise((resolve, reject) => {
        let f = hook.action(
          ...args,
          // If the handler uses promises then this callback is never called
          (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          }
        );
        if (f instanceof Promise) {
          f.then(resolve, reject);
        }
      });

      try {
        await p;
      } catch (err) {
        let error = /** @type {Error & AnyRecord} */ (err);
        // non error "errors" are allowed to break the plugin chain, do not log these
        if (/Error$/.test(error.name)) {
          this.logger.error(
            "Plugins",
            '"%s" for "%s" failed with: %s',
            hook.title,
            hook.name,
            error.stack
          );
        }
        error.category = error.category || "plugin";
        error._source = "PLUGIN";
        error._sourceName = hook.title;

        throw error;
      }
    }
  }

  /**
   * @param {string} name
   * @param {unknown[]} args
   * @param {DoneCallback} done
   * @returns {void}
   */
  runHooks(name, args, done) {
    if (!done) {
      // treat as a promise
      return this.runHooksAsync(name, args);
    }

    // run callback
    this.runHooksAsync(name, args)
      .then(() => done())
      .catch((err) => done(err));
  }

  /**
   * @param {string | GelfMessage} message
   * @returns {void}
   */
  loggelf(message) {
    if (!message) {
      return;
    }

    let gelfOpts = (this.options.log && this.options.log.gelf) || {};

    const component = gelfOpts.component || "zone-mta";
    const hostname = gelfOpts.hostname || os.hostname();

    if (typeof message === "string") {
      message = {
        short_message: message,
      };
    }

    if (typeof message.short_message !== "string") {
      message.short_message = (message.short_message || "").toString();
    }

    if (
      !message.short_message ||
      message.short_message.indexOf(component.toUpperCase()) !== 0
    ) {
      message.short_message =
        component.toUpperCase() + " " + (message.short_message || "");
    }

    message.facility = component; // facility is deprecated but set by the driver if not provided
    message.host = hostname;
    message.timestamp = Date.now() / 1000;
    message._component = component;

    Object.keys(message).forEach((key) => {
      if (!message[key]) {
        delete message[key];
      }
    });

    this.gelf.emit("gelf.log", message);
  }

  /**
   * @param {unknown} id
   * @param {unknown} seq
   * @param {string} action
   * @param {AnyRecord} [data]
   * @returns {void}
   */
  remotelog(id, seq, action, data) {
    /** @type {import("./types").RemoteLogEntry} */
    let entry = {
      id,
    };
    if (seq) {
      entry.seq = seq;
    }
    if (action) {
      entry.action = action;
    }
    if (data) {
      Object.keys(data).forEach((key) => {
        if (!(key in entry)) {
          entry[key] = data[key];
        }
      });
    }

    if (this.options.log && this.options.log.remote) {
      let payload;
      try {
        payload = msgpack.encode(entry);
      } catch (E) {
        let err = /** @type {Error} */ (E);
        log.error(
          "REMOTELOG",
          '%s Failed encoding message. error="%s"',
          id + (seq ? "." + seq : ""),
          err.message
        );
      }

      let client = dgram.createSocket(this.options.log.remote.protocol);
      client.send(
        payload,
        this.options.log.remote.port,
        this.options.log.remote.host || "localhost",
        () => client.close()
      );
    }

    this.runHooks("log:entry", [entry], () => false);
  }

  /**
   * @param {string} name
   * @param {string} method
   * @param {string} path
   * @param {ApiCallback} callback
   * @returns {void}
   */
  addAPIEndpoint(name, method, path, callback) {
    if (this.apiServer && this.apiServer.server) {
      // Missed leading slash ? ... Add it
      if (path.charAt(0) !== "/") {
        path = "/" + path;
      }

      // Check if there is a function with this method name
      let fn = method.toLowerCase();
      let fullPath = "/plugin/" + name + path;
      try {
        if (this.apiServer.server[fn](fullPath, callback)) {
          this.logger.verbose(
            "Plugins",
            'Plugin endpoint %s "%s" successfully registered for "%s"',
            method,
            fullPath,
            name
          );
        }
      } catch {
        this.logger.error(
          "Plugins",
          'Unresolvable API http method "%s" in "%s"',
          fn,
          name
        );
      }
    }
  }
}

module.exports = PluginHandler;
