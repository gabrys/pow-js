export function pow_cosmo_clean(pow) {
  // TODO: move pow cosmo-* to docker
  if (pow.windows) {
    pow.error("pow cosmo commands are not available on Windows");
    return 1;
  }
  return pow.os.exec(["rm", "-rf", "cosmopolitan", "pow/qjs_pow.c"]);
}

export function pow_cosmo_init(pow) {
  if (pow.windows) {
    pow.error("pow cosmo commands are not available on Windows");
    return 1;
  }
  const cmd = `git clone https://github.com/jart/cosmopolitan &&
              cd cosmopolitan &&
              git reset --hard 9a6bd304a58b89277b8a2d490bfda9fd12d19370 &&
              cd .. &&
              cp cosmopolitan/third_party/quickjs/qjs.c pow/qjs_pow.c &&
              patch pow/qjs_pow.c docker/qjs.diff`;
  return pow.os.exec(["bash", "-c", cmd]);
}

export function pow_cosmo_save_diff(pow) {
  if (pow.windows) {
    pow.error("pow cosmo commands are not available on Windows");
    return 1;
  }
  if (!pow.utils.file_exists("pow/qjs_pow.c")) {
    pow.print("No qjs_pow.c, using cached docker/pow.diff");
    return;
  }
  pow.print("Saving qjs.c diff to docker/qjs.diff");
  const cmd = `diff -u cosmopolitan/third_party/quickjs/qjs.c pow/qjs_pow.c > docker/qjs.diff`;
  return pow.os.exec(["bash", "-c", cmd]);
}

export function pow_install(pow) {
  if (pow.windows) {
    pow.log.error("pow install is not available on Windows");
    return;
  }
  pow.os.exec(["sudo", "cp", "/usr/local/bin/jpow", "/usr/local/bin/jpow.old"]);
  pow.os.exec(["sudo", "cp", "dist/linux/pow", "/usr/local/bin/jpow.new"]);
  return pow.os.exec([
    "sudo",
    "mv",
    "/usr/local/bin/jpow.new",
    "/usr/local/bin/jpow",
  ]);
}

export function pow_restore(pow) {
  if (pow.windows) {
    pow.log.error("pow restore is not available on Windows");
    return;
  }
  pow.os.exec([
    "sudo",
    "cp",
    "/usr/local/bin/jpow.old",
    "/usr/local/bin/jpow.new",
  ]);
  return pow.os.exec([
    "sudo",
    "mv",
    "/usr/local/bin/jpow.new",
    "/usr/local/bin/jpow",
  ]);
}

export function pow_shell(pow, args) {
  const switch_user = args.includes("--user");
  const user_line = switch_user ? '--user "$(id -u):$(id -g)"' : "";
  const cmd = `docker run --rm \
              ${user_line} \
              --volume "$PWD/pow/:/pow/" \
              --volume "$PWD/dist/:/dist/" \
              -it pow`;
  return pow.os.exec(["bash", "-c", cmd]);
}

export function pow_todo(pow) {
  // TODO: run pow todo in Docker
  if (pow.windows) {
    pow.log.error("pow todo is not available on Windows");
    return;
  }
  const cmd =
    "( echo ; git grep TO" +
    "DO: | sed 's/:.*TO" +
    "DO:/:/' | sed 's/^/* /' ; echo ; ) | tee TODO";
  return pow.os.exec(["bash", "-c", cmd], { cwd: pow.base_dir });
}

// vim: tabstop=2 shiftwidth=2 expandtab
