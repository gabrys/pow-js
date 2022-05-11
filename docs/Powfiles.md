<!-- @format -->

Powfiles are files containing JavaScript modules defining commands that can be invoked as subcommands to the command `pow`.

Example Powfile:

```
// save as Powfile.mjs

export function powSum(_ctx, args) {
    let total = 0;
    for (const arg of args) {
        total += Number(arg);
    }
    print(total);
}

```

When pow is installed to invoke this function from the command line you need to be in a directory where your Powfile is and call `pow sum`.

Example:

```
gabrys@fedora:~/pow-example$ pow sum
0
gabrys@fedora:~/pow-example$ pow sum 1
1
gabrys@fedora:~/pow-example$ pow sum 1 2
3
gabrys@fedora:~/pow-example$ pow sum 1 2 3
6
```

# Context

Powfiles can access the following global objects/functions:

- `pow` (see below)
- `print` / `console.log`
- `_` (https://lodash.com/)

You can also import QuickJS's `os` and `std` modules:

```
import * as os from "os";
import * as std from "std";
```

Consult their official documentation:

- (os)[https://bellard.org/quickjs/quickjs.html#os-module]
- (std)[https://bellard.org/quickjs/quickjs.html#std-module]

# pow object

## Logging:

pow.DEBUG(...args)
pow.INFO(...args)
pow.WARN(...args)
pow.ERROR(...args)

Print a message to standard error.

- INFO messages are by only shown if pow is started with at least one `-v` flag (`pow -v`)
- DEBUG messages are by only shown if pow is started with at least two `-v` flags (`pow -vv` or `pow -v`)

## pow.baseDir

The directory where Powfiles were found. This is either the current directory or one of the parent directories.

## pow.cwd

The directory where pow was started.

## pow.fileExists

Check if a file exists

## pow.fns

An object with all registered pow functions. Allows you to call one function from anther

## pow.gid

Current process group id (as reported by id -g). Undefined in Windows.

## pow.listDir(path)

Return an array of [subdirs, files]

- `subdirs` is a list of all directories in the given path.
- `files` is a list of other files in the given path.

## pow.parseArgv

A port of https://github.com/75lb/command-line-args/

Example:

```
// Save as Powfile.mjs

export function powParseArgs(_ctx, args) {
    const parsed = pow.parseArgv([
        {name: "rainbows", alias: "r", type: Boolean}
    ], args);

    if (parsed.args.length == 0) {
        parsed.args = ["unicorns"];
    }

    for (const arg of parsed.args) {
        if (parsed.opts.rainbows) {
            print(`🌈 ${arg} 🌈`);
        } else {
            print(arg);
        }
    }
}
```

Usage:

```
gabrys@fedora:~/pow-example$ pow parse-args
unicorns
gabrys@fedora:~/pow-example$ pow parse-args --rainbows
🌈 unicorns 🌈
gabrys@fedora:~/pow-example$ pow parse-args --rainbows abc
🌈 abc 🌈
gabrys@fedora:~/pow-example$ pow parse-args --rainbows abc def
🌈 abc 🌈
🌈 def 🌈
gabrys@fedora:~/pow-example$ pow parse-args --abc
Error: Unknown option: --abc
    at parseArgv (/zip/pow.utils.mjs:112)
    at powParseArgs (/home/gabrys/git/pow-js/Powfiles/pow_sum.mjs:12)
    at <anonymous> (/zip/pow.mjs)
    at main (/zip/pow.mjs:183)
    at <anonymous> (/zip/pow.mjs)
    at <eval> (qjs_pow.c)
```

## pow.platform

The detected platform. One of: "darwin", "linux" or "win32"

## pow.spawnSync(file, args, opts)

A port of Node's child_process.spawnSync.

- Consult https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options for the API.
- The API is only partially implemented. The method should raise a `NotImplementedError` when you reach a case that's not implemented.
- Right now you cannot skip `args` param.
- Non-empty `args` and `shell: true` is not implemented.
- **The default `stdio` and `encoding` option combination is not supported**.
- You need to either specify `encoding: "utf-8"` or `stdio: "inherit"` or `stdio: "ignore"`.
- To pass user's stdin, stdout and stderr to the command, use `stdio: "inherit"`.
- To hide the command output and also not consume it, use `stdio: "ignore"`.
- To fetch output from the command, use option `encoding: "utf-8"`. The output will wriiten to the resulting object's `stdout` and `stderr` properties.
- To send data to the command, use `input` option.

## pow.uid

Current process user id (as reported by id -u). Undefined in Windows.
