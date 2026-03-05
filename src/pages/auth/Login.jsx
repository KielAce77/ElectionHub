import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Logo } from '../../components/ui';
import { Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import heroImage from '../../assets/hero.png';
import { supabase } from '../../lib/supabase';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/');
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signIn(email, password);
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            const rawMessage = err?.message || '';
            const lower = rawMessage.toLowerCase();

            if (lower.includes('invalid login credentials')) {
                // Supabase uses the same message for unknown email AND wrong password.
                // Make this specific by checking whether a profile exists for the email.
                try {
                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .maybeSingle();

                    if (!existingProfile) {
                        toast.error('Account does not exist. Please check the email or register.');
                    } else {
                        toast.error('Password is incorrect. Please try again.');
                    }
                } catch {
                    toast.error('Invalid credentials. Please check your email and password.');
                }
            } else {
                toast.error(rawMessage || 'Verification failed. Unauthorized access attempt.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
            {/* Professional Visual Sidebar */}
            <div className="hidden lg:block relative overflow-hidden bg-slate-900">
                <img
                    src={heroImage}
                    alt="Voting"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/60" />

                <div className="relative h-full flex flex-col justify-between p-16 z-10">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-white font-black tracking-tighter text-2xl uppercase">ElectionHub</span>
                    </div>

                    <div className="max-w-md">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h1 className="text-5xl font-black text-white leading-tight mb-6 tracking-tight">
                                Easy & Secure <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8 font-serif italic">Online</span> Voting.
                            </h1>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed">
                                The best way to run your elections. Simple setup, secure voting, and clear results.
                            </p>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-8 border-t border-white/10 pt-8">
                        <div>
                            <p className="text-3xl font-black text-white">100%</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Encrypted</p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div>
                            <p className="text-3xl font-black text-white">Real-time</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Analytics</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secure Sign-in Interface */}
            <div className="flex items-center justify-center p-6 xs:p-8 sm:p-12 lg:p-24 bg-white relative">
                <div className="absolute top-0 right-0 p-6 md:p-8 mobile-hide">
                    <div className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        System Ready
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    <div className="lg:hidden mb-10 flex flex-col items-center gap-4 text-center">
                        <div className="bg-blue-700 p-4 rounded-3xl shadow-2xl shadow-blue-500/20">
                            <Logo className="w-12 h-12" />
                        </div>
                        <div>
                            <span className="text-slate-900 font-black tracking-tighter text-4xl uppercase italic">ElectionHub</span>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mt-1">Simple & Secure</p>
                        </div>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Sign In</h2>
                        <p className="text-slate-500 mt-3 font-medium text-sm md:text-lg leading-relaxed">Welcome back! Please sign in to continue.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
                            <Input
                                type="email"
                                placeholder="name@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                className="bg-slate-50 border-slate-100 focus:bg-white h-14 font-bold rounded-xl"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                                <Link to="/forgot-password" intrinsic="true" className="text-[10px] font-black text-blue-700 hover:text-blue-800 uppercase tracking-wider">Reset</Link>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="bg-slate-50 border-slate-100 focus:bg-white h-14 rounded-xl"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-700/10 transition-all rounded-xl mt-4"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Signing in...
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    Sign In <ShieldCheck className="w-5 h-5" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                            New here?{' '}
                            <Link to="/register" className="text-blue-700 hover:underline decoration-2 underline-offset-4 font-black">Create an account</Link>
                        </p>
                    </div>

                    <footer className="mt-16 pt-6 border-t border-slate-100 flex justify-between items-center opacity-50">
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
                            V1.4.2 PREMIUM
                        </div>
                        <div className="flex gap-2">
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                        </div>
                    </footer>
                </motion.div>
            </div>

        </div>
    );
};

export default Login;
