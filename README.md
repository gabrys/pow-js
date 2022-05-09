# Pow

`pow` is a CLI tool to run useful commands, easily configurable via Powfiles.

# How it works

Pow is a CLI tool that's:

- simple to install
- self-contained (no-dependepncies)
- fast (starts in around 30ms)
- multi-platform (Linux, macOS, Windows)

It allows you to execute pre-defined commands against your project that you
put in a Powfile (similar to a Makefile).

# Powfiles

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

When pow is installed to invoke this function from the command line you need to
be in the directory where your Powfile is (or its subdirectory) and call `pow sum`.

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

# REPL (read, evaluate, print loop)

Since `pow` is based on QuickJS and not Node, it doesn't include the familiar
Node APIs (for launching commands, browsing directories, etc). To allow you to
quickly explore the API exposed, `pow` can launch a REPL:

```
$ jpow --repl
QuickJS - Type "\h" for help
qjs >:
```

# Powfile directories

You can split your Powfile into multiple files. Name needs to match `pow_*.mjs`
and you need to put them to a directory called `Powfiles` in your project.
`pow` will load all of them.

# Comparison to other tools

## `pow` vs `make`:

- Powfiles are simpler to write if you're familiar with JavaScript.
- Makefiles are way more powerful.
- Pow commands are available in subdirectories of the project.
- `make` needs to be invoked in a specific directory.

## `pow abc` vs `yarn run abc` / `composer run-script abc` / `./manage.py abc`

- `pow` can be used whether you do or don't have yarn or composer
- You don't need to install any libraries or languages to use `pow`.
  It comes with a JavaScript engine baked in
