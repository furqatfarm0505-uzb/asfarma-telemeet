import React from 'react';
import logoImg from '../assets/logo.png';

export function AsfarmaLogo({ size = 'normal' }) {
  const isLarge = size === 'large';

  return (
    <div className="flex items-center gap-2 select-none">
      <img
        src={logoImg}
        alt="Asfarma"
        className={`object-contain ${
          isLarge ? 'h-11 md:h-12' : 'h-8 md:h-9'
        } w-auto drop-shadow-sm`}
      />
    </div>
  );
}
