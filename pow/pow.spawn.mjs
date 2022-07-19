import * as bspawn from "bspawn";
import * as os from "os";
import * as std from "std";

class NotImplemented extends Error {}

function buildCommand(cmd, args, shell) {
  if (!shell) {
    return {
      useDefaultShell: false,
      fullCmd: [cmd, ...args],
    };
  }

  // shell is truthy

  if (args && args.length) {
    throw new NotImplemented("spawn: shell with arguments is not supported");
  }

  // args is empty

  if (typeof shell !== "string") {
    return {
      useDefaultShell: true,
      fullCmd: cmd,
    };
  }

  // shell is a string

  if (/^(?:.*\\)?cmd(?:\.exe)?$/i.test(shellFile)) {
    throw new NotImplemented(
      "spawn: selecting a cmd shell is not supported on Windows"
    );
  }

  // shell is not cmd.exe. It is probably a Unix shell (bash/sh) or powershell
  // an thus should support -c param

  return {
    useDefaultShell: false,
    fullCmd: [shell, "-c", cmd],
  };
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

  const { fullCmd, useDefaultShell } = buildCommand(cmd, args, inOpts.shell);

  const cwd = inOpts.cwd || os.getcwd()[0];
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

  const impl = os.platform === "win32" ? runImplWindows : runImplCosmo;

  return impl(fullCmd, cwd, env, input, stdin, stdout, stderr, useDefaultShell);
}

function runImplCosmo(
  cmd, // string if useDefaultShell=true, otherwise Array
  cwd, // always string
  env, // object of key-value strings
  input, // undefined or string
  stdinConfig, // "close" or "inherit". Always "close" if input is passed
  stdoutConfig, // "ignore", "inherit" or "capture"
  stderrConfig, // "ignore", "inherit" or "capture"
  useDefaultShell // bool, cmd is a string to run via defaultShell
) {
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

  if (useDefaultShell) {
    cmd = ["sh", "-c", cmd];
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

function runImplWindows(
  cmd, // string if useDefaultShell=true, otherwise Array
  cwd, // always string
  env, // object of key-value strings
  input, // undefined or string
  stdin, // "ignore" or "inherit". Always "ignore" if input is passed
  stdout, // "ignore", "inherit" or "capture"
  stderr, // "ignore", "inherit" or "capture"
  useDefaultShell // bool, cmd is a string to run via cmd.exe
) {
  let debugInput = input === undefined ? "(not set)" : input;
  if (debugInput.length > 15) {
    debugInput = debugInput.substring(0, 12) + "...";
  }
  pow.DEBUG(
    "Running command via bspawn",
    `cmd:       ${JSON.stringify(cmd)}`,
    `cwd:       ${cwd}`,
    `env:       ${env}`,
    `input:     ${debugInput}`,
    `stdin:     ${stdin}`,
    `stdout:    ${stdout}`,
    `stderr:    ${stderr}`,
    `useShell:  ${useDefaultShell}`
  );

  const cmdExe = std.getenv("comspec") || "cmd.exe";

  const randomCmd = "echo %RANDOM%%RANDOM% %RANDOM%%RANDOM%";
  const randomCp = reproc.run(
    [cmdExe, "/d", "/s", "/c", randomCmd],
    cwd,
    env,
    "ignore",
    "capture",
    "inherit"
  );
  const [random1, random2] = randomCp.stdout
    .trim()
    .split(" ")
    .map((n) => Math.abs(n));

  const cmdPath = `${std.getenv("TMP")}\\pow-run-${random1}.cmd`;
  const inputPath = `${std.getenv("TMP")}\\pow-run-${random1}.input`;

  if (input !== undefined) {
    const inputFile = std.open(inputPath, "w");
    inputFile.puts(input);
    inputFile.close();
  }

  let reprocCmd;

  if (useDefaultShell) {
    const cmdFile = std.open(cmdPath, "w");
    cmdFile.puts("@echo off\n" + cmd);
    if (input !== undefined) {
      cmdFile.puts(` < ${inputPath}`);
    }
    cmdFile.close();
    reprocCmd = cmdPath;
  } else {
    if (!cmd[0].includes("/") && !cmd[0].includes("\\")) {
      cmd[0] = windowsFindExecutable(cmd[0], cwd, env) || cmd[0];
    }
    for (let i = 0; i < cmd.length; i += 1) {
      cmd[i] = `'${cmd[i].replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
    }
    let cmdString = `& ${cmd.join(" ")}`;
    pow.DEBUG("Launching PowerShell script:", cmdString);
    if (input !== undefined) {
      cmdString += ` < ${inputPath}`;
    }
    reprocCmd = ["powershell.exe", "-Command", cmdString];
  }

  const out = bspawn.spawn_child(
    cmd, //
    cwd, //
    env, //
    stdin_config, //
    stdout_config, //
    stderr_config, //
    stdin_data, //
    timeout //
  );

  os.remove(cmdPath);
  os.remove(inputPath);

  return out;
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

function windowsFindExecutable(name, cwd, env) {
  const cp = reproc.run(
    ["where", name],
    cwd,
    env,
    "close",
    "capture",
    "inherit"
  );
  const candidates = cp.stdout.trim().split("\r\n");
  for (const candidate of candidates) {
    const ext = candidate.split(".").pop().toLowerCase();
    if (["bat", "cmd", "exe"].includes(ext)) {
      return candidate;
    }
  }
}
