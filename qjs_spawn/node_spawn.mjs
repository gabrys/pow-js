import * as pow from "child_process";

const [_0, _1, arg0, ...other]  = process.argv
// console.debug('args', other);
pow.spawnSync(arg0, other, { stdio: "inherit" });
