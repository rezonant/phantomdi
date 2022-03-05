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