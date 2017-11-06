
import GooglePlaceTypeahead from './provider-google-place-autocomplete';
import { _create, addClass, removeClass, toggleClass, _onClick, _onInput, _onFocus, _onBlur } from './utils-dom';
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

export default AddressTypeahead;
