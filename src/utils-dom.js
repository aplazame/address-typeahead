
var arrayShift = Array.prototype.shift

function __extractProps (tag, props) {
  return (tag || '')
    .replace(/#([^\s.]+)/, function __extractId (_matched, id) { props.id = id; return '' })
    .replace(/\.([^\s.]+)/g, function __extractClasses (_matched, class_name) {
      props.className = (props.className ? ( props.className + ' ' + class_name ) : class_name )
      return ''
    })
}

function __create (tag, attrs, props, children) {
  var el = document.createElement(tag || 'div'), key

  if( attrs ) for( key in attrs ) el.setAttribute(key, attrs[key])
  for( key in props ) el[key] = props[key]

  if( children ) children.forEach(function __createAppendChild (_child) { el.appendChild(_child) })

  return el
}

export function _create () {
  var tag = arrayShift.call(arguments), attrs, props, children
  if( typeof tag !== 'string' ) {
    attrs = tag; tag = null
  } else {
    attrs = arrayShift.call(arguments)
  }
  if( attrs instanceof Array ) {
    children = attrs; attrs = null
  } else {
    props = arrayShift.call(arguments)
  }
  if( props instanceof Array ) {
    children = props; props = {}
  } else props = props || {}

  tag = __extractProps(tag, props)

  return __create(tag, attrs, props, children)
}

var classListEnabled = 'classList' in document.documentElement

export var hasClass = classListEnabled ? function __classListHasClass (el, className) {
  return el.classList.contains(className)
} : function __polyfillHasClass (el, className) {
  return new RegExp('\\b' + (className || '') + '\\b','').test(el.className)
}


export var _addClass = classListEnabled ? function __classListAddClass (el, className) {
  el.classList.add(className)
} : function __polyfillAddClass (el, className) {
  if( !hasClass(el, className) ) el.className += ' ' + className
}

export var _removeClass = classListEnabled ? function __classListRemoveClass (el, className) {
  el.classList.remove(className)
} : function __polyfillRemoveClass (el, className) {
  el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ')
}

export var _toggleClass = classListEnabled ? (function __classListToggleClass () {
  var aux = document.createElement('span')
  aux.classList.toggle('test', true)
  aux.classList.toggle('test', true)

  // IE does not support second parameter toggle
  return aux.classList.contains('test') ? function __classListToggleClassNative (el, className, toggle) {
   el.classList.toggle(className, toggle)
  } : function __classListToggleClassNativePolyfill (el, className, toggle) {
   toggle = toggle === undefined ? !el.classList.contains(className) : toggle
   if( toggle ) el.classList.add(className)
   else el.classList.remove(className)
  }
})() : function __polyfillToggleClass (el, className) {
  el.className = el.className.replace(new RegExp('\\s*' + className + '\\s*','g'), ' ')
}

// event functions

export function _on (el, event_name, listener, use_capture) {
  return el.addEventListener(event_name, listener, use_capture)
}

export function _off (el, event_name, listener, use_capture) {
  return el.removeEventListener(event_name, listener, use_capture)
}
