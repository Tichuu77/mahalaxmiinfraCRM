'use client';

import Image from 'next/image';

/**
 * MahalaxmiLogo Component
 * 
 * Renders the official Mahalaxmi Group logo from the brand identity guidelines.
 * Supports:
 * - 'card': The complete green card with gold emblem, white typography, and gold tagline
 * - 'horizontal': Horizontal arrangement (emblem on left, MAHALAXMI GROUP + tagline on right)
 * - 'stacked': Vertical arrangement (emblem on top, typography below)
 * - 'emblem': The emblem mark only
 * 
 * Variants:
 * - 'on-dark' (default): For dark green backgrounds (#30534A) with white typography & gold accents
 * - 'on-light': For white/light backgrounds with deep green typography & gold accents
 */
export default function MahalaxmiLogo({
  variant = 'on-dark',
  layout = 'horizontal',
  size = 'md',
  className = '',
  showTagline = true,
}) {
  if (layout === 'card') {
    const cardDimensions = {
      sm: { width: 120, height: 120 },
      md: { width: 170, height: 170 },
      lg: { width: 220, height: 220 },
    }[size] || { width: 170, height: 170 };

    return (
      <div className={`relative inline-block overflow-hidden rounded-2xl shadow-lg border border-gold-500/20 ${className}`}>
        <Image
          src="/logo-green-card.png"
          alt="Mahalaxmi Group - A Tradition of Trust"
          width={cardDimensions.width}
          height={cardDimensions.height}
          priority
          className="object-contain"
        />
      </div>
    );
  }

  if (layout === 'emblem') {
    const emblemSizes = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-14 h-14',
    }[size] || 'w-10 h-10';

    return (
      <div className={`relative flex items-center justify-center flex-shrink-0 ${emblemSizes} ${className}`}>
        <Image
          src="/emblem-transparent.png"
          alt="Mahalaxmi Emblem"
          width={48}
          height={48}
          priority
          className="object-contain w-full h-full filter drop-shadow-sm"
        />
      </div>
    );
  }

  // Horizontal or Stacked vector/image hybrid layout
  const isDark = variant === 'on-dark';
  const textColor = isDark ? 'text-white' : 'text-brand-700';
  const subTextColor = isDark ? 'text-gold-400' : 'text-gold-600';
  const lineColor = isDark ? 'bg-gold-400/80' : 'bg-gold-500/80';

  if (layout === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center select-none ${className}`}>
        {/* Emblem */}
        <div className="relative w-14 h-12 mb-2 flex items-center justify-center">
          <Image
            src="/emblem-transparent.png"
            alt="Mahalaxmi Emblem"
            width={56}
            height={48}
            priority
            className="object-contain"
          />
        </div>

        {/* Text */}
        <h1 className={`font-serif tracking-[0.2em] font-bold text-lg leading-tight uppercase ${textColor}`}>
          MAHALAXMI
        </h1>
        <h2 className={`font-serif tracking-[0.25em] font-semibold text-sm leading-tight uppercase ${textColor} mt-0.5`}>
          GROUP
        </h2>

        {/* Tagline */}
        {showTagline && (
          <div className="flex items-center gap-2 mt-2 w-full max-w-[200px] justify-center">
            <span className={`h-[1px] flex-1 ${lineColor}`} />
            <span className={`text-[9px] tracking-[0.18em] uppercase font-semibold whitespace-nowrap ${subTextColor}`}>
              A TRADITION OF TRUST
            </span>
            <span className={`h-[1px] flex-1 ${lineColor}`} />
          </div>
        )}
      </div>
    );
  }

  // Default: Horizontal layout
  const emblemSizeClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
  }[size] || 'w-11 h-11';

  const titleClasses = {
    sm: 'text-sm tracking-[0.16em]',
    md: 'text-base tracking-[0.18em]',
    lg: 'text-lg tracking-[0.2em]',
  }[size] || 'text-base tracking-[0.18em]';

  const groupClasses = {
    sm: 'text-[11px] tracking-[0.22em]',
    md: 'text-xs tracking-[0.24em]',
    lg: 'text-sm tracking-[0.26em]',
  }[size] || 'text-xs tracking-[0.24em]';

  const taglineClasses = {
    sm: 'text-[7.5px] tracking-[0.14em]',
    md: 'text-[8.5px] tracking-[0.16em]',
    lg: 'text-[10px] tracking-[0.18em]',
  }[size] || 'text-[8.5px] tracking-[0.16em]';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className={`relative flex items-center justify-center flex-shrink-0 ${emblemSizeClasses}`}>
        <Image
          src="/emblem-transparent.png"
          alt="Mahalaxmi Emblem"
          width={48}
          height={48}
          priority
          className="object-contain w-full h-full filter drop-shadow-sm"
        />
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={`font-serif font-bold uppercase ${titleClasses} ${textColor}`}>
            MAHALAXMI
          </span>
          <span className={`font-serif font-semibold uppercase ${groupClasses} ${textColor}`}>
            GROUP
          </span>
        </div>

        {showTagline && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`h-[1px] w-3 ${lineColor}`} />
            <span className={`font-medium uppercase whitespace-nowrap ${taglineClasses} ${subTextColor}`}>
              A TRADITION OF TRUST
            </span>
            <span className={`h-[1px] w-3 ${lineColor}`} />
          </div>
        )}
      </div>
    </div>
  );
}
