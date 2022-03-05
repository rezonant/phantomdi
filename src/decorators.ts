
/**
 * Opt into dependency injection when requireOptIn is true.
 * Also required when not using emitDecoratorMetadata (instead of a compatible metadata transformer)
 * @returns 
 */
export function Injectable() {
    return Reflect.metadata('pdi:injectable', true);
}

/**
 * Mark an injection (constructor parameter, property) as optional. If the injector cannot find a suitable 
 * provider, `undefined` will be supplied instead.
 * @returns 
 */
export function Optional() {
    return Reflect.metadata('pdi:optional', true);
}

/**
 * Inject into a constructor parameter or property
 * @param token The dependency injection token. If not provided, the type of the parameter/property is used instead.
 */
export function Inject(token? : any) {
    return Reflect.metadata('pdi:inject', token);
}