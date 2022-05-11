const dp = "--platform=linux/amd64";

export class PowBuild {
  static helpShort = "Build pow in Docker";
  static run() {
    // if (!pow.windows) {
    //   pow.fns.cosmoSaveDiff();
    // }
    const cp = pow.spawnSync("docker", ["build", dp, "-t", "pow", "docker/"], {
      cwd: pow.baseDir,
      stdio: "inherit",
    });
    if (cp.status !== 0) {
      return cp.status;
    }
    return pow.fns.update();
  }
}

export class PowLint {
  static helpShort = "Lint pow JS files";
  static run() {
    const dir = pow.baseDir;
    const gid = pow.gid ?? 1000;
    const uid = pow.uid ?? 1000;
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
    ];
    return pow.spawnSync("docker", dockerArgs, {
      cwd: pow.baseDir,
      stdio: "inherit",
    });
  }
}

export class PowPullJsLibs {
  static helpShort = "Pull JavaScript libraries bundled with pow";
  static run() {
    const gid = pow.gid ?? 1000;
    const uid = pow.uid ?? 1000;
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
  static helpShort = "Get a shell in the container used to build pow";
  static run(_ctx, args) {
    const uid = pow.uid || 1000;
    const gid = pow.gid || 1000;
    const root = args.includes("--root");
    const userArgs = root ? [] : [`--user=${uid}:${gid}`];
    const dockerArgs = [
      "run",
      "--rm",
      ...userArgs,
      `--volume=${pow.baseDir}/pow/:/pow/`,
      `--volume=${pow.baseDir}/dist/:/dist/`,
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
  static helpShort = "Update pow binaries with updated JavaScript files";
  static run() {
    const gid = pow.gid ?? 1000;
    const uid = pow.uid ?? 1000;
    const dockerArgs = [
      "run",
      "--rm",
      `--user=${uid}:${gid}`,
      `--volume=${pow.baseDir}/pow/:/pow/`,
      `--volume=${pow.baseDir}/dist/:/dist/`,
      "pow",
      "build-pow",
    ];
    return pow.spawnSync("docker", dockerArgs, {
      cwd: pow.baseDir,
      stdio: "inherit",
    });
  }
}

export class PowGitPublishDistModules {
  static helpShort = "Push updated git modules containing compiled binaries";
  static run() {
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

// vim: tabstop=2 shiftwidth=2 expandtab
