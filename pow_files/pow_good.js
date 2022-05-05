// TODO --platform=linux/amd64 or linux/x86_64 ??
const dp = "--platform=linux/amd64";

export function powBuildFull() {
  if (!pow.windows) {
    pow.fns.cosmoSaveDiff();
  }
  const build_ret = pow.exec(["docker", "build", dp, "-t", "pow", "docker/"], {
    cwd: pow.baseDir,
  });
  return build_ret || pow_update(pow);
}

export function pow_lint() {
  const dir = pow.baseDir;
  const gid = pow.gid ?? 1000;
  const uid = pow.uid ?? 1000;
  const cmd = [
    "docker",
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
  return pow.exec(cmd, { cwd: pow.baseDir });
}

export function pow_test_logs() {
  pow.log.error("ERROR");
  pow.log.warn("warn");
  pow.log.info("info");
  pow.log.debug("debug");
}

export function pow_update() {
  // TODO: pow update without docker (using plain zip)
  const dir = pow.baseDir;
  const gid = pow.gid ?? 1000;
  const uid = pow.uid ?? 1000;
  const cmd = [
    "docker",
    "run",
    "--rm",
    `--user=${uid}:${gid}`,
    `--volume=${dir}/pow/:/pow/`,
    `--volume=${dir}/dist/:/dist/`,
    "pow",
    "build-pow",
  ];
  return pow.exec(cmd, { cwd: pow.baseDir });
}

export function pow_pull_js_libs() {
  const dir = pow.baseDir;
  const gid = pow.gid ?? 1000;
  const uid = pow.uid ?? 1000;
  const cmd = [
    "docker",
    "run",
    "--rm",
    "-it",
    `--user=${uid}:${gid}`,
    `--volume=${dir}/pow/:/pow/`,
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
  return pow.exec(cmd, { cwd: pow.baseDir });
}

// vim: tabstop=2 shiftwidth=2 expandtab
