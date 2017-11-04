
import GooglePlaceTypeahead from './provider-google-place-autocomplete';
import { _create, onClick, onInput } from './utils-dom';
import { eventMethods } from './utils';

function AddressTypeahead (options) {
  this.options = options || {};

  eventMethods(this);

  if( this.options.google ) {
    this.provider = new GooglePlaceTypeahead(this.options.google).load();
  }
}

AddressTypeahead.prototype.bind = function (input_el, options) {
  var self = this;

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
  var predictions_footer_el = _create('.-predictions-list');
  var predictions_wrapper = _create('.apz-address-typeahead-predictions', [predictions_list_el]);
  predictions_wrapper.style.display = 'none';

  if( options.custom_address ) (function () {
    var button = _create('button.-custom-address', { type: 'button' }, { textContent: options.custom_address.label });
    onClick(button, function () {
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

  onInput(input_el, function () {
    console.log(input_el);

    place_provider.getPredictions(input_el.value, function (predictions) {
      console.log('predictions', predictions);
    });
  });

  console.log('Typeahead ready!', self);

  return self;
};

export default AddressTypeahead;
