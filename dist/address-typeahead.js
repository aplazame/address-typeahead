'use strict';

var _now = Date.now || function __dateNowPolyfill () { return new Date().getTime() };

function debounce (fn, debounce_duration) {
  var debouncing = null,
      last_hit = _now();

  function runHit (_this, _args) {
    fn.apply(_this, _args);
    last_hit = _now();
    debouncing = setTimeout(function __cancelRunHitDebounce () {
      debouncing = null;
    }, debounce_duration);
  }

  debounce_duration = debounce_duration || 400;

  return function _curryDebounce () {
    var _this = this, _args = arguments;

    if( !debouncing || (_now() - last_hit) > debounce_duration ) {
      runHit(_this, _args);
    } else {
      clearTimeout(debouncing);
      debouncing = setTimeout(function _debouncedRunHit () {
        runHit(_this, _args);
      }, debounce_duration);
    }
  }
}

var arrayShift = [].shift;

function isArray (o) {
  return o instanceof Array
}

function isObject (o) {
  return typeof o === 'object' && o !== null
}

function _runListeners (args, this_arg) {
  return function __runListeners (listener) {
    listener.apply(this_arg, args);
  }
}

function _runDelayed (delay_time, fn) {
  return function __runDelayed () {
    setTimeout(fn, delay_time);
  }
}

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

  return dest
}





function _removeItem (list, item) {
  for( var i = list.length - 1 ; i >= 0 ; i-- ) {
    if( list[i] === item ) list.splice(i, 1);
  }
}

function eventMethods (target) {
  var listeners = {}, listeners_once = {};

  target = target || {};

  function _on (event_name, listener) {
    listeners[event_name] = listeners[event_name] || [];
    listeners[event_name].push(listener);
    return target
  }

  function _once (event_name, listener) {
    listeners_once[event_name] = listeners_once[event_name] || [];
    listeners_once[event_name].push(listener);
    return target
  }

  function _off (event_name, listener) {
    if( listeners[event_name] ) _removeItem(listeners[event_name], listener);
    return target
  }

  function _emit (event_name, args, this_arg) {
    var listenersRunner = _runListeners(args, this_arg);

    if( listeners[event_name] ) {
      listeners[event_name].forEach(listenersRunner);
    }

    if( listeners_once[event_name] ) {
      listeners_once[event_name].splice(0).forEach(listenersRunner);
    }
    return target
  }

  target.on = _on;
  target.once = _once;
  target.off = _off;
  target.emit = _emit;

  return target
}

var arrayShift$1 = Array.prototype.shift;

