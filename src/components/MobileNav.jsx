import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Layers, BarChart3, Fingerprint } from 'lucide-react';
import { cn } from './ui';
import { motion, AnimatePresence } from 'framer-motion';

const MobileNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { label: 'Core', path: '/admin/', icon: Home },
        { label: 'Fleet', path: '/admin/elections/', icon: Layers },
        { label: 'Stats', path: '/admin/results/', icon: BarChart3 },
    ];

    return (
        <div className="md:hidden fixed bottom-6 left-6 right-6 z-[60]">
            <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 px-4 py-3 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex justify-between items-center relative overflow-hidden">
                {/* Subtle gradient glow */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600/20 rounded-full blur-[40px] pointer-events-none" />

                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path || (tab.path !== '/admin/' && location.pathname.startsWith(tab.path));

                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className="relative flex-1 flex flex-col items-center gap-1 group py-1"
                        >
                            <div className={cn(
                                "relative p-3 rounded-2xl transition-all duration-500",
                                isActive
                                    ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110"
                                    : "text-slate-500 hover:text-slate-300"
                            )}>
                                <tab.icon className={cn(
                                    "w-5 h-5 transition-transform duration-300",
                                    isActive ? "stroke-[3px]" : "stroke-[2px] group-active:scale-95"
                                )} />

                                {isActive && (
                                    <motion.div
                                        layoutId="nav-indicator"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </div>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 mt-1",
                                isActive ? "text-blue-400 opacity-100 translate-y-0" : "text-slate-600 opacity-0 -translate-y-2 invisible h-0"
                            )}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNav;

