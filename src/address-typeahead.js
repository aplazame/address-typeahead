
import { debounce, eventMethods } from './utils'
import { _on, _onInput } from './utils-dom'

import GooglePlaceTypeahead from './provider-google-place-autocomplete'
import TypeaheadPredictions from './typeahead-predictions'
import { _address2Search, _formattedAddress } from './utils-address-format'

function _numberTyped (input_value) {
  var matches = input_value && input_value.match(/.*?, *(\d+) *(,.*?)?$|^.*? \d+/)
  return matches ? matches[1] : null
}

function _cursorToNumberPosition (input_el, address) {
  setTimeout(function () {
    input_el.setSelectionRange(address.street.length + 2, address.street.length + 2)
  }, 10)
  setTimeout(function () {
    input_el.setSelectionRange(address.street.length + 2, address.street.length + 2)
  }, 100)
}

function __trySearches (try_searches, getPredictions, callback) {
  var try_search = try_searches.shift()

  if( !try_search ) return

  getPredictions(try_search, function (predictions_data) {
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

AddressTypeahead.prototype.bind = function (input_el, options) {
  var self = this,
      component = eventMethods({}),
      // predictions = [],
      selected_address = null,
      number_typed = false

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

  function _fetchAddress (prediction) {
    place_provider.getAddress(prediction, function (address) {
      selected_address = address
    })
  }

  function _selectAddress (address) {
    selected_address = address
    _emitEvent('change')
  }

  function __onInput () {
    number_typed = _numberTyped(input_el.value)

    if( !input_el.value ) {
      predictions_ctrl.clear()
      return _selectAddress(null)
    }

    place_provider.getPredictions(input_el.value, function (_predictions_data) {
      // predictions_ctrl.selected(null)
      predictions_ctrl.render(_predictions_data)

      if( !_predictions_data.length ) return

      if( _predictions_data.indexOf(predictions_ctrl.selected) < 0 ) {
        predictions_ctrl.select(_predictions_data[0])
      }
      // if( _predictions_data[0] ) _fetchAddress(_predictions_data[0])
    })
  }

  predictions_ctrl.on('selected', function (prediction) {
    if( !prediction ) return _selectAddress(null)

    if( prediction.__address__ ) return _selectAddress(prediction.__address__)

    _fetchAddress(prediction, function (address) {
      if( predictions_ctrl.selected !== prediction ) return
      prediction.__address__ = address
      _selectAddress(address)
    })
  })

  _onInput(input_el, debounce(__onInput, options.debounce_duration) )

  function __onFocus () {
    predictions_ctrl.show()
    if( selected_address && !selected_address.street_number ) {
      _cursorToNumberPosition(selected_address)
    } else {
      input_el.value = _address2Search(selected_address, true, false)
    }
  }

  _on(input_el, 'focus', __onFocus)

  _on(input_el, 'click', function () {
    predictions_ctrl.show()
  })

  input_el.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case 13:
        if( predictions_ctrl.is_hidden ) return
        if( selected_address && selected_address.street_number && ( !number_typed || Number(number_typed) === Number(selected_address.street_number) ) ) {
          e.preventDefault()
          predictions_ctrl.hide()
        }
        break
      case 38:
        e.preventDefault()
        predictions_ctrl.selectPrevious()
        break
      case 40:
        e.preventDefault()
        predictions_ctrl.selectNext()
        break
    }
  })

  // predictions_wrapper.addEventListener('mousedown', function (_e) {
  //   clicked_predictions = false
  // })

  _on(input_el, 'blur', function () {
    if( selected_address && selected_address.street_number ) input_el.value = _formattedAddress(selected_address)

    setTimeout(function () {
      if( focus_root.activeElement === input_el ) return
      // if( clicked_predictions ) clicked_predictions = false
      predictions_ctrl.hide()
    }, 100)
  })

  component.input = input_el
  component.focus = function () {
    input_el.focus()
    return component
  }

  Object.defineProperty(component, 'value', {
    get: function () { return input_el.value },
    set: function (value) {
      input_el.value = value
      __onInput()
    }
  })

  Object.defineProperty(component, 'address', {
    get: function () { return selected_address },
    set: function (address) {
      if( !address || !address.place ) return
      selected_address = address

      if( address.place === 'custom' ) {
        predictions_ctrl.addCustomPrediction(address)
        input_el.value = _address2Search(address)
      } else {
        predictions_ctrl.setPredictions([address.place])
        input_el.value = _address2Search(address, true)
        // _selectPrediction(address.place, false)
      }
      predictions_ctrl.select(address)
      _emitEvent('change')
      // if( focus_root.activeElement !== input_el ) predictions_ctrl.hide()
    }
  })

  if( input_el.value ) __onInput()

  if( options.try_searches ) {
    __trySearches(
      options.try_searches,
      place_provider.getPredictions.bind(place_provider),
      function (predictions_data, try_search) {
        predictions_ctrl.setPredictions(predictions_data)
        predictions_ctrl.select(predictions_data[0])
        input_el.value = try_search
      }
    )
  }

  return component
}

export default AddressTypeahead
