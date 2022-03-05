import { InterfaceToken, reflect, ReflectedTypeRef } from 'typescript-rtti';
import { Constructor } from './common';
export interface Dependency<T = any> { tokens : any[]; optional? : boolean; default? : () => T; }

export type Provider = (...args) => any;

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
    constructor(providers : [any, Function][], parent? : Injector) {
        this.#providers = new Map(providers);
        this.#providers.set(Injector, () => this);
        this.#parent = parent;
    }

    static construct(constructor : Constructor): Provider {
        return (i : Injector) => i.construct(constructor);
    }

    #parent? : Injector;
    #providers = new Map<any, Function>();
    #resolved = new Map<any, any>();

    /**
     * Provide an instance for the given class. 
     * @param constructor 
     */
    provide<T>(constructor : Constructor<T>): T;
    /**
     * Provide an object that implements the given interface via a token that represents it.
     * @param token 
     */
    provide<T>(token : InterfaceToken): any;
    provide(token : any): any {
        if (this.#resolved.has(token))
            return this.#resolved.get(token);
    
        if (!this.#providers.has(token))
            return undefined;
        
        let resolved = this.invoke(this.#providers.get(token));
        this.#resolved.set(token, resolved);
        return resolved;
    }

    /**
     * Invoke the given function, providing its arguments using the injector.
     * @param func 
     * @returns The result of the function
     */
    invoke<T = any>(func : ((...args) => T) | Function): T {
        return <T> func(...this.analyze(func).map(d => this.resolve(d)));
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
     * Resolve the given dependency. This is the core mechanism for providing dependencies internally.
     * @param dep 
     * @returns 
     */
    private resolve(dep : Dependency) {
        return this.invoke(() => dep.tokens.map(t => this.provide(t)).filter(x => x)[0]);
    }

    /**
     * Analyze the given function (or constructor) to determine its dependencies.
     * @param ctor 
     * @returns 
     */
    private analyze<T>(ctor : Constructor<T> | Function): Dependency[] {
        return reflect(ctor).metadata('pdi:deps', () => {
            return Object.seal(reflect(ctor).parameters.map(p => ({ 
                ...this.dependency(p.type),
                optional: p.isOptional,
                default: p.initializer
            })));
        });
    }

    /**
     * Produce a Dependency that corresponds to the given runtime type reference.
     * @param typeRef 
     * @returns 
     */
    private dependency(typeRef : ReflectedTypeRef) : Dependency {
        if (typeRef.isUnion())
            return { tokens: typeRef.types.map(t => this.dependency(t)).map(d => d.tokens).flat() };
        else if (typeRef.isClass())
            return { tokens: [ typeRef.class ] };
        else if (typeRef.isInterface())
            return { tokens: [ typeRef.token ] };
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
export function injector(providers : [any, Function][], parent? : Injector): Injector {
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
export function provide<T>(constructor : Constructor<T>): [ Function, Function ] {
    return [constructor, construct(constructor)];
}