function __extractProps (tag, props) {
  return (tag || '')
    .replace(/#([^\s.]+)/, function __extractId (_matched, id) { props.id = id; return '' })
    .replace(/\.([^\s.]+)/g, function __extractClasses (_matched, class_name) {
      props.className = (props.className ? ( props.className + ' ' + class_name ) : class_name );
      return ''
    })
}

function __create (tag, attrs, props, children) {
  var el = document.createElement(tag || 'div'), key;

  if( attrs ) for( key in attrs ) el.setAttribute(key, attrs[key]);
  for( key in props ) el[key] = props[key];

  if( children ) children.forEach(function __createAppendChild (_child) { el.appendChild(_child); });

  return el
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

  return __create(tag, attrs, props, children)
}

var classListEnabled = 'classList' in document.documentElement;








var _toggleClass = classListEnabled ? (function __classListToggleClass () {
  var aux = document.createElement('span');
  aux.classList.toggle('test', true);
  aux.classList.toggle('test', true);

  // IE does not support second parameter toggle
  return aux.classList.contains('test') ? function __classListToggleClassNative (el, className, toggle) {
   el.classList.toggle(className, toggle);
  } : function __classListToggleClassNativePolyfill (el, className, toggle) {
   toggle = toggle === undefined ? !el.classList.contains(className) : toggle;
   if( toggle ) el.classList.add(className);
   else el.classList.remove(className);
  }
})() : function __polyfillToggleClass (el, className) {
  el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ');
};

// event functions

function _on (el, event_name, listener, use_capture) {
  return el.addEventListener(event_name, listener, use_capture)
}

function _off (el, event_name, listener, use_capture) {
  return el.removeEventListener(event_name, listener, use_capture)
}

function GooglePlaceTypeahead (options) {
  this.options = options || {};

  this.loading_listeners = [];

  this.addresses_cache = {};
  this.predictions_cache = {};
}

var callback_num = 0;

GooglePlaceTypeahead.prototype.load = function __protoGooglePlaceTypeaheadLoad (cb) {
  var self = this;

  if( self.loaded ) return cb(self)
  if( self.loading ) {
    self.loading_listeners.push(cb);
    return
  }

  var script = window.document.createElement('script'),
      callback_name = '__googleAPICallback__' + (++callback_num);

  self.loading = true;

  window[callback_name] = function __googleJSCallback () {
    self.places = window.google.maps.places;
    self.predictions_OK = window.google.maps.places.PlacesServiceStatus.OK;

    self.session_token = new self.places.AutocompleteSessionToken();

    self.service = {
      autocomplete: new self.places.AutocompleteService(),
      place: new self.places.PlacesService(document.createElement('div')),
    };

    delete self.loading;
    self.loaded = true;

    self.loading_listeners.splice(0).forEach(function __googleJSCallbackRunListeners (cb) { cb(self); });
  };

  script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
      this.options.app_key + '&libraries=places&callback=' + callback_name;

  window.document.head.appendChild(script);

  return this
};

GooglePlaceTypeahead.prototype.getPredictions = function __protoGooglePlaceTypeaheadGetPredictions (input_text, onSuccess, onError) {
  if( typeof input_text === 'string' ) input_text = input_text.trim();

  if( !input_text ) {
    if( onSuccess instanceof Function ) onSuccess([]);
    return
  }

  var self = this;
  var predictions_cache = self.predictions_cache;

  if( predictions_cache[input_text] ) {
    onSuccess(predictions_cache[input_text]);
    return self
  }

  // var self = this;

  self.load(function __loadPredictions () {
    self.service.autocomplete.getPlacePredictions( _merge({}, self.options, {
      input: input_text,
      sessionToken: self.options.session_token || self.session_token,
    }), function __loadPredictionsCallback (predictions, status) {
      if( status != self.predictions_OK ) {
        if( onError instanceof Function ) onError(status);
        return
      }

      predictions_cache[input_text] = predictions;
      if( onSuccess instanceof Function ) onSuccess(predictions);
    });
  });

  return self

};

GooglePlaceTypeahead.prototype.getPredictionHTML = function __protoGooglePlaceTypeaheadGetPredictionHTML (prediction) {
  var cursor = 0, src = prediction.description, result = '', from, len;

  if( !prediction.matched_substrings ) return prediction.formatted_address

  // if( prediction.custom ) return address2Search(prediction.address, prediction.address.street_number);

  for( var i = 0, n = prediction.matched_substrings.length; i < n ; i++ ) {
    from = prediction.matched_substrings[i].offset;
    len = prediction.matched_substrings[i].length;
    result += src.substr(cursor, from - cursor).replace(/^ | $/g, '&nbsp;');
    result += '<strong>' + src.substr(from, len).replace(/^ | $/g, '&nbsp;') + '</strong>';
    cursor = from + len;
  }

  result += src.substr(cursor);

  return result
};

function _parsePlace (place, prediction) {
  var fields = {};

  place.address_components.forEach(function __cacheField (component) {
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
      coordinates: [
        place.geometry.location.lng instanceof Function ? place.geometry.location.lng() : place.geometry.location.lng,
        place.geometry.location.lat instanceof Function ? place.geometry.location.lat() : place.geometry.location.lat
      ],
    };
  }

  return address
}

// docs: https://developers.google.com/maps/documentation/javascript/places#place_details_requests
var _place_fields = 'address_component, adr_address, alt_id, formatted_address, geometry, icon, id, name, permanently_closed, photo, place_id, plus_code, scope, type, url, utc_offset, vicinity'.split(/ *, */);

GooglePlaceTypeahead.prototype.getAddress = function __protoGooglePlaceTypeaheadGetAddress (prediction, onSuccess, onError) {
  var self = this,
      addresses_cache = self.addresses_cache;

  if( !prediction || !prediction.place_id ) throw new TypeError('prediction is not a valid prediction')

  if( addresses_cache[prediction.place_id] ) return onSuccess(addresses_cache[prediction.place_id])
  // var params = typeof place_id === 'string' ? { placeId: place_id } : ( place_id.place_id ? {placeId: place_id.place_id} : place_id );
  // console.log('getAddress', prediction)
  self.service.place.getDetails({
    placeId: prediction.place_id,
    fields: self.options.place_fields || _place_fields,
  }, function __getDetailsCallback (place, result) {
    if( result === 'OK' ) {
      addresses_cache[prediction.place_id] = _parsePlace(place, prediction);
      if( onSuccess instanceof Function ) onSuccess( addresses_cache[prediction.place_id] );
    } else {
      if( onError instanceof Function ) onError(result);
    }
  });
};

GooglePlaceTypeahead.prototype.license_img = 'https://developers.google.com/places/documentation/images/powered-by-google-on-white.png?hl=es-419';

function _commaIf (text) {
  if( !text ) return ''
  if( typeof text === 'string' ) text = text.trim();
  return ', ' + text
}

function _address2Search (address, number_placeholder, show_area_name) {
  if( !address ) return ''
  var area_name = address.sublocality || address.locality || address.city;
  return address.street + ( _commaIf(address.street_number) || (number_placeholder ? ', ' : '') ) + _commaIf(show_area_name !== false && area_name !== address.street && area_name)
}

function _formattedAddress (address, number_placeholder, show_region, show_country) {
  if( !address ) return ''
  return address.street + _commaIf(address.street_number || (number_placeholder ? ' ' : '')) + _commaIf( address.postcode + ' ' + address.locality ) + _commaIf( address.province !== address.locality && address.province ) + _commaIf( show_region && address.region ) + _commaIf( show_country && address.country )
}

function _numberTyped (input_value) {
  var matches = input_value && input_value.match(/.*?, *(\d+) *(,.*?)?$|^.*? \d+/);
  return matches ? matches[1] : null
}

function _cursorToNumberPosition (input_el, address) {
  setTimeout(function __cursorToNumberAtempt1 () {
    input_el.setSelectionRange(address.street.length + 2, address.street.length + 2);
  }, 10);
  setTimeout(function __cursorToNumberAtempt2 () {
    input_el.setSelectionRange(address.street.length + 2, address.street.length + 2);
  }, 100);
}

var _push = Array.prototype.push;

function TypeaheadPredictions (TA, options) {
  var _predictions = this;

  var list_el = _create('.-predictions-list');
  // var predictions_list_custom_el = _create('.-predictions-list._custom-list')
  var predictions_footer_el = _create('.-predictions-footer');
  // var wrapper_el = _create('.apz-address-typeahead-predictions', [list_el, predictions_list_custom_el])
  var wrapper_el = _create(options.wrapper_selector || '.apz-typeahead_predictions', [list_el]);

  // predictions properties
  eventMethods(_predictions);
  _predictions.TA = TA;
  _predictions.options = options;

  _predictions.wrapper_el = wrapper_el;
  _predictions.list_el = list_el;

  _predictions.custom_predictions = [];

  // init

  function _onDocumentClick (e) {
    var el = e.target;
    if( _predictions.showing_custom || TA.focus_root.activeElement === TA.input_el ) return

    while( el && el !== document.body ) {
      if( el === wrapper_el || el === TA.input_el ) return
      el = el.parentElement;
    }
    _predictions.hide();
  }

  _predictions._onDocumentClick = _onDocumentClick;

  _predictions.hide();

  var predictions_parent = options.predictions_parent ?
  ( typeof options.predictions_parent === 'string' ?
    TA.focus_root.querySelector(options.predictions_parent) :
    options.predictions_parent
  ) : TA.input_el.parentElement;

  predictions_parent.appendChild(wrapper_el);

  if( options.custom_address ) (function __initCustomAddressButton () {
    var button_custom_address_el = _create('button.-custom-address', { type: 'button' }, { textContent: options.custom_address.label });
    _on(button_custom_address_el, 'click', function __initCustomAddressButtonClick () {
        _predictions.showing_custom = true;
        options.custom_address.getter(function _resolveCustomAddress (custom_address) {
          _predictions.showing_custom = false;
          custom_address.place = 'custom';
          custom_address.formatted_address = _formattedAddress(custom_address);
          custom_address.url = 'https://maps.google.com/?q=' + encodeURIComponent( custom_address.formatted_address );

          _predictions.setPredictions([], custom_address);

          _predictions.render();
          _predictions.select(custom_address);
          _predictions.emit('custom_address', [custom_address]);
        }, function _cancelCustomAddress () {
          _predictions.showing_custom = false;
          _predictions.emit('cancel-custom_address');
        });
    });

    predictions_footer_el.appendChild(button_custom_address_el);
    
    if( TA.provider.license_img ) {
      predictions_footer_el.appendChild(
        _create('.-license', [
          _create('img', { src: TA.provider.license_img })
        ])
      );
    }

  })();

  if( options.custom_address || options.license_img ) wrapper_el.appendChild(predictions_footer_el);
}

TypeaheadPredictions.prototype.show = function __protoTypeaheadPredictionsShow (refresh_render) {
  this.wrapper_el.style.display = '';
  this.is_hidden = false;
  
  if( refresh_render !== false ) this.render();
  
  _on(document, 'click', this._onDocumentClick, true);
};
TypeaheadPredictions.prototype.hide = function __protoTypeaheadPredictionsHide () {
  this.wrapper_el.style.display = 'none';
  this.is_hidden = true;

  _off(document, 'click', this._onDocumentClick, true);
};

TypeaheadPredictions.prototype.hasFocus = function __protoTypeaheadPredictionsHasFocus () {
  var active_element = this.TA.focus_root.activeElement;
  
  return active_element === this.wrapper_el || this.wrapper_el.contains(active_element)
};

TypeaheadPredictions.prototype.select = function __protoTypeaheadPredictionsSelect (prediction) {
  // console.warn('TypeaheadPredictions.prototype.select', prediction)
  var children = this.list_el.children ||[];

  this.selected = prediction;

  for( var i = 0, n = children.length ; i < n ; i++ ) {
    _toggleClass(children[i], '_is-selected', children[i].prediction === prediction );
  }

  this.emit('selected', [prediction]);
};

// function _matchSelected (selected_prediction) {
//   return function _matchSelectedPrediction (prediction) {
//     return prediction === selected_prediction
//   }
// }

function _selectDelta (loaded_predictions, delta) {
  var selected_index = loaded_predictions.indexOf(this.selected);

  if( selected_index >= 0 && loaded_predictions[selected_index + delta] ) {
    this.select(loaded_predictions[selected_index  + delta]);
  }
}

TypeaheadPredictions.prototype.selectPrevious = function __protoTypeaheadPredictionsSelectPrevious () {
  if( !this.loaded_predictions ) return

  _selectDelta.call(this, this.loaded_predictions, -1);
};

TypeaheadPredictions.prototype.selectNext = function __protoTypeaheadPredictionsSelectNext () {
  if( !this.loaded_predictions ) return

  _selectDelta.call(this, this.loaded_predictions, 1);
};

TypeaheadPredictions.prototype.setPredictions = function __protoTypeaheadPredictionsSetPredictions (predictions_data, custom_address) {
  var _predictions = this;

  if( predictions_data ) predictions_data = predictions_data.slice();
  predictions_data = predictions_data || _predictions.predictions_data ||[];

  var loaded_predictions = predictions_data.slice();

  if( !_predictions.options.keep_custom ) {
    if( custom_address ) loaded_predictions.push(custom_address);
  } else if( _predictions.custom_predictions.length ) {
    if( custom_address ) _predictions.custom_predictions.push(custom_address);
    _push.apply(loaded_predictions, _predictions.custom_predictions);
  }

  _predictions.predictions_data = predictions_data;
  _predictions.loaded_predictions = loaded_predictions;

  if( _predictions.selected && loaded_predictions.indexOf(_predictions.selected) < 0 ) {
    _predictions.select(null);
  }
};

TypeaheadPredictions.prototype.clear = function __protoTypeaheadPredictionsClear (flush_custom) {
  if( flush_custom ) this.custom_predictions.splice(0);
  this.render([]);
};

TypeaheadPredictions.prototype.addCustomPrediction = function __protoTypeaheadPredictionsAddCustomPrediction (custom_address) {
  this.custom_predictions.push(custom_address);
  this.setPredictions();
};

TypeaheadPredictions.prototype.render = function __protoTypeaheadPredictionsRender (predictions_data) {
  var _predictions = this;

  if( predictions_data ) _predictions.setPredictions(predictions_data);
  var predictions_to_render = _predictions.loaded_predictions || [];

  var list_el = this.list_el,
      wrapper_el = this.wrapper_el;

  var i, n, tmp_prediction_el, children = list_el.children;

  _toggleClass(wrapper_el, '_has-predictions', _predictions.predictions_data && _predictions.predictions_data.length);
  _toggleClass(wrapper_el, '_has-custom_predictions', _predictions.custom_predictions.length);

  function __onClickPrediction () {
    _predictions.select(this.prediction);
  }

  // wrapper.style.display = null;

  if( predictions_to_render.length > children.length ) {
    for( i = 0, n = predictions_to_render.length - children.length ; i < n ; i++ ) {
      tmp_prediction_el = _create('.-prediction', { tabindex: '0' });
      list_el.appendChild( tmp_prediction_el );
      _on(tmp_prediction_el, 'click', __onClickPrediction);
    }
  }

  for( i = 0, n = predictions_to_render.length; i < n ; i++ ) {
    children[i].innerHTML = _predictions.TA.provider.getPredictionHTML(predictions_to_render[i]) || _address2Search(predictions_to_render[i]);
    children[i].prediction = predictions_to_render[i];
    // children[i].setAttribute('data-predition', predictions_to_render[i].id )
    _toggleClass(children[i], '_is-custom', predictions_to_render[i].place === 'custom' );
    _toggleClass(children[i], '_is-selected', predictions_to_render[i] === _predictions.selected );
  }
  // selectPrediction(selectedCursor);

  if( predictions_to_render.length < children.length ) {
    while( children[predictions_to_render.length] ) {
      list_el.removeChild(children[predictions_to_render.length]);
    }
  }
};

var KEY_ENTER = 13;
var KEY_UP = 38;
var KEY_DOWN = 40;

function __trySearches (try_searches, getPredictions, callback) {
  var try_search = try_searches.shift();

  if( !try_search ) return

  getPredictions(try_search, function __trySearchesWithPredictions (predictions_data) {
    if(predictions_data && predictions_data[0]) {
      callback(predictions_data, try_search);
    } else __trySearches(try_searches, getPredictions, callback);
  });
}

function AddressTypeahead (options) {
  options = options || {};
  this.options = options;

  this.focus_root = options.focus_root || document;

  if( options.google ) {
    this.provider = new GooglePlaceTypeahead(options.google).load();
  }
}

AddressTypeahead.prototype.bind = function _protoAddressTypeaheadBind (input_el, options) {
  var self = this,
      // predictions = [],
      selected_address = null,
      number_typed = false,
      input_value_on_selected = null,
      fetching_address = null;

  var component = eventMethods({
    get value () {
      return input_el.value
    },
    set value (_value) {
      input_el.value = _value;
      __onInput();
    },

    get address () {
      return selected_address
    },
    set address (_address) {
      if( !_address || !_address.place ) return
      selected_address = _address;

      if( _address.place === 'custom' ) {
        predictions_ctrl.addCustomPrediction(_address);
        input_el.value = _address2Search(_address);
      } else {
        predictions_ctrl.setPredictions([_address.place]);
        input_el.value = _address2Search(_address, true);
      }
      predictions_ctrl.select(_address.place);
      _emitEvent('change');
    },
  });

  options = options || {};

  var focus_root = self.focus_root,
      place_provider = self.provider;

  if( typeof input_el === 'string' ) input_el = focus_root.querySelector(input_el);

  self.input_el = input_el;

  var predictions_ctrl = new TypeaheadPredictions(self, options);

  // methods  

  function _emitEvent (event_name) {
    component.emit(event_name, [input_el.value, selected_address, number_typed]);
  }

  function _selectAddress (address) {
    selected_address = address;
    // console.log('selected_address', selected_address, input_el.value)
    _emitEvent('change');
  }

  function _fetchAddress (prediction, callback) {
    fetching_address = [];

    place_provider.getAddress(prediction, function __getAddress (address) {
      if( input_el.value !== input_value_on_selected || predictions_ctrl.selected !== prediction ) return
      _selectAddress(address);
      if( callback instanceof Function ) callback(address);
      fetching_address.forEach(_runListeners([address]));
      fetching_address = null;
    });
  }

  var last_input_value = null;

  function __onInput () {
    if( input_el.value === last_input_value ) {
      if( focus_root.activeElement === input_el ) predictions_ctrl.show();
      return
    }
    last_input_value = input_el.value;
    number_typed = _numberTyped(input_el.value);

    if( !input_el.value ) {
      input_value_on_selected = '';
      predictions_ctrl.clear();
      return _selectAddress(null)
    }

    // console.log('__onInput', input_el.value)

    var fetched_input_value = input_el.value;
    place_provider.getPredictions(input_el.value, function __onInputWithPredictions (_predictions_data) {
      // predictions_ctrl.selected(null)
      predictions_ctrl.render(_predictions_data);

      if( !_predictions_data.length || input_el.value !== fetched_input_value ) return

      if( _predictions_data[0] && _predictions_data.indexOf(predictions_ctrl.selected) < 0 ) {
        predictions_ctrl.select(_predictions_data[0]);
      }
      // if( _predictions_data[0] ) _fetchAddress(_predictions_data[0])
    });
  }

  predictions_ctrl.on('selected', function __onPredictionSelected (prediction) {
    if( !prediction ) return _selectAddress(null)
    // if( !prediction ) return

    input_value_on_selected = input_el.value;

    if( prediction.place === 'custom' ) _selectAddress(prediction);
    else _fetchAddress(prediction);
  });

  var _onInput = debounce(__onInput, options.debounce_duration);

  _on(input_el, 'input', _onInput );
  _on(input_el, 'change', _onInput );

  function __onFocus () {
    predictions_ctrl.show();
    if( selected_address && !selected_address.street_number ) {
      input_el.value = _formattedAddress(selected_address, true);
      _cursorToNumberPosition(input_el, selected_address);
    } else if( selected_address ) {
      input_el.value = _address2Search(selected_address, true, false);
    }
    __onInput();
  }

  _on(input_el, 'focus', __onFocus);
  _on(input_el, 'click', __onFocus);

  predictions_ctrl.on('cancel-custom_address', function __onCancelCustomAddress () {
    input_el.focus();
  });

  _on(input_el, 'click', function __onInputClick () {
    predictions_ctrl.show();
  });

  input_el.addEventListener('keydown', function __onInputKeyDown (e) {
    if( e.keyCode !== KEY_ENTER ) predictions_ctrl.show();

    switch (e.keyCode) {
      case KEY_ENTER:
        if( predictions_ctrl.is_hidden ) return
        e.preventDefault();

        if( selected_address && !selected_address.street_number ) {
          input_el.value = _address2Search(selected_address, true, true);
          _cursorToNumberPosition(input_el, selected_address);
          __onInput();
        } else {
          if( fetching_address ) fetching_address.push(_renderInputOnBlur);
          else _renderInputOnBlur(selected_address);
          predictions_ctrl.hide();
        }
        break
      case KEY_UP:
        e.preventDefault();
        predictions_ctrl.selectPrevious();
        break
      case KEY_DOWN:
        e.preventDefault();
        predictions_ctrl.selectNext();
        break
    }
  });

  function _renderInputOnBlur (_address) {
    input_el.value = _formattedAddress(_address, true);
  }

  _on(input_el, 'blur', _runDelayed(100, function __onInputBlur () {
    if( fetching_address ) fetching_address.push(_renderInputOnBlur);
    else _renderInputOnBlur(selected_address);

    if( predictions_ctrl.showing_custom || focus_root.activeElement === input_el ) return

    predictions_ctrl.hide();
  }) );

  component.input = input_el;
  component.focus = function __focusComponent () {
    input_el.focus();
    return component
  };

  

  if( input_el.value ) __onInput();
  else if( options.try_searches ) {
    __trySearches(
      options.try_searches,
      place_provider.getPredictions.bind(place_provider),
      function __onTrySearchMatch (predictions_data, try_search) {
        predictions_ctrl.setPredictions(predictions_data);
        predictions_ctrl.select(predictions_data[0]);
        input_el.value = try_search;
      }
    );
  }

  return component
};

module.exports = AddressTypeahead;
