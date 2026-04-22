import React from 'react';

type BrandNameProps = {
  className?: string;
};

export default function BrandName({ className = '' }: BrandNameProps) {
  return (
    <span className={`font-black tracking-tight ${className}`}>
      <span className="text-red-500">ZXC</span>
      <span className="text-white">HUB</span>
    </span>
  );
}
