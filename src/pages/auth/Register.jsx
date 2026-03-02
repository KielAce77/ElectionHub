import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Logo } from '../../components/ui';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import heroImage from '../../assets/hero.png';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        orgName: ''
    });
    const [loading, setLoading] = useState(false);
    const { signUp, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate('/admin');
    }, [user, navigate]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        console.log('Register: Initiating signup for', formData.email);

        try {
            const data = await signUp(formData.email, formData.password, {
                full_name: formData.fullName,
                org_name: formData.orgName,
                role: 'admin'
            });

            console.log('Register: Signup successful response:', data);

            if (data?.session) {
                toast.success('Account created. Accessing your dashboard.');
                navigate('/admin');
            } else {
                toast.success('Registration successful. Please check your email to verify.');
                navigate('/login');
            }
        } catch (err) {
            console.error('Register: Critical failure:', err);
            toast.error(err.message || 'Registration failed. Please check your details.');
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
                                Empowering <span className="text-blue-500 underline decoration-blue-500/30 underline-offset-8 font-serif italic">Trusted</span> Leadership.
                            </h1>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed">
                                Set up your organization's digital voting system in minutes. Professional-grade infrastructure for modern decision making.
                            </p>
                        </motion.div>
                    </div>

                    <div className="flex items-center gap-8 border-t border-white/10 pt-8">
                        <div>
                            <p className="text-3xl font-black text-white">256-bit</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Security</p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div>
                            <p className="text-3xl font-black text-white">24/7</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Support Ready</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Registration Interface */}
            <div className="flex items-center justify-center p-8 sm:p-24 bg-white relative overflow-y-auto">
                <div className="absolute top-0 right-0 p-8">
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Account Setup
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-10">
                        <h2 className="text-4xl font-black text-slate-950 tracking-tighter">Get Started</h2>
                        <p className="text-slate-500 mt-4 font-medium text-lg leading-relaxed">Register your organization and create an administrator account.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <Input
                            label="Administrator Full Name"
                            type="text"
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="bg-slate-50 border-slate-200 focus:bg-white h-14"
                            required
                        />

                        <Input
                            label="Organization Name"
                            type="text"
                            placeholder="Acme Corporation"
                            value={formData.orgName}
                            onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                            className="bg-slate-50 border-slate-200 focus:bg-white h-14"
                            required
                        />

                        <Input
                            label="Work Email Address"
                            type="email"
                            placeholder="admin@organization.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="bg-slate-50 border-slate-200 focus:bg-white h-14"
                            required
                        />

                        <Input
                            label="Create Password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="bg-slate-50 border-slate-200 focus:bg-white h-14"
                            required
                        />

                        <Button
                            type="submit"
                            className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Setting up...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Create Account <ArrowRight className="w-5 h-5 font-bold" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-sm font-bold text-slate-400">
                            Already registered?{' '}
                            <Link to="/login" className="text-blue-700 hover:underline decoration-2 underline-offset-4 font-black">Sign In</Link>
                        </p>
                    </div>

                    <footer className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                            ElectionHub v1.0
                        </div>
                    </footer>
                </motion.div>
            </div>
        </div>
    );
};

export default Register;
