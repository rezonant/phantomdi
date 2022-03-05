import { InterfaceToken, reflect, ReflectedClass, ReflectedConstructorParameter, ReflectedFunctionParameter, ReflectedMethodParameter, ReflectedTypeRef } from 'typescript-rtti';
import { capitalize, Constructor } from './common';
import { Inject } from './decorators';
export interface Dependency<T = any> { tokens : any[]; optional? : boolean; default? : () => T; }

export type Provider = (...args) => any;

function carry<T,U>(v : T, callback : (v : T) => U) {
    return callback(v);
}

/**
 * Represents a dependency injector.
 */
export class Injector {
    /**
     * Construct an injector with the given providers and parent injector. Once constructed the 
     * injector will be able to provide any of the dependencies specified by the providers by using 
     * provide(), construct(), or invoke().
     * @param providers 
     * @param parent 
     */
    constructor(providers : [any, Provider][], parent? : Injector) {
        this.#providers = new Map(providers.filter(([token]) => !token[ALTERS]));

        let alterations = new Map<any, Function[]>();
        for (let [alteredToken, provider] of providers.filter(([token]) => token[ALTERS])) {
            let token = alteredToken[ALTERS];
            if (!alterations.has(token))
                alterations.set(token, []);
            alterations.get(token).push(provider);
        }
        this.#alterations = alterations;
        this.#providers.set(Injector, () => this);
        this.#parent = parent;
    }

    /**
     * Creates a dependency injection provider which constructs the given class.
     * @param constructor 
     * @returns 
     */
    static construct(constructor : Constructor): Provider {
        return (i : Injector) => i.construct(constructor);
    }

    #parent? : Injector;
    #providers = new Map<any, Function>();
    #alterations = new Map<any, Function[]>();
    #resolved = new Map<any, any>();

