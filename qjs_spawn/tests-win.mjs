let cp;

const tests = [
  function test_stdio_inherit() {
    cp.spawnSync("wslconfig", ["/list"], {
      stdio: ["inherit", "inherit", "inherit"],
    });
  },

  function test_stdout_pipe() {
    const proc = cp.spawnSync("dir", [], {
      cwd: "C:\\Users",
      encoding: "utf-8",
      shell: true,
      stdio: ["inherit", "pipe", "inherit"],
    });

    console.log(proc.stdout.match(/Public/)[0]);
  },

  function test_invalid_stdio() {
    try {
      cp.spawnSync("route", ["print"], {
        stdio: "invalid",
      });
    } catch (ex) {
      console.log(ex.name, ex.message);
    }
  },

  function test_env() {
    cp.spawnSync("cmd.exe", ["/d", "/s", "/c", "echo %COMSPEC%"], {
      stdio: "inherit",
    });
    cp.spawnSync("cmd.exe", ["/d", "/s", "/c", "echo %a%"], {
      env: { a: "b" },
      stdio: "inherit",
    });
    const p = cp.spawnSync("cmd.exe", ["/d", "/s", "/c", "echo %COMSPEC%"], {
      encoding: "utf-8",
      stdio: "pipe",
    });
    console.log(`COMSPEC: ${p.stdout}`);
  },

  function test_env2() {
    cp.spawnSync("cmd.exe", ["/d", "/s", "/c", "echo %c%"], {
      env: {},
      stdio: "inherit",
    });
    cp.spawnSync("cmd.exe", ["/d", "/s", "/c", "echo %c%"], {
      stdio: "inherit",
    });
  },

  function test_command_not_found() {
    const proc = cp.spawnSync("hfhdhf--adsfaf-af", [], {
      stdio: "ignore",
    });
    console.log(proc.error ? "error" : "no-error", proc.status);
  },

  function test_command_not_found_shell() {
    const proc1 = cp.spawnSync("hfhdhf--adsfaf-af", [], {
      shell: true,
      stdio: "ignore",
    });
    console.log(proc1.error ? "error" : "no-error", proc1.status);

    const proc2 = cp.spawnSync("hfhdhf--adsfaf-af", [], {
      shell: true,
      stdio: "inherit",
    });
    console.log(proc2.error ? "error" : "no-error", proc2.status);
  },

  function test_incorrect_opt() {
    cp.spawnSync("true", [], {
      invalid: 123,
    });
  },
];

import("child_process")
  .catch(() => import("../pow/pow.spawn.mjs"))
  .then((mod) => {
    cp = mod;
    for (const test of tests) {
      console.log(`[${test.name}]\n`);
      test();
      console.log("");
    }
  })
  .catch((err) => console.log(err));
