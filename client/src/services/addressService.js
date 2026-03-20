import api from './api';

export const addressService = {
  getAddresses: async () => {
    const response = await api.get('/addresses');
    return response.data?.data?.addresses || [];
  },

  addAddress: async (addressData) => {
    const response = await api.post('/addresses', addressData);
    return response.data?.data?.address;
  },

  updateAddress: async (id, addressData) => {
    const response = await api.put(`/addresses/${id}`, addressData);
    return response.data?.data?.address;
  },

  deleteAddress: async (id) => {
    const response = await api.delete(`/addresses/${id}`);
    return response.data;
  },

  setDefault: async (id) => {
    const response = await api.put(`/addresses/${id}`, { isDefault: true });
    return response.data?.data?.address;
  },

  formatAddressText: (address) => {
    const firstName = address.first_name ?? address.firstName ?? '';
    const lastName = address.last_name ?? address.lastName ?? '';
    const name = `${firstName} ${lastName}`.trim();

    const addressLine = address.address_line ?? address.addressLine ?? '';
    const houseNumber = address.house_number ?? address.houseNumber ?? '';
    const floor = address.floor ?? '';
    const society = address.society ?? '';

    const streetBits = [
      houseNumber ? `House ${houseNumber}` : '',
      floor ? `Floor ${floor}` : '',
      society ? `Society ${society}` : '',
      addressLine,
    ].filter(Boolean);

    const parts = [
      name || null,
      streetBits.length ? streetBits.join(', ') : (address.address_line ?? address.addressLine ?? null),
      address.city,
      address.state,
      address.postal_code ?? address.postalCode,
    ].filter(Boolean);

    if (address.phone) parts.push(`Ph: ${address.phone}`);
    return parts.join(', ');
  },
};
