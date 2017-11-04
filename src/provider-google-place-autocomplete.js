
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
      if( status != self.googlePredictionsOK ) {
        if( onError instanceof Function ) onError(status);
        return;
      }
      console.log('getPredictions.then', predictions);

      if( onSuccess instanceof Function ) onSuccess(predictions);
    });
  });

};

GooglePlaceTypeahead.prototype.license_img = 'https://developers.google.com/places/documentation/images/powered-by-google-on-white.png?hl=es-419';

export default GooglePlaceTypeahead;
