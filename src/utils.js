
export let _now = Date.now || function () { return new Date().getTime(); };

export function debounce (fn, debounce_duration) {
  var debouncing = null,
      last_hit = _now(),
      runHit = function (_this, _args) {
        fn.apply(_this, _args);
        last_hit = _now();
        debouncing = setTimeout(function () {
          debouncing = null;
        }, debounce_duration);
      };

  debounce_duration = debounce_duration || 80;

  return function () {
    var _this = this, _args = arguments;

    if( !debouncing || _now() - last_hit > debounce_duration ) {
      runHit(_this, _args);
    } else {
      clearTimeout(debouncing);
      debouncing = setTimeout(function () {
        runHit(_this, _args);
      }, debounce_duration);
    }
  };
}

var arrayShift = [].shift,
    isArray = function (o) {
      return o instanceof Array;
    },
    isObject = function (o) {
      return typeof o === 'object' && o !== null;
    };

export function _merge () {
  var dest = arrayShift.call(arguments),
      src = arrayShift.call(arguments),
      key;

  while( src ) {

    if( typeof dest !== typeof src ) {
        dest = isArray(src) ? [] : ( isObject(src) ? {} : src );
    }

    if( isObject(src) ) {

      for( key in src ) {
        if( src[key] === undefined ) {
          dest[key] = undefined;
        } else if( isArray(dest[key]) ) {
          [].push.apply(dest[key], src[key]);
        } else if( isObject(dest[key]) ) {
          dest[key] = _merge(dest[key], src[key]);
        } else {
          dest[key] = src[key];
        }
      }
    }
    src = arrayShift.call(arguments);
  }

  return dest;
}

export function _remove (list, iteratee, this_arg) {
  for( var i = list.length - 1 ; i >= 0 ; i-- ) {
    if( iteratee.call( this_arg, list[i], i ) ) list.splice(i, 1);
  }
}

export function _removeItem (list, item) {
  for( var i = list.length - 1 ; i >= 0 ; i-- ) {
    if( list[i] === item ) list.splice(i, 1);
  }
}

export function eventMethods (target) {
  var listeners = {}, listeners_once = {};

  target = target || {};

  target.on = function (event_name, listener) {
    listeners[event_name] = listeners[event_name] || [];
    listeners[event_name].push(listener);
    return target;
  };

  target.once = function (event_name, listener) {
    listeners_once[event_name] = listeners_once[event_name] || [];
    listeners_once[event_name].push(listener);
    return target;
  };

  target.off = function (event_name, listener) {
    if( listeners[event_name] ) _removeItem(listeners[event_name], listener);
    return target;
  };

  target.emit = function (event_name, args, this_arg) {
    if( listeners[event_name] ) {
      listeners[event_name].forEach(function (listener) {
        listener.apply(this_arg, args);
      });
    }

    if( listeners_once[event_name] ) {
      listeners_once[event_name].splice(0).forEach(function (listener) {
        listener.apply(this_arg, args);
      });
    }
    return target;
  };

  return target;
}
