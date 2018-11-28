
export function _commaIf (text) {
  if( !text ) return ''
  if( typeof text === 'string' ) text = text.trim()
  return ', ' + text
}

export function _address2Search (address, number_placeholder, show_area_name) {
  if( !address ) return ''
  var area_name = address.sublocality || address.locality || address.city
  return address.street + ( _commaIf(address.street_number) || (number_placeholder ? ', ' : '') ) + _commaIf(show_area_name !== false && area_name !== address.street && area_name)
}

export function _formattedAddress (address, number_placeholder, show_region, show_country) {
  if( !address ) return ''
  return address.street + _commaIf(address.street_number || (number_placeholder ? ' ' : '')) + _commaIf( address.postcode + ' ' + address.locality ) + _commaIf( address.province !== address.locality && address.province ) + _commaIf( show_region && address.region ) + _commaIf( show_country && address.country )
}
