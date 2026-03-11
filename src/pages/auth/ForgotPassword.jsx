import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Logo } from '../../components/ui';
import { Loader2, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import heroImage from '../../assets/hero.png';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: Email, 2: OTP
    const [loading, setLoading] = useState(false);
    const { resetPassword, verifyRecoveryOtp } = useAuth();
    const navigate = useNavigate();

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await resetPassword(email);
            toast.success('Security code issued! Please check your email.');
            setStep(2);
        } catch (err) {
            toast.error(err.message || 'Verification request failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await verifyRecoveryOtp(email, otp);
            toast.success('Security identity verified. Updating permissions.');
            navigate('/reset-password');
        } catch (err) {
            toast.error(err.message || 'Invalid or expired security code.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
            <div className="hidden lg:block relative overflow-hidden bg-slate-900">
                <img
                    src={heroImage}
                    alt="Institutional Security"
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay scale-110 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/60" />
                <div className="relative h-full flex flex-col justify-between p-16 z-10">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <span className="text-white font-black tracking-tighter text-2xl uppercase">ElectionHub</span>
                    </div>
                    <div className="max-w-md">
                        <h1 className="text-5xl font-black text-white leading-tight mb-6 tracking-tight">
                            Multi-Factor <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8 font-serif italic">Identity</span> Recovery.
                        </h1>
                        <p className="text-xl text-slate-300 font-medium leading-relaxed italic opacity-80">
                            Protocol-based assessment required to re-establish organizational command.
                        </p>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Auth Protocol: V2-RECOVERY</div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8 sm:p-24 bg-white relative">
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-sm"
                        >
                            <div className="mb-12">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
                                    <Mail className="w-6 h-6 text-blue-700" />
                                </div>
                                <h2 className="text-4xl font-black text-slate-950 tracking-tighter">Issue One-Time Access</h2>
                                <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">Submit your credentials below to generate a specialized security token.</p>
                            </div>

                            <form onSubmit={handleRequestReset} className="space-y-8">
                                <Input
                                    label="Administrative Email"
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
                                            <Loader2 className="w-5 h-5 animate-spin" /> Digitizing...
                                        </div>
                                    ) : (
                                        "Initiate Recovery"
                                    )}
                                </Button>
                            </form>

                            <div className="mt-12 text-center">
                                <Link to="/login" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-blue-700 transition-colors uppercase tracking-widest">
                                    <ArrowLeft className="w-4 h-4" /> Cancel Protocol
                                </Link>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full max-w-sm"
                        >
                            <div className="mb-12">
                                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100 shadow-sm relative">
                                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                    <div className="absolute inset-0 rounded-2xl bg-emerald-500 opacity-20 animate-ping" />
                                </div>
                                <h2 className="text-4xl font-black text-slate-950 tracking-tighter italic">Identity Verification</h2>
                                <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">
                                    An 8-digit security code has been transmitted to <span className="text-slate-950 font-bold">{email}</span>.
                                </p>
                            </div>

                            <form onSubmit={handleVerifyOtp} className="space-y-8">
                                <Input
                                    label="8-Digit Security Token"
                                    type="text"
                                    placeholder="XXXXXXXX"
                                    maxLength={8}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    disabled={loading}
                                    required
                                    className="h-14 text-center tracking-[1em] font-black text-2xl"
                                />

                                <Button
                                    type="submit"
                                    className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin" /> Validating...
                                        </div>
                                    ) : (
                                        "Verify Credentials"
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="w-full text-center text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                                >
                                    Re-issue New Code
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ForgotPassword;
