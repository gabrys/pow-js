import * as os from "os";
import * as std from "std";

import "./lib.lodash.mjs";
import { spawnSync } from "./pow.spawn.mjs";
import { PowLogger, PowUtils } from "./pow.utils.mjs";

const utils = new PowUtils();

const pow = {
  cwd: os.getcwd()[0],
  exec: os.exec,
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
    const file = `${curDir}/pow_file.js`;
    if (utils.fileExists(file)) {
      powFiles.push({
        baseDir: curDir,
        powFile: file,
      });
    }
    const powDir = `${curDir}/pow_files`;
    for (const name of utils.getFilesInDir(powDir)) {
      if (name.startsWith("pow_") && name.endsWith(".js")) {
        powFiles.push(`${powDir}/${name}`);
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
      // TODO: special treatment for when no pow files are found
      return {
        baseDir: "/",
        powFiles: [],
      };
    }
    curDir = newDir;
  }
}

function load() {
  // TODO: class based pow files with register and before_cmd
  // TODO: pow -u / pow -g t load user's pow files
  // TODO: support and embedded pow_files <wow>
  pow.log.debug("Running load()");
  const { baseDir, powFiles } = getPowFiles(pow.cwd);
  pow.baseDir = baseDir;

  const promises = powFiles.map((powFilePath) =>
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
      "  --repl   Load pow_files and open REPL",
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

pow.log = new PowLogger(parsedArgs.verbosity);
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
