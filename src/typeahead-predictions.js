
import { _create, _on, _off, _toggleClass } from './utils-dom'
import { eventMethods } from './utils'

import { _address2Search, _formattedAddress } from './utils-address'

var _push = Array.prototype.push

export default function TypeaheadPredictions (TA, options) {
  var _predictions = this

  var list_el = _create('.-predictions-list')
  // var predictions_list_custom_el = _create('.-predictions-list._custom-list')
  var predictions_footer_el = _create('.-predictions-footer')
  // var wrapper_el = _create('.apz-address-typeahead-predictions', [list_el, predictions_list_custom_el])
  var wrapper_el = _create(options.wrapper_selector || '.apz-typeahead_predictions', [list_el])

  // predictions properties
  eventMethods(_predictions)
  _predictions.TA = TA
  _predictions.options = options

  _predictions.wrapper_el = wrapper_el
  _predictions.list_el = list_el

  _predictions.custom_predictions = []

  // init

  function _onDocumentClick (e) {
    var el = e.target
    if( _predictions.showing_custom || TA.focus_root.activeElement === TA.input_el ) return

    while( el && el !== document.body ) {
      if( el === wrapper_el || el === TA.input_el ) return
      el = el.parentElement
    }
    _predictions.hide()
  }

  _predictions._onDocumentClick = _onDocumentClick

  _predictions.hide()

  var predictions_parent = options.predictions_parent ?
  ( typeof options.predictions_parent === 'string' ?
    TA.focus_root.querySelector(options.predictions_parent) :
    options.predictions_parent
  ) : TA.input_el.parentElement

  predictions_parent.appendChild(wrapper_el)

  if( options.custom_address ) (function __initCustomAddressButton () {
    var button_custom_address_el = _create('button.-custom-address', { type: 'button' }, { textContent: options.custom_address.label })
    _on(button_custom_address_el, 'click', function __initCustomAddressButtonClick () {
        _predictions.showing_custom = true
        options.custom_address.getter(function _resolveCustomAddress (custom_address) {
          _predictions.showing_custom = false
          custom_address.place = 'custom'
          custom_address.formatted_address = _formattedAddress(custom_address)
          custom_address.url = 'https://maps.google.com/?q=' + encodeURIComponent( custom_address.formatted_address )

          _predictions.setPredictions([], custom_address)

          _predictions.render()
          _predictions.select(custom_address)
          _predictions.emit('custom_address', [custom_address])
        }, function _cancelCustomAddress () {
          _predictions.showing_custom = false
          _predictions.emit('cancel-custom_address')
        })
    })

    predictions_footer_el.appendChild(button_custom_address_el)
    
    if( TA.provider.license_img ) {
      predictions_footer_el.appendChild(
        _create('.-license', [
          _create('img', { src: TA.provider.license_img })
        ])
      )
    }

  })()

  if( options.custom_address || options.license_img ) wrapper_el.appendChild(predictions_footer_el)
}

TypeaheadPredictions.prototype.show = function __protoTypeaheadPredictionsShow (refresh_render) {
  this.wrapper_el.style.display = ''
  this.is_hidden = false
  
  if( refresh_render !== false ) this.render()
  
  _on(document, 'click', this._onDocumentClick, true)
}
TypeaheadPredictions.prototype.hide = function __protoTypeaheadPredictionsHide () {
  this.wrapper_el.style.display = 'none'
  this.is_hidden = true

  _off(document, 'click', this._onDocumentClick, true)
}

TypeaheadPredictions.prototype.hasFocus = function __protoTypeaheadPredictionsHasFocus () {
  var active_element = this.TA.focus_root.activeElement
  
  return active_element === this.wrapper_el || this.wrapper_el.contains(active_element)
}

TypeaheadPredictions.prototype.select = function __protoTypeaheadPredictionsSelect (prediction) {
  // console.warn('TypeaheadPredictions.prototype.select', prediction)
  var children = this.list_el.children ||[]

  this.selected = prediction

  for( var i = 0, n = children.length ; i < n ; i++ ) {
    _toggleClass(children[i], '_is-selected', children[i].prediction === prediction )
  }

  this.emit('selected', [prediction])
}

