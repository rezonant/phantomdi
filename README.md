# phantomdi

[![Version](https://img.shields.io/npm/v/phantomdi.svg)](https://www.npmjs.com/package/phantomdi)
[![CircleCI](https://circleci.com/gh/rezonant/phantomdi/tree/main.svg?style=shield)](https://circleci.com/gh/rezonant/phantomdi/tree/main)

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