export class PowWin {
  run() {
    const cmd = `
      mv Powfiles/reproc.mjs Powfiles/pow_reproc_test.mjs &&
      dist/mingw/pow.exe test
      mv Powfiles/pow_reproc_test.mjs Powfiles/reproc.mjs
    `;
    pow.spawnSync("bash", ["-c", cmd], { stdio: "inherit" });
  }
}
