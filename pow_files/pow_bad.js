export function pow_cosmo_clean(pow) {
  return pow.os.exec(["rm", "-rf", "cosmopolitan", "pow/qjs_pow.c"]);
}

export function pow_cosmo_init(pow) {
  const cmd = `git clone https://github.com/jart/cosmopolitan &&
              cd cosmopolitan &&
              git reset --hard 552525cbdd682f9e6e7d504ef62d0e1b0db3a2b8 &&
              cd .. &&
              cp cosmopolitan/third_party/quickjs/qjs.c pow/qjs_pow.c &&
              patch pow/qjs_pow.c docker/qjs.diff`;
  return pow.os.exec(["bash", "-c", cmd]);
}

export function pow_cosmo_save_diff(pow) {
  if (!pow.utils.file_exists("pow/qjs_pow.c")) {
    pow.print("No qjs_pow.c, using cached docker/pow.diff");
    return;
  }
  pow.print("Saving qjs.c diff to docker/qjs.diff");
  const cmd = `diff -u cosmopolitan/third_party/quickjs/qjs.c pow/qjs_pow.c > docker/qjs.diff`;
  return pow.os.exec(["bash", "-c", cmd]);
}

export function pow_install(pow) {
  pow.os.exec(["sudo", "cp", "/usr/local/bin/jpow", "/usr/local/bin/jpow.old"]);
  pow.os.exec(["sudo", "cp", "dist/linux/pow", "/usr/local/bin/jpow.new"]);
  return pow.os.exec([
    "sudo",
    "mv",
    "/usr/local/bin/jpow.new",
    "/usr/local/bin/jpow",
  ]);
}

export function pow_lint(pow) {
  const cmd = `docker run --rm \
              --user "$(id -u):$(id -g)" \
              --volume "$PWD:/work" \
              tmknom/prettier --write \
              pow/*.js pow_files/*.js`;
  return pow.os.exec(["bash", "-c", cmd], {
    cwd: pow.base_dir,
  });
}

export function pow_local(pow, args) {
  args.unshift("dist/linux/pow");
  return pow.os.exec(args);
}

export function pow_restore(pow) {
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
  const cmd =
    "( echo ; git grep TO" +
    "DO: | sed 's/:.*TO" +
    "DO:/:/' | sed 's/^/* /' ; echo ; ) | tee TODO";
  return pow.os.exec(["bash", "-c", cmd], {cwd: pow.base_dir});
}

export function pow_testing(pow) {
  pow.print(pow.base_dir);
  pow.print(pow.windows);
}

// vim: tabstop=2 shiftwidth=2 expandtab
