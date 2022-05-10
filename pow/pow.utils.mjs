import * as os from "os";
import * as std from "std";
import commandLineArgs from "./lib.args.mjs";
import { windows, windowsCwd } from "./pow.windows.mjs";

export class PowLogger {
  constructor(verbosity) {
    this.verbosity = verbosity;
  }

  levels = {
    "-1": "ERROR",
    0: "WARN",
    1: "INFO",
    2: "DEBUG",
  };

  ERROR = -1;
  WARN = 0;
  INFO = 1;
  DEBUG = 2;

  log(level, ...args) {
    if (level > this.verbosity) {
      return;
    }

    // extended logging
    if (this.verbosity > 0) {
      const newlineSubst = std.sprintf("%-14s", "\n");
      const msg = args.join("\n").replace(/\n/g, newlineSubst) + "\n";
      std.err.printf("[pow] %-7s %s", `[${this.levels[level]}]`, msg);
      return;
    }

    // simple logging
    std.err.printf("pow: %s\n", args.join(" "));
  }

  error(...args) {
    this.log(this.ERROR, ...args);
  }

  warn(...args) {
    this.log(this.WARN, ...args);
  }

  info(...args) {
    this.log(this.INFO, ...args);
  }

  debug(...args) {
    this.log(this.DEBUG, ...args);
  }
}

export class PowUtils {
  constructor() {
    if (windows) {
      this.cwd = windowsCwd;
      this.platform = "win32";
      this.windows = true;
    } else {
      this.cwd = os.getcwd()[0];
      this.platform = std.popen("uname", "r").getline().toLowerCase();
      this.gid = ~~std.popen("id -g", "r").getline();
      this.uid = ~~std.popen("id -u", "r").getline();
    }
  }

  fileExists = (path) => {
    const out = os.stat(path);
    return !out[1];
  };

  listFiles = (path) => {
    const dirs = [];
    const files = [];
    const [names, _readStatus] = os.readdir(path);
    // TODO: pow.listFiles: check status
    for (const name of names) {
      if (name === "." || name === "..") {
        continue;
      }
      const [stat, _statStatus] = os.stat(`${path}/${name}`);
      if (stat & os.S_IFDIR) {
        dirs.push(name);
      } else {
        files.push(name);
      }
    }
    dirs.sort();
    files.sort();
    return [dirs, files];
  };

  parseArgv = (definitions, argv) => {
    // TODO: improve error message for pow --abc
    const { _unknown, ...opts } = commandLineArgs(definitions, {
      argv: argv,
      stopAtFirstUnknown: true,
    });

    const args = _unknown || [];
    const firstArg = args[0] || "";

    // Parse "-", "--" and error on unknown options
    if (firstArg.startsWith("-")) {
      if (firstArg === "--") {
        args.shift();
      } else if (firstArg !== "-") {
        throw new Error(`Unknown option: ${firstArg}`);
      }
    }

    return {
      args: args,
      opts: opts || {},
    };
  };

  readFile = (path) => {
    const f = std.open(path, "r");
    return f.readAsString();
  };
}

// vim: tabstop=2 shiftwidth=2 expandtab
