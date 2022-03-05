import { describe, it } from "razmin";
import { construct, injector, Injector, provide } from "./injector";
import { expect } from "chai";
import { Inject } from "./decorators";
import { reify } from "typescript-rtti";

describe('Injector', () => {
    it('performs simple class injection', () => {
        class A {
            foo = 123;
        }

        class B { 
            constructor(readonly a : A) {}
            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([provide(A), provide(B)]);

        let a = injector.provide(A);
        expect(a.foo).to.equal(123);
        let b = injector.provide(B);
        expect(b.foo).to.equal(123);
        expect(b.a).to.equal(a);
    })
    it('performs simple class injection with a custom token', () => {
        const TOKEN = { name: 'something' };
        class A {
            foo = 123;
        }

        class B { 
            constructor(@Inject(TOKEN) readonly a : A) {}
            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([[TOKEN, construct(A)], provide(B)]);

        let b = injector.provide(B);
        expect(b.foo).to.equal(123);
        expect(b.a instanceof A).to.be.true;
    })
    it('supports property injection', () => {
        class A {
            foo = 123;
        }

        class B {
            @Inject() a : A;
            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([provide(A), provide(B)]);

        let a = injector.provide(A);
        expect(a.foo).to.equal(123);
        let b = injector.provide(B);
        expect(b.foo).to.equal(123);
        expect(b.a).to.equal(a);
    })
    it('supports property injection with custom token', () => {
        const TOKEN = { name: 'something' };

        class B {
            @Inject(TOKEN) a : any;
            get foo() {
                return this.a.foo;
            }
        }

        let value = { foo: 123 };
        let injector = new Injector([[TOKEN, () => value], provide(B)]);

        let b = injector.provide(B);
        expect(b.foo).to.equal(123);
        expect(b.a).to.equal(value);
    })
    it('returns provided default value when no provider is available', () => {
        let injector = new Injector([]);
        expect(injector.provide({ foo: 123 }, 321)).to.equal(321);
    });
    it('throws when no provider is available', () => {
        const TOKEN = { name: 'something' };

        class B {
            @Inject(TOKEN) a : any;
            get foo() {
                return this.a.foo;
            }
        }

        let value = { foo: 123 };
        let injector = new Injector([]);
        let caughtError;

        try {
            injector.provide(B);
        } catch (e) {
            caughtError = e;
        }
        
        expect(caughtError).to.exist;
    });
    it('calls onInjectionCompleted after construction', () => {
        let count = 0;

        class B {
            onInjectionCompleted() {
                count += 1;
            }
        }

        let injector = new Injector([ provide(B) ]);
        injector.provide(B);
        
        expect(count).to.equal(1);
    });
    it('constructs a subdependency exactly once', () => {
        let count = 0;

        class A {
            onInjectionCompleted() {
                count += 1;
            }
        }

        class B {
            constructor(readonly a : A) { }
        }

        let injector = new Injector([ provide(A), provide(B) ]);
        injector.provide(A);
        injector.provide(B);
        
        expect(count).to.equal(1);
    });
    it('supports interfaces', () => {
        interface A {
            foo : number;
        }

        class B {
            constructor(readonly a : A) { }
        }

        let b = injector([ [reify<A>(), () => ({ foo: 123 })],  provide(B) ]).provide(B);
        expect(b.a.foo).to.equal(123);
    });
});