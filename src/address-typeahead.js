
import { debounce, eventMethods, _runListeners, _runDelayed } from './utils'
import { _on } from './utils-dom'

import GooglePlaceTypeahead from './provider-google-place-autocomplete'
import TypeaheadPredictions from './typeahead-predictions'
import { _address2Search, _formattedAddress, _numberTyped, _cursorToNumberPosition } from './utils-address'

var KEY_ENTER = 13,
    KEY_UP = 38,
    KEY_DOWN = 40

function __trySearches (try_searches, getPredictions, callback) {
  var try_search = try_searches.shift()

  if( !try_search ) return

  getPredictions(try_search, function __trySearchesWithPredictions (predictions_data) {
    if(predictions_data && predictions_data[0]) {
      callback(predictions_data, try_search)
    } else __trySearches(try_searches, getPredictions, callback)
  })
}

function AddressTypeahead (options) {
  options = options || {}
  this.options = options

  this.focus_root = options.focus_root || document

  if( options.google ) {
    this.provider = new GooglePlaceTypeahead(options.google).load()
  }
}

AddressTypeahead.prototype.bind = function _protoAddressTypeaheadBind (input_el, options) {
  var self = this,
      // predictions = [],
      selected_address = null,
      number_typed = false,
      input_value_on_selected = null,
      fetching_address = null

  var component = eventMethods({
    get value () {
      return input_el.value
    },
    set value (_value) {
      input_el.value = _value
      __onInput()
    },

    get address () {
      return selected_address
    },
    set address (_address) {
      if( !_address || !_address.place ) return
      selected_address = _address

      if( _address.place === 'custom' ) {
        predictions_ctrl.addCustomPrediction(_address)
        input_el.value = _address2Search(_address)
      } else {
        predictions_ctrl.setPredictions([_address.place])
        input_el.value = _address2Search(_address, true)
      }
      predictions_ctrl.select(_address.place)
      _emitEvent('change')
    },
  })

  options = options || {}

  var focus_root = self.focus_root,
      place_provider = self.provider

  if( typeof input_el === 'string' ) input_el = focus_root.querySelector(input_el)

  self.input_el = input_el

  var predictions_ctrl = new TypeaheadPredictions(self, options)

  // methods  

  function _emitEvent (event_name) {
    component.emit(event_name, [input_el.value, selected_address, number_typed])
  }

  function _selectAddress (address) {
    selected_address = address
    // console.log('selected_address', selected_address, input_el.value)
    _emitEvent('change')
  }

  function _fetchAddress (prediction, callback) {
    fetching_address = []

    place_provider.getAddress(prediction, function __getAddress (address) {
      if( input_el.value !== input_value_on_selected || predictions_ctrl.selected !== prediction ) return
      _selectAddress(address)
      if( callback instanceof Function ) callback(address)
      fetching_address.forEach(_runListeners([address]))
      fetching_address = null
    })
  }

  var last_input_value = null

  function __onInput () {
    if( input_el.value === last_input_value ) {
      if( focus_root.activeElement === input_el ) predictions_ctrl.show()
      return
    }
    last_input_value = input_el.value
    number_typed = _numberTyped(input_el.value)

    if( !input_el.value ) {
      input_value_on_selected = ''
      predictions_ctrl.clear()
      return _selectAddress(null)
    }

    // console.log('__onInput', input_el.value)

    var fetched_input_value = input_el.value
    place_provider.getPredictions(input_el.value, function __onInputWithPredictions (_predictions_data) {
      // predictions_ctrl.selected(null)
      predictions_ctrl.render(_predictions_data)

      if( !_predictions_data.length || input_el.value !== fetched_input_value ) return

      if( _predictions_data[0] && _predictions_data.indexOf(predictions_ctrl.selected) < 0 ) {
        predictions_ctrl.select(_predictions_data[0])
      }
      // if( _predictions_data[0] ) _fetchAddress(_predictions_data[0])
    })
  }

  predictions_ctrl.on('selected', function __onPredictionSelected (prediction) {
    if( !prediction ) return _selectAddress(null)
    // if( !prediction ) return

    input_value_on_selected = input_el.value

    if( prediction.place === 'custom' ) _selectAddress(prediction)
    else _fetchAddress(prediction)
  })

  var _onInput = debounce(__onInput, options.debounce_duration)

  _on(input_el, 'input', _onInput )
  _on(input_el, 'change', _onInput )

  function __onFocus () {
    predictions_ctrl.show()
    if( selected_address && !selected_address.street_number ) {
      input_el.value = _formattedAddress(selected_address, true)
      _cursorToNumberPosition(input_el, selected_address)
    } else if( selected_address ) {
      input_el.value = _address2Search(selected_address, true, false)
    }
    __onInput()
  }

  _on(input_el, 'focus', __onFocus)
  _on(input_el, 'click', __onFocus)

  predictions_ctrl.on('cancel-custom_address', function __onCancelCustomAddress () {
    input_el.focus()
  })

  _on(input_el, 'click', function __onInputClick () {
    predictions_ctrl.show()
  })

  input_el.addEventListener('keydown', function __onInputKeyDown (e) {
    if( e.keyCode !== KEY_ENTER ) predictions_ctrl.show()

    switch (e.keyCode) {
      case KEY_ENTER:
        if( predictions_ctrl.is_hidden ) return
        e.preventDefault()

        if( selected_address && !selected_address.street_number ) {
          input_el.value = _address2Search(selected_address, true, true)
          _cursorToNumberPosition(input_el, selected_address)
          __onInput()
        } else {
          if( fetching_address ) fetching_address.push(_renderInputOnBlur)
          else _renderInputOnBlur(selected_address)
          predictions_ctrl.hide()
        }
        break
      case KEY_UP:
        e.preventDefault()
        predictions_ctrl.selectPrevious()
        break
      case KEY_DOWN:
        e.preventDefault()
        predictions_ctrl.selectNext()
        break
    }
  })

  function _renderInputOnBlur (_address) {
    input_el.value = _formattedAddress(_address, true)
  }

  _on(input_el, 'blur', _runDelayed(100, function __onInputBlur () {
    if( fetching_address ) fetching_address.push(_renderInputOnBlur)
    else _renderInputOnBlur(selected_address)

    if( predictions_ctrl.showing_custom || focus_root.activeElement === input_el ) return

    predictions_ctrl.hide()
  }) )

  component.input = input_el
  component.focus = function __focusComponent () {
    input_el.focus()
    return component
  }

  

  if( input_el.value ) __onInput()
  else if( options.try_searches ) {
    __trySearches(
      options.try_searches,
      place_provider.getPredictions.bind(place_provider),
      function __onTrySearchMatch (predictions_data, try_search) {
        predictions_ctrl.setPredictions(predictions_data)
        predictions_ctrl.select(predictions_data[0])
        input_el.value = try_search
      }
    )
  }

  return component
}

export default AddressTypeahead
