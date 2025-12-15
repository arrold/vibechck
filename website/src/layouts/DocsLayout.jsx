import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Navbar, Footer } from '../components/Layout';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const SidebarLink = ({ to, children }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `block px-4 py-2 text-sm font-mono border-l-2 transition-colors ${isActive
                ? 'border-[#FF3D00] text-[#FAFAFA] bg-[#FF3D00]/5'
                : 'border-transparent text-[#737373] hover:text-[#FAFAFA] hover:border-[#333]'
            }`
        }
    >
        {children}
    </NavLink>
);

export const DocsLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans selection:bg-[#FF3D00] selection:text-[#0A0A0A] flex flex-col">
            <Navbar />

            <div className="flex-1 flex pt-20 max-w-[1400px] mx-auto w-full">
                {/* Mobile Sidebar Toggle */}
                <button
                    className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#FF3D00] text-[#0A0A0A] p-4 rounded-full shadow-lg"
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Sidebar */}
                <aside className={`
                    fixed inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] border-r border-[#262626] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-80px)] lg:sticky lg:top-20
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <div className="h-full overflow-y-auto p-8 space-y-8">
                        <div>
                            <h4 className="font-bold text-[#FAFAFA] mb-4 uppercase tracking-widest text-xs">Getting Started</h4>
                            <div className="space-y-1">
                                <SidebarLink to="/docs/installation">Installation & Usage</SidebarLink>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-[#FAFAFA] mb-4 uppercase tracking-widest text-xs">Reference</h4>
                            <div className="space-y-1">
                                <SidebarLink to="/docs/configuration">Configuration</SidebarLink>
                                <SidebarLink to="/docs/how-it-works">How it Works</SidebarLink>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-w-0 px-6 py-12 md:px-12 md:py-16">
                    <div className="prose prose-invert max-w-3xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
