import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Logo } from '../../components/ui';
import { Loader2, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import heroImage from '../../assets/hero.png';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            toast.error('Passwords do not match. Please verify your entries.');
            return;
        }

        setLoading(true);
        try {
            await updatePassword(password);
            toast.success('Credentials updated successfully. Redirecting...');
            navigate('/admin'); // Or wherever you want them to go
        } catch (err) {
            toast.error(err.message || 'Failed to update credentials. Access has expired or is unauthorized.');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
            <div className="hidden lg:block relative overflow-hidden bg-slate-900 border-r border-slate-200">
                <img
                    src={heroImage}
                    alt="Institutional Security"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-125 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/60" />
                <div className="relative h-full flex flex-col justify-between p-16 z-10">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-white font-black tracking-tighter text-2xl uppercase">ElectionHub</span>
                    </div>
                    <div className="max-w-md">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <h1 className="text-5xl font-black text-white leading-tight mb-6 tracking-tight uppercase tracking-widest">
                                Re-authentication <span className="text-blue-500 font-serif italic font-normal underline decoration-blue-500/30 underline-offset-8">Required</span>.
                            </h1>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed opacity-90 italic">
                                Final step for re-establishing organizational authority.
                            </p>
                        </motion.div>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Credential Update Protocol</div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8 sm:p-24 bg-white relative">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-sm">
                    <div className="mb-12">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 shadow-sm relative">
                            <KeyRound className="w-6 h-6 text-blue-700" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic">Establish New Access</h2>
                        <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">Update your administrator credentials to regain access to the digital voting system.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="New Administrator Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            className="h-14"
                        />
                        <Input
                            label="Verify New Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            disabled={loading}
                            required
                            className="h-14"
                        />

                        <Button
                            type="submit"
                            className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Digitizing Credentials...
                                </div>
                            ) : (
                                "Confirm New Access Protocol"
                            )}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default ResetPassword;
