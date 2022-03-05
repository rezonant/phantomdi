# phantomdi

[![Version](https://img.shields.io/npm/v/phantomdi.svg)](https://www.npmjs.com/package/phantomdi)
[![CircleCI](https://circleci.com/gh/rezonant/phantomdi/tree/main.svg?style=shield)](https://circleci.com/gh/rezonant/phantomdi/tree/main)

`phantomdi` is a no-boilerplate DI framework for classes and functions which can optionally leverage [typescript-rtti](https://typescript-rtti.org). 

* No decorators needed (when paired with `typescript-rtti`)
* Supports classes, interfaces and arbitrary values as tokens
* Supports injection on union types (ie `OptionA | OptionB`)
* Inject on both constructor parameters and properties
* Also supports the standard `emitDecoratorMetadata`-style injection (a la Angular, `injection-js`, 
  `@alterior/di`, etc)

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

class A { foo = 123 }
class B { bar = 321 }

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

```typescript
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

You can provide a class token using another class:

```typescript
class Foo { }
class Bar extends Foo { }

injector([ provide(Foo, Bar) ]);
```

You can also invoke a function by injecting its parameters based on the available metadata:

```typescript
class Foo { bar = 123; }

let result = injector([ provide(Foo) ]).invoke((foo : Foo) => foo.bar);

expect(result).to.equal(123);
```

In addition to parameter injection, you can do property injection:

```typescript
class Foo {
    baz = 123;
}

class Bar {
    @Inject() foo : Foo;
}

let result = inject([ provide(Foo), provide(Bar) ]).provide(Bar).foo.baz;

expect(result).to.equal(123);
```

You can define an `onInjectionCompleted()` method which will get called after all injection is resolved:

```typescript
class Foo {
    baz = 123;
}

class Bar {
    @Inject() foo : Foo;

    onInjectionCompleted() {
        expect(this.foo.baz).to.equal(123);
    }
}

let bar = inject([ provide(Foo), provide(Bar) ]).provide(Bar);
```

If you specify that a parameter or property is optional, it will be treated as optional. If you specify an initializer for a property or parameter it will automatically be considered "optional", with its value set automatically to the initializer.

# Using without typescript-rtti

When using `typescript-rtti`, no decorators are required, the library will automatically determine all relevant Typescript types and do the right thing. However you can still use the library without it- the library provides `@Injectable()` along with `@Inject()` and `@Optional()`, and it supports `emitDecoratorMetadata`:

```typescript
@Injectable()
class Foo {
    baz = 123;
}

@Injectable()
class Bar {
    constructor(readonly foo : Foo) {
    }
}

let result = inject([ provide(Foo), provide(Bar) ]).provide(Bar).foo.baz;

expect(result).to.equal(123);
```

As with other dependency injection libraries, technically any decorator on the class being injected is fine, the specific use of `@Injectable()` is not enforced.