import * as os from "os";
import * as std from "std";

import { windows, windowsFindExecutable } from "./pow.windows.mjs";

class NotImplemented extends Error {}

function validateStdioOpt(opt) {
  if (typeof opt !== "string") {
    throw new NotImplemented("Non-string oprions for stdio are not suppoerted");
  }
  if (opt === "overlapped") {
    throw new NotImplemented(`spawn: stdio: ${opt} is not supported`);
  }
  if (!["pipe", "inherit", "ignore"].includes(opt)) {
    throw TypeError(`The argument 'stdio' is invalid. Received '${opt}'`);
  }
}

function normalizeStdioOption(stdio) {
  if (!Array.isArray(stdio)) {
    stdio = [stdio, stdio, stdio];
  }

  if (stdio.length > 3) {
    throw new NotImplemented(
      "spawn: passing more than 3 fds to stdio is not supported"
    );
  }

  stdio[0] = stdio[0] ?? "pipe";
  stdio[1] = stdio[1] ?? "pipe";
  stdio[2] = stdio[2] ?? "pipe";

  validateStdioOpt(stdio[0]);
  validateStdioOpt(stdio[1]);
  validateStdioOpt(stdio[2]);

  return stdio;
}

// Based on https://github.com/uki00a/deno_std/blob/3c8549b6fe09a147f320a35d6fc34f08824e0d13/node/spawn.ts
function buildCommand(file, args, shell) {
  let shellFile;
  if (shell && args && args.length) {
    throw new NotImplemented("spawn: shell with arguments is not supported");
  }
  if (shell && windows) {
    // Set the shell, switches, and commands.
    if (typeof shell === "string") {
      shellFile = shell;
    } else {
      shellFile = std.getenv("comspec") || "cmd.exe";
    }
    // '/d /s /c' is used only for cmd.exe.
    if (/^(?:.*\\)?cmd(?:\.exe)?$/i.test(shellFile)) {
      args = ["/d", "/s", "/c", file];
    } else {
      args = ["-c", file];
    }
  }
  if (shell && !windows) {
    if (typeof shell === "string") {
      shellFile = shell;
    } else {
      shellFile = "/bin/sh";
    }
    args = ["-c", file];
  }
  if (!shell && windows) {
    if (!file.includes("/") && !file.includes("\\")) {
      file = windowsFindExecutable(file) || file;
    }
  }
  if (shell) {
    file = shellFile;
  }
  return [file, ...args];
}

export function spawnSync(cmd, args, inOpts) {
  /*
    + cwd <string> | <URL> Current working directory of the child process.
    + input <string> | <Buffer> | <TypedArray> | <DataView> The value which will be passed as stdin to the spawned process. Supplying this value will override stdio[0].
      argv0 <string> Explicitly set the value of argv[0] sent to the child process. This will be set to command if not specified.
    + stdio <string> | <Array> Child's stdio configuration.
    + env <Object> Environment key-value pairs. Default: process.env.
    + uid <number> Sets the user identity of the process (see setuid(2)).
    + gid <number> Sets the group identity of the process (see setgid(2)).
      timeout <number> In milliseconds the maximum amount of time the process is allowed to run. Default: undefined.
      killSignal <string> | <integer> The signal value to be used when the spawned process will be killed. Default: 'SIGTERM'.
      maxBuffer <number> Largest amount of data in bytes allowed on stdout or stderr. If exceeded, the child process is terminated and any output is truncated. See caveat at maxBuffer and Unicode. Default: 1024 * 1024.
    + encoding <string> The encoding used for all stdio inputs and outputs. Default: 'buffer'.
    + shell <boolean> | <string> If true, runs command inside of a shell. Uses '/bin/sh' on Unix, and process.env.ComSpec on Windows. A different shell can be specified as a string. See Shell requirements and Default Windows shell. Default: false (no shell).
      windowsVerbatimArguments <boolean> No quoting or escaping of arguments is done on Windows. Ignored on Unix. This is set to true automatically when shell is specified and is CMD. Default: false.
      windowsHide <boolean> Hide the subprocess console window that would normally be created on Windows systems. Default: false.
  */
  inOpts = inOpts || {};

  // TODO: spawn: support skipping args
  // TODO: spawn: better support stdio: ignore
  // TODO: spawn: support timeout

  const supportedOpts = [
    "cwd",
    "input",
    "stdio",
    "env",
    "uid",
    "gid",
    "encoding",
    "shell",
  ];
  const unsupportedOpts = [
    "argv0",
    "timeout",
    "killSignal",
    "maxBuffer",
    "windowsVerbatimArguments",
    "windowsHide",
  ];

  for (const optName in inOpts) {
    if (unsupportedOpts.includes(optName)) {
      throw new NotImplemented(`spawn: option "${optName}" is not supported`);
    }
    if (!supportedOpts.includes(optName)) {
      throw new TypeError(`spawn: option "${optName}" is bad`);
    }
  }

  const stdioConfig = normalizeStdioOption(inOpts.stdio);

  const opts = {
    block: false,
  };

  let pipeIn;
  let pipeOut;
  let pipeErr;
  let stdin;
  let stdout;
  let stderr;

  if (inOpts.cwd) {
    opts.cwd = inOpts.cwd;
  }

  if (inOpts.input) {
    pipeIn = os.pipe();
    opts.stdin = pipeIn[0];
  }

  const encoding = inOpts.encoding || "buffer";

  if (encoding !== "utf-8") {
    if (stdioConfig[1] === "pipe" || stdioConfig[2] === "pipe") {
      throw new NotImplemented(`spawn: encoding: ${encoding} + stdio: pipe`);
    }
  }

  if (stdioConfig[1] === "pipe" && encoding !== "utf-8") {
    throw new NotImplemented("spawn: only encoding: utf-8 is supported");
  }
  if (["pipe", "ignore"].includes(stdioConfig[1])) {
    pipeOut = os.pipe();
    opts.stdout = pipeOut[1];
  }

  if (stdioConfig[2] === "pipe" && encoding !== "utf-8") {
    throw new NotImplemented("spawn: only encoding: utf-8 is supported");
  }
  if (["pipe", "ignore"].includes(stdioConfig[1])) {
    pipeErr = os.pipe();
    opts.stderr = pipeErr[1];
  }

  opts.env = inOpts.env;
  opts.uid = inOpts.uid;
  opts.gid = inOpts.gid;

  const fullCmd = buildCommand(cmd, args, inOpts.shell);

  // EXEC HERE!
  const pid = os.exec(fullCmd, opts);
  const ret = {};

  if (inOpts.input) {
    stdin = std.fdopen(pipeIn[1], "w");
    stdin.puts(inOpts.input);
    stdin.close();
  }

  if (["pipe", "ignore"].includes(stdioConfig[1])) {
    os.close(pipeOut[1]);
  }
  if (stdioConfig[1] === "pipe") {
    stdout = std.fdopen(pipeOut[0], "r");
    ret.stdout = stdout.readAsString();
  }

  if (["pipe", "ignore"].includes(stdioConfig[2])) {
    os.close(pipeErr[1]);
  }
  if (stdioConfig[2] === "pipe") {
    stderr = std.fdopen(pipeErr[0], "r");
    ret.stderr = stderr.readAsString();
  }

  const status = os.waitpid(pid, 0)[1];
  ret.status = (status & 0xff00) >> 8;
  if (ret.status !== 0) {
    ret.error = {};
  }

  if (inOpts.input) {
    os.close(opts.stdin);
  }

  return ret;
}
