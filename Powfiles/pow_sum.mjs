export function powSum(_ctx, args) {
    let total = 0;
    for (const arg of args) {
        total += Number(arg);
    }
    print(total);
}