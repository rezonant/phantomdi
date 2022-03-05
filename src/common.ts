
export interface Constructor<T = any> {
    new (...args) : T;
}

export function capitalize(str : string) {
    return str[0].toUpperCase() + str.slice(1);
}