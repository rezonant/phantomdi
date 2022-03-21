import { describe, it } from "razmin";
import { alter, construct, genericImpl, injector, Injector, provide } from "./injector";
import { expect } from "chai";
import { Inject, Optional } from "./decorators";
import { reflect, reify } from "typescript-rtti";

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
    it('supports @Optional() for constructor param when no provider is available', () => {
        const TOKEN = { name: 'something' };

        class A { foo = 123; }

        class B {
            constructor(@Optional() readonly a : A) {}

            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([provide(B)]);
        let b = injector.provide(B);
        
        expect(b.a).not.to.exist;
    });
    it('supports @Optional() for constructor param with custom token when no provider is available', () => {
        const TOKEN = { name: 'something' };

        class B {
            constructor(@Inject(TOKEN) @Optional() readonly a : any) {}

            get foo() {
                return this.a.foo;
            }
        }

        let value = { foo: 123 };
        let injector = new Injector([provide(B)]);
        let b = injector.provide(B);

        expect(b.a).not.to.exist;
    });
    it('supports @Optional() for property with custom token when no provider is available', () => {
        const TOKEN = { name: 'something' };

        class B {
            @Inject(TOKEN) @Optional() a : any;
            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([provide(B)]);
        let b = injector.provide(B);

        expect(b.a).not.to.exist;
    });
    it('supports Typescript optional for property with custom token when no provider is available', () => {
        const TOKEN = { name: 'something' };

        class B {
            @Inject(TOKEN) a? : any;
            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([provide(B)]);
        let b = injector.provide(B);

        expect(b.a).not.to.exist;
    });
    it('supports Typescript optional for property when no provider is available', () => {
        const TOKEN = { name: 'something' };

        class A { foo = 123; };
        class B {
            @Inject() a? : A;
            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([provide(B)]);
        let b = injector.provide(B);

        expect(b.a).not.to.exist;
    });
    it('supports Typescript optional for constructor parameter when no provider is available', () => {
        const TOKEN = { name: 'something' };

        class A { foo = 123; };
        class B {
            constructor(readonly a? : A) { }
            get foo() {
                return this.a.foo;
            }
        }

        let injector = new Injector([provide(B)]);
        let b = injector.provide(B);

        expect(b.a).not.to.exist;
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
    it('supports unions', () => {
        interface Foo {
            foo : number;
            fooThing();
        }
        interface Bar {
            foo : number;
            barThing();
        }

        class B {
            constructor(readonly a : Foo | Bar) { }
        }

        let b = injector([ [reify<Foo>(), () => ({ foo: 123, fooThing() { } })],  provide(B) ]).provide(B);
        expect(b.a.foo).to.equal(123);

        b = injector([ [reify<Bar>(), () => ({ foo: 321, fooThing() { } })],  provide(B) ]).provide(B);
        expect(b.a.foo).to.equal(321);
    });
    it('throws when neither provider is available', () => {
        interface Foo {
            foo : number;
            fooThing();
        }
        interface Bar {
            foo : number;
            barThing();
        }

        class B {
            constructor(readonly a : Foo | Bar) { }
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
    it('injects on function params', () => {
        class A { foo = 123 };
        class B { bar = 321 };

        function foo(a : A, b : B) {
            return a.foo;
        }

        function bar(a : A, b : B) {
            return b.bar;
        }

        function foobar(a : A, b : B) {
            return a.foo + b.bar;
        }

        let resultFoo = injector([provide(A), provide(B)]).invoke(globalThis, foo);
        let resultBar = injector([provide(A), provide(B)]).invoke(globalThis, bar);
        let resultFooBar = injector([provide(A), provide(B)]).invoke(globalThis, foobar);
        expect(resultFoo).to.equal(123);
        expect(resultBar).to.equal(321);
        expect(resultFooBar).to.equal(123 + 321);
    });
    it('throws for missing dependency on function param', () => {
        class A { foo = 123 };
        class B { bar = 321 };

        function foobar(a : A, b : B) {
            return `shouldn't happen`;
        }

        let caughtError;

        try {
            injector([provide(A)]).invoke(globalThis, foobar);
        } catch (e) {
            caughtError = e;
        }

        expect(caughtError).to.exist;
    });
    it('optionally injects on function param', () => {
        class A { foo = 123 };
        class B { bar = 321 };

        function foo(a : A, b : B) {
            return a.foo;
        }

        function bar(a : A, b : B) {
            return b.bar;
        }

        function foobar(a : A, b? : B) {
            return b;
        }

        let result = injector([provide(A)]).invoke(globalThis, foobar);
        expect(result).not.to.exist;
    });
    it('uses default value for missing function param', () => {
        class A { foo = 123 };
        class B { constructor(readonly bar = 321) { } };

        function foo(a : A, b : B) {
            return a.foo;
        }

        function bar(a : A, b : B) {
            return b.bar;
        }

        function foobar(a : A, b : B = new B(555)) {
            return a.foo + b.bar;
        }

        let result = injector([provide(A)]).invoke(globalThis, foobar);
        expect(result).to.equal(123 + 555);
    });
    it('allows for altering a method on an injected class', () => {
        class A {
            bar = 'abc';
            foo(faz : number) { return 123; } 
        };

        let i = injector([provide(A), alter(A, {
            foo() { return 321; }
        })]);

        let a = i.provide(A);
        expect(a.bar).to.equal('abc');
        expect(a.foo(555)).to.equal(321);
    });
    it('allows for observing the start of a method on an injected class', () => {
        let result : string = '';
        class A {
            bar = 'abc';
            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let i = injector([provide(A), alter(A, {
            beforeFoo() { result += 'b' }
        })]);

        let a = i.provide(A);
        expect(a.bar).to.equal('abc');
        expect(a.foo(555)).to.equal('original');
        expect(result).to.equal('b555');
    });
    it('allows for observing the end of a method on an injected class', () => {
        let result : string = '';
        class A {
            bar = 'abc';
            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let i = injector([provide(A), alter(A, {
            afterFoo() { result += 'a' }
        })]);

        let a = i.provide(A);
        expect(a.bar).to.equal('abc');
        expect(a.foo(555)).to.equal('original');
        expect(result).to.equal('555a');
    });
    it('allows for observing the start and end of a method on an injected class', () => {
        let result : string = '';
        class A {
            bar = 'abc';
            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let i = injector([provide(A), alter(A, {
            afterFoo() { result += 'a' },
            beforeFoo() { result += 'b' }
        })]);

        let a = i.provide(A);
        expect(a.bar).to.equal('abc');
        expect(a.foo(555)).to.equal('original');
        expect(result).to.equal('b555a');
    });
    it('allows for wrapping a method on an injected class', () => {
        let result : string = '';
        class A {
            bar = 'abc';
            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let i = injector([provide(A), alter(A, {
            aroundFoo(original) {
                return function(faz : number) {
                    return original.call(this, faz) + '/replaced';
                }
            }
        })]);

        let a = i.provide(A);
        expect(a.bar).to.equal('abc');
        expect(a.foo(555)).to.equal('original/replaced');
    });
    it('allows for start/end/around at the same time for a method on an injected class', () => {
        let result : string = '';
        class A {
            bar = 'abc';
            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let i = injector([provide(A), alter(A, {
            beforeFoo() { result += 'b'; },
            afterFoo() { result += 'a'; },
            aroundFoo(original) {
                return function(faz : number) {
                    result += 'A';
                    return original.call(this, faz) + '/replaced';
                }
            }
        })]);

        let a = i.provide(A);
        expect(a.bar).to.equal('abc');
        expect(a.foo(544)).to.equal('original/replaced');
        expect(result).to.equal('bA544a');
    });
    it('supports arbitrary alterations', () => {
        let result : string = '';
        class A {
            constructor(readonly bar = 'abc') { };
            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let a1 = new A('def');
        let i = injector([provide(A), alter(A, () => a1) ]);
        let a2 = i.provide(A);
        expect(a1).to.equal(a2);
        expect(a2.bar).to.equal('def');
    });
    it('supports unrelated alterations', () => {
        let result : string = '';
        class A {
            constructor(readonly bar = 'abc') { };
            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let a1 = { bar: 'def' };
        let i = injector([provide(A), alter(A, () => a1) ]);
        let a2 = i.provide(A);
        expect(a1).to.equal(a2);
        expect(a2.bar).to.equal('def');
    });
    
    it('does not interfere with symbols during alteration', () => {
        let result : string = '';
        let sym = Symbol();

        class A {
            constructor(readonly bar = 'abc') { 
            };

            [sym]() {
                return 123;
            }

            foo(faz : number) { 
                result += faz.toString();
                return 'original';
            } 
        };

        let i = injector([provide(A), alter(A, { beforeFoo() { } }) ]);
        let a2 = i.provide(A);
        expect(a2[sym]()).to.equal(123);
    });
    it('should support reification to a constant object', () => {
        interface Foobar { 
            version : number;
        }

        class A {

            constructor(readonly foobar : Foobar) {

            }

            get version() { return this.foobar.version; }
        }

        const provider1 = provide(reify<Foobar>(), () => ({ version: 123 }))
        const provider2 = provide(A)
        const a = injector([ provider1, provider2 ]).provide(A)
        expect(a.version).to.equal(123);
    });
    it('should throw when accidentally providing a constant object instead of a function returning a constant object', () => {
        interface Foobar { 
            version : number;
        }

        class A {

            constructor(readonly foobar : Foobar) {

            }

            get version() { return this.foobar.version; }
        }

        const provider1 = provide(reify<Foobar>(), <any>{ version: 123 })
        const provider2 = provide(A)
        let caughtError;

        try {
           injector([ provider1, provider2 ]).provide(A)
        } catch (e) {
            caughtError = e;
        }

        expect(caughtError).to.exist;
        expect(caughtError.message).to.equal(`Cannot construct '[object Object]': only a valid constructor can be passed here unless you provide a function`);
    });

    it('should resolve generic typed instances', async () => {
      class Dummy<T> {
        public constructor(
          public value: T
        ){}
      }
    
      const anyImpl = new Dummy<any>({ input: '123' })
      const stringImpl = new Dummy<string>('foo')
    
      const inj = injector([ 
        genericImpl(reflect<Dummy<any>>(), anyImpl),
        genericImpl(reflect<Dummy<string>>(), stringImpl),
      ])
    
      const anyFn = (dummy: Dummy<any>) => dummy
      expect(inj.invoke(null, anyFn)).to.equal(anyImpl)
    
      const stringFn = (dummy: Dummy<string>) => dummy
      expect(inj.invoke(null, stringFn)).to.equal(stringImpl)
    });
});