import * as std from "std";

import "./lib.lodash.mjs";
import { spawnSync } from "./pow.spawn.mjs";
import { PowLogger, PowUtils } from "./pow.utils.mjs";

const utils = new PowUtils();

const pow = {
  fns: {},
  spawnSync: spawnSync,
  verbosity: 0,
  ...utils,
};

function parseArgv(argv) {
  let { args, opts } = utils.parseArgv(
    [
      { name: "help", type: Boolean },
      { name: "repl", type: Boolean },
      { name: "verbose", alias: "v", multiple: true, type: Boolean },
    ],
    argv
  );
  const verbose = opts.verbose || [];

  if (opts.help) {
    args = [];
  }

  return {
    cmd: args[0],
    cmdArgs: args.slice(1),
    repl: opts.repl,
    verbosity: verbose.length,
  };
}

function getParentDir(absdir) {
  const parts = absdir.split("/");
  const disk = parts[0];
  const path = parts.slice(1);
  if (disk !== "" && !disk.match(/^[A-Z]:$/)) {
    throw Error("getParentDir didn't get an absolute path");
  }
  path.pop();
  if (path.length === 0) {
    path.push("");
  }
  path.unshift(disk);
  return path.join("/");
}

function getPowFiles(dir) {
  let curDir = dir;
  let newDir;

  const powFiles = [];

  while (true) {
    const file = `${curDir}/Powfile.mjs`;
    if (utils.fileExists(file)) {
      powFiles.push(file);
    }
    for (const powDir of [`${curDir}/Powfiles`, `${curDir}/pow_files`]) {
      const [_subdirs, files] = utils.listFiles(powDir);
      for (const name of files) {
        if (_.kebabCase(name).startsWith("pow-") && name.endsWith(".mjs")) {
          powFiles.push(`${powDir}/${name}`);
        }
        if (name === "pow.py") {
          powFiles.push(`${powDir}/${name}`);
        }
      }
    }
    if (powFiles.length) {
      return {
        baseDir: curDir,
        powFiles: powFiles,
      };
    }
    newDir = getParentDir(curDir);
    if (newDir === curDir) {
      // TODO: special treatment for when no Powfiles are found
      return {
        baseDir: null,
        powFiles: [],
      };
    }
    curDir = newDir;
  }
}

function load() {
  // TODO: pow -u to load user Powfile
  // TODO: pow -g (or -s?) to load system Powfile
  // TODO: pow -f file to load a specific Powfile
  // TODO: pow -d dir to load Powfiles from a specific directory
  // TODO: support embedding of Powfiles
  // TODO: allow help for pow commands
  pow.log.debug("Running load()");
  const { baseDir, powFiles } = getPowFiles(pow.cwd);
  pow.baseDir = baseDir;

  pow.log.debug("Discovered Powfiles:", ...powFiles);

  const powFilesPy = powFiles.filter((name) => name.endsWith(".py"));
  const powFilesMjs = powFiles.filter((name) => name.endsWith(".mjs"));

  // Handle JavaScript modules
  const promises = powFilesMjs.map((powFilePath) =>
    import(powFilePath).then(
      function success(mod) {
        pow.log.debug(`Loading ${powFilePath}`);
        for (const fullKey in mod) {
          const fn = mod[fullKey];
          const key = _.camelCase(fullKey.replace(/^pow/, ""));
          const ctx = {
            powFile: powFilePath,
          };

          if (
            fullKey.startsWith("pow") &&
            typeof fn === "function" &&
            !pow.fns[key]
          ) {
            pow.fns[key] = (args) => fn(ctx, args);
            pow.log.debug(`  * ${fullKey}`);
          }
        }
      },
      function fail(err) {
        pow.log.error(`Failed to load ${powFilePath}`);
        throw err;
      }
    )
  );

  // Handle Python modules
  if (powFilesPy.length === 1) {
    pow.log.debug(`Loading Python Powfiles`);
    const powPyPath = powFilesPy[0];
    const ext = pow.windows ? ".cmd" : "";
    const powRunnerPath = `py-pow-runner${ext}`;
    const cp = spawnSync(powRunnerPath, [powPyPath, "--list-commands"], {
      encoding: "utf-8",
    });
    const cmds = cp.stdout.trim().split("\n");
    for (const cmd of cmds) {
      const key = _.camelCase(cmd);
      if (cmd && !pow.fns[key]) {
        pow.log.debug(`  * pow_${_.snakeCase(cmd)}`);
        pow.fns[key] = (args) => {
          pow.log.info(`Launching pow ${[cmd, ...args].join(" ")} via Python`);
          const cp2 = spawnSync(powRunnerPath, [powPyPath, cmd, ...args], {
            stdio: "inherit",
          });
          return cp2.status;
        };
      }
    }
  }

  return Promise.all(promises);
}

function powListCommands() {
  const cmd_help = [];
  const cmds = Object.keys(pow.fns);
  cmds.sort();
  for (const cmd of cmds) {
    if (!pow.fns[cmd].hide) {
      cmd_help.push(`  pow ${_.kebabCase(cmd)}`);
    }
  }
  print(
    [
      "\nUsage: pow [OPTIONS] COMMAND [COMMAND PARAMETERS]",
      "\nOptions:",
      "  --help   Display this help and exit",
      "  --repl   Load Powfiles and open REPL",
      "  -v       Set verbosity to INFO",
      "  -vv      Set verbosity to DEBUG",
      "\nCommands:",
      ...cmd_help,
      "",
    ].join("\n")
  );
}

function commandNotFound(args) {
  pow.log.error(`command "${args[0]}" not found.\nSee "pow --help"`);
  return 1;
}

function main(parsedArgs) {
  pow.log.debug("Running main()");

  const cmd = _.camelCase(parsedArgs.cmd) || "_help";
  const cmdArgs = parsedArgs.cmdArgs;

  let fullCmd = `pow.fns.${cmd}`;
  let fn = pow.fns[cmd];

  if (!fn) {
    cmdArgs.unshift(parsedArgs.cmd);
    fullCmd = "command_not_found";
    fn = commandNotFound;
  }

  if (parsedArgs.repl) {
    pow.log.info(`Launching pow REPR`);
  } else {
    pow.log.info(`Launching ${fullCmd}`);
    pow.log.debug(`Arguments`, ...cmdArgs);

    const ret = fn(cmdArgs);
    std.exit(ret);
  }
}

globalThis.pow = pow;
globalThis.__ = _;

const parsedArgs = parseArgv(scriptArgs.slice(1));

// Expose logger
pow.log = new PowLogger(parsedArgs.verbosity);
pow.DEBUG = (...args) => pow.log.debug(...args);
pow.INFO = (...args) => pow.log.info(...args);
pow.WARN = (...args) => pow.log.warn(...args);
pow.ERROR = (...args) => pow.log.error(...args);
pow.verbosity = parsedArgs.verbosity;

pow.fns._help = powListCommands;
pow.fns._help.hide = true;

load().then(
  function success() {
    globalThis.__post_run = () => main(parsedArgs, pow);
  },
  function fail(err) {
    globalThis.__post_run = () => {
      throw err;
    };
  }
);

// vim: tabstop=2 shiftwidth=2 expandtab
