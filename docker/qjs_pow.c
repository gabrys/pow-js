// This file will be included to qjs.c
// and the original main function will be renamed to orig_main

#if defined(COSMO)

#include "libc/calls/struct/stat.h"
#include "libc/isystem/string.h"
#include "libc/isystem/unistd.h"
#include "libc/sysv/consts/s.h"

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
    while (p)
    {
        int ex;
        n = strchr(p, ':');
        if (n)
            *n = '\0';
        concat_path_file(
            p[0] ? p : ".", /* handle "::" case */
            filename,
            buffer);
        ex = file_is_executable(buffer);
        if (n)
            *n++ = ':';
        if (ex)
            return 1;
        p = n;
    } /* on loop exit p == NULL */
    return 0;
}

#endif /* COSMO */

// New main

int main(int argc, char **argv)
{

#if defined(COSMO)

    if (!file_is_executable(argv[0]))
    {

        // On macOS, argv[0] is not normalized
        // This trips Cosmopolitan's custom file handler for files in /zip/
        // Here we're re-runing the command with the full path to work around:

        char cmdpath[1111];
        if (find_executable(argv[0], getenv("PATH"), cmdpath))
        {
            argv[0] = cmdpath;
            execvp(cmdpath, argv);
        }
    }

#endif /* COSMO */

    JSRuntime *rt;
    JSContext *ctx;
    int repl = 0;

    char *filename = "/zip/pow.mjs";

#if defined(_WIN32)

    // On MinGW build we put the .mjs files next to pow.exe
    // as we don't have the mechanism to embed them to the binary
    //
    // Example location of pow.exe (argv[0]):
    // C:/Users/gabrys/AppData/Roaming/npm/node_modules/pow-windows/pow.exe
    //
    // Corresponding pow.mjs location:
    // C:/Users/gabrys/AppData/Roaming/npm/node_modules/pow-windows/pow.mjs

    filename = strdup(argv[0]);
    int len = strlen(filename);
    int extstart = len - 4;

    if (extstart > 0 && (0 == strcmp(filename + extstart, ".exe"))) {
        filename[extstart+1] = 'm';
        filename[extstart+2] = 'j';
        filename[extstart+3] = 's';
    }

    for (int i = 0; i < len; i++)
        if (filename[i] == '\\')
            filename[i] = '/';

#endif /* _WIN32 */

    for (int optind = 1; optind < argc; optind++)
    {
        char *opt = argv[optind];
        if (*opt != '-' || !strcmp(opt, "-") || !strcmp(opt, "--"))
            break;
        if (!strcmp(opt, "--repl"))
            repl = 1;
    }

    rt = JS_NewRuntime();
    if (!rt)
    {
        fprintf(stderr, "pow: cannot allocate JS runtime\n");
        exit(2);
    }
    js_std_set_worker_new_context_func(JS_NewCustomContext);
    js_std_init_handlers(rt);
    ctx = JS_NewCustomContext(rt);
    if (!ctx)
    {
        fprintf(stderr, "pow: cannot allocate JS context\n");
        exit(2);
    }

    /* loader for ES6 modules */
    JS_SetModuleLoaderFunc(rt, NULL, js_module_loader, NULL);
    js_std_add_helpers(ctx, argc, argv);


    if (eval_file(ctx, filename, JS_EVAL_TYPE_MODULE))
        goto fail;
    js_std_loop(ctx);

    // Extra call to __post_run after the main program ends
    const char *post_expr = "globalThis.__post_run && __post_run();";
    if (eval_buf(ctx, post_expr, strlen(post_expr), "qjs_pow.c", 0))
        goto fail;
    js_std_loop(ctx);

    if (repl)
    {
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
