import { describe, it } from "razmin";
import { Injector, provide } from "./injector";
import { expect } from "chai";

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
});