
export class PowTestWin2 {
    run() {
        const cp = pow.spawnSync(
            'C:/Program Files/Git/usr/bin/bash.exe',
            [],
            {encoding: "utf-8", input: "echo 123", shell: false}
        );
        print("Powfile.mjs status:", cp.status);
        print("Powfile.mjs stdout:", cp.stdout);
        print("Powfile.mjs stderr:", cp.stderr);
    }
}
