
var arrayShift = Array.prototype.shift;

function __extractProps (tag, props) {
  return (tag || '')
    .replace(/#([^\s.]+)/, function (_matched, id) { props.id = id; return ''; })
    .replace(/\.([^\s.]+)/g, function (_matched, class_name) {
      props.className = (props.className ? ( props.className + ' ' + class_name ) : class_name );
      return '';
    });
}

function __create (tag, attrs, props, children) {
  var el = document.createElement(tag || 'div'), key;

  if( attrs ) for( key in attrs ) el.setAttribute(key, attrs[key]);
  for( key in props ) el[key] = props[key];

  if( children ) children.forEach(function (_child) { el.appendChild(_child); });

  return el;
}

export function _create () {
  var tag = arrayShift.call(arguments), attrs, props, children;
  if( typeof tag !== 'string' ) {
    attrs = tag; tag = null;
  } else {
    attrs = arrayShift.call(arguments);
  }
  if( attrs instanceof Array ) {
    children = attrs; attrs = null;
  } else {
    props = arrayShift.call(arguments);
  }
  if( props instanceof Array ) {
    children = props; props = {};
  } else props = props || {};

  tag = __extractProps(tag, props);

  return __create(tag, attrs, props, children);
}
