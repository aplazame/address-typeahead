
import GooglePlaceTypeahead from './provider-google-place-autocomplete';
import { _create, toggleClass, _onClick, _onInput, _onFocus, _onBlur } from './utils-dom';
import { eventMethods, _find } from './utils';

function AddressTypeahead (options) {
  this.options = options || {};

  eventMethods(this);

  if( this.options.google ) {
    this.provider = new GooglePlaceTypeahead(this.options.google).load();
  }
}

AddressTypeahead.prototype.bind = function (input_el, options) {
  var self = this,
      predictions = [];

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
  var predictions_footer_el = _create('.-predictions-footer');
  var predictions_wrapper = _create('.apz-address-typeahead-predictions', [predictions_list_el]);
  predictions_wrapper.style.display = 'none';

  // methods

  function _renderPredictions () {
    var i, n, children = predictions_list_el.children;

    // wrapper.style.display = null;

    if( predictions.length > children.length ) {
      for( i = 0, n = predictions.length - children.length ; i < n ; i++ ) {
        predictions_list_el.appendChild( _create('.prediction') );
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
      _prediction.id = prediction;
    });

    if( !prediction ) return;

    place_provider.getAddress(prediction, function (address) {
      console.log('address', address);
    });
  }


  // initialization

  if( options.custom_address ) (function () {
    var button = _create('button.-custom-address', { type: 'button' }, { textContent: options.custom_address.label });
    _onClick(button, function () {
      is_waiting_custom_address = true;
      options.custom_address.getter(function (custom_address) {
        is_waiting_custom_address = false;
        console.log('custom_address', custom_address);
      }, function () {
        is_waiting_custom_address = false;
      });
    });

    predictions_footer_el.appendChild(button);
  })();

  if( place_provider.license_img ) predictions_footer_el.appendChild( _create('img.-license', { src: place_provider.license_img }) );

  predictions_parent.appendChild(predictions_wrapper);
  if( options.custom_address || place_provider.license_img ) predictions_wrapper.appendChild(predictions_footer_el);

  function onInput () {
    console.log(input_el);

    place_provider.getPredictions(input_el.value, function (_predictions) {
      predictions = _predictions;
      console.log('predictions', predictions);
      _renderPredictions();
      _selectPrediction(predictions[0]);
    });
  }
  _onInput(input_el, onInput);

  function onFocus () {
    predictions_wrapper.style.display = '';
  }
  _onFocus(input_el, onFocus);

  function onBlur () {
    if( is_waiting_custom_address ) return;
    predictions_wrapper.style.display = 'none';
  }
  _onBlur(input_el, function () {
    setTimeout(onBlur, 100);
  });

  // onClick(predictions_list_el, function (e) {
  //
  // });

  console.log('Typeahead ready!', self);

  if( input_el.value ) onInput();

  return self;
};

export default AddressTypeahead;
