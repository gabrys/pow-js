const dp = "--platform=linux/amd64";

export function powBuildFull() {
  if (!pow.windows) {
    pow.fns.cosmoSaveDiff();
  }
  const cp = pow.spawnSync("docker", ["build", dp, "-t", "pow", "docker/"], {
    cwd: pow.baseDir,
    stdio: "inherit",
  });
  if (cp.status !== 0) {
    return cp.status;
  }
  return powUpdate();
}

export function powLint() {
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
    "pow_files/pow*.js",
  ];
  return pow.spawnSync("docker", dockerArgs, {
    cwd: pow.baseDir,
    stdio: "inherit",
  });
}

export function powPullJsLibs() {
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

export function powShell(_ctx, args) {
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

export function powTestLogs() {
  pow.log.error("ERROR");
  pow.log.warn("warn");
  pow.log.info("info");
  pow.log.debug("debug");
}

export function powUpdate() {
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

// vim: tabstop=2 shiftwidth=2 expandtab
