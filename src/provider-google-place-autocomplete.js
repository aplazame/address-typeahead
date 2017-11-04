
import {_merge} from './utils';

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

    console.log('Google loaded!', self);
  };

  script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
      this.options.app_key + '&libraries=places&callback=' + callback_name;

  window.document.head.appendChild(script);

  return this;
};

GooglePlaceTypeahead.prototype.getPredictions = function (input_text, onSuccess, onError) {

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

GooglePlaceTypeahead.prototype.license_img = 'https://developers.google.com/places/documentation/images/powered-by-google-on-white.png?hl=es-419';

export default GooglePlaceTypeahead;
