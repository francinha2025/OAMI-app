import React from 'react';
import { INSTITUTION_LOGO } from '../constants';

export default function LogoOami({ style, className }: { style?: React.CSSProperties, className?: string }) {
  return (
    <img
      src={INSTITUTION_LOGO} 
      alt="Logo OAMI"
      style={{ width: '200px', ...style }}
      className={className}
    />
  );
}