    /**
     * Provide an instance for the given class. 
     * @param constructor 
     */
    provide<T>(constructor : Constructor<T>, defaultValue? : any): T;
    /**
     * Provide an object that implements the given interface via a token that represents it.
     * @param token 
     */
    provide<T>(token : InterfaceToken, defaultValue? : any): any;
    provide(token : any, defaultValue? : any): any;
    provide(token : any, defaultValue? : any): any {
        let hasDefault = arguments.length > 1;

        if (this.#resolved.has(token))
            return this.#resolved.get(token);
    
        if (!this.#providers.has(token)) {
            if (this.#parent) {
                if (hasDefault)
                    return this.#parent.provide(token, defaultValue);
                else
                    return this.#parent.provide(token);
            }

            if (!hasDefault)
                throw new Error(`No provider for dependency: ${token.name ?? token}`);
            return defaultValue;
        }
        
        let resolved = this.invoke(globalThis, this.#providers.get(token));
        resolved = this.prepare(token, resolved);
        this.#resolved.set(token, resolved);
        return resolved;
    }

    /**
     * Invoke the given function, providing its arguments using the injector.
     * @param func 
     * @returns The result of the function
     */
    invoke<T = any>(target : any, func : ((...args) => T) | Function): T {
        return <T> func.call(target, ...this.analyze(func).map(d => this.resolve(d)));
    }

    /**
     * Construct the given class by using the injector to resolve and provide its dependencies.
     * This creates a new instance of the class every time, and does not resolve the class itself 
     * using the providers of this injector.
     * 
     * @param klass 
     * @returns 
     */
    construct<T>(klass : Constructor<T>): T {
        return new klass(...this.analyze(klass).map(d => this.resolve(d)));
    }

    /**
     * Applies property injection and calls the onInjectionCompleted lifecycle hook
     * @param instance 
     * @returns 
     */
    private prepare<T>(token : any, instance : T): T {
        reflect(instance).properties
            .filter(x => x.hasMetadata('pdi:inject'))
            .forEach(p => instance[p.name] = carry(
                p.getMetadata('pdi:inject') ?? p.type.as('class').class, 
                token => (p.isOptional || p.getMetadata('pdi:optional') === true) ? this.provide(token, undefined) : this.provide(token)
            ))
        ;

        if (instance['onInjectionCompleted'])
            this.invoke(instance, instance['onInjectionCompleted']);
        
        instance = this.applyAlterations(token, instance);
        return instance;
    }

    derive(providers : [any, Provider][]) {
        return new Injector(providers, this);
    }

    private applyAlterations<T>(token : any, instance : T): T {
        return (this.#alterations.get(token) ?? [])
            .reduce((instance, alteration) => 
                this.derive([[token, () => instance]])
                    .invoke(globalThis, alteration), 
                instance
            );
    }

    /**
     * Resolve the given dependency. This is the core mechanism for providing dependencies internally.
     * @param dep 
     * @returns 
     */
    private resolve(dep : Dependency) {
        return this.invoke(globalThis, () => carry(
            dep.tokens.map(t => this.provide(t, undefined))
                .filter(x => x)[0],
            value => {
                if (value === undefined && !dep.optional)
                    throw new Error(`No provider for dependency: ${dep.tokens.map(t => t.name ?? t).join(' | ')}`);
                return value ?? dep.default?.();
            }
        ));
    }

    /**
     * Analyze the given function (or constructor) to determine its dependencies.
     * @param ctor 
     * @returns 
     */
    private analyze<T>(ctor : Constructor<T> | Function): Dependency[] {
        return reflect(ctor).metadata('pdi:deps', () => Object.seal(
            reflect(ctor)
                .parameters
                .map(p => ({ 
                    ...this.paramDependency(p), 
                    optional: this.paramOptional(p), 
                    default: p.initializer
                }))
        ));
    }

    private paramOptional(param : ReflectedConstructorParameter | ReflectedFunctionParameter) {
        return param.isOptional || param.parent.getMetadata(`pdi:optional:param:${param.index}`) || !!param.initializer;
    }

    private paramDependency(param : ReflectedConstructorParameter | ReflectedFunctionParameter): Dependency {
        if (param.parent?.hasMetadata(`pdi:inject:param:${param.index}`))
            return { tokens: [ param.parent.getMetadata(`pdi:inject:param:${param.index}`)] };
        else
            return { ...this.typeDependency(param.type) }
    }

    /**
     * Produce a Dependency that corresponds to the given runtime type reference.
     * @param typeRef 
     * @returns 
     */
    private typeDependency(typeRef : ReflectedTypeRef, map = new Map<ReflectedTypeRef, Dependency>()) : Dependency {
        if (typeRef.isUnion())
            return { tokens: typeRef.types.map(t => this.typeDependency(t, map)).map(d => d.tokens).flat() };
        else if (typeRef.isClass())
            return { tokens: [ typeRef.class ] };
        else if (typeRef.isInterface())
            return { tokens: [ typeRef.token ] };
        else if (typeRef.isLiteral())
            return { tokens: [ typeRef.value.constructor ]}
        else
            throw new TypeError(`Unsupported type ref: ${typeRef}`);
    }
}

/**
 * Create a new injector with the given providers and parent injector. 
 * This is a function-oriented alternative to `new Injector(providers, parent)`
 * 
 * @param providers 
 * @param parent 
 * @returns 
 */
export function injector(providers : [any, Provider][], parent? : Injector): Injector {
    return new Injector(providers, parent);
}

/**
 * Creates a dependency injection provider which constructs the given class.
 * @param constructor 
 * @returns 
 */
export function construct(constructor : Constructor): Provider { return Injector.construct(constructor); }

/**
 * Creates a dependency injection provider for the given constructor. When an injection calls for the 
 * constructor as its token or when the type specified at the injection site is the class represented by the 
 * constructor, this provider will be used.
 * 
 * @param constructor The class constructor to provide. It will be provided by constructing it. All constructor
 *                    parameters will be provided by the dependency injector.
 * @returns 
 */
export function provide<T>(constructor : Constructor<T>, klass? : Constructor<T>): [ Function, Provider ];
export function provide<T>(token : any, provider : Provider): [ any, Provider ];
export function provide(token : any, value? : any): [ any, Provider ] {
    if (arguments.length === 1)
        return [token, token && reflect(token) instanceof ReflectedClass ? construct(token) : token];
    else
        return [token, value && reflect(value) instanceof ReflectedClass ? construct(value) : value];
}

const ALTERS = Symbol('alters');

type JustStringKeys<T> = ({[P in keyof T]: P extends string ? P : never });
type JustMethodKeys<T> = ({[P in keyof T]: T[P] extends (...args) => any ? P : never })[keyof T];  

type BeforeAlteration<T> = {
    [P in JustMethodKeys<T> as `before${Capitalize<string & P>}`]? 
    : T[P] extends (...args) => any ? (...params : Parameters<T[P]>) => void : never;
};
type AfterAlteration<T> = {
    [P in JustMethodKeys<T> as `after${Capitalize<string & P>}`]? 
    : T[P] extends (...args) => any ? (...params : Parameters<T[P]>) => void : never;
};
type AroundAlteration<T> = {
    [P in JustMethodKeys<T> as `around${Capitalize<string & P>}`]? : (original : T[P]) => T[P];
};
type ReplaceAlteration<T> = {
    [P in JustMethodKeys<T> as P]? : T[P];
};

type OverrideAlteration<T> = {
    [P in JustMethodKeys<T>]? : T[P];
};

export type Alteration<T> = OverrideAlteration<T> & BeforeAlteration<T> & AfterAlteration<T> & AroundAlteration<T> & ReplaceAlteration<T>;
export function alter<T>(klass : Constructor<T>, alteration : Alteration<T>): [ any, Provider ];
export function alter<T>(token : any, alteration : Provider | Alteration<T>): [ any, Provider ] {
    if (typeof alteration === 'function')
        return [{ [ALTERS]: token }, alteration];

    return [{ [ALTERS]: token }, (injector : Injector) => {
        let instance = injector.provide(token);

        return new Proxy(instance, {
            get(target, property : string | symbol, receiver) {
                if (typeof property === 'symbol')
                    return target[property];
                
                let value = target[property];
                if (property in alteration)
                    value = alteration[property];

                if (typeof value === 'function') {
                    let cap = `${capitalize(property)}`;
                    if (alteration[`around${cap}`])
                        value = alteration[`around${cap}`](value);

                    if (alteration[`before${cap}`] || alteration[`after${cap}`]) {
                        let original = value;
                        value = function (...args) {
                            try {
                                alteration[`before${cap}`]?.call(this, ...args);
                                return original.call(this, ...args);
                            } finally {
                                alteration[`after${cap}`]?.call(this, ...args);
                            }
                        };
                    }
                }

                return value;
            }
        });
    }];
}