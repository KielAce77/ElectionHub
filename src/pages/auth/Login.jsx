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
            toast.success('Authentication successful. Accessing Protected Portal.');
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
                    alt="Institutional Voting"
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
                                Secure. Transparent. <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8 font-serif italic">Reliable</span> Voting.
                            </h1>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed">
                                The modern standard for professional elections. Experience seamless digital balloting with bank-grade security and real-time results.
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
            <div className="flex items-center justify-center p-8 sm:p-24 bg-white relative">
                <div className="absolute top-0 right-0 p-8">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        System Ready
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-12">
                        <h2 className="text-4xl font-black text-slate-950 tracking-tighter">Sign In</h2>
                        <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">Please enter your account details to access the voting dashboard.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-8">
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@organization.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="bg-slate-50 border-slate-200 focus:bg-white h-14 font-medium"
                            required
                        />

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                                <Link to="/forgot-password" title="Initiate password recovery protocol" className="text-[11px] font-black text-blue-700 hover:text-blue-800 uppercase tracking-wider">Forgot?</Link>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="bg-slate-50 border-slate-200 focus:bg-white h-14"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Signing in...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Continue to Dashboard <ShieldCheck className="w-5 h-5" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-sm font-bold text-slate-400">
                            New here?{' '}
                            <Link to="/register" className="text-blue-700 hover:underline decoration-2 underline-offset-4 font-black">Register Your Organization</Link>
                        </p>
                    </div>

                    <footer className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center">
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                            ElectionHub v1.0
                        </div>
                        <div className="flex gap-4">
                            <div className="w-2 h-2 rounded-full bg-slate-100" />
                            <div className="w-2 h-2 rounded-full bg-slate-100" />
                        </div>
                    </footer>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
