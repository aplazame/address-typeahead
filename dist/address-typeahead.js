'use strict';

var _now = Date.now || function () { return new Date().getTime(); };

function debounce (fn, debounce_duration) {
  var debouncing = null,
      last_hit = _now(),
      runHit = function (_this, _args) {
        fn.apply(_this, _args);
        last_hit = _now();
        debouncing = setTimeout(function () {
          debouncing = null;
        }, debounce_duration);
      };

  debounce_duration = debounce_duration || 400;

  return function () {
    var _this = this, _args = arguments;

    if( !debouncing || (_now() - last_hit) > debounce_duration ) {
      runHit(_this, _args);
    } else {
      clearTimeout(debouncing);
      debouncing = setTimeout(function () {
        runHit(_this, _args);
      }, debounce_duration);
    }
  };
}

var arrayShift = [].shift;
var isArray = function (o) {
      return o instanceof Array;
    };
var isObject = function (o) {
      return typeof o === 'object' && o !== null;
    };

function _merge () {
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

function _find (list, iteratee, this_arg) {
  for( var i = 0, n = list.length ; i < n ; i++ ) {
    if( iteratee.call( this_arg, list[i], i ) ) return list[i];
  }
}



function _removeItem (list, item) {
  for( var i = list.length - 1 ; i >= 0 ; i-- ) {
    if( list[i] === item ) list.splice(i, 1);
  }
}

function eventMethods (target) {
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

function GooglePlaceTypeahead (options) {
  this.options = options;

  this.loading_listeners = [];
}

var callback_num = 0;

GooglePlaceTypeahead.prototype.load = function (cb) {
  var self = this;

  if( self.loaded ) return cb(self);
  if( self.loading ) {
    self.loading_listeners.push(cb);
    return;
  }

  var script = window.document.createElement('script'),
      callback_name = '__googleAPICallback__' + (++callback_num);

  self.loading = true;

  window[callback_name] = function () {
    self.places = window.google.maps.places;
    self.predictions_OK = window.google.maps.places.PlacesServiceStatus.OK;

    self.service = {
      autocomplete: new self.places.AutocompleteService(),
      place: new self.places.PlacesService(document.createElement('div')),
    };

    delete self.loading;
    self.loaded = true;

    self.loading_listeners.splice(0).forEach(function (cb) { cb(self); });
  };

  script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
      this.options.app_key + '&libraries=places&callback=' + callback_name;

  window.document.head.appendChild(script);

  return this;
};

GooglePlaceTypeahead.prototype.getPredictions = function (input_text, onSuccess, onError) {
  if( !input_text ) {
    if( onSuccess instanceof Function ) onSuccess([]);
    return;
  }

  return this.load(function (self) {
    self.service.autocomplete.getPlacePredictions( _merge({}, self.options, {
      input: input_text
    }), function (predictions, status) {
      if( status != self.predictions_OK ) {
        if( onError instanceof Function ) onError(status);
        return;
      }

      if( onSuccess instanceof Function ) onSuccess(predictions);
    });
  });

};

GooglePlaceTypeahead.prototype.getPredictionHTML = function (prediction) {
  var cursor = 0, src = prediction.description, result = '', from, len;

  // if( prediction.custom ) return address2Search(prediction.address, prediction.address.street_number);

  for( var i = 0, n = prediction.matched_substrings.length; i < n ; i++ ) {
    from = prediction.matched_substrings[i].offset;
    len = prediction.matched_substrings[i].length;
    result += src.substr(cursor, from - cursor);
    result += '<strong>' + src.substr(from, len) + '</strong>';
    cursor = from + len;
  }

  result += src.substr(cursor);

  return result;
};

function _parsePlace (place, prediction) {
  var fields = {};

  place.address_components.forEach(function (component) {
    fields[ component.types[0] ] = component.long_name;
  });

  var address = {
    street: fields.route || place.name || '',
    street_number: Number(fields.street_number),
    postcode: fields.postal_code || '',
    locality: fields.locality,
    sublocality: fields.sublocality_level_1,
    province: fields.administrative_area_level_2,
    region: fields.administrative_area_level_1,
    country: fields.country,

    formatted_address: place.formatted_address,
    url: place.url,

    place: place,
    _fields: fields,
    _prediction: prediction,
  };

  if( place.geometry && place.geometry.location ) {
    address.location = {
        type: 'Point',
        coordinates: [place.geometry.location.lon, place.geometry.location.lat],
    };
  }

  return address;
}

GooglePlaceTypeahead.prototype.getAddress = function (prediction, onSuccess, onError) {
  // var params = typeof place_id === 'string' ? { placeId: place_id } : ( place_id.place_id ? {placeId: place_id.place_id} : place_id );
  this.service.place.getDetails(prediction, function (place, result) {
    if( result === 'OK' ) {
      if( onSuccess instanceof Function ) onSuccess(_parsePlace(place));
    } else {
      if( onError instanceof Function ) onError(result);
    }
  });
};

GooglePlaceTypeahead.prototype.license_img = 'https://developers.google.com/places/documentation/images/powered-by-google-on-white.png?hl=es-419';

var arrayShift$1 = Array.prototype.shift;

function __extractProps (tag, props) {
  return (tag || '')
    .replace(/#([^\s.]+)/, function (_matched, id) { props.id = id; return ''; })
    .replace(/\.([^\s.]+)/g, function (_matched, class_name) {
      props.className = (props.className ? ( props.className + ' ' + class_name ) : class_name );
      return '';
    });
}

function __create (tag, attrs, props, children) {
  var el = document.createElement(tag || 'div'), key;

  if( attrs ) for( key in attrs ) el.setAttribute(key, attrs[key]);
  for( key in props ) el[key] = props[key];

  if( children ) children.forEach(function (_child) { el.appendChild(_child); });

  return el;
}

function _create () {
  var tag = arrayShift$1.call(arguments), attrs, props, children;
  if( typeof tag !== 'string' ) {
    attrs = tag; tag = null;
  } else {
    attrs = arrayShift$1.call(arguments);
  }
  if( attrs instanceof Array ) {
    children = attrs; attrs = null;
  } else {
    props = arrayShift$1.call(arguments);
  }
  if( props instanceof Array ) {
    children = props; props = {};
  } else props = props || {};

  tag = __extractProps(tag, props);

  return __create(tag, attrs, props, children);
}

var classListEnabled = 'classList' in document.documentElement;

var hasClass = classListEnabled ? function (el, className) {
  return el.classList.contains(className);
} : function (el, className) {
  return new RegExp('\\b' + (className || '') + '\\b','').test(el.className);
};


var addClass = classListEnabled ? function (el, className) {
  el.classList.add(className);
} : function (el, className) {
  if( !hasClass(el, className) ) el.className += ' ' + className;
};

var removeClass = classListEnabled ? function (el, className) {
  el.classList.remove(className);
} : function (el, className) {
  el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ');
};

var toggleClass = classListEnabled ? (function () {
  var aux = document.createElement('span');
  aux.classList.toggle('test', true);
  aux.classList.toggle('test', true);

  // IE does not support second parameter toggle
  return aux.classList.contains('test') ? function (el, className, toggle) {
   el.classList.toggle(className, toggle);
  } : function (el, className, toggle) {
   toggle = toggle === undefined ? !el.classList.contains(className) : toggle;
   if( toggle ) el.classList.add(className);
   else el.classList.remove(className);
  };
})() : function (el, className) {
  el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ');
};

// event functions

function _onClick (el, listener, use_capture) {
  return el.addEventListener('click', listener, use_capture);
}



function _onInput (el, listener, use_capture) {
  return el.addEventListener('input', listener, use_capture);
}

function _onFocus (el, listener, use_capture) {
  return el.addEventListener('focus', listener, use_capture);
}



function _onBlur (el, listener, use_capture) {
  return el.addEventListener('blur', listener, use_capture);
}

function commaIf (text) {
  if( !text ) return '';
  return ', ' + text;
}

function address2Search (address, numberPlaceholder) {
  if( !address ) return '';
  var areaName = address.sublocality || address.locality || address.city;
  return address.street + ( commaIf(address.street_number) || (numberPlaceholder ? ', ' : '') ) + commaIf(areaName !== address.street && areaName);
}

function formattedAddress (address) {
  if( !address ) return '';
  return address.street + commaIf(address.street_number) + commaIf( address.postcode + ' ' + address.locality ) + commaIf( address.province ) + commaIf( address.region ) + commaIf( address.country );
}

function AddressTypeahead (options) {
  this.options = options || {};

  eventMethods(this);

  if( this.options.google ) {
    this.provider = new GooglePlaceTypeahead(this.options.google).load();
  }
}

AddressTypeahead.prototype.bind = function (input_el, options) {
  var self = this,
      predictions = [],
      selected = {};

  options = options || {};
  if( typeof input_el === 'string' ) input_el = document.querySelector(input_el);

  var predictions_parent = options.predictions_parent ?
    ( typeof options.predictions_parent === 'string' ?
      document.querySelector(options.predictions_parent) :
      options.predictions_parent
    ) : input_el.parentElement;

  var place_provider = self.provider,
      is_waiting_custom_address = false;

  var predictions_list_el = _create('.-predictions-list');
  var predictions_list_custom_el = _create('.-predictions-list._custom-list');
  var predictions_footer_el = _create('.-predictions-footer');
  var predictions_wrapper = _create('.apz-address-typeahead-predictions', [predictions_list_el, predictions_list_custom_el]);
  predictions_wrapper.style.display = 'none';

  // methods

  function emitOnChange () {
    self.emit('change', [input_el.value, selected.address]);
  }

  function _createPredictionEl () {
    var el = _create('.-prediction');
    _onClick(el, function () {
      _selectPrediction(this.getAttribute('data-predition'));
    });
    return el;
  }

  function _createCustomAddressEl (custom_address, select_this_address) {
    var el = _create('.-prediction._custom'),
        selectThisAddress = function () {
          _unselectPredictions();
          addClass(el, '_selected');
          selected.address = custom_address;
          self.emit('address', [custom_address]);
        };
    el.innerHTML = address2Search(custom_address);
    _onClick(el, selectThisAddress);
    if(select_this_address) selectThisAddress();
    return el;
  }

  function _renderPredictions () {
    var i, n, children = predictions_list_el.children;

    // wrapper.style.display = null;

    if( predictions.length > children.length ) {
      for( i = 0, n = predictions.length - children.length ; i < n ; i++ ) {
        predictions_list_el.appendChild( _createPredictionEl() );
      }
    }

    for( i = 0, n = predictions.length; i < n ; i++ ) {
      children[i].innerHTML = place_provider.getPredictionHTML(predictions[i]);
      children[i].setAttribute('data-predition', predictions[i].id );
      toggleClass(children[i], '_custom', predictions[i].custom );
    }
    // selectPrediction(selectedCursor);

    if( predictions.length < children.length ) {
      while( children[predictions.length] ) {
        predictions_list_el.removeChild(children[predictions.length]);
      }
    }
  }

  function _selectPrediction (prediction) {
    if( typeof prediction === 'string' ) prediction = _find(predictions, function (_prediction) {
      return _prediction.id === prediction;
    });

    if( !prediction ) return;

    _unselectPredictions();
    _find(predictions_list_el.children, function (prediction_el) {
      if( prediction_el.getAttribute('data-predition') === prediction.id ) {
        addClass(prediction_el, '_selected');
        return true;
      }
    });

    selected.prediction = prediction;

    place_provider.getAddress(prediction, function (address) {
      if( prediction === selected.prediction ) {
        selected.address = address;
        if( document.activeElement !== input_el ) {
          input_el.value = address2Search(address, true);
        }
        self.emit('address', [address]);
        emitOnChange();
      }
    });
  }

  function _unselectPredictions () {
    var i, n, children = predictions_list_el.children;

    for( i = 0, n = children.length; i < n ; i++ ) {
      removeClass(children[i], '_selected');
    }

    children = predictions_list_custom_el.children;
    for( i = 0, n = children.length; i < n ; i++ ) {
      removeClass(children[i], '_selected');
    }

    delete selected.prediction;
    delete selected.address;
  }


  // initialization

  if( options.custom_address ) (function () {
    var button = _create('button.-custom-address', { type: 'button' }, { textContent: options.custom_address.label });
    _onClick(button, function () {
      is_waiting_custom_address = true;
      options.custom_address.getter(function (custom_address) {
        is_waiting_custom_address = false;
        custom_address.custom = true;
        custom_address.formatted_address = formattedAddress(custom_address);
        custom_address.url = 'https://maps.google.com/?q=' + encodeURIComponent( custom_address.formatted_address );
        addClass(predictions_list_custom_el, '_has_addresses');
        predictions_list_custom_el.appendChild( _createCustomAddressEl(custom_address, true) );

        predictions = [];
        _renderPredictions();
        input_el.value = address2Search(custom_address);
        onBlur();
      }, function () {
        is_waiting_custom_address = false;
        input_el.focus();
      });
    });

    predictions_footer_el.appendChild(button);
  })();

  if( place_provider.license_img ) {
    predictions_footer_el.appendChild(
      _create('.-license', [
        _create('img', { src: place_provider.license_img })
      ])
    );
  }

  predictions_parent.appendChild(predictions_wrapper);
  if( options.custom_address || place_provider.license_img ) predictions_wrapper.appendChild(predictions_footer_el);

  function onInput () {
    if( selected.address && selected.address.custom ) _unselectPredictions();

    if( !input_el.value ) {
      predictions = [];
      _renderPredictions();
      _unselectPredictions();
      emitOnChange();
      return;
    }

    place_provider.getPredictions(input_el.value, function (_predictions) {
      predictions = _predictions;
      _renderPredictions();
      if(predictions[0]) _selectPrediction(predictions[0]);
    });
  }

  _onInput(input_el, debounce(onInput) );

  function _cursorToNumberPosition (address) {
    setTimeout(function () {
      input_el.setSelectionRange(address.street.length + 2, address.street.length + 2);
    }, 10);
    setTimeout(function () {
      input_el.setSelectionRange(address.street.length + 2, address.street.length + 2);
    }, 100);
  }

  function onFocus () {
    predictions_wrapper.style.display = '';
    if( selected.address && !selected.address.street_number ) {
      _cursorToNumberPosition(selected.address);
    }
  }
  _onFocus(input_el, onFocus);
  _onClick(input_el, function () {
    predictions_wrapper.style.display = '';
  });

  function onBlur () {
    if( is_waiting_custom_address ) return;
    if( selected.address ) {
      input_el.value = address2Search(selected.address, true);
    }
    predictions_wrapper.style.display = 'none';
    self.emit('blur', [input_el.value, selected.address]);
  }
  _onBlur(input_el, function () {
    setTimeout(onBlur, 100);
  });

  if( input_el.value ) onInput();

  return self;
};

module.exports = AddressTypeahead;
