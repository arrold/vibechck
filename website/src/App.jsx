import React, { useState, useEffect } from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  return <button>{children}</button>;
};

// --- MAIN PAGE COMPONENT ---

export default function VibechckLanding() {
  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-4xl font-bold">DEBUG V0.1.3</h1>
      <p>If you see this, React is working.</p>
    </div>
  );
}
