import * as os from "os";
import * as std from "std";

// TODO: provide an emulation of subprocess.run
// TODO: getuid/getgid

export class PowUtils {
  file_exists(path) {
    const out = os.stat(path);
    return !out[1];
  }

  get_files_in_dir(dir) {
    const out = os.readdir(dir);
    const names = out[0];
    return names;
  }

  get_parent_dir(absdir) {
    const parts = absdir.split("/");
    const disk = parts[0];
    const path = parts.slice(1);
    if (disk !== "" && !disk.match(/^[A-Z]:$/)) {
      throw Error("get_parent_dir didn't get an absolute path");
    }
    path.pop();
    if (path.length === 0) {
      path.push("");
    }
    path.unshift(disk);
    return path.join("/");
  }

  to_kabob_case(name) {
    return name.replace(/_/g, "-");
  }

  to_snake_case(name) {
    return name.replace(/-/g, "_");
  }
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
      const newline_subst = std.sprintf("%-14s", "\n");
      const msg = args.join("\n").replace(/\n/g, newline_subst) + "\n";
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
