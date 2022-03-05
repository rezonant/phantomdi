import { describe } from "razmin";
import { expect } from "chai";
import { Injector, provide } from "./injector";

describe('Injector with parent', it => {
    it('provides parent dependencies', () => {
        class Foo { foo = 123; }
        let a = new Injector([ provide(Foo) ]);
        let b = new Injector([], a);

        expect(b.provide(Foo).foo).to.equal(123);
    });
    it('allows child to override dependencies', () => {
        class Foo { foo = 123; }
        class Bar extends Foo { foo = 321; }
        let a = new Injector([ provide(Foo) ]);
        let b = new Injector([ provide(Foo, Bar) ], a);

        expect(b.provide(Foo).foo).to.equal(321);
    });
    it('takes default from parent injector', () => {
        class Foo { foo = 123; }
        class Bar { 
            constructor(readonly foo? : Foo) {}
        }
        let a = new Injector([ ]);
        let b = new Injector([ provide(Bar) ], a);

        expect(b.provide(Bar).foo).to.not.exist;
    });
    it('injects inferred type', () => {
        class Bar {
            constructor(readonly foo = 123) {}
        }
        let i = new Injector([ provide(Number, () => 321), provide(Bar) ]);
        expect(i.provide(Bar).foo).to.equal(321);
    });
    it('throws for unsupported type ref', () => {
        class Bar { 
            constructor(readonly foo : string & { foo: 123 }) {}
        }

        let caughtError;
        try {
            new Injector([ provide(Bar) ]).provide(Bar);
        } catch (e) {
            caughtError = e;
        }

        expect(caughtError).to.exist;
    });
});