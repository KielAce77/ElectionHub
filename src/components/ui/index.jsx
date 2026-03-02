import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Vote } from "lucide-react";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const Logo = ({ className, iconClassName }) => {
    return (
        <div className={cn("w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center shadow-2xl shadow-blue-500/20", className)}>
            <Vote className={cn("w-6 h-6 text-white", iconClassName)} />
        </div>
    );
};

export const Button = ({ className, variant = "primary", size = "md", children, disabled, ...props }) => {
    const variants = {
        primary: "bg-blue-700 hover:bg-blue-800 text-white shadow-sm font-semibold tracking-tight",
        secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm",
        outline: "border-2 border-blue-700 text-blue-700 hover:bg-blue-50 font-bold",
        ghost: "text-slate-600 hover:bg-slate-100 font-medium",
        danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-8 py-3.5 text-base rounded-lg",
    };

    return (
        <button
            disabled={disabled}
            className={cn(
                "inline-flex items-center justify-center rounded-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

export const Input = ({ className, label, error, ...props }) => {
    return (
        <div className="w-full space-y-2">
            {label && <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wider text-[11px]">{label}</label>}
            <input
                className={cn(
                    "w-full bg-white border border-slate-300 rounded-md px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400",
                    error && "border-red-500 focus:ring-red-500/10 focus:border-red-500",
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
    );
};

export const Card = ({ className, children, ...props }) => {
    return (
        <div
            className={cn(
                "pro-card rounded-lg p-6",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export const Badge = ({ children, variant = "neutral" }) => {
    const variants = {
        neutral: "bg-slate-100 text-slate-600 border-slate-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        danger: "bg-red-50 text-red-700 border-red-200",
        primary: "bg-blue-50 text-blue-700 border-blue-200",
    };

    return (
        <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border", variants[variant])}>
            {children}
        </span>
    );
}
