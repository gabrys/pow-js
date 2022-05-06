export function pow_cosmo_clean() {
  // TODO: move pow cosmo-* to docker
  if (pow.windows) {
    pow.log.error("pow cosmo commands are not available on Windows");
    return 1;
  }
  return pow.exec(["rm", "-rf", "cosmopolitan", "pow/qjs_pow.c"]);
}

export function pow_cosmo_init() {
  if (pow.windows) {
    pow.log.error("pow cosmo commands are not available on Windows");
    return 1;
  }
  const cmd = `git clone https://github.com/jart/cosmopolitan &&
              cd cosmopolitan &&
              git reset --hard 9a6bd304a58b89277b8a2d490bfda9fd12d19370 &&
              cd .. &&
              cp cosmopolitan/third_party/quickjs/qjs.c pow/qjs_pow.c &&
              patch pow/qjs_pow.c docker/qjs.diff`;
  return pow.exec(["bash", "-c", cmd], { cwd: pow.baseDir });
}

export function pow_cosmo_save_diff() {
  if (pow.windows) {
    pow.log.error("pow cosmo commands are not available on Windows");
    return 1;
  }
  if (!pow.fileExists("pow/qjs_pow.c")) {
    print("No qjs_pow.c, using cached docker/pow.diff");
    return;
  }
  print("Saving qjs.c diff to docker/qjs.diff");
  const cmd = `diff -u cosmopolitan/third_party/quickjs/qjs.c pow/qjs_pow.c > docker/qjs.diff`;
  return pow.exec(["bash", "-c", cmd], { cwd: pow.baseDir });
}

export function pow_install() {
  if (pow.windows) {
    pow.log.error("pow install is not available on Windows");
    return;
  }
  pow.exec(["sudo", "cp", "/usr/local/bin/jpow", "/usr/local/bin/jpow.old"]);
  pow.exec(["sudo", "cp", "dist/linux/pow", "/usr/local/bin/jpow.new"]);
  return pow.exec([
    "sudo",
    "mv",
    "/usr/local/bin/jpow.new",
    "/usr/local/bin/jpow",
  ]);
}

export function pow_restore() {
  if (pow.windows) {
    pow.log.error("pow restore is not available on Windows");
    return;
  }
  pow.exec([
    "sudo",
    "cp",
    "/usr/local/bin/jpow.old",
    "/usr/local/bin/jpow.new",
  ]);
  return pow.exec([
    "sudo",
    "mv",
    "/usr/local/bin/jpow.new",
    "/usr/local/bin/jpow",
  ]);
}

export function pow_todo() {
  // TODO: run pow todo in Docker
  if (pow.windows) {
    pow.log.error("pow todo is not available on Windows");
    return;
  }
  const cmd =
    "( echo ; git grep TO" +
    "DO: | sed 's/:.*TO" +
    "DO:/:/' | sed 's/^/* /' ; echo ; ) | tee TODO";
  return pow.exec(["bash", "-c", cmd], { cwd: pow.baseDir });
}

// vim: tabstop=2 shiftwidth=2 expandtab
