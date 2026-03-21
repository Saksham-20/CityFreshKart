import React from 'react';

const DEFAULT_WHATSAPP_NUMBER = '918054544611';
const WHATSAPP_NUMBER = (process.env.REACT_APP_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER).replace(/\D/g, '');
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%20CityFreshKart%2C%20I%20want%20to%20order%20on%20WhatsApp.`;

const WhatsAppFloatingButton = () => {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Order on WhatsApp"
      className="fixed right-4 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.5rem)' }}
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden="true">
        <path d="M20.52 3.48A11.84 11.84 0 0 0 12.06 0C5.44 0 .06 5.38.06 12c0 2.11.55 4.17 1.59 5.99L0 24l6.16-1.61A11.93 11.93 0 0 0 12.06 24h.01c6.62 0 12-5.38 12-12 0-3.2-1.25-6.21-3.55-8.52Zm-8.46 18.5h-.01a9.92 9.92 0 0 1-5.05-1.39l-.36-.21-3.66.96.98-3.57-.23-.37A9.87 9.87 0 0 1 2.07 12c0-5.5 4.48-9.98 9.99-9.98 2.66 0 5.17 1.04 7.05 2.93A9.9 9.9 0 0 1 22.02 12c0 5.5-4.48 9.98-9.96 9.98Zm5.47-7.49c-.3-.15-1.79-.88-2.07-.98-.28-.1-.48-.15-.69.15-.2.3-.79.98-.96 1.18-.18.2-.35.23-.65.08-.3-.15-1.25-.46-2.38-1.48-.88-.79-1.47-1.76-1.64-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.69-1.66-.94-2.28-.25-.6-.5-.52-.69-.53h-.58c-.2 0-.53.08-.8.38-.28.3-1.06 1.03-1.06 2.5 0 1.48 1.09 2.9 1.24 3.1.15.2 2.14 3.26 5.18 4.57.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.57-.08 1.79-.73 2.04-1.44.25-.71.25-1.32.18-1.44-.08-.12-.28-.2-.58-.35Z" />
      </svg>
    </a>
  );
};

export default WhatsAppFloatingButton;

