/* global define */

(function (root, factory) {
  if( typeof module !== 'undefined' && module.exports ) {
    // CommonJS
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else {
    // Browser globals
    root.AddressTypeahead = factory();
  }
}(this, function () {

  var _now = Date.now || function () { return new Date().getTime(); };

  function createElement (nodeName, attrs, content) {
    attrs = attrs || {};

    var node = document.createElement(nodeName);

    for( var key in attrs ) node[key] = attrs[key];

    if( typeof content === 'string' ) node.innerHTML = content;
    else if( content instanceof Array ) content.forEach(function (elem) {
      if( typeof elem === 'string' ) node.appendChild(createElement('div', {}, elem));
      else node.appendChild(elem);
    });

    return node;
  }

  function noop (value) { return value; }

  function safeFn(fn) {
    return typeof fn === 'function' ? fn : noop;
  }

  function extend(dest, src) {
    for( var key in src ) dest[key] = src[key];
    return dest;
  }

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

  function serialize (o, nested) {
    var params = '';

    nested = nested || noop;

    for( var key in o ) {
      params += (params ? '&' : '') + key + '=' + nested(o[key]);
    }

    return params;
  }

  function getIndex (list, el) {
    for( var i = 0, n = list.length; i < n ; i++ ) {
      if( list[i] === el ) return i;
    }
    return -1;
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

  var listen = document.documentElement.addEventListener ? function(element, eventName, listener, useCapture) {
      return element.addEventListener(eventName, listener, useCapture);
    } : function(element, eventName, listener, useCapture) {
      return element.attachEvent('on' + eventName, listener, useCapture);
    };
    // unlisten = document.documentElement.removeEventListener ? function(element, eventName, listener, useCapture) {
    //   return element.removeEventListener(eventName, listener, useCapture);
    // } : function(element, eventName, listener, useCapture) {
    //   return element.detachEvent('on' + eventName, listener, useCapture);
    // };

  var hasClass = document.documentElement.classList ? function (el, className) {
      return el.classList.contains(className);
    } : function (el, className) {
      return new RegExp('\\b' + (className || '') + '\\b','').test(el.className);
    },
    addClass = document.documentElement.classList ? function (el, className) {
      el.classList.add(className);
    } : function (el, className) {
      if( !hasClass(el, className) ) {
        el.className += ' ' + className;
      }
    },
    removeClass = document.documentElement.classList ? function (el, className) {
      el.classList.remove(className);
    } : function (el, className) {
      el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ');
    };

  // --------------------------------------------------------------------------

  var isAndroid = typeof navigator !== 'undefined' && navigator.userAgent.indexOf('Android') !== -1;

  function GooglePlaces (key, config) {
    this.key = key;
    this.config = config || {};
    this.onInit = [];
  }

  function loadGoogle (self) {
    self.$$google = true;
    var timestamp = new Date().getTime();
    window['__googleAPICallback__' + timestamp] = function () {
      delete window['__googleAPICallback__' + timestamp];

      var places = window.google.maps.places,
          div = document.createElement('div'),
          listeners = self.onInit;

      delete self.onInit;

      self.autocompleteService = new places.AutocompleteService();
      self.placesService = new places.PlacesService(div);

      self.googlePredictionsOK = window.google.maps.places.PlacesServiceStatus.OK;

      self.onInit = false;
      listeners.forEach(function (listener) {
        listener(self);
      });
    };

    var script = window.document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?' + serialize({
      key: self.key,
      libraries: 'places',
      callback: '__googleAPICallback__' + timestamp
    });
    window.document.head.appendChild(script);
  }

  GooglePlaces.prototype.init = function (cb) {
    cb = typeof cb === 'function' ? cb : noop;
    if( !this.onInit ) return cb(this);

    this.onInit.push(cb);

    if( !this.$$google ) loadGoogle(this);
  };

  GooglePlaces.prototype.getPredictions = function (input, cb, onError) {

    var self = this;

    self.init(function () {
      self.autocompleteService.getPlacePredictions( extend({
        input: input
      }, self.config ), function (predictions, status) {
        if( status != self.googlePredictionsOK ) {
          safeFn(onError)(status);
          return;
        }

        safeFn(cb)(predictions);
      });
    });

    return self;
  };

  GooglePlaces.prototype.getDetails = function (place_id, cb, onError) {
    var params = typeof place_id === 'string' ? { placeId: place_id } : ( place_id.place_id ? {placeId: place_id.place_id} : place_id );
    this.placesService.getDetails(params, function (place, result) {
      if( result === 'OK' ) safeFn(cb)(place);
      else safeFn(onError)(result);
    });
  };

  GooglePlaces.prototype.licenseHTML = '<img src="https://developers.google.com/places/documentation/images/powered-by-google-on-white.png?hl=es-419"/>';

  GooglePlaces.prototype.getPredictionHTML = function (prediction) {
    var cursor = 0, src = prediction.description, result = '', from, len;

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

  GooglePlaces.parsePlace = function (place, prediction) {
    var fields = {};

    place.address_components.forEach(function (component) {
      fields[ component.types[0] ] = component.long_name;
    });

    var address = {
      street: fields.route || place.name || '',
      street_number: fields.street_number,
      postcode: fields.postal_code || '',
      locality: fields.locality,
      sublocality: fields.sublocality_level_1,
      city: fields.administrative_area_level_2,
      state: fields.administrative_area_level_1
    };

    return {
      address: address,
      fields: fields,
      place: place,
      prediction: prediction,
    };
  };

  // --------------------------------------------------------------------------

  function AddressTypeahead (type, key, config) {
    if( type === 'google' ) {
      this.places = new GooglePlaces(key, config.google);
      this.parsePlace = GooglePlaces.parsePlace;
    }

    this.config = config || {};
    this.messages = extend({
      required: 'Indica tu dirección',
      number_missing: 'Falta el número de la calle',
      number_mismatch: 'El número indicado no existe',
      make_choice: 'No es una dirección válida',
    }, this.config.messages || {});

    if( !this.places ) throw new Error('typeahead `' + type + '` not supported');
  }

  AddressTypeahead.GooglePlaces = GooglePlaces;

  AddressTypeahead.prototype.bind = function (input, wrapperParent) {
    input = typeof input === 'string' ? document.querySelector(input) : input;
    this.input = input;

    var ta = this,
      // google object
        places = this.places,

        listeners = {},

        on = function (eventName, handler) {
          if( typeof handler !== 'function' ) throw new Error('handler should be a function');
          listeners[eventName] = listeners[eventName] || [];
          listeners[eventName].push(handler);
          return autocomplete;
        },

        emit = function (eventName, args) {
          (listeners[eventName] || []).forEach(function (listener) {
            listener.apply(input, args || []);
          });
        },

        autocomplete = {
          on: on,
          emit: emit,
          input: input,
        },

    // DOM nodes
        predictionsWrapper = createElement('div', { className: 'predictions' }),
        wrapper = (function () {
          var wrapper = createElement('div', { className: 'typeahead-predictions' }, [
            predictionsWrapper, createElement('div', { className: 'typeahead-license' }, places.licenseHTML)
          ]);

          ( wrapperParent ? ( typeof wrapperParent === 'string' ? document.querySelector(wrapperParent) : wrapperParent ) : document.body ).appendChild(wrapper);
          return wrapper;
        })(),
        clear_style = /; *Trident\//.test(navigator.userAgent) ? '' : null,
        showWrapper = function () {
          wrapper.style.display = clear_style;
        },
        hideWrapper = function () {
          wrapper.style.display = 'none';
          emit('blur', [addressResult, blurredChoice]);
        },

      // loaded predictions
        predictions = [],
      // saving Google API requests
        predictionsCache = {},

      // cursor (selected) prediction
        selectedCursor = -1,

      // matched address
        addressResult = null,

        // last_input_value = '',

      // renders loaded predictions
        selectPrediction = function (cursor) {

          if( predictionsWrapper && predictionsWrapper.children ) {
            if( selectedCursor >= 0 && predictionsWrapper.children[selectedCursor] ) {
              removeClass(predictionsWrapper.children[selectedCursor], 'selected');
            }
            if( cursor >= 0 && predictionsWrapper.children[cursor] ) {
              addClass(predictionsWrapper.children[cursor], 'selected');
            }
          }

          selectedCursor = cursor >= 0 ? cursor : -1;
        },

        renderPredictions = function (_predictions, beforeRender, afterRender) {
          var i, n, children = predictionsWrapper.children;

          predictions = _predictions;

          safeFn(beforeRender)();

          // wrapper.style.display = null;

          if( predictions.length > children.length ) {
            for( i = 0, n = predictions.length - children.length ; i < n ; i++ ) {
              predictionsWrapper.appendChild( createElement('div', { className: 'prediction' }) );
            }
          }

          for( i = 0, n = predictions.length; i < n ; i++ ) {
            children[i].innerHTML = places.getPredictionHTML(predictions[i]);
          }
          selectPrediction(selectedCursor);

          if( predictions.length < children.length ) {
            while( children[predictions.length] ) {
              predictionsWrapper.removeChild(children[predictions.length]);
            }
          }

          // if( predictions.length ) wrapper.style.display = null;
          // else wrapper.style.display = 'none';

          safeFn(afterRender)();
        },

      // debouncing predictions request for 400ms
        fetchingPredictions = false,
        debouncedPredictions = debounce(function (value, cb) {
          fetchingPredictions = true;
          places.getPredictions(value, function (results) {
            fetchingPredictions = false;
            cb(results);
          }, function () {
            fetchingPredictions = false;
            cb(null);
          });
        }, 400),
        // numDebounced = 0,

      // fetches predictions if any value and not cached
        fetchResults = function (value, beforeRender, afterRender, skipRender) {
          // addressResult = null;
          if( /\d$/.test(value) ) value += ' ';

          if( value ) {
            // var sec = ++numDebounced;
            addClass(wrapper, 'js-typeahead-loading');
            debouncedPredictions(value, function (results) {
              if( results === null ) {
                addressResult = undefined;
                predictions.splice(0, predictions.length);
                updateValidity();
                emit('place', [null]);
                emit('change', [addressResult, blurredChoice]);
                return;
              }

              // if( sec !== numDebounced ) return;
              removeClass(wrapper, 'js-typeahead-loading');
              predictionsCache[value] = results;
              if( !skipRender ) renderPredictions(results, beforeRender, afterRender);
            });
          } else {
            if( !skipRender ) renderPredictions([], beforeRender, afterRender);
          }
        },

        numberTyped = false,
        fetchedValue = '',
        blurredChoice = false,

        updateValidity = function () {
          if( input.getAttribute('required') !== null && (!input.value || !addressResult) ) {
            input.setCustomValidity( ( input.value && addressResult === undefined ) ? ta.messages.make_choice : ta.messages.required );
            hideWrapper();
            emit('change', [addressResult, blurredChoice]);
            return;
          }

          input.setCustomValidity( waitingNumber() ? (numberTyped ? ta.messages.number_mismatch : ta.messages.number_missing) : '');
          emit('change', [addressResult, blurredChoice]);
        },

      // when a place is choosed
        onPlace = function (place, updateInput) {
          addressResult = place && ta.parsePlace(place, predictions[selectedCursor]);

          if( addressResult && updateInput !== false ) {
            input.value = address2Search( addressResult.address, true );

            if( !addressResult.address.street_number ) {
              input.setSelectionRange(addressResult.address.street.length + 2, addressResult.address.street.length + 2);
            }
            updateValidity();
          }

          emit('place', [addressResult]);
          emit('change', [addressResult, blurredChoice]);
        },

      // last fetched value
        lastValue = null;


    function waitingNumber () {
      return addressResult && addressResult.address.street_number === undefined;
    }

    function focusAddressNumber () {
      if( addressResult ) {
        setTimeout(function () {
          if( document.activeElement !== input ) input.focus();
          input.setSelectionRange(addressResult.address.street.length + 2, addressResult.address.street.length + 2);
        }, 0);
      }
    }

    function onInput (_e) {
      var value = input.value, currentAddress = addressResult;

      // last_input_value = value;

      if( !value ) {
        addressResult = null;
        predictions.splice(0, predictions.length);
        blurredChoice = false;
        onPlace(null, false);
        updateValidity();
        return;
      }

      updateValidity();

      fetchedValue = value;
      fetchResults(value, function () {
        if( lastValue === null || value !== lastValue ) {
          selectPrediction(predictions.length ? 0 : -1);
          lastValue = value;
        }

        if( predictions.length ) {
          addressResult = currentAddress;
          places.getDetails(predictions[selectedCursor], function (details) {
            numberTyped = /^.*?, *\d+ *(,.*?)?$|^.*? \d+$/.test(value);
            onPlace(details, false);
            updateValidity();
            // emit('change', [addressResult]);
          });
        } else {
          addressResult = null;
          updateValidity();
          emit('place', [null]);
          emit('change', [addressResult, blurredChoice]);
        }

        if( document.activeElement === input ) showWrapper();
      });
    }

    autocomplete.parse = function () {
      onInput.call(input);
    };

    listen(input, isAndroid ? 'keyup' : 'input', onInput);
    hideWrapper();
    onInput.call(input);
    on('update-validity', updateValidity);

    function onBlur (_e, keepFocus) {
      if( !input.value || !predictions[selectedCursor] || fetchingPredictions ) return;

      if( !keepFocus ) hideWrapper();

      if( addressResult && !fetchingPredictions ) {
        blurredChoice = true;
        var input_value = address2Search( addressResult.address, true );

        if( addressResult.place.name && addressResult.place.name ) fetchResults(addressResult.place.name);
        // fetchResults(last_input_value);
        input.value = input_value;
        updateValidity();
        emit('change', [addressResult, blurredChoice]);
        hideWrapper();
      }

    }

    listen(input, 'blur', onBlur);

    listen(document.body, 'mousedown', function (e) {
      var el = e.target, cursor;

      while( el ) {
        if( hasClass(el, 'prediction') ) {
          cursor = getIndex(predictionsWrapper.children, el);
        } else if( el === predictionsWrapper ) {
          if( cursor >= 0 ) {
            selectPrediction(cursor);
            places.getDetails(predictions[cursor], function (details) {
              onPlace(details);
              if( !waitingNumber() ) input.blur();
              else input.focus();
            });
          }
          break;
        }
        el = el.parentElement;
      }
    }, true);

    function fetchDetails (updateInput, cb) {
      places.getDetails(predictions[selectedCursor], function (place) {
        predictions[selectedCursor].$$details = place;
        onPlace(place, updateInput == true );
        updateValidity();
        if( cb instanceof Function ) cb();
      });
    }

    listen(input, 'keydown', function (e) {
      var children = predictionsWrapper.children,
          cursorLastChild = children.length - 1;

      switch( e.keyCode ) {
        case 38:
          if( !predictionsWrapper.children.length ) return;
          e.preventDefault();
          selectPrediction( selectedCursor >= 0 ? (selectedCursor > 0 ? (selectedCursor - 1) : 0) : cursorLastChild );
          fetchDetails(true);
          break;
        case 40:
          if( !predictionsWrapper.children.length ) return;
          e.preventDefault();
          if( predictions[selectedCursor].$$details ) {
            selectPrediction( selectedCursor >= 0 ? (selectedCursor < cursorLastChild ? (selectedCursor + 1) : selectedCursor) : 0 );
          }
          fetchDetails(true);
          break;
        case 9:
          onBlur(null);
          break;
        case 13:
          if( !input.value || !predictions.length ) return;

          onBlur(null);

          if( !input.validationMessage ) {
            if( wrapper.style.display !== 'none' ) {
              e.preventDefault();
              hideWrapper();
            }
            return;
          }
          break;
      }
    });

    listen(input, 'keyup', function (e) {

      switch( e.keyCode ) {
        case 13:
          if( !input.value || !predictions.length ) return;

          if( waitingNumber() ) {
            setTimeout(function () {
              input.setSelectionRange(addressResult.address.street.length + 2, addressResult.address.street.length + 2);
            }, 100);
          }

          break;
      }
    });

    listen(input, 'focus', function () {
      if( waitingNumber() ) {
        if( input.value === address2Search( addressResult.address, true ) ) focusAddressNumber();
        showWrapper();
        if( input.value !== fetchedValue ) onInput.call(input);
      } else if( predictions && predictions.length ) {
        if( addressResult ) input.value = addressResult.place.name + ' ';
        setTimeout(function () {
          input.setSelectionRange(input.value.length, input.value.length);
        }, 0);
        showWrapper();
      } else if( input.value ) {
        onInput.call(input);
      }
    });

    listen(input, 'click', function () {
      if( waitingNumber() ) focusAddressNumber();
      else if( wrapper.style.display === clear_style && addressResult ) input.value = addressResult.place.name;
      if( input.value ) showWrapper();
    });

    return autocomplete;
  };

  AddressTypeahead.prototype.unbind = function () { return this; };

  return AddressTypeahead;

}));
