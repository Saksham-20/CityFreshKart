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
    const parts = [
      `${address.first_name} ${address.last_name}`.trim(),
      address.address_line,
      address.city,
      address.state,
      address.postal_code,
    ].filter(Boolean);
    if (address.phone) parts.push(`Ph: ${address.phone}`);
    return parts.join(', ');
  },
};
