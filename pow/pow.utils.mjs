import * as os from "os";
import * as std from "std";
import commandLineArgs from "./lib.args.mjs";

export class PowUtils {
  constructor() {
    // example os.getcwd() on Windows:
    // [ "//?/C:/Users/gabrys/pow-js", 0 ]
    const path = os.getcwd()[0];
    const windowsPathMatch = path.match(/^\/\/[^\/]+\/([A-Z]:\/.*)/);
    if (windowsPathMatch) {
      this.cwd = windowsPathMatch[1];
      this.platform = "win32";
      this.windows = true;
      return;
    }
    this.cwd = path;
    this.platform = std.popen("uname", "r").getline().toLowerCase();
    this.gid = ~~std.popen("id -g", "r").getline();
    this.uid = ~~std.popen("id -u", "r").getline();
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

  // runcmd(cmd, in_opts) {
  //   // Limited port of Python's subprocess.run
  //   // TODO: support for check, shell and timeout

  //   in_opts = in_opts || {};

  //   const opts = {
  //     block: false,
  //   };

  //   let pipe_in;
  //   let pipe_out;
  //   let pipe_err;
  //   let stdin;
  //   let stdout;
  //   let stderr;

  //   if (in_opts.cwd) {
  //     opts.cwd = in_opts.cwd;
  //   }

  //   if (in_opts.input) {
  //     pipe_in = os.pipe();
  //     opts.stdin = pipe_in[0];
  //   }

  //   if (in_opts.capture_output) {
  //     pipe_out = os.pipe();
  //     pipe_err = os.pipe();
  //     opts.stdout = pipe_out[1];
  //     opts.stderr = pipe_err[1];
  //   }

  //   const pid = os.exec(cmd, opts);
  //   const ret = {};

  //   if (in_opts.input) {
  //     stdin = std.fdopen(pipe_in[1], "w");
  //     stdin.puts(in_opts.input);
  //     stdin.close();
  //   }

  //   if (in_opts.capture_output) {
  //     os.close(pipe_out[1]);
  //     os.close(pipe_err[1]);
  //     stdout = std.fdopen(pipe_out[0], "r");
  //     stderr = std.fdopen(pipe_err[0], "r");
  //     ret.stdout = stdout.readAsString();
  //     ret.stderr = stderr.readAsString();
  //   }

  //   ret.returncode = os.waitpid(pid, 0)[1];

  //   if (in_opts.input) {
  //     os.close(opts.stdin);
  //   }

  //   return ret;
  // }
}

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

// vim: tabstop=2 shiftwidth=2 expandtab
