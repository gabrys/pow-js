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

// On Windows we'll use libbspawn to implement a substitution for the missing os.exec

#include <libbspawn.h>

// Copied from quickjs-libc.c verbatim:
static char **build_envp(JSContext *ctx, JSValueConst obj)
{
    uint32_t len, i;
    JSPropertyEnum *tab;
    char **envp, *pair;
    const char *key, *str;
    JSValue val;
    size_t key_len, str_len;

    if (JS_GetOwnPropertyNames(ctx, &tab, &len, obj,
                               JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY) < 0)
        return NULL;
    envp = js_mallocz(ctx, sizeof(envp[0]) * ((size_t)len + 1));
    if (!envp)
        goto fail;
    for (i = 0; i < len; i++)
    {
        val = JS_GetProperty(ctx, obj, tab[i].atom);
        if (JS_IsException(val))
            goto fail;
        str = JS_ToCString(ctx, val);
        JS_FreeValue(ctx, val);
        if (!str)
            goto fail;
        key = JS_AtomToCString(ctx, tab[i].atom);
        if (!key)
        {
            JS_FreeCString(ctx, str);
            goto fail;
        }
        key_len = strlen(key);
        str_len = strlen(str);
        pair = js_malloc(ctx, key_len + str_len + 2);
        if (!pair)
        {
            JS_FreeCString(ctx, key);
            JS_FreeCString(ctx, str);
            goto fail;
        }
        memcpy(pair, key, key_len);
        pair[key_len] = '=';
        memcpy(pair + key_len + 1, str, str_len);
        pair[key_len + 1 + str_len] = '\0';
        envp[i] = pair;
        JS_FreeCString(ctx, key);
        JS_FreeCString(ctx, str);
    }
done:
    for (i = 0; i < len; i++)
        JS_FreeAtom(ctx, tab[i].atom);
    js_free(ctx, tab);
    return envp;
fail:
    if (envp)
    {
        for (i = 0; i < len; i++)
            js_free(ctx, envp[i]);
        js_free(ctx, envp);
        envp = NULL;
    }
    goto done;
}

