import * as os from "os";
import * as std from "std";

class NotImplemented extends Error {}

function buildCommand(cmd, args, shell) {
  const cmdExe = std.getenv("comspec") || "cmd.exe";
  const defaultShell = pow.windows ? cmdExe : "/bin/sh";

  if (!shell) {
    return [cmd, ...args];
  }

  if (typeof shell === "string") {
    throw new NotImplemented(
      `spawn: selecting a shell is not supported (shell: true will use ${defaultShell})`
    );
  }

  if (args && args.length) {
    throw new NotImplemented("spawn: shell with arguments is not supported");
  }

  if (pow.windows) {
    return [defaultShell, "/d", "/s", "/c", cmd];
  }

  return [defaultShell, "-c", cmd];
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

export function spawnSync(cmd, args, inOpts) {
  /*
    + cwd <string> | <URL> Current working directory of the child process.
    + input <string> | <Buffer> | <TypedArray> | <DataView> The value which will be passed as stdin to the spawned process. Supplying this value will override stdio[0].
      argv0 <string> Explicitly set the value of argv[0] sent to the child process. This will be set to command if not specified.
    + stdio <string> | <Array> Child's stdio configuration.
    + env <Object> Environment key-value pairs. Default: process.env.
      uid <number> Sets the user identity of the process (see setuid(2)).
      gid <number> Sets the group identity of the process (see setgid(2)).
      timeout <number> In milliseconds the maximum amount of time the process is allowed to run. Default: undefined.
      killSignal <string> | <integer> The signal value to be used when the spawned process will be killed. Default: 'SIGTERM'.
      maxBuffer <number> Largest amount of data in bytes allowed on stdout or stderr. If exceeded, the child process is terminated and any output is truncated. See caveat at maxBuffer and Unicode. Default: 1024 * 1024.
    + encoding <string> The encoding used for all stdio inputs and outputs. Default: 'buffer'.
    + shell <boolean> | <string> If true, runs command inside of a shell. Uses '/bin/sh' on Unix, and process.env.ComSpec on Windows. A different shell can be specified as a string. See Shell requirements and Default Windows shell. Default: false (no shell).
      windowsVerbatimArguments <boolean> No quoting or escaping of arguments is done on Windows. Ignored on Unix. This is set to true automatically when shell is specified and is CMD. Default: false.
      windowsHide <boolean> Hide the subprocess console window that would normally be created on Windows systems. Default: false.
  */
  if (!Array.isArray(args) && inOpts === undefined) {
    inOpts = args;
    args = [];
  }
  inOpts = inOpts || {};

  const supportedOpts = ["cwd", "encoding", "env", "input", "shell", "stdio"];
  const unsupportedOpts = [
    "argv0",
    "gid",
    "killSignal",
    "maxBuffer",
    "timeout",
    "uid",
    "windowsHide",
    "windowsVerbatimArguments",
  ];

  if (typeof cmd !== "string") {
    throw new Exception(
      "First argument to pow.spawnSync needs to be a string (command to run)"
    );
  }

  if (!Array.isArray(args)) {
    throw new Exception(
      "Second argument to pow.spawnSync needs to be an array (list of arguments)"
    );
  }

  for (const optName in inOpts) {
    if (unsupportedOpts.includes(optName)) {
      throw new NotImplemented(`spawn: option "${optName}" is not supported`);
    }
    if (!supportedOpts.includes(optName)) {
      throw new TypeError(`spawn: option "${optName}" is bad`);
    }
  }

  const stdioConfig = normalizeStdioOption(inOpts.stdio);
  const encoding = inOpts.encoding || "buffer";

  if (encoding !== "utf-8") {
    if (stdioConfig[1] === "pipe" || stdioConfig[2] === "pipe") {
      throw new NotImplemented(`spawn: encoding: ${encoding} + stdio: pipe`);
    }
  }

  if (stdioConfig[1] === "pipe" && encoding !== "utf-8") {
    throw new NotImplemented("spawn: only encoding: utf-8 is supported");
  }

  if (stdioConfig[2] === "pipe" && encoding !== "utf-8") {
    throw new NotImplemented("spawn: only encoding: utf-8 is supported");
  }

  const fullCmd = buildCommand(cmd, args, inOpts.shell);

  const cwd = inOpts.cwd || pow.cwd;
  const env = inOpts.env || std.getenviron();

  let [stdin, stdout, stderr] = stdioConfig;

  let input = inOpts.input;
  if (typeof input !== "string") {
    if (input) {
      throw new NotImplemented("spawn: only string input is supported");
    }
    input = undefined;
  }
  if (stdin !== "inherit") {
    stdin = "close";
  }

  pow.DEBUG("Running command", fullCmd, cwd, env, input, stdin, stdout, stderr);
  return runImplCosmo(fullCmd, cwd, env, input, stdin, stdout, stderr);
}

function runImplCosmo(
  cmd, // always Array
  cwd, // always string
  env, // object of key-value strings
  input, // undefined or string
  stdinConfig, // "ignore", "inherit" or "pipe". "pipe" if and only if input is passed
  stdoutConfig, // "ignore", "inherit" or "pipe"
  stderrConfig // "ignore", "inherit" or "pipe"
) {
  if (pow.windows) {
    env = supplementWindowsEnvironment(env);
  }

  const opts = {
    block: false,
    cwd: cwd,
    env: env,
  };

  let pipeIn;
  let pipeOut;
  let pipeErr;
  let stdin;
  let stdout;
  let stderr;

  if (["capture", "ignore"].includes(stdoutConfig)) {
    pipeOut = os.pipe();
    opts.stdout = pipeOut[1];
  }
  if (["capture", "ignore"].includes(stderrConfig)) {
    pipeErr = os.pipe();
    opts.stderr = pipeErr[1];
  }

  if (stdinConfig === "close") {
    pipeIn = os.pipe();
    opts.stdin = pipeIn[0];
  }

  // EXEC HERE!
  const pid = os.exec(cmd, opts);
  const ret = {};

  if (input !== undefined) {
    stdin = std.fdopen(pipeIn[1], "w");
    stdin.puts(input);
    stdin.close();
  }

  if (["capture", "ignore"].includes(stdoutConfig)) {
    os.close(pipeOut[1]);
  }
  if (stdoutConfig === "capture") {
    stdout = std.fdopen(pipeOut[0], "r");
    ret.stdout = stdout.readAsString();
  }

  if (["capture", "ignore"].includes(stderrConfig)) {
    os.close(pipeErr[1]);
  }
  if (stderrConfig === "capture") {
    stderr = std.fdopen(pipeErr[0], "r");
    ret.stderr = stderr.readAsString();
  }

  const status = os.waitpid(pid, 0)[1];
  ret.status = (status & 0xff00) >> 8;
  if (ret.status !== 0) {
    ret.error = {};
  }

  if (stdinConfig === "close") {
    os.close(opts.stdin);
  }

  return ret;
}

function validateStdioOpt(opt) {
  if (typeof opt !== "string") {
    throw new NotImplemented("Non-string oprions for stdio are not supported");
  }
  if (opt === "overlapped") {
    throw new NotImplemented(`spawn: stdio: ${opt} is not supported`);
  }
  if (!["pipe", "inherit", "ignore"].includes(opt)) {
    throw TypeError(`The argument 'stdio' is invalid. Received '${opt}'`);
  }
}

function supplementWindowsEnvironment(env) {
  const newEnv = { ...env };

  for (const envName of [
    "HOMEDRIVE",
    "HOMEPATH",
    "LOGONSERVER",
    "PATH",
    "SYSTEMDRIVE",
    "SYSTEMROOT",
    "TEMP",
    "USERDOMAIN",
    "USERNAME",
    "USERPROFILE",
    "WINDIR",
  ]) {
    if (newEnv[envName] === undefined) {
      newEnv[envName] = std.getenv(envName);
    }
  }
  return newEnv;
}
