import * as os from "os";
import * as std from "std";

function is_windows() {
  // os.platform returns linux due to cosmo
  const parts = os.getcwd()[0].split("/");
  const disk = parts[0];
  return !!disk.match(/^[A-Z]:$/);
}

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

  get_gid() {
    if (this.is_windows) {
      return;
    }
    const cmd = std.popen("id -g", "r");
    const out = cmd.getline();
    return ~~out;
  }

  get_uid() {
    if (this.is_windows) {
      return;
    }
    const cmd = std.popen("id -u", "r");
    const out = cmd.getline();
    return ~~out;
  }

  is_windows = is_windows();

  runcmd(cmd, in_opts) {
    // Limited port of Python's subprocess.run
    // TODO: support for check, shell and timeout

    in_opts = in_opts || {};

    const opts = {
      block: false,
    };

    let pipe_in;
    let pipe_out;
    let pipe_err;
    let stdin;
    let stdout;
    let stderr;

    if (in_opts.cwd) {
      opts.cwd = in_opts.cwd;
    }

    if (in_opts.input) {
      pipe_in = os.pipe();
      opts.stdin = pipe_in[0];
    }

    if (in_opts.capture_output) {
      pipe_out = os.pipe();
      pipe_err = os.pipe();
      opts.stdout = pipe_out[1];
      opts.stderr = pipe_err[1];
    }

    const pid = os.exec(cmd, opts);
    const ret = {};

    if (in_opts.input) {
      stdin = std.fdopen(pipe_in[1], "w");
      stdin.puts(in_opts.input);
      stdin.close();
    }

    if (in_opts.capture_output) {
      os.close(pipe_out[1]);
      os.close(pipe_err[1]);
      stdout = std.fdopen(pipe_out[0], "r");
      stderr = std.fdopen(pipe_err[0], "r");
      ret.stdout = stdout.readAsString();
      ret.stderr = stderr.readAsString();
    }

    ret.returncode = os.waitpid(pid, 0)[1];

    if (in_opts.input) {
      os.close(opts.stdin);
    }

    return ret;
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
