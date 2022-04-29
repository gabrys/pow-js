// TODO --platform=linux/amd64 or linux/x86_64 ??
const dp = "--platform=linux/amd64";

export function pow_build_full(pow) {
  if (!pow.windows) {
    pow.fns.cosmo_save_diff(pow);
  }
  const build_ret = pow.os.exec(
    ["docker", "build", dp, "-t", "pow", "docker/"],
    {
      cwd: pow.base_dir,
    }
  );
  return build_ret || pow_update(pow);
}

export function pow_lint(pow) {
  const dir = pow.base_dir;
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
    "pow/*.js",
    "pow_files/*.js",
  ];
  return pow.os.exec(cmd, { cwd: pow.base_dir });
}

export function pow_test_logs(pow) {
  pow.log.error("ERROR");
  pow.log.warn("warn");
  pow.log.info("info");
  pow.log.debug("debug");
}

export function pow_update(pow) {
  // TODO: pow update without docker (using plain zip)
  const dir = pow.base_dir;
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
  return pow.os.exec(cmd, { cwd: pow.base_dir });
}

// vim: tabstop=2 shiftwidth=2 expandtab
