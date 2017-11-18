
import GooglePlaceTypeahead from './provider-google-place-autocomplete';
import { _create, addClass, removeClass, toggleClass, _onClick, _offClick, _onInput, _onFocus, _onBlur } from './utils-dom';
import { debounce, eventMethods, _find } from './utils';

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

  if( this.options.google ) {
    this.provider = new GooglePlaceTypeahead(this.options.google).load();
  }
}

AddressTypeahead.prototype.bind = function (input_el, options) {
  var self = this,
      component = eventMethods({}),
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
      is_waiting_custom_address = false,
      clicked_predictions = false;

  var predictions_list_el = _create('.-predictions-list');
  var predictions_list_custom_el = _create('.-predictions-list._custom-list');
  var predictions_footer_el = _create('.-predictions-footer');
  var predictions_wrapper = _create('.apz-address-typeahead-predictions', [predictions_list_el, predictions_list_custom_el]);
  predictions_wrapper.style.display = 'none';

  // methods

  function _numberTyped () {
    var matches = input_el.value && input_el.value.match(/.*?, *(\d+) *(,.*?)?$|^.*? \d+/);
    return matches ? matches[1] : null;
  }

  function emitOnChange () {
    component.emit('change', [input_el.value, selected.address, _numberTyped() ]);
  }

  function emitOnBlur () {
    component.emit('blur', [input_el.value, selected.address, _numberTyped() ]);
  }

  function _hidePredictions () {
    if( is_waiting_custom_address ) return;
    if( selected.address && !selected.address.street_number && !_numberTyped() ) {
      _renderPredictions([]);
      input_el.value = address2Search(selected.address, true);
    }
    predictions_wrapper.style.display = 'none';
    emitOnBlur();
    _offClick(document, onDocumentClick, true);
  }

  function _predictionsAreHidden () {
    return predictions_wrapper.style.display === 'none';
  }

  function onDocumentClick (e) {
    var el = e.target;
    if( document.activeElement === input_el ) return;

    while( el && el !== document.body ) {
      if( el === predictions_wrapper || el === input_el ) return;
      el = el.parentElement;
    }
    _hidePredictions();
    clicked_predictions = false;
  }

  function _createPredictionEl () {
    var el = _create('.-prediction');
    _onClick(el, function () {
      _selectPrediction(this.getAttribute('data-predition'), function () {
        var number_typed = _numberTyped();
        if( !selected.address || !selected.address.street_number) {
          if( document.activeElement !== input_el ) input_el.focus();
          emitOnChange();
          return;
        }
        if( number_typed && Number(number_typed) !== Number(selected.address.street_number) ) {
          if( document.activeElement !== input_el ) input_el.focus();
          emitOnChange();
          return;
        }
        _hidePredictions();
      });
    });
    return el;
  }

  function _createCustomAddressEl (custom_address, select_this_address) {
    var el = _create('.-prediction._custom'),
        selectThisAddress = function () {
          _unselectPredictions();
          _renderPredictions([]);
          addClass(el, '_selected');
          selected.address = custom_address;
          input_el.value = address2Search(custom_address);
          _hidePredictions();
        };
    el.innerHTML = address2Search(custom_address);
    _onClick(el, selectThisAddress);
    if(select_this_address) selectThisAddress();
    return el;
  }

  function _renderPredictions (_predictions) {
    var i, n, children = predictions_list_el.children;

    if( _predictions ) predictions = _predictions;

    toggleClass(predictions_wrapper, '_has_predictions', predictions.length);

    // wrapper.style.display = null;

    if( predictions.length > children.length ) {
      for( i = 0, n = predictions.length - children.length ; i < n ; i++ ) {
        predictions_list_el.appendChild( _createPredictionEl() );
      }
    }

    for( i = 0, n = predictions.length; i < n ; i++ ) {
      children[i].innerHTML = place_provider.getPredictionHTML(predictions[i]) || address2Search(predictions[i]);
      children[i].setAttribute('data-predition', predictions[i].id );
      toggleClass(children[i], '_custom', predictions[i].place === 'custom' );
    }
    // selectPrediction(selectedCursor);

    if( predictions.length < children.length ) {
      while( children[predictions.length] ) {
        predictions_list_el.removeChild(children[predictions.length]);
      }
    }
  }

  function _selectPrediction (prediction, then) {
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

    if( then === false ) {
      emitOnChange();
      return;
    }
    place_provider.getAddress(prediction, function (address) {
      if( prediction === selected.prediction ) {
        selected.address = address;
        if( document.activeElement !== input_el && selected.address && !selected.address.street_number && !_numberTyped() ) {
          input_el.value = address2Search(address, true);
        }
        // if( document.activeElement !== input_el ) {
        //   input_el.value = address2Search(address, true);
        // }
        if( then instanceof Function ) then();
        // component.emit('address', [address]);
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
  }


  // initialization

  if( options.custom_address ) (function () {
    var button = _create('button.-custom-address', { type: 'button' }, { textContent: options.custom_address.label });
    _onClick(button, function () {
      is_waiting_custom_address = true;
      options.custom_address.getter(function (custom_address) {
        is_waiting_custom_address = false;
        custom_address.place = 'custom';
        custom_address.formatted_address = formattedAddress(custom_address);
        custom_address.url = 'https://maps.google.com/?q=' + encodeURIComponent( custom_address.formatted_address );
        addClass(predictions_list_custom_el, '_has_addresses');
        predictions_list_custom_el.appendChild( _createCustomAddressEl(custom_address, true) );

        _renderPredictions([]);
        input_el.value = address2Search(custom_address);
        emitOnChange();
        _hidePredictions();
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
    delete selected.address;

    if( !input_el.value ) {
      _renderPredictions([]);
      _unselectPredictions();
      emitOnChange();
      return;
    }

    place_provider.getPredictions(input_el.value, function (_predictions) {
      _renderPredictions(_predictions);
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

  _onClick(document, onDocumentClick, true);

  input_el.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case 13:
        if( _predictionsAreHidden() ) return;
        if( selected.address && selected.address.street_number && ( !_numberTyped() || Number(_numberTyped()) === Number(selected.address.street_number) ) ) {
          e.preventDefault();
          _hidePredictions();
        } else emitOnBlur();
        break;
      case 38:
        e.preventDefault();
        if( selected.prediction && predictions ) {
          _selectPrediction( predictions[predictions.indexOf(selected.prediction) - 1] );
        }
        break;
      case 40:
        e.preventDefault();
        if( selected.prediction && predictions ) {
          _selectPrediction( predictions[predictions.indexOf(selected.prediction) + 1] );
        }
        break;
    }
  });

  predictions_wrapper.addEventListener('mousedown', function (_e) {
    clicked_predictions = false;
  });

  _onBlur(input_el, function () {
    setTimeout(function () {
      if( document.activeElement === input_el ) return;
      if( clicked_predictions ) clicked_predictions = false;
      else _hidePredictions();
    }, 100);
  });

  component.input = input_el;
  component.focus = function () {
    input_el.focus();
    return component;
  };

  Object.defineProperty(component, 'value', {
    get: function () { return input_el.value; },
    set: function (value) {
      input_el.value = value;
      onInput();
    }
  });
  Object.defineProperty(component, 'address', {
    get: function () { return selected.address; },
    set: function (address) {
      if( !address || !address.place ) return;
      if( address.place === 'custom' ) {
        addClass(predictions_list_custom_el, '_has_addresses');
        predictions_list_custom_el.appendChild( _createCustomAddressEl(address, true) );
        _renderPredictions([]);
        input_el.value = address2Search(address);
      } else {
        input_el.value = address2Search(address, true);
        _renderPredictions([address.place]);
        _selectPrediction(address.place, false);
      }
      selected.address = address;
      emitOnChange();
      if( document.activeElement !== input_el ) _hidePredictions();
    }
  });

  if( input_el.value ) onInput();

  var try_searches = options.try_searches || [];

  function trySearches () {
    var try_search = try_searches.shift();

    if( !try_search ) {
      predictions = [];
      return;
    }

    place_provider.getPredictions(try_search, function (_predictions) {
      if(_predictions && _predictions[0]) {
        _renderPredictions(_predictions);
        _selectPrediction(_predictions[0]);
        input_el.value = try_search;
      } else trySearches();
    });
  }

  trySearches();

  return component;
};

export default AddressTypeahead;
