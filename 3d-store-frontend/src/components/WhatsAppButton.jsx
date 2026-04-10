import React from 'react';
import './WhatsAppButton.css';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppButton = () => {

  const phoneNumber = '905411190626';
  const message = 'Merhaba, bir ürün hakkında bilgi almak istiyorum.';
  const wpLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={wpLink}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      title="Bize WhatsApp'tan Ulaşın"
    >
      <div className="whatsapp-tooltip">Soru Sorun</div>
      <FaWhatsapp className="whatsapp-icon" />
    </a>
  );
};

export default WhatsAppButton;
