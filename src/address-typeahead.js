
import {_create} from './utils';

function AddressProvider (provider_name, options) {
  this.name = provider_name;
  this.options = options;
}

function AddressTypeahead (provider_name, provider_options, options) {
  this.options = options || {};

  this.provider = new AddressProvider(provider_name, provider_options);
}

export default AddressTypeahead;
