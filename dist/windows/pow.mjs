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

pow.runPowPy = function runPowPy(powPyPath, cmd, args) {
  const cmdArgs = [powPyPath, cmd, ...args];
  const env = std.getenviron();
  pow.log.info(`Launching py-pow-runner ${cmdArgs.join(" ")}`);
  const cp = spawnSync("py-pow-runner", cmdArgs, {
    env: {
      SILENCE_POW_DEPRECATION_WARNING: "1",
      ...env,
    },
    stdio: "inherit",
  });
  return cp.status;
};

class CommandNotFound {
  run(args) {
    pow.log.error(`command "${args[0]}" not found.\nSee "pow --help"`);
    return 1;
  }
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

function parseArgv(argv) {
  let { args, opts } = utils.parseArgv(
    [
      { name: "help", type: Boolean },
      { name: "repl", type: Boolean },
      { name: "verbose", alias: "v", multiple: true, type: Boolean },
    ],
    argv,
    { cmdName: "pow" }
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

class PowListCommands {
  hide = true;
  run() {
    const cmdTable = [];
    const cmdKeys = Object.keys(pow.fns);
    cmdKeys.sort();
    for (const key of cmdKeys) {
      const fn = pow.fns[key];
      if (!fn.hide) {
        cmdTable.push([
          `  pow ${_.kebabCase(key)}  ${fn.helpArguments}`,
          fn.helpShort,
        ]);
      }
    }

    const firstColLen = _.max(
      cmdTable.map((item) => {
        const len = item[0].length;
        if (len > 40) {
          return 0;
        }
        return len;
      })
    );

    const cmdHelp = cmdTable.map((row) => {
      let [firstCol, secondCol] = row;
      if (firstCol.length > 40) {
        secondCol = `\n${_.padEnd("", firstColLen)}  ${secondCol}`;
      } else {
        firstCol = _.padEnd(firstCol, firstColLen);
      }
      return `${firstCol}  ${secondCol}`;
    });

    print(
      [
        "\nUsage: pow [OPTIONS] COMMAND [COMMAND PARAMETERS]",
        "\nOptions:",
        "  --help   Display this help and exit",
        "  --repl   Load Powfiles and open REPL",
        "  -v       Set verbosity to INFO",
        "  -vv      Set verbosity to DEBUG",
        "\nCommands:",
        ...cmdHelp,
        "",
      ].join("\n")
    );
  }
}

function load() {
  // TODO: pow -u to load user Powfile
  // TODO: pow -g (or -s?) to load system Powfile
  // TODO: pow -f file to load a specific Powfile
  // TODO: pow -d dir to load Powfiles from a specific directory
  // TODO: support embedding of Powfiles
  pow.log.debug("Running load()");
  const { baseDir, powFiles } = getPowFiles(pow.cwd);
  pow.baseDir = baseDir;

  pow.log.debug("Discovered Powfiles:", ...powFiles);

  const powFilesMjs = powFiles.filter((name) => name.endsWith(".mjs"));

  // Handle JavaScript modules
  const promises = powFilesMjs.map((powFilePath) =>
    import(powFilePath).then(
      function success(mod) {
        pow.log.debug(`Loading ${powFilePath}`);
        for (const fullKey in mod) {
          const cmdClass = mod[fullKey];
          const kebabFullKey = _.kebabCase(fullKey);
          const key = _.camelCase(kebabFullKey.replace(/^pow-/, ""));
          const ctx = {
            powFile: powFilePath,
          };

          if (
            kebabFullKey.startsWith("pow-") &&
            typeof cmdClass === "function" &&
            !pow.fns[key]
          ) {
            pow.log.debug(`  * ${_.padEnd(fullKey, 30)}  -->  pow.fns.${key}`);
            if (typeof cmdClass.prototype.run !== "function") {
              throw new Error(
                `${fullKey} doesn't have method "run" in ${powFilePath}`
              );
            }
            const cmd = new cmdClass();
            pow.fns[key] = {
              helpArguments: cmd.helpArguments || "",
              helpShort: cmd.helpShort || "",
              hide: cmd.hide,
              run: (args) => cmd.run(ctx, args),
            };
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

function main(parsedArgs) {
  pow.log.debug("Running main()");

  const cmd = _.camelCase(parsedArgs.cmd) || "_help";
  const cmdArgs = parsedArgs.cmdArgs;

  let fullCmd = `pow.fns.${cmd}`;
  let fn = pow.fns[cmd];

  if (!fn) {
    cmdArgs.unshift(parsedArgs.cmd);
    fullCmd = "command_not_found";
    fn = new CommandNotFound();
  }

  if (parsedArgs.repl) {
    pow.log.info(`Launching pow REPR`);
  } else {
    pow.log.info(`Launching ${fullCmd}`);
    if (cmdArgs.length) {
      pow.log.debug(`Arguments`, ...cmdArgs);
    } else {
      pow.log.debug("Arguments: (empty)");
    }

    const ret = fn.run(cmdArgs);
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

pow.fns._help = new PowListCommands();

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
