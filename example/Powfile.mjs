// TODO: better examples
export class PowParseArgs {
  run(_ctx, args) {
    const parsed = pow.parseArgv(
      [{ name: "rainbows", alias: "r", type: Boolean }],
      args
    );

    if (parsed.args.length == 0) {
      parsed.args = ["unicorns"];
    }

    for (const arg of parsed.args) {
      if (parsed.opts.rainbows) {
        print(`🌈 ${arg} 🌈`);
      } else {
        print(arg);
      }
    }
  }
}

export class PowSum {
  run(_ctx, args) {
    let total = 0;
    for (const arg of args) {
      total += Number(arg);
    }
    print(total);
  }
}

export class PowTestLogs {
  run() {
    pow.log.error("ERROR");
    pow.log.warn("warn");
    pow.log.info("info");
    pow.log.debug("debug");
  }
}
