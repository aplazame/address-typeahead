
import {_merge} from './utils'

function GooglePlaceTypeahead (options) {
  this.options = options || {}

  this.loading_listeners = []

  this.addresses_cache = {}
  this.predictions_cache = {}
}

var callback_num = 0

GooglePlaceTypeahead.prototype.load = function __protoGooglePlaceTypeaheadLoad (cb) {
  var self = this

  if( self.loaded ) return cb(self)
  if( self.loading ) {
    self.loading_listeners.push(cb)
    return
  }

  var script = window.document.createElement('script'),
      callback_name = '__googleAPICallback__' + (++callback_num)

  self.loading = true

  window[callback_name] = function __googleJSCallback () {
    self.places = window.google.maps.places
    self.predictions_OK = window.google.maps.places.PlacesServiceStatus.OK

    self.session_token = new self.places.AutocompleteSessionToken()

    self.service = {
      autocomplete: new self.places.AutocompleteService(),
      place: new self.places.PlacesService(document.createElement('div')),
    }

    delete self.loading
    self.loaded = true

    self.loading_listeners.splice(0).forEach(function __googleJSCallbackRunListeners (cb) { cb(self) })
  }

  script.src = 'https://maps.googleapis.com/maps/api/js?key=' +
      this.options.app_key + '&libraries=places&callback=' + callback_name

  window.document.head.appendChild(script)

  return this
}

GooglePlaceTypeahead.prototype.getPredictions = function __protoGooglePlaceTypeaheadGetPredictions (input_text, onSuccess, onError) {
  if( typeof input_text === 'string' ) input_text = input_text.trim()

  if( !input_text ) {
    if( onSuccess instanceof Function ) onSuccess([])
    return
  }

  var self = this
  var predictions_cache = self.predictions_cache

  if( predictions_cache[input_text] ) {
    onSuccess(predictions_cache[input_text])
    return self
  }

  // var self = this;

  self.load(function __loadPredictions () {
    self.service.autocomplete.getPlacePredictions( _merge({}, self.options, {
      input: input_text,
      sessionToken: self.options.session_token || self.session_token,
    }), function __loadPredictionsCallback (predictions, status) {
      if( status != self.predictions_OK ) {
        if( onError instanceof Function ) onError(status)
        return
      }

      predictions_cache[input_text] = predictions
      if( onSuccess instanceof Function ) onSuccess(predictions)
    })
  })

  return self

}

GooglePlaceTypeahead.prototype.getPredictionHTML = function __protoGooglePlaceTypeaheadGetPredictionHTML (prediction) {
  var cursor = 0, src = prediction.description, result = '', from, len

  if( !prediction.matched_substrings ) return prediction.formatted_address

  // if( prediction.custom ) return address2Search(prediction.address, prediction.address.street_number);

  for( var i = 0, n = prediction.matched_substrings.length; i < n ; i++ ) {
    from = prediction.matched_substrings[i].offset
    len = prediction.matched_substrings[i].length
    result += src.substr(cursor, from - cursor).replace(/^ | $/g, '&nbsp;')
    result += '<strong>' + src.substr(from, len).replace(/^ | $/g, '&nbsp;') + '</strong>'
    cursor = from + len
  }

  result += src.substr(cursor).replace(/^ | $/g, '&nbsp;')

  return result
}

function _parsePlace (place, prediction) {
  var fields = {}

  place.address_components.forEach(function __cacheField (component) {
    fields[ component.types[0] ] = component.long_name
  })

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
  }

  if( place.geometry && place.geometry.location ) {
    address.location = {
      type: 'Point',
      coordinates: [
        place.geometry.location.lng instanceof Function ? place.geometry.location.lng() : place.geometry.location.lng,
        place.geometry.location.lat instanceof Function ? place.geometry.location.lat() : place.geometry.location.lat
      ],
    }
  }

  return address
}

// docs: https://developers.google.com/maps/documentation/javascript/places#place_details_requests
var _place_fields = 'address_component, adr_address, alt_id, formatted_address, geometry, icon, id, name, permanently_closed, photo, place_id, plus_code, scope, type, url, utc_offset, vicinity'.split(/ *, */)

GooglePlaceTypeahead.prototype.getAddress = function __protoGooglePlaceTypeaheadGetAddress (prediction, onSuccess, onError) {
  var self = this,
      addresses_cache = self.addresses_cache

  if( !prediction || !prediction.place_id ) throw new TypeError('prediction is not a valid prediction')

  if( addresses_cache[prediction.place_id] ) return onSuccess(addresses_cache[prediction.place_id])
  // var params = typeof place_id === 'string' ? { placeId: place_id } : ( place_id.place_id ? {placeId: place_id.place_id} : place_id );
  // console.log('getAddress', prediction)
  self.service.place.getDetails({
    placeId: prediction.place_id,
    fields: self.options.place_fields || _place_fields,
  }, function __getDetailsCallback (place, result) {
    if( result === 'OK' ) {
      addresses_cache[prediction.place_id] = _parsePlace(place, prediction)
      if( onSuccess instanceof Function ) onSuccess( addresses_cache[prediction.place_id] )
    } else {
      if( onError instanceof Function ) onError(result)
    }
  })
}

GooglePlaceTypeahead.prototype.license_img = 'https://developers.google.com/places/documentation/images/powered-by-google-on-white.png?hl=es-419'

export default GooglePlaceTypeahead
