import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabasePublic as supabase } from '../../lib/supabasePublic';
import { Button, Logo, Card, Badge } from '../../components/ui';
import { Check, ShieldCheck, Loader2, Send, ChevronRight, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const PublicBallot = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [election, setElection] = useState(null);
    const [positions, setPositions] = useState([]);
    const [selections, setSelections] = useState({}); // { positionId: candidateId }

    useEffect(() => {
        fetchBallotData();
    }, [token]);

    const fetchBallotData = async () => {
        try {
            const { data: tokenData, error: tokenError } = await supabase
                .from('voting_tokens')
                .select('id, election_id, is_used')
                .eq('token', token)
                .single();

            if (tokenError || !tokenData || tokenData.is_used) {
                toast.error('Token invalid or already used.');
                navigate('/vote');
                return;
            }

            const { data: electionData, error: electionError } = await supabase
                .from('elections')
                .select('*')
                .eq('id', tokenData.election_id)
                .single();

            if (electionError || !electionData) {
                toast.error('Election data not found.');
                navigate('/vote');
                return;
            }

            const now = new Date();
            const start = electionData.start_date ? new Date(electionData.start_date) : null;
            const end = electionData.end_date ? new Date(electionData.end_date) : null;
            const withinWindow = (!start || now >= start) && (!end || now <= end);

            if (!withinWindow || electionData.status === 'closed') {
                toast.error('This election is currently inactive.');
                navigate('/vote');
                return;
            }

            const { data: positionsData, error: positionsError } = await supabase
                .from('positions')
                .select('*, candidates (*)')
                .eq('election_id', electionData.id);

            if (positionsError) throw positionsError;

            setElection(electionData);
            setPositions(positionsData);
        } catch (err) {
            console.error('Ballot fetch error:', err);
            toast.error('Failed to load credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (positionId, candidateId) => {
        setSelections(prev => ({
            ...prev,
            [positionId]: candidateId
        }));
    };

    const handleSubmitBallot = async () => {
        if (Object.keys(selections).length < positions.length) {
            toast.error('Selection required for all categories.');
            return;
        }

        setSubmitting(true);
        try {
            const votesData = Object.entries(selections).map(([posId, candId]) => ({
                position_id: posId,
                candidate_id: candId
            }));

            const { error } = await supabase.rpc('submit_ballot', {
                p_token: token,
                p_votes: votesData
            });

            if (error) throw error;

            toast.success('Ballot digitized successfully. Session terminated.');
            navigate('/vote');
        } catch (err) {
            console.error('Submission error:', err);
            toast.error(err.message || 'Transmission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="relative inline-block mb-8">
                        <Loader2 className="w-16 h-16 text-blue-500 animate-[spin_2s_linear_infinite]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-blue-200/40 font-black uppercase tracking-[0.4em] text-[10px]">Authorizing Secure Stream</p>
                </div>
            </div>
        );
    }

    const progress = Math.round((Object.keys(selections).length / positions.length) * 100) || 0;

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-200 flex flex-col">
            {/* High-End Navigation */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 py-4 px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Logo className="w-10 h-10 shadow-2xl shadow-blue-500/20" />
                        <div className="hidden sm:block">
                            <h2 className="text-white font-black uppercase tracking-tighter text-sm">Official Voting Portal</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Election ID: {election?.id.substring(0, 8)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
                                <span className="text-xs font-black text-blue-400 tabular-nums">{progress}%</span>
                            </div>
                            <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <Badge variant="primary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-4 py-1.5 h-auto font-black italic">
                            ENCRYPTED
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-16">
                {/* Election Title Section */}
                <div className="mb-20 space-y-4">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-6xl font-black text-white tracking-tighter max-w-4xl leading-[1.1]">
                            {election?.title}
                        </h1>
                        <p className="text-xl text-slate-400 mt-6 max-w-3xl leading-relaxed font-medium">
                            {election?.description}
                        </p>
                    </motion.div>
                </div>

                {/* Ballot Logic */}
                <div className="space-y-32">
                    {positions.map((position, pIdx) => (
                        <motion.section
                            key={position.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="space-y-12"
                        >
                            <div className="flex items-center gap-6">
                                <div className="text-6xl font-black text-white/5 italic tabular-nums">0{pIdx + 1}</div>
                                <div className="flex-grow">
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tight">{position.title}</h3>
                                    <div className="h-0.5 w-12 bg-blue-500 mt-2" />
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Status</p>
                                    <Badge variant={selections[position.id] ? "success" : "neutral"} className="rounded-md px-3 font-black">
                                        {selections[position.id] ? "SELECTED" : "REQUIRED"}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {position.candidates.map((candidate) => {
                                    const isSelected = selections[position.id] === candidate.id;
                                    return (
                                        <motion.div
                                            key={candidate.id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Card
                                                onClick={() => handleSelect(position.id, candidate.id)}
                                                className={`group relative overflow-hidden transition-all duration-500 cursor-pointer border-none shadow-none h-full bg-slate-900/40 hover:bg-slate-900/60 ring-1 ${isSelected ? 'ring-blue-500' : 'ring-white/5 hover:ring-white/10'}`}
                                            >
                                                {/* Candidate Image with Overlay */}
                                                <div className="relative aspect-[4/5] overflow-hidden">
                                                    {candidate.photo_url ? (
                                                        <img
                                                            src={candidate.photo_url}
                                                            alt={candidate.full_name}
                                                            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isSelected ? 'scale-110' : ''}`}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center gap-4">
                                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                                                                <User className="w-8 h-8 text-slate-700" />
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Image Unavailable</span>
                                                        </div>
                                                    )}

                                                    {/* Selection Glow */}
                                                    <AnimatePresence>
                                                        {isSelected && (
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="absolute inset-0 bg-blue-500/20 mix-blend-overlay border-[6px] border-blue-500"
                                                            />
                                                        )}
                                                    </AnimatePresence>

                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-transparent to-transparent pointer-events-none" />

                                                    {/* Floating Badge */}
                                                    <div className="absolute top-4 right-4">
                                                        {isSelected && (
                                                            <motion.div
                                                                initial={{ scale: 0, rotate: -20 }}
                                                                animate={{ scale: 1, rotate: 0 }}
                                                                className="bg-blue-500 text-white rounded-full p-2 shadow-2xl shadow-blue-500/50 ring-4 ring-slate-950"
                                                            >
                                                                <Check className="w-6 h-6 stroke-[4]" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-8 space-y-4">
                                                    <div>
                                                        <h4 className="text-2xl font-black text-white tracking-tight uppercase group-hover:text-blue-400 transition-colors">
                                                            {candidate.full_name}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Official Candidate</p>
                                                    </div>
                                                    <p className="text-sm text-slate-400 font-medium leading-relaxed italic opacity-80 line-clamp-3 group-hover:opacity-100 transition-opacity">
                                                        "{candidate.bio || 'Formal statement pending.'}"
                                                    </p>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.section>
                    ))}
                </div>

                {/* Final Submission Card */}
                <section className="mt-40 mb-24">
                    <Card className="bg-slate-950 border border-white/5 p-12 relative overflow-hidden group">
                        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-all duration-700" />

                        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                            <div className="max-w-xl space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                                        <ShieldCheck className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white tracking-tight">Authorize Submission</h3>
                                </div>
                                <p className="text-slate-400 font-medium leading-relaxed">
                                    By clicking below, you attest that these selections represent your formal mandate. Your unique credentials will be retired and your ballot cryptographically signed.
                                </p>
                            </div>

                            <div className="shrink-0 w-full lg:w-auto">
                                <Button
                                    onClick={handleSubmitBallot}
                                    disabled={submitting}
                                    className={`w-full lg:w-80 h-24 text-sm font-black uppercase tracking-[0.3em] transition-all duration-300 ${progress === 100 ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.2)]' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}
                                >
                                    {submitting ? (
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="w-6 h-6 animate-spin" /> Digitizing...
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            {progress === 100 ? 'Cast Official Ballot' : 'Incomplete Selections'}
                                            {progress === 100 && <Send className="w-5 h-5" />}
                                        </div>
                                    )}
                                </Button>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] text-center mt-6">Secure Terminal V4.2.0</p>
                            </div>
                        </div>
                    </Card>
                </section>
            </main>

            <footer className="py-12 border-t border-white/5 bg-slate-950/50">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
                    <div className="flex items-center gap-4">
                        <Logo className="w-6 h-6 grayscale" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Protected by Institutional Cryptography</span>
                    </div>
                    <div className="flex gap-8">
                        <span className="text-[10px] font-black uppercase tracking-widest">Terms of Service</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">Privacy Protocol</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicBallot;
