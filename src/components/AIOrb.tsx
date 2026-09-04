import React from 'react';
import { AuraCore } from './aura/AuraCore';
import { AIOrbState } from '../types';

interface AIOrbProps {
  state: AIOrbState;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AIOrb: React.FC<AIOrbProps> = ({
  state,
  size = 'md',
  showLabel = true,
  onClick,
  className = ''
}) => {
  return (
    <AuraCore
      state={state}
      size={size}
      showLabel={showLabel}
      onCoreClick={onClick}
      className={className}
    />
  );
};
