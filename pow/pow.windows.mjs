import * as os from "os";
import * as std from "std";

// example os.getcwd() on Windows:
// [ "//?/C:/Users/gabrys/pow-js", 0 ]
const path = os.getcwd()[0];
const windowsPathMatch = path.match(/^\/\/[^\/]+\/([A-Z]:\/.*)/);

export const windows = !!windowsPathMatch;
export const windowsCwd = windowsPathMatch ? windowsPathMatch[1] : null;

export function windowsFindExecutable(name) {
  // os.exec({usePath: true}) is broken on Windows in cosmopolitan build of QuickJS
  // Here's an alternative approach using where.exe
  // See pow.spawn.mjs for usage
  const pipe = os.pipe();
  os.exec(["where", name], { block: false, stdout: pipe[1] });
  os.close(pipe[1]);
  const candidates = std
    .fdopen(pipe[0], "r")
    .readAsString()
    .trim()
    .split("\r\n");
  for (const candidate of candidates) {
    const ext = candidate.split(".").pop().toLowerCase();
    if (["bat", "cmd", "exe"].includes(ext)) {
      return candidate;
    }
  }
}
