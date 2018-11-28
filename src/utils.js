
export var _now = Date.now || function __dateNowPolyfill () { return new Date().getTime() }

export function debounce (fn, debounce_duration) {
  var debouncing = null,
      last_hit = _now()

  function runHit (_this, _args) {
    fn.apply(_this, _args)
    last_hit = _now()
    debouncing = setTimeout(function __cancelRunHitDebounce () {
      debouncing = null
    }, debounce_duration)
  }

  debounce_duration = debounce_duration || 400

  return function _curryDebounce () {
    var _this = this, _args = arguments

    if( !debouncing || (_now() - last_hit) > debounce_duration ) {
      runHit(_this, _args)
    } else {
      clearTimeout(debouncing)
      debouncing = setTimeout(function _debouncedRunHit () {
        runHit(_this, _args)
      }, debounce_duration)
    }
  }
}

var arrayShift = [].shift

function isArray (o) {
  return o instanceof Array
}

function isObject (o) {
  return typeof o === 'object' && o !== null
}

export function _runListeners (args, this_arg) {
  return function __runListeners (listener) {
    listener.apply(this_arg, args)
  }
}

export function _runDelayed (delay_time, fn) {
  return function __runDelayed () {
    setTimeout(fn, delay_time)
  }
}

export function _merge () {
  var dest = arrayShift.call(arguments),
      src = arrayShift.call(arguments),
      key

  while( src ) {

    if( typeof dest !== typeof src ) {
        dest = isArray(src) ? [] : ( isObject(src) ? {} : src )
    }

    if( isObject(src) ) {

      for( key in src ) {
        if( src[key] === undefined ) {
          dest[key] = undefined
        } else if( isArray(dest[key]) ) {
          [].push.apply(dest[key], src[key])
        } else if( isObject(dest[key]) ) {
          dest[key] = _merge(dest[key], src[key])
        } else {
          dest[key] = src[key]
        }
      }
    }
    src = arrayShift.call(arguments)
  }

  return dest
}

export function _find (list, iteratee, this_arg) {
  for( var i = 0, n = list.length ; i < n ; i++ ) {
    if( iteratee.call( this_arg, list[i], i ) ) return list[i]
  }
}

export function _remove (list, iteratee, this_arg) {
  for( var i = list.length - 1 ; i >= 0 ; i-- ) {
    if( iteratee.call( this_arg, list[i], i ) ) list.splice(i, 1)
  }
}

export function _removeItem (list, item) {
  for( var i = list.length - 1 ; i >= 0 ; i-- ) {
    if( list[i] === item ) list.splice(i, 1)
  }
}

export function eventMethods (target) {
  var listeners = {}, listeners_once = {}

  target = target || {}

  function _on (event_name, listener) {
    listeners[event_name] = listeners[event_name] || []
    listeners[event_name].push(listener)
    return target
  }

  function _once (event_name, listener) {
    listeners_once[event_name] = listeners_once[event_name] || []
    listeners_once[event_name].push(listener)
    return target
  }

  function _off (event_name, listener) {
    if( listeners[event_name] ) _removeItem(listeners[event_name], listener)
    return target
  }

  function _emit (event_name, args, this_arg) {
    var listenersRunner = _runListeners(args, this_arg)

    if( listeners[event_name] ) {
      listeners[event_name].forEach(listenersRunner)
    }

    if( listeners_once[event_name] ) {
      listeners_once[event_name].splice(0).forEach(listenersRunner)
    }
    return target
  }

  target.on = _on
  target.once = _once
  target.off = _off
  target.emit = _emit

  return target
}
