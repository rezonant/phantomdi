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
});