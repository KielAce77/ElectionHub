import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabasePublic as supabase } from '../../lib/supabasePublic';
import { Button, Input, Logo } from '../../components/ui';
import { Key, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import heroImage from '../../assets/hero.png';

const VoteEntry = () => {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const verifyToken = async (rawToken) => {
        // Efficiently validate the provided token against the authorized registry.
        const normalizedToken = rawToken.trim().toUpperCase();

        const { data, error } = await supabase
            .from('voting_tokens')
            .select('id')
            .eq('token', normalizedToken)
            .maybeSingle();

        if (error || !data) {
            toast.error('Invalid or already used voting token.');
            return;
        }

        toast.success('Token verified. Accessing ballot.');
        navigate(`/ballot/${normalizedToken}`);
    };

    const handleVerifyToken = async (e) => {
        e.preventDefault();
        if (!token.trim()) return;

        setLoading(true);
        try {
            await verifyToken(token);
        } catch {
            toast.error('Unable to verify token. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // If a token is provided in the URL, automatically populate and verify it.
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const deepToken = params.get('token');
        if (!deepToken) return;

        setToken(deepToken.toUpperCase());
        setLoading(true);
        verifyToken(deepToken)
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
            <div className="hidden lg:block relative overflow-hidden bg-slate-900">
                <img
                    src={heroImage}
                    alt="Secure Voting"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay scale-105"
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
                                Your Voice, <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8 font-serif italic">Protected</span> by Technology.
                            </h1>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed">
                                Enter your unique voting token to securely participate in your organization's decision-making process.
                            </p>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-6 border-t border-white/10 pt-8">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Key className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Single-use Tokens</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-2 text-slate-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">End-to-End Encrypted</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-6 xs:p-12 sm:p-24 bg-white relative">
                <div className="absolute top-0 right-0 p-6 md:p-8">
                    <div className="text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] md:tracking-[0.3em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Session Encrypted
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="lg:hidden mb-12 flex items-center gap-3">
                        <Logo className="w-10 h-10" />
                        <span className="text-slate-900 font-extrabold tracking-tighter text-2xl uppercase">ElectionHub</span>
                    </div>

                    <div className="mb-8 md:mb-12">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tighter">Enter Voting Token</h2>
                        <p className="text-slate-500 mt-3 md:mt-4 font-medium text-base md:text-lg leading-relaxed">Please provide the 12-character code sent to you by your administrator.</p>
                    </div>

                    <form onSubmit={handleVerifyToken} className="space-y-8">
                        <Input
                            label="Access Token"
                            type="text"
                            placeholder="XXXX-XXXX-XXXX"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            disabled={loading}
                            className="bg-slate-50 border-slate-200 focus:bg-white h-16 text-center text-2xl font-black tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-medium placeholder:text-lg"
                            required
                        />

                        <Button
                            type="submit"
                            className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Access Private Ballot <ArrowRight className="w-5 h-5" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <footer className="mt-20 pt-8 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] text-center">
                            Secure Public Portal v2.0 • ElectionHub
                        </p>
                    </footer>
                </motion.div>
            </div>
        </div>
    );
};

export default VoteEntry;
