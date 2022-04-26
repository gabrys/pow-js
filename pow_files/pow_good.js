export function pow_build_full(pow) {
  pow.fns.cosmo_save_diff(pow);
  pow.os.exec(["docker", "build", "-t", "pow", "docker/"]);
  return pow_update(pow);
}

export function pow_test_logs(pow) {
  pow.log.error("VERY BAD");
  pow.log.warn("warn");
  pow.log.info("info");
  pow.log.debug("debug");
}

export function pow_update(pow) {
  // TODO: pow update without docker (using plain zip)
  const cmd = `docker run --rm \
              --user "$(id -u):$(id -g)" \
              --volume "$PWD/pow/:/pow/" \
              --volume "$PWD/dist/:/dist/" \
  pow build-pow`;
  return pow.os.exec(["bash", "-c", cmd]);
}

// vim: tabstop=2 shiftwidth=2 expandtab
