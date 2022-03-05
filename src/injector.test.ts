import { describe, it } from "razmin";
import { construct, Injector, provide } from "./injector";
import { expect } from "chai";
import { Inject } from "./decorators";

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
});