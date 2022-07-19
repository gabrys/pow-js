const dp = "--platform=linux/amd64";
const gid = pow.gid ?? 1000;
const uid = pow.uid ?? 1000;
const dir = pow.baseDir;

function buildPowRunner() {
  const cp = pow.spawnSync("docker", ["build", dp, "-t", "pow", "docker/"], {
    cwd: pow.baseDir,
    stdio: "inherit",
  });
  if (cp.status !== 0) {
    return cp.status;
  }
  return 0;
}

export class PowBuild {
  helpShort = "Build pow in Docker";
  run() {
    return buildPowRunner() || pow.fns.update.run();
  }
}

export class PowMakeQjs {
  helpShort = "Get a QuickJS universal binary";
  run() {
    const status = buildPowRunner();
    if (status !== 0) {
      return status;
    }

    const dockerArgs = [
      "run",
      dp,
      "--rm",
      `--user=${uid}:${gid}`,
      `--volume=${dir}/dist:/dist`,
      "pow",
      "cp",
      "/build/qjs.com",
      "/dist/qjs.com",
    ];
    const cp = pow.spawnSync("docker", dockerArgs, {
      cwd: dir,
      stdio: "inherit",
    });
    if (cp.status !== 0) {
      pow.ERROR("Making qjs.com failed");
      return cp.status;
    }
    print("File ready at dist/qjs.com");
  }
}

export class PowGitPublishDistModules {
  helpShort = "Push updated git modules containing compiled binaries";
  run() {
    let cp;
    for (const [msg, cwd, exeName] of [
      ["darwin", `${pow.baseDir}/dist/gitmodules/pow-dist-darwin`, "pow"],
      ["linux", `${pow.baseDir}/dist/gitmodules/pow-dist-linux`, "pow"],
      ["win32", `${pow.baseDir}/dist/gitmodules/pow-windows`, "pow.exe"],
    ]) {
      print(`=== ${msg} ===\n`);
      const status = pow.spawnSync("git", ["status", "-s"], {
        cwd: cwd,
        encoding: "utf-8",
        input: "",
      });
      if (status.stdout.length) {
        cp = pow.spawnSync("git", ["commit", "-m", "Update pow", exeName], {
          cwd: cwd,
          input: "",
          stdio: "inherit",
        });
        if (cp.status) {
          return cp.status;
        }
      }
      cp = pow.spawnSync("git", ["push", "origin", "main"], {
        cwd: cwd,
        input: "",
        stdio: "inherit",
      });
      if (cp.status) {
        return cp.status;
      }
      print();
    }
  }
}

export class PowLint {
  helpShort = "Lint pow JS files";
  run() {
    const dockerArgs = [
      "run",
      dp,
      "--rm",
      `--user=${uid}:${gid}`,
      `--volume=${dir}:/work`,
      "tmknom/prettier",
      "--write",
      "pow/pow*.mjs",
      "Powfiles/pow*.mjs",
      "example/Powfile.mjs",
    ];
    return pow.spawnSync("docker", dockerArgs, {
      cwd: pow.baseDir,
      stdio: "inherit",
    });
  }
}

export class PowPullJsLibs {
  helpShort = "Pull JavaScript libraries bundled with pow";
  run() {
    const dockerArgs = [
      "run",
      "--rm",
      "-it",
      `--user=${uid}:${gid}`,
      `--volume=${pow.baseDir}/pow/:/pow/`,
      "node",
      "bash",
      "-c",
      `
        cd /tmp

        echo "Pulling lodash"
        wget -O /pow/lib.lodash.mjs https://raw.githubusercontent.com/lodash/lodash/4.17.10-npm/lodash.js

        echo "Pulling command-line-args"
        yarn add command-line-args@5.2.1 &&
        (
          echo "/*"
          echo "  File generated automatically by: pow pull-js-libs"
          echo "  from https://www.npmjs.com/package/command-line-args"
          echo "*/"
          echo "const process = {argv: [], execArgv: []};"
          cat node_modules/lodash.camelcase/index.js | grep -v ^module.exports
          cat node_modules/command-line-args/dist/index.mjs | grep -v ^import.camel
        ) > /pow/lib.args.mjs
    `,
    ];
    return pow.spawnSync("docker", dockerArgs, {
      cwd: pow.baseDir,
      stdio: "inherit",
    });
  }
}

export class PowShell {
  helpArguments = "[--root]";
  helpShort = "Get a shell in the container used to build pow";
  run(_ctx, argv) {
    const { opts } = pow.parseArgv([{ name: "root", type: Boolean }], argv, {
      cmdName: "pow shell",
      maxArgs: 0,
    });
    const userArgs = opts.root ? [] : [`--user=${uid}:${gid}`];
    const dockerArgs = [
      "run",
      "--rm",
      ...userArgs,
      `--volume=${dir}/pow/:/pow/`,
      `--volume=${dir}/dist/:/dist/`,
      "-it",
      "pow",
    ];
    pow.log.info(...dockerArgs);
    return pow.spawnSync("docker", dockerArgs, {
      cwd: pow.baseDir,
      stdio: "inherit",
    });
  }
}

export class PowUpdate {
  helpShort = "Update pow binaries with updated JavaScript files";
  run() {
    const dockerArgs = [
      "run",
      "--rm",
      `--user=${uid}:${gid}`,
      `--volume=${dir}/pow/:/pow/`,
      `--volume=${dir}/dist/:/dist/`,
      "pow",
      "build-pow",
    ];
    return pow.spawnSync("docker", dockerArgs, {
      cwd: pow.baseDir,
      stdio: "inherit",
    });
  }
}

export class PowSpawn {
  run(_ctx, args) {
    const [arg0, ...other] = args;
    pow.spawnSync(arg0, other, { stdio: "inherit" });
  }
}

export class PowWineShell {
  helpShort = "Start a docker container with wine and open a shell";
  run(_ctx, argv) {
    const cp = pow.spawnSync(
      "docker",
      ["build", dp, "-t", "pow-wine", "wine/"],
      {
        cwd: pow.baseDir,
        stdio: "inherit",
      }
    );
    if (cp.status !== 0) {
      return cp.status;
    }

    const dockerArgs = [
      "run",
      "--rm",
      `--volume=${dir}/dist/windows/:/dist/windows/`,
      "-it",
      "pow-wine",
    ];

    return pow.spawnSync("docker", dockerArgs, {
      cwd: pow.baseDir,
      stdio: "inherit",
    }).status;
  }
}

// vim: tabstop=2 shiftwidth=2 expandtab
