import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './UI';

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const isDocs = location.pathname === '/docs';

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#262626]">
            <div className="flex items-center justify-between px-6 py-4 max-w-[1400px] mx-auto">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FF3D00]" />
                    <span className="text-xl font-bold tracking-tighter text-[#FAFAFA]">vibechck</span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link to="/" className={`text-sm uppercase tracking-widest transition-colors ${location.pathname === '/' ? 'text-[#FAFAFA]' : 'text-[#737373] hover:text-[#FAFAFA]'}`}>
                        Features
                    </Link>
                    <Link to="/docs" className={`text-sm uppercase tracking-widest transition-colors ${isDocs ? 'text-[#FAFAFA]' : 'text-[#737373] hover:text-[#FAFAFA]'}`}>
                        Docs
                    </Link>
                    <Link to="/docs">
                        <Button variant="outline" className="!py-2 !px-4 text-xs">
                            Install CLI
                        </Button>
                    </Link>
                </div>

                <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-[#FAFAFA]">
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-[#0A0A0A] border-b border-[#262626]"
                    >
                        <div className="flex flex-col p-6 gap-6">
                            <Link to="/" onClick={() => setIsOpen(false)} className="text-lg font-bold text-[#FAFAFA]">
                                Features
                            </Link>
                            <Link to="/docs" onClick={() => setIsOpen(false)} className="text-lg font-bold text-[#FAFAFA]">
                                Docs
                            </Link>
                            <Button variant="primary" className="w-full justify-start !px-0" onClick={() => { window.location.href = '/docs'; setIsOpen(false); }}>
                                Install CLI <ArrowRight size={16} />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export const Footer = () => (
    <footer className="border-t border-[#262626] bg-[#050505] py-20 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-4 h-4 bg-[#FF3D00]" />
                    <span className="text-xl font-bold tracking-tighter text-[#FAFAFA]">vibechck</span>
                </div>
                <p className="text-[#737373] max-w-sm">
                    Static analysis for the generative age. Stop reviewing hallucinated code.
                </p>
            </div>

            <div>
                <h4 className="font-bold text-[#FAFAFA] mb-6 uppercase tracking-widest text-sm">Product</h4>
                <ul className="space-y-4 text-[#737373]">
                    <li><a href="https://www.npmjs.com/package/vibechck" className="hover:text-[#FF3D00] transition-colors">Download</a></li>
                    <li><Link to="/docs" className="hover:text-[#FF3D00] transition-colors">Documentation</Link></li>
                    <li><a href="#" className="hover:text-[#FF3D00] transition-colors">Changelog</a></li>
                </ul>
            </div>

            <div>
                <h4 className="font-bold text-[#FAFAFA] mb-6 uppercase tracking-widest text-sm">Social</h4>
                <ul className="space-y-4 text-[#737373]">
                    <li><a href="https://github.com/arrold/vibechck" className="hover:text-[#FF3D00] transition-colors flex items-center gap-2"><Github size={16} /> GitHub</a></li>
                </ul>
            </div>
        </div>
        <div className="max-w-[1400px] mx-auto mt-20 pt-8 border-t border-[#262626] flex justify-between text-[#333] text-sm">
            <p>© 2024 vibechck. All rights reserved.</p>
        </div>
    </footer>
);
