import 'reflect-metadata'
import { expect } from 'chai'
import { reflect } from 'typescript-rtti';
import { injector, genericImpl } from './injector';
import { it, describe } from 'razmin'


class Dummy<T> {
  public constructor(
    public value: T
  ){}
}

const implValue = { input: '123' }
const impl = new Dummy<any>(implValue)


describe('Generic Injector Support', () => {
  it('can provide for multiple refs', async () => {
    const ref1 = reflect<Dummy<any>>()
    const ref2 = reflect<Dummy<any>>()

    expect(ref1).not.to.equal(ref2)
    const provider = genericImpl(ref1, impl)

    const inj = injector([ provider ])
    expect(inj.provide(ref1)).to.equal(impl)
    expect(inj.provide(ref2)).to.equal(impl)
  })

  it('can invoke for multiple refs', async () => {
    const fn = (dummy: Dummy<any>) => {
      return dummy.value
    }
    
    const provider = genericImpl(reflect<Dummy<any>>(), impl)

    const inj = injector([ provider ])
    expect(inj.invoke(null, fn)).to.equal(implValue)
    expect(inj.invoke(null, fn)).to.equal(implValue)
  })
})