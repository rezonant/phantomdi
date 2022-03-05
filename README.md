# phantomdi

[![Version](https://img.shields.io/npm/v/phantomdi.svg)](https://www.npmjs.com/package/phantomdi)
[![CircleCI](https://circleci.com/gh/rezonant/phantomdi/tree/main.svg?style=shield)](https://circleci.com/gh/rezonant/phantomdi/tree/main)

* No decorators needed (when paired with `typescript-rtti`)
* Supports classes, interfaces and arbitrary values as tokens
* Supports injection on union types (ie `OptionA | OptionB`)
* Inject on both constructor parameters and properties
* Also supports the standard `emitDecoratorMetadata`-style injection (a la Angular, `injection-js`, 
  `@alterior/di`, etc)

`phantomdi` is a no-boilerplate DI framework for classes and functions which can optionally leverage [typescript-rtti](https://typescript-rtti.org). 

```typescript
import { injector, provide } from 'phantomdi';
import { reify } from 'typescript-rtti';

interface Foobar { 
    version : number;
}

class A {
    constructor(readonly foobar : Foobar) {

    }

    get version() { return this.foobar.version; }
}

let a = injector([ provide(reify<Foobar>, { version: 123 }), provide(A) ]).provide(A)
expect(a.version).to.equal(123);
```

Functions:

```typescript
import { injector, provide } from 'phantomdi';

class A { foo: 123 }
class B { bar: 321 }

function foobar(a : A, b : B) {
    return a.foo + b.bar;
}

expect(injector([ provide(A), provide(B) ]).invoke(globalThis, foobar))
    .to.equal(123 + 321);
```

Optional:

```typescript
import { injector, provide } from 'phantomdi';

class A { foo: 123 }
class B { bar: 321 }

function foobar(a : A, b? : B) {
    return a.foo + (b?.bar ?? 555);
}

expect(injector([ provide(A) ]).invoke(globalThis, foobar))
    .to.equal(123 + 555);
```

Initializers:


```typescript
import { injector, provide } from 'phantomdi';

class A { foo: 123 }
class B { bar: 321 }

function foobar(a : A, b = new B(555)) {
    return a.foo + (b?.bar);
}

expect(injector([ provide(A) ]).invoke(globalThis, foobar))
    .to.equal(123 + 555);
```

Heirarchical injection:

```typescript
import { injector, provide } from 'phantomdi';

class A { 
    constructor(readonly foo = 123) {
    }
}

class B {
    bar = 321;
}

let parent = injector([ provide(A), provide(B) ]);
let injector = injector([ provide(A, () => new A(555))], parent)

expect(injector.provide(A).foo).to.equal(555);
expect(injector.provide(B).bar).to.equal(321);
```

# API

The `injector()` function (and the `Injector` constructor) accept an array of providers. Each provider is a tuple of two values: a token and a function which provides the value for that token.

```typescript
let i = injector([
    ['foo', () => 123],
    ['bar', () => 321]
]);

expect(i.provide('foo')).to.equal(123);
expect(i.provide('bar')).to.equal(321);
```

The `provide()` function provides syntactic sugar for defining these:

```
let i = injector([
    provide('foo', () => 123),
    provide('bar', () => 321)
]);

expect(i.provide('foo')).to.equal(123);
expect(i.provide('bar')).to.equal(321);
```

Provider functions are also subject to dependency injection:

```typescript
let i = injector([
    provide(Number, () => 123),
    provide('bar', (num : number) => num + 1)
])

expect(i.provide('bar').to.equal(124));
```

Calling `provide()` with a class constructor will provide that class using its constructor as the token:

```typescript
class Foo { }

injector([ provide(Foo) ]);
```

This is done using the `construct(constructor)` function. It returns a provider function which constructs the 
given class using the dependency injector.