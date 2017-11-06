(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.AddressTypeahead = factory());
}(this, (function () { 'use strict';

var classListEnabled = 'classList' in document.documentElement;

let toggleClass = classListEnabled ? (function () {
  var aux = document.createElement('span');
  aux.classList.toggle('test', true);
  aux.classList.toggle('test', true);

  // IE does not support second parameter toggle
  return aux.classList.contains('test') ? function (el, className, toggle) {
   el.classList.toggle(className, toggle);
  } : function (el, className, toggle) {
   toggle = toggle === undefined ? !el.classList.contains(className) : toggle;
   if( toggle ) el.classList.add(className);
   else el.classList.remove(className);
  };
})() : function (el, className) {
  el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ');
};

function AddressProvider (provider_name, options) {
  this.name = provider_name;
  this.options = options;
}

function AddressTypeahead (provider_name, provider_options, options) {
  this.options = options || {};

  this.provider = new AddressProvider(provider_name, provider_options);
}

return AddressTypeahead;

})));
