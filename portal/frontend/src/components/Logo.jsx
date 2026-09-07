import React from 'react';

// Linx-AS brand logo. Accepts a `size` prop (px); defaults to 32.
export default function LinxasLogo({ size = 32 }) {
    return (
        <img
            src="/logo.png"
            alt="Linx-AS"
            width={size}
            height={size}
            style={{ objectFit: 'contain' }}
        />
    );
}
