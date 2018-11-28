
import { debounce, eventMethods } from './utils'
import { _on } from './utils-dom'

import GooglePlaceTypeahead from './provider-google-place-autocomplete'
import TypeaheadPredictions from './typeahead-predictions'
import { _address2Search, _formattedAddress } from './utils-address-format'

var KEY_ENTER = 13,
    KEY_UP = 38,
    KEY_DOWN = 40

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
      number_typed = false,
      fetching_address = null

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

    var fetched_input_value = input_el.value
    place_provider.getAddress(prediction, function (address) {
      if( input_el.value !== fetched_input_value || predictions_ctrl.selected !== prediction ) return
      _selectAddress(address)
      if( callback instanceof Function ) callback(address)
      fetching_address.forEach(function (listener) {
        listener(address)
      })
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
      predictions_ctrl.clear()
      return _selectAddress(null)
    }

    // console.log('__onInput', input_el.value)

    var fetched_input_value = input_el.value
    place_provider.getPredictions(input_el.value, function (_predictions_data) {
      // predictions_ctrl.selected(null)
      predictions_ctrl.render(_predictions_data)

      if( !_predictions_data.length || input_el.value !== fetched_input_value ) return

      if( _predictions_data[0] && _predictions_data.indexOf(predictions_ctrl.selected) < 0 ) {
        predictions_ctrl.select(_predictions_data[0])
      }
      // if( _predictions_data[0] ) _fetchAddress(_predictions_data[0])
    })
  }

  predictions_ctrl.on('selected', function (prediction) {
    if( !prediction ) return _selectAddress(null)

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

  predictions_ctrl.on('cancel-custom_address', function () {
    input_el.focus()
  })

  _on(input_el, 'click', function () {
    predictions_ctrl.show()
  })

  input_el.addEventListener('keydown', function (e) {
    if( e.keyCode !== KEY_ENTER ) predictions_ctrl.show()

    switch (e.keyCode) {
      case KEY_ENTER:
        // console.log('predictions_ctrl.is_hidden', predictions_ctrl.is_hidden)
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
        // if( selected_address && selected_address.street_number && ( !number_typed || Number(number_typed) === Number(selected_address.street_number) ) ) {
        //   e.preventDefault()
        //   predictions_ctrl.hide()
        // }
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

  // predictions_wrapper.addEventListener('mousedown', function (_e) {
  //   clicked_predictions = false
  // })

  function _renderInputOnBlur (_address) {
    input_el.value = _formattedAddress(_address, true)
    // console.log('_renderInputOnBlur', _address, input_el.value)
  }

  _on(input_el, 'blur', function () {
    // console.log('[blur]', predictions_ctrl.selected)
    // if( predictions_ctrl.selected ) input_el.value = predictions_ctrl.selected.description
    // input_el.value = _formattedAddress(predictions_ctrl.selected)
    // if( selected_address && selected_address.street_number ) input_el.value = _formattedAddress(selected_address)

    setTimeout(function () {
      if( fetching_address ) fetching_address.push(_renderInputOnBlur)
      else _renderInputOnBlur(selected_address)

      if( predictions_ctrl.showing_custom || focus_root.activeElement === input_el ) return

      // if( options.close_on_click !== false && predictions_ctrl.hasFocus() ) return
      // console.log('focus_root.activeElement', focus_root.activeElement)
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
  else if( options.try_searches ) {
    __trySearches(
      options.try_searches,
      place_provider.getPredictions.bind(place_provider),
      function (predictions_data, try_search) {
        predictions_ctrl.setPredictions(predictions_data)
        predictions_ctrl.select(predictions_data[0])
        // console.log('try_search', try_search)
        input_el.value = try_search
      }
    )
  }

  return component
}

export default AddressTypeahead
