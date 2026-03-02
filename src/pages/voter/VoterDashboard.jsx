import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge } from '../../components/ui';
import { Shield, Calendar, LogOut, ChevronRight, Inbox, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const VoterDashboard = () => {
    const { profile, signOut } = useAuth();
    const [elections, setElections] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchElections();
    }, [profile]);

    const fetchElections = async () => {
        if (!profile?.organization_id) return;
        try {
            const { data, error } = await supabase
                .from('elections')
                .select(`*, votes!left(id)`)
                .eq('organization_id', profile.organization_id)
                .order('start_date', { ascending: false });

            if (error) throw error;
            setElections(data);
        } catch (err) {
            console.error('Error fetching elections:', err);
        } finally {
            setLoading(false);
        }
    };

    const statusMap = {
        active: { variant: 'success', label: 'Active Polling' },
        upcoming: { variant: 'primary', label: 'Scheduled' },
        closed: { variant: 'neutral', label: 'Concluded' },
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Professional Navigation */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-700 p-1.5 rounded-lg">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-extrabold text-slate-900 tracking-tight text-xl">ElectionHub</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900 leading-none">{profile?.full_name}</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Authorized Official</p>
                        </div>
                        <button onClick={signOut} className="text-slate-400 hover:text-red-600 transition-colors">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <header className="mb-12">
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-[0.2em] mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-700"></div>
                        Governance Portal
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Voter Compliance & Ballots</h1>
                    <p className="text-slate-500 mt-2 font-medium max-w-2xl">
                        Welcome to the official {profile?.organizations?.name} voting platform. Please review the active mandates and cast your vote before the scheduled deadline.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-6">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-4 ml-1">
                            <Inbox className="w-4 h-4" /> Available Mandates
                        </h2>

                        {loading ? (
                            Array(2).fill(0).map((_, i) => (
                                <div key={i} className="h-40 bg-white border border-slate-200 rounded-lg animate-pulse" />
                            ))
                        ) : elections.length === 0 ? (
                            <Card className="text-center py-16 bg-white border-dashed border-2 border-slate-200 shadow-none">
                                <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-400">No active mandates found.</h3>
                                <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">There are currently no elections scheduled for your organizational unit.</p>
                            </Card>
                        ) : (
                            elections.map((election) => (
                                <motion.div key={election.id} whileHover={{ x: 4 }} className="fade-in">
                                    <Card className="hover:border-blue-200 group p-0 overflow-hidden flex flex-col sm:flex-row shadow-none">
                                        <div className="p-6 flex-grow">
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge variant={statusMap[election.status].variant}>
                                                    {statusMap[election.status].label}
                                                </Badge>
                                                <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {election.status === 'closed' ? 'Concluded' : `Closes ${format(new Date(election.end_date), 'MMM d')}`}
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                                                {election.title}
                                            </h3>
                                            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4 font-medium">
                                                {election.description || 'Mandate formalization and organizational decision support.'}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 sm:w-56 p-6 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-100">
                                            {election.status === 'active' ? (
                                                <Button
                                                    className="w-full gap-2 shadow-blue-700/10"
                                                    onClick={() => navigate(`/voter/election/${election.id}`)}
                                                >
                                                    Access Ballot <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button variant="secondary" className="w-full cursor-not-allowed opacity-60" disabled>
                                                    {election.status === 'closed' ? 'Review Only' : 'Locked'}
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Compliance Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="bg-blue-700 border-none text-white p-8">
                            <Shield className="w-8 h-8 text-blue-200 mb-6" />
                            <h3 className="text-xl font-bold mb-4">Integrity Verified</h3>
                            <p className="text-blue-100 text-sm leading-relaxed mb-6 font-medium">
                                Our voting process is audited in real-time. Every vote is cryptographically signed and stored in an immutable ledger to ensure total transparency.
                            </p>
                            <div className="space-y-4 pt-4 border-t border-blue-600">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-4 h-4 text-blue-300" />
                                    <span className="text-xs font-bold uppercase tracking-wider">SECURE-VOTE-256</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-4 h-4 text-blue-300" />
                                    <span className="text-xs font-bold uppercase tracking-wider">End-to-End Encryption</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-white border-slate-200">
                            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Voter ID Records</h4>
                            <div className="flex items-center gap-4 border border-slate-100 p-4 rounded-lg bg-slate-50">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm">
                                    {profile?.full_name?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900 uppercase tracking-tight line-clamp-1">{profile?.full_name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">{profile?.email}</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium mt-4 italic text-center leading-relaxed">
                                Verification status: Organizational Clearance Active.
                            </p>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VoterDashboard;
