/* global describe, it */

import assert from 'assert'
import {_merge} from './utils'

describe('_merge', function () {

  it('should extend (2 args)', function () {

    assert.deepEqual(_merge({}, { foo: 'bar' }), { foo: 'bar' })

  })

  it('should extend (3 args)', function () {

    assert.deepEqual(_merge({}, { foo: 'bar' }, { crash: 'test' }), { foo: 'bar', crash: 'test' })

  })

  it('should override', function () {

    assert.deepEqual(_merge({}, { foo: 'bar' }, { foo: 'bye' }), { foo: 'bye' })

  })

})
