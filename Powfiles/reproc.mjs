import * as reproc from "reproc";

function run(cmd, cwd, env, input, stderr, stdout, timeout) {
  return reproc.run(
    cmd,
    cwd,
    env || {},
    input || "",
    stderr || "inherit",
    stdout || "inherit",
    timeout || 0
  );
}

export class PowTest {
//   run() {
//     print("reproc.run:");
//     let ret = run(["cmd", "/d", "/s", "/c", "dir"], "C:\\");
//     print("result", ret);
//   }

  run() {
	run(["C:\\Program Files\\Git\\usr\\bin\\cat.exe"], "C:\\", {});
  }
}

