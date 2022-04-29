import * as os from "os";
import * as std from "std";

import { PowLogger, PowUtils } from "./utils.js";

const utils = new PowUtils();

const pow = {
  cwd: os.getcwd()[0],
  fns: {},
  gid: utils.get_gid(),
  os: os,
  print: print,
  std: std,
  uid: utils.get_uid(),
  utils: utils,
  verbosity: 0,
  windows: utils.is_windows,
};

function parse_args(args) {
  let repl = false;
  let verbosity = 0;
  let optind = 0;

  for (; optind < args.length; optind += 1) {
    const arg = args[optind];
    if (arg === "-i") {
      repl = true;
    } else if (arg === "-v") {
      verbosity += 1;
    } else {
      break;
    }
  }
  return {
    cmd: args[optind],
    cmd_args: args.slice(optind + 1),
    repl: repl,
    verbosity: verbosity,
  };
}

function get_pow_files(dir) {
  let cur_dir = dir;
  let new_dir;

  const mods = [];
  while (true) {
    const file = `${cur_dir}/pow_file.js`;
    if (utils.file_exists(file)) {
      mods.push({
        base_dir: cur_dir,
        pow_file: file,
      });
    }
    const pow_dir = `${cur_dir}/pow_files`;
    for (const name of utils.get_files_in_dir(pow_dir)) {
      if (name.startsWith("pow_") && name.endsWith(".js")) {
        mods.push({
          base_dir: cur_dir,
          pow_file: `${pow_dir}/${name}`,
        });
      }
    }
    new_dir = utils.get_parent_dir(cur_dir);
    if (new_dir === cur_dir) {
      return mods;
    }
    cur_dir = new_dir;
  }
}

function load() {
  // TODO: class based pow files with register and before_cmd
  pow.log.debug("Running load()");
  const pow_files = get_pow_files(pow.cwd);
  const promises = pow_files.map((modinfo) =>
    import(modinfo.pow_file).then(
      function success(mod) {
        pow.log.debug(`Loading ${modinfo.pow_file}`);
        for (const full_key in mod) {
          const fn = mod[full_key];
          const key = full_key.replace(/^pow_/, "");

          if (
            full_key.startsWith("pow_") &&
            typeof fn === "function" &&
            !pow.fns[key]
          ) {
            fn.base_dir = modinfo.base_dir;
            fn.pow_file = modinfo.pow_file;
            pow.fns[key] = fn;
            pow.log.debug(`  * ${full_key}`);
          }
        }
      },
      function fail(err) {
        pow.log.error(`Failed to load ${modinfo.pow_file}`);
        throw err;
      }
    )
  );

  return Promise.all(promises);
}

function pow_list_commands(pow) {
  const cmd_help = [];
  const cmds = Object.keys(pow.fns);
  cmds.sort();
  for (const cmd of cmds) {
    cmd_help.push(`  pow ${utils.to_kabob_case(cmd)}`);
  }
  print(
    `\nUsage: pow [options] <command> [command parameters]\n\n${cmd_help.join(
      "\n"
    )}\n`
  );
}

function command_not_found(pow, args) {
  pow.log.error(`command "${args[0]}" not found`);
  return 1;
}

function main(parsed_args, pow) {
  pow.log.debug("Running main()");

  if (parsed_args.repl) {
    globalThis.pow = pow;
  }

  const cmd = utils.to_snake_case(parsed_args.cmd || "--help");
  const cmd_args = parsed_args.cmd_args;

  let full_cmd = `pow.fns.${cmd}`;
  let fn = pow.fns[cmd];

  if (!fn) {
    cmd_args.unshift(parsed_args.cmd);
    full_cmd = "command_not_found";
    fn = command_not_found;
  }

  pow.log.info(`Launching ${full_cmd}`);
  pow.log.debug(`Arguments`, ...cmd_args);

  pow.pow_file = fn.pow_file;
  pow.base_dir = fn.base_dir;

  const ret = fn(pow, cmd_args);

  if (!parsed_args.repl) {
    std.exit(ret);
  }
}

const parsed_args = parse_args(scriptArgs.slice(1));

pow.log = new PowLogger(parsed_args.verbosity);
pow.verbosity = parsed_args.verbosity;

pow.fns.__help = pow_list_commands;

// TODO: implement pow --repl
pow.fns.__repr = command_not_found;

load().then(
  function success() {
    globalThis.__post_run = () => main(parsed_args, pow);
  },
  function fail(err) {
    globalThis.__post_run = () => {
      throw err;
    };
  }
);

// vim: tabstop=2 shiftwidth=2 expandtab