/* bspawn.spawn_child(cmd, cwd, env, timeout, stdin_config, stdout_config, stderr_config, stdin_data) -> {status, stdout, stderr} */
static JSValue js_bspawn_spawn_child(JSContext *ctx, JSValueConst this_val,
                                     int argc, JSValueConst *argv)
{
    JSValueConst arg_cmd = argv[0];
    JSValueConst arg_cwd = argv[1];
    JSValueConst arg_env = argv[2];
    JSValueConst arg_timeout = argv[3];
    JSValueConst arg_stdin_config = argv[4];  // 1=IGNORE, 2=INHERIT, 3=PIPE
    JSValueConst arg_stdout_config = argv[5]; // 1=IGNORE, 2=INHE3IT, 3=PIPE
    JSValueConst arg_stderr_config = argv[6]; // 1=IGNORE, 2=INHERIT, 3=PIPE, 4=STDOUT
    JSValueConst arg_stdin_data = argv[7];

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
        return JS_ThrowTypeError(ctx, "invalid number of arguments");
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
    // printf("qjs_pow.c cwd: %s\n", cwd);

    // env:
    const char **envp = (const char **)build_envp(ctx, arg_env);
    if (!envp)
        goto exception;

    // input:
    const char *stdin_data = JS_ToCString(ctx, arg_stdin_data);
    if (!stdin_data)
        goto exception;
    // printf("qjs_pow.c stdin_data: %s\n", stdin_data);

    // stdin
    uint32_t stdin_config = 0;
    ret = JS_ToUint32(ctx, &stdin_config, arg_stdin_config);
    if (ret)
        goto exception;
    // printf("qjs_pow.c stdin: %d\n", stdin_config);

    // stdout
    uint32_t stdout_config = 0;
    ret = JS_ToUint32(ctx, &stdout_config, arg_stdout_config);
    if (ret)
        goto exception;
    // printf("qjs_pow.c stdout: %d\n", stdout_config);

    // stderr
    uint32_t stderr_config = 0;
    ret = JS_ToUint32(ctx, &stderr_config, arg_stderr_config);
    if (ret)
        goto exception;
    // printf("qjs_pow.c stderr: %d\n", stderr_config);

    // timeout
    uint32_t timeout = 0;
    ret = JS_ToUint32(ctx, &timeout, arg_timeout);
    if (ret)
        goto exception;
    // printf("qjs_pow.c timeout: %d\n", timeout);

    const char *stdout_data = NULL;
    const char *stderr_data = NULL;
    int exit_code;
    const char *error_message = NULL;

    int ok = spawn_child(
        exec_argv,     // args (first is the program to run)
        cwd,           // requested working directory
        envp,          // environment to set in the standard form
        timeout,       // timeout in milliseconds (0 means no limit)
        stdin_config,  // one of: BSPAWN_STREAM_IGNORE, BSPAWN_STREAM_INHERIT, BSPAWN_STREAM_PIPE (read from stdin_data)
        stdout_config, // one of: BSPAWN_STREAM_IGNORE, BSPAWN_STREAM_INHERIT, BSPAWN_STREAM_PIPE (save to stdout_data)
        stderr_config, // one of: BSPAWN_STREAM_IGNORE, BSPAWN_STREAM_INHERIT, BSPAWN_STREAM_PIPE (save to stderr_data)
        stdin_data,    // used if stdin_config=BSPAWN_STREAM_PIPE
        &stdout_data,  // out: set if stdout_config=BSPAWN_STREAM_PIPE
        &stderr_data,  // out: set if stderr_config=BSPAWN_STREAM_PIPE
        &exit_code,    // out: exit code of the process
        &error_message // out: error message
    );

    // int rr = glib_spawn_ex(
    //     exec_argv,
    //     (reproc_options){
    //         .working_directory = cwd,
    //         // .redirect.err = redirect_err,
    //     },
    //     reproc_sink_string(&p_stdout),
    //     reproc_sink_string(&p_stderr));

    // if (rr < 0)
    //     goto exception;

    // Check that the while loop stopped because the output stream of the child
    // process was closed and not because of any other error.
    // if (rr != REPROC_EPIPE)
    //     goto exception;

    // printf("qjs_pow.c ok:        %d\n", ok);
    // printf("qjs_pow.c exit_code: %d\n", exit_code);
    // printf("qjs_pow.c stdout:    %s\n", stdout_data);
    // printf("qjs_pow.c stderr:    %s\n", stderr_data);

    JSValue obj = JS_NewObject(ctx);
    if (JS_IsException(obj))
        return JS_EXCEPTION;

    JSAtom atom_status = JS_NewAtomLen(ctx, "status", strlen("status"));
    JSAtom atom_stdout = JS_NewAtomLen(ctx, "stdout", strlen("stdout"));
    JSAtom atom_stderr = JS_NewAtomLen(ctx, "stderr", strlen("stderr"));

    JS_DefinePropertyValue(ctx, obj, atom_status, JS_NewInt32(ctx, exit_code), JS_PROP_C_W_E);
    if (stdout_data != NULL)
        JS_DefinePropertyValue(ctx, obj, atom_stdout, JS_NewString(ctx, stdout_data), JS_PROP_C_W_E);
    if (stderr_data != NULL)
        JS_DefinePropertyValue(ctx, obj, atom_stderr, JS_NewString(ctx, stderr_data), JS_PROP_C_W_E);

    return obj;

    // ret_val = JS_NewInt32(ctx, -666);

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

static const JSCFunctionListEntry js_bspawn_funcs[] = {
#if defined(_WIN32)
    JS_CFUNC_DEF("spawn_child", 8, js_bspawn_spawn_child),
#endif
};

static int js_bspawn_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_bspawn_funcs, countof(js_bspawn_funcs));
}

JSModuleDef *js_init_module_bspawn(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_bspawn_init);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_bspawn_funcs, countof(js_bspawn_funcs));
    return m;
}

static JSContext *POW_JS_NewCustomContext(JSRuntime *rt)
{
    JSContext *ctx = JS_NewCustomContext(rt);
    js_init_module_bspawn(ctx, "bspawn");
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
