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

#if defined(_WIN32)

// On Windows we'll use reproc to implement a substitution for the missing os.exec

#include <reproc/run.h>

/* reproc.run(cmd, cwd, env, input, stderr, stdout, timeout) -> {exitcode, stderr, stdout} */
static JSValue js_reproc_run(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    JSValueConst arg_cmd = argv[0];
    JSValueConst arg_cwd = argv[1];
    // JSValueConst arg_env = argv[2];
    JSValueConst arg_stderr = argv[3];
    JSValueConst arg_stdout = argv[4];
    // JSValueConst arg_timeout = argv[5];

    JSValue val, ret_val;
    uint32_t exec_argc, i;
    int ret;

    // cmd:
    const char **exec_argv, *str;

    val = JS_GetPropertyStr(ctx, arg_cmd, "length");
    if (JS_IsException(val))
        return JS_EXCEPTION;
    ret = JS_ToUint32(ctx, &exec_argc, val);
    JS_FreeValue(ctx, val);
    if (ret)
        return JS_EXCEPTION;
    /* arbitrary limit to avoid overflow */
    if (exec_argc < 1 || exec_argc > 65535)
    {
        return JS_ThrowTypeError(ctx, "invalid number of arguments");
    }
    exec_argv = js_mallocz(ctx, sizeof(exec_argv[0]) * (exec_argc + 1));
    if (!exec_argv)
        return JS_EXCEPTION;
    for (i = 0; i < exec_argc; i++)
    {
        val = JS_GetPropertyUint32(ctx, arg_cmd, i);
        if (JS_IsException(val))
            goto exception;
        str = JS_ToCString(ctx, val);
        JS_FreeValue(ctx, val);
        if (!str)
            goto exception;
        exec_argv[i] = str;
    }
    exec_argv[exec_argc] = NULL;

    // cwd:
    const char *cwd = JS_ToCString(ctx, arg_cwd);
    if (!cwd)
        goto exception;
    printf("cwd: %s\n", cwd);

    // env:

    // ????

    // stderr
    // REPROC_REDIRECT redirect_err;
    const char *stderr_ = JS_ToCString(ctx, arg_stderr);
    if (!stderr_)
        goto exception;
    printf("stderr: %s\n", stderr_);
    // if (strcmp("pipe", stderr_) == 0) {
    //     redirect_err = REPROC_REDIRECT_PIPE;
    // }

    // stdout
    const char *stdout_ = JS_ToCString(ctx, arg_stdout);
    if (!stdout_)
        goto exception;
    printf("stdout: %s\n", stdout_);

    char *p_stdout = NULL;
    char *p_stderr = NULL;

    int rr = reproc_run_ex(
        exec_argv,
        (reproc_options){
            .working_directory = cwd,
            // .redirect.err = redirect_err,
        },
        reproc_sink_string(&p_stdout),
        reproc_sink_string(&p_stderr));

    if (rr < 0)
        goto exception;

    // Check that the while loop stopped because the output stream of the child
    // process was closed and not because of any other error.
    // if (rr != REPROC_EPIPE)
    //     goto exception;

    printf("stdout: %s\n", p_stdout);
    printf("stderr: %s\n", p_stderr);

    // Wait for the process to exit. This should always be done since some systems
    // (POSIX) don't clean up system resources allocated to a child process until
    // the parent process explicitly waits for it after it has exited.

    ret_val = JS_NewInt32(ctx, rr);

done:
    // JS_FreeCString(ctx, file);
    // JS_FreeCString(ctx, cwd);
    for (i = 0; i < exec_argc; i++)
        JS_FreeCString(ctx, exec_argv[i]);
    js_free(ctx, exec_argv);
    // if (envp != environ) {
    //     char **p;
    //     p = envp;
    //     while (*p != NULL) {
    //         js_free(ctx, *p);
    //         p++;
    //     }
    //     js_free(ctx, envp);
    // }
    return ret_val;
exception:
    ret_val = JS_EXCEPTION;
    goto done;
}

#endif

// Boilerplate code ro wrap the function above in a QuickJS module:

static const JSCFunctionListEntry js_reproc_funcs[] = {
#if defined(_WIN32)
    JS_CFUNC_DEF("run", 6, js_reproc_run),
#endif
};

static int
js_reproc_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_reproc_funcs, countof(js_reproc_funcs));
}

JSModuleDef *js_init_module_reproc(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_reproc_init);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_reproc_funcs, countof(js_reproc_funcs));
    return m;
}

static JSContext *POW_JS_NewCustomContext(JSRuntime *rt)
{
    JSContext *ctx = JS_NewCustomContext(rt);
    js_init_module_reproc(ctx, "reproc");
    return ctx;
}

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

    if (extstart > 0 && (0 == strcmp(filename + extstart, ".exe")))
    {
        filename[extstart + 1] = 'm';
        filename[extstart + 2] = 'j';
        filename[extstart + 3] = 's';
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
    js_std_set_worker_new_context_func(POW_JS_NewCustomContext);
    js_std_init_handlers(rt);
    ctx = POW_JS_NewCustomContext(rt);
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
