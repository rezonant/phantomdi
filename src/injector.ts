import { reflect, ReflectedTypeRef } from 'typescript-rtti';
import { Constructor } from './common';
export interface Dependency<T = any> { tokens : any[]; optional? : boolean; default? : () => T; }
export class Injector {
    constructor(providers : [any, Function][], parent? : Injector) {
        this.#providers = new Map(providers);
        this.#providers.set(Injector, () => this);
        this.#parent = parent;
    }

    static construct(constructor : Constructor): Function {
        return (i : Injector) => i.construct(constructor);
    }

    #parent? : Injector;
    #providers = new Map<any, Function>();
    #resolved = new Map<any, any>();

    provide<T>(constructor : Constructor<T>): T;
    provide(token : any): any {
        if (this.#resolved.has(token))
            return this.#resolved.get(token);
    
        if (!this.#providers.has(token))
            return undefined;
        
        let resolved = this.invoke(this.#providers.get(token));
        this.#resolved.set(token, resolved);
        return resolved;
    }

    invoke<T = any>(func : ((...args) => T) | Function): T {
        return <T> func(...this.analyze(func).map(d => this.resolve(d)));
    }

    construct<T>(klass : Constructor<T>): T {
        return new klass(...this.analyze(klass).map(d => this.resolve(d)));
    }

    private resolve(dep : Dependency) {
        return this.invoke(() => dep.tokens.map(t => this.provide(t)).filter(x => x)[0]);
    }

    private analyze<T>(ctor : Constructor<T> | Function): Dependency[] {
        return reflect(ctor).metadata('pdi:deps', () => {
            return Object.seal(reflect(ctor).parameters.map(p => ({ 
                ...this.dependency(p.type),
                optional: p.isOptional,
                default: p.initializer
            })));
        });
    }

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

export function injector(providers : [any, Function][], parent? : Injector): Injector {
    return new Injector(providers, parent);
}

export function construct(constructor : Constructor) { return Injector.construct(constructor); }
export function provide<T>(constructor : Constructor<T>): [ Function, Function ] {
    return [constructor, construct(constructor)];
}