export function pow_build_full(pow) {
  pow.fns.cosmo_save_diff(pow);
  pow.os.exec(["docker", "build", "-t", "pow", "docker/"], {
    cwd: pow.base_dir,
  });
  return pow_update(pow);
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
  // TODO: Windows: check pow update (and pow.os.exec)
  return pow.os.exec(cmd, { cwd: pow.base_dir });
}

// vim: tabstop=2 shiftwidth=2 expandtab
