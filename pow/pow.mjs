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
          const kebabFullKey = _.kebabCase(fullKey);
          const key = _.camelCase(kebabFullKey.replace(/^pow-/, ""));
          const ctx = {
            powFile: powFilePath,
          };

          if (
            kebabFullKey.startsWith("pow-") &&
            typeof fn === "function" &&
            !pow.fns[key]
          ) {
            pow.log.debug(
              `  * ${_.padEnd(fullKey, 30)}  -->  pow.fns["${key}"]`
            );
            pow.fns[key] = (args) => {
              if (typeof fn.run === "function") {
                return fn.run(ctx, args);
              }
              return fn(ctx, args);
            };
            pow.fns[key].helpArguments = fn.helpArguments || "";
            pow.fns[key].helpShort = fn.helpShort || "";
            pow.fns[key].hide = fn.hide;
          }
        }
      },
      function fail(err) {
        pow.log.error(`Failed to load ${powFilePath}`);
        throw err;
      }
    )
  );

  return Promise.all(promises).then(function success() {
    // Handle Python modules
    if (powFilesPy.length !== 1) {
      return;
    }

    pow.log.debug(`Loading Python Powfiles`);

    const powPyPath = powFilesPy[0];
    const powRunnerPath = "py-pow-runner";
    const cp = spawnSync(powRunnerPath, [powPyPath, "--list-commands"], {
      encoding: "utf-8",
    });
    // TODO: Weird bug on Windows. In Git Bash, the output is printed to stderr
    const cmds = (cp.stdout.trim() || cp.stderr.trim()).split(/[\n\r]+/g);

    for (const cmd of cmds) {
      if (!cmd) {
        continue;
      }
      const [name, ...help] = cmd.split(": ");
      const helpShort = help.join(": ");
      const key = _.camelCase(name);
      if (!pow.fns[key]) {
        pow.log.debug(
          `  * pow_${_.padEnd(_.snakeCase(name), 26)}  -->  pow.fns["${key}"]`
        );
        pow.fns[key] = (args) => {
          pow.log.info(`Launching pow ${[name, ...args].join(" ")} via Python`);
          const cp2 = spawnSync(powRunnerPath, [powPyPath, name, ...args], {
            stdio: "inherit",
          });
          return cp2.status;
        };
        pow.fns[key].helpShort = `[PY] ${helpShort}`;
        pow.fns[key].helpArguments = "";
      }
    }
  });
}

function powListCommands() {
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

  const firstColLen = _.max(cmdTable.map((item) => {
    const len = item[0].length;
    if (len > 40) {
      return 0;
    }
    return len;
  }));

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
    if (cmdArgs.length) {
      pow.log.debug(`Arguments`, ...cmdArgs);
    } else {
      pow.log.debug("Arguments: (empty)");
    }

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
