import * as os from "os";
import * as std from "std";
import commandLineArgs from "./lib.args.mjs";
import {windows, windowsCwd} from "./pow.windows.mjs";

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

  getFilesInDir = (dir) => {
    const out = os.readdir(dir);
    const names = out[0];
    return names;
  };

  parseArgv = (definitions, argv) => {
    // TODO: improve error message for pow --abc
    const { _unknown, ...opts } = commandLineArgs(definitions, {
      argv: argv,
      stopAtFirstUnknown: true,
    });
    return {
      args: _unknown || [],
      opts: opts || {},
    };
  };
}

// vim: tabstop=2 shiftwidth=2 expandtab
