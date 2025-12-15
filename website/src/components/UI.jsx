import React from 'react';
import { ArrowRight } from 'lucide-react';

export const COLORS = {
    bg: '#0A0A0A',
    fg: '#FAFAFA',
    muted: '#1A1A1A',
    mutedFg: '#737373',
    accent: '#FF3D00',
    border: '#262626',
};

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold uppercase tracking-widest transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF3D00] disabled:opacity-50 disabled:pointer-events-none rounded-none";

    const variants = {
        primary: "bg-transparent text-[#FF3D00] hover:text-[#FF3D00] hover:bg-[#FF3D00]/10 group relative overflow-hidden border border-[#FF3D00]",
        outline: "border border-[#FAFAFA] text-[#FAFAFA] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]",
        ghost: "text-[#737373] hover:text-[#FAFAFA]"
    };

    // Override primary variant based on user feedback (fill on hover)
    // Actually, I should stick to the specific class provided earlier if possible or genericize it.
    // The user liked hover:bg-[#FF3D00] hover:text-[#0A0A0A]

    if (variant === 'primary' && className.includes('hover:bg-[#FF3D00]')) {
        // The class passed in props overrides, so standard primary is fine.
    }

    return (
        <button className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
            <span className="relative z-10 flex items-center gap-2">{children}</span>
        </button>
    );
};

export const Section = ({ children, className = '', id = '' }) => (
    <section id={id} className={`py-20 md:py-32 px-6 md:px-12 max-w-[1400px] mx-auto ${className}`}>
        {children}
    </section>
);

export const DisplayText = ({ children, size = 'xl', className = '' }) => {
    const sizes = {
        sm: "text-2xl md:text-3xl tracking-tight",
        md: "text-4xl md:text-5xl tracking-tighter",
        lg: "text-5xl md:text-7xl lg:text-8xl tracking-tighter leading-[0.9]",
        xl: "text-6xl md:text-8xl lg:text-9xl tracking-tighter leading-[0.85] font-bold"
    };

    return (
        <h2 className={`${sizes[size]} font-sans text-[#FAFAFA] ${className}`}>
            {children}
        </h2>
    );
};

export const Badge = ({ children }) => (
    <span className="inline-block px-2 py-1 mb-4 text-xs font-mono uppercase tracking-widest text-[#FF3D00] border border-[#FF3D00]/30 bg-[#FF3D00]/5">
        {children}
    </span>
);

export const CodeBlock = ({ code, fileName, errorLine }) => (
    <div className="font-mono text-sm bg-[#0F0F0F] border border-[#262626] p-4 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-[#262626] pb-2">
            <span className="text-[#737373] text-xs uppercase tracking-wider">{fileName}</span>
            <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-[#262626]" />
                <div className="w-2 h-2 rounded-full bg-[#262626]" />
            </div>
        </div>
        <div className="space-y-1 overflow-x-auto">
            {code.map((line, i) => (
                <div key={i} className={`flex ${i === errorLine ? 'bg-[#FF3D00]/10 -mx-4 px-4 border-l-2 border-[#FF3D00]' : ''}`}>
                    <span className="text-[#333] select-none w-8 text-right mr-4">{i + 1}</span>
                    <span className={`${i === errorLine ? 'text-[#FF3D00]' : 'text-[#A3A3A3]'} whitespace-pre`}>
                        {line}
                    </span>
                    {i === errorLine && (
                        <span className="ml-4 text-[#FF3D00] text-xs flex items-center gap-1">
                            <span className="uppercase font-bold tracking-wider">Error</span> Hallucinated Import
                        </span>
                    )}
                </div>
            ))}
        </div>
    </div>
);
