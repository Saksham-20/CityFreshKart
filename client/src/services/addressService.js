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
    const addressLine = address.address_line ?? address.addressLine ?? '';
    const houseNumber = address.house_number ?? address.houseNumber ?? '';
    const floor = address.floor ?? '';

    return [
      houseNumber || null,
      floor ? `Floor ${floor}` : null,
      addressLine || null,
    ].filter(Boolean).join(', ');
  },
};
