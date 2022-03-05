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

function foobar(a : A, b : B) {
    return a.foo + b.bar;
}

expect(injector([ provide(A), provide(B) ]).invoke(globalThis, foobar))
    .to.equal(123 + 321);
```