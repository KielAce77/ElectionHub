import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Logo } from '../../components/ui';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import heroImage from '../../assets/hero.png';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await resetPassword(email);
            toast.success('Password recovery link sent! Please check your email inbox.');
        } catch (err) {
            toast.error(err.message || 'Failed to request password reset. Please verify your email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
            <div className="hidden lg:block relative overflow-hidden bg-slate-900">
                <img
                    src={heroImage}
                    alt="Legacy Infrastructure"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/60" />
                <div className="relative h-full flex flex-col justify-between p-16 z-10">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-white font-black tracking-tighter text-2xl uppercase">ElectionHub</span>
                    </div>
                    <div className="max-w-md">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <h1 className="text-5xl font-black text-white leading-tight mb-6 tracking-tight">
                                Restoring <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8 font-serif italic">Access</span> to Governance.
                            </h1>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed italic opacity-80">
                                Specialized recovery procedures designed to ensure continuity of organizational leadership.
                            </p>
                        </motion.div>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">System Recovery Protocol</div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8 sm:p-24 bg-white relative">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
                    <div className="mb-12">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
                            <Mail className="w-6 h-6 text-blue-700" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-950 tracking-tighter">Account Recovery</h2>
                        <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">Enter your registered email and we'll send specialized credentials to restore your access.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <Input
                            label="Security Verification Email"
                            type="email"
                            placeholder="admin@organization.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                            className="h-14"
                        />

                        <Button
                            type="submit"
                            className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Issuing Link...
                                </div>
                            ) : (
                                "Request Recovery Access"
                            )}
                        </Button>
                    </form>

                    <div className="mt-12 text-center">
                        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-blue-700 transition-colors uppercase tracking-widest">
                            <ArrowLeft className="w-4 h-4" /> Back to Terminal
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ForgotPassword;