// function _matchSelected (selected_prediction) {
//   return function _matchSelectedPrediction (prediction) {
//     return prediction === selected_prediction
//   }
// }

function _selectDelta (loaded_predictions, delta) {
  var selected_index = loaded_predictions.indexOf(this.selected)

  if( selected_index >= 0 && loaded_predictions[selected_index + delta] ) {
    this.select(loaded_predictions[selected_index  + delta])
  }
}

TypeaheadPredictions.prototype.selectPrevious = function __protoTypeaheadPredictionsSelectPrevious () {
  if( !this.loaded_predictions ) return

  _selectDelta.call(this, this.loaded_predictions, -1)
}

TypeaheadPredictions.prototype.selectNext = function __protoTypeaheadPredictionsSelectNext () {
  if( !this.loaded_predictions ) return

  _selectDelta.call(this, this.loaded_predictions, 1)
}

TypeaheadPredictions.prototype.setPredictions = function __protoTypeaheadPredictionsSetPredictions (predictions_data, custom_address) {
  var _predictions = this

  if( predictions_data ) predictions_data = predictions_data.slice()
  predictions_data = predictions_data || _predictions.predictions_data ||[]

  var loaded_predictions = predictions_data.slice()

  if( !_predictions.options.keep_custom ) {
    if( custom_address ) loaded_predictions.push(custom_address)
  } else if( _predictions.custom_predictions.length ) {
    if( custom_address ) _predictions.custom_predictions.push(custom_address)
    _push.apply(loaded_predictions, _predictions.custom_predictions)
  }

  _predictions.predictions_data = predictions_data
  _predictions.loaded_predictions = loaded_predictions

  if( _predictions.selected && loaded_predictions.indexOf(_predictions.selected) < 0 ) {
    _predictions.select(null)
  }
}

TypeaheadPredictions.prototype.clear = function __protoTypeaheadPredictionsClear (flush_custom) {
  if( flush_custom ) this.custom_predictions.splice(0)
  this.render([])
}

TypeaheadPredictions.prototype.addCustomPrediction = function __protoTypeaheadPredictionsAddCustomPrediction (custom_address) {
  this.custom_predictions.push(custom_address)
  this.setPredictions()
}

TypeaheadPredictions.prototype.render = function __protoTypeaheadPredictionsRender (predictions_data) {
  var _predictions = this

  if( predictions_data ) _predictions.setPredictions(predictions_data)
  var predictions_to_render = _predictions.loaded_predictions || []

  var list_el = this.list_el,
      wrapper_el = this.wrapper_el

  var i, n, tmp_prediction_el, children = list_el.children

  _toggleClass(wrapper_el, '_has-predictions', _predictions.predictions_data && _predictions.predictions_data.length)
  _toggleClass(wrapper_el, '_has-custom_predictions', _predictions.custom_predictions.length)

  function __onClickPrediction () {
    _predictions.select(this.prediction)
  }

  // wrapper.style.display = null;

  if( predictions_to_render.length > children.length ) {
    for( i = 0, n = predictions_to_render.length - children.length ; i < n ; i++ ) {
      tmp_prediction_el = _create('.-prediction', { tabindex: '0' })
      list_el.appendChild( tmp_prediction_el )
      _on(tmp_prediction_el, 'click', __onClickPrediction)
    }
  }

  for( i = 0, n = predictions_to_render.length; i < n ; i++ ) {
    children[i].innerHTML = _predictions.TA.provider.getPredictionHTML(predictions_to_render[i]) || _address2Search(predictions_to_render[i])
    children[i].prediction = predictions_to_render[i]
    // children[i].setAttribute('data-predition', predictions_to_render[i].id )
    _toggleClass(children[i], '_is-custom', predictions_to_render[i].place === 'custom' )
    _toggleClass(children[i], '_is-selected', predictions_to_render[i] === _predictions.selected )
  }
  // selectPrediction(selectedCursor);

  if( predictions_to_render.length < children.length ) {
    while( children[predictions_to_render.length] ) {
      list_el.removeChild(children[predictions_to_render.length])
    }
  }
}
