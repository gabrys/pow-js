// This file will be included to qjs.c
// and the original main function will be renamed to orig_main

#include "libc/isystem/string.h"
#include "libc/isystem/unistd.h"

// A few functions borrowed from busybox (and modified a bit)
// (This is to find the equivalent of `which pow`)

void concat_path_file(const char *path, const char *filename, char *buffer)
{
	if (!path)
		path = "";
	while (*filename == '/')
		filename++;

    *buffer = '\0';
    strncat(buffer, path, 1000);
    strncat(buffer, "/", 1);
    strncat(buffer, filename, 100);
}

int file_is_executable(const char *name)
{
    int X_OK = 1;
	struct stat s;
	return (!access(name, X_OK) && !stat(name, &s) && S_ISREG(s.st_mode));
}

int find_executable(const char *filename, char *p, char *buffer)
{
	char *n;
	while (p) {
		int ex;

		n = strchr(p, ':');
		if (n) *n = '\0';

		concat_path_file(
			p[0] ? p : ".", /* handle "::" case */
			filename,
            buffer
		);
		ex = file_is_executable(buffer);
		if (n) *n++ = ':';
		if (ex) {
			return 1;
		}
		p = n;
	} /* on loop exit p == NULL */
	return 0;
}

// New main

int main(int argc, char **argv)
{
    if (!file_is_executable(argv[0])) {

        // On macOS, argv[0] is not normalized
        // This trips Cosmopolitan's custom file handler for files in /zip/
        // Here we're re-runing the command with the full path to work around:

        char cmdpath[1111];
        if (find_executable(argv[0], getenv("PATH"), cmdpath)) {
            argv[0] = cmdpath;
            execvp(cmdpath, argv);
        }
    }

    JSRuntime *rt;
    JSContext *ctx;
    int optind;
    int verbosity = 0;
    int repl = 0;
    int help = 0;

    /* cannot use getopt because we want to pass the command line to
       the script */
    optind = 1;
    while (optind < argc && *argv[optind] == '-') {
        char *arg = argv[optind] + 1;
        const char *longopt = "";
        /* a single - is not an option, it also stops argument scanning */
        if (!*arg)
            break;
        optind++;
        if (*arg == '-') {
            longopt = arg + 1;
            arg += strlen(arg);
            /* -- stops argument scanning */
            if (!*longopt)
                break;
        }
        for (; *arg || *longopt; longopt = "") {
            char opt = *arg;
            if (opt)
                arg++;

            if (opt == 'v') {
                verbosity++;
                continue;
            }
            if (opt == 'r' || !strcmp(longopt, "repl")) {
                repl = 1;
                continue;
            }
            if (opt == 'h' || !strcmp(longopt, "help")) {
                help = 1;
                continue;
            }
            if (opt) {
                fprintf(stderr, "pow: unknown option '-%c'\n", opt);
            } else {
                fprintf(stderr, "pow: unknown option '--%s'\n", longopt);
            }
            exit(1);
        }
    }

    rt = JS_NewRuntime();
    if (!rt) {
        fprintf(stderr, "pow: cannot allocate JS runtime\n");
        exit(2);
    }
    js_std_set_worker_new_context_func(JS_NewCustomContext);
    js_std_init_handlers(rt);
    ctx = JS_NewCustomContext(rt);
    if (!ctx) {
        fprintf(stderr, "pow: cannot allocate JS context\n");
        exit(2);
    }

    /* loader for ES6 modules */
    JS_SetModuleLoaderFunc(rt, NULL, js_module_loader, NULL);
    js_std_add_helpers(ctx, argc, argv);

    const char *filename = "/zip/pow.mjs";
    if (eval_file(ctx, filename, JS_EVAL_TYPE_MODULE))
        goto fail;
    js_std_loop(ctx);

    // Extra call to __post_run after the main program ends
    const char *post_expr = "globalThis.__post_run && __post_run();";
    if (eval_buf(ctx, post_expr, strlen(post_expr), "qjs_pow.c", 0))
        goto fail;
    js_std_loop(ctx);

    if (repl) {
        js_std_eval_binary(ctx, qjsc_repl, qjsc_repl_size, 0);
        js_std_loop(ctx);
    }

    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);

    return 0;
 fail:
    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return 1;
}
