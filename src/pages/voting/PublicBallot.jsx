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

            // Safely mark the token as used in the registry to prevent redundant voting sessions.
            await supabase
                .from('voting_tokens')
                .update({
                    is_used: true,
                    used_at: new Date().toISOString()
                })
                .eq('token', token);

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
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <Logo className="w-8 h-8 md:w-10 md:h-10 shadow-2xl shadow-blue-500/20 shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-white font-black uppercase tracking-tighter text-xs md:text-sm truncate">Voting Portal</h2>
                            <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">Election ID: {election?.id.substring(0, 8)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6 shrink-0">
                        <div className="hidden xs:flex flex-col items-end gap-1">
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
                                <span className="text-[10px] md:text-xs font-black text-blue-400 tabular-nums">{progress}%</span>
                            </div>
                            <div className="w-20 md:w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                        <Badge variant="primary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-2 md:px-4 py-1.5 h-auto font-black italic text-[8px] md:text-[10px]">
                            ENCRYPTED
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-16">
                {/* Election Title Section */}
                <div className="mb-12 md:mb-20 space-y-4">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter max-w-4xl leading-[1.1]">
                            {election?.title}
                        </h1>
                        <p className="text-base md:text-xl text-slate-400 mt-4 md:mt-6 max-w-3xl leading-relaxed font-medium">
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
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="text-4xl md:text-6xl font-black text-white/5 italic tabular-nums">0{pIdx + 1}</div>
                                <div className="flex-grow">
                                    <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight">{position.title}</h3>
                                    <div className="h-0.5 w-8 md:w-12 bg-blue-500 mt-2" />
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1">Status</p>
                                    <Badge variant={selections[position.id] ? "success" : "neutral"} className="rounded-md px-2 md:px-3 font-black text-[9px] md:text-[10px]">
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
                                            whileHover={{ y: -5 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                            onClick={() => handleSelect(position.id, candidate.id)}
                                            className="cursor-pointer group"
                                        >
                                            <Card className={`relative h-full overflow-hidden border-none bg-slate-900/40 hover:bg-slate-900/60 ring-1 transition-all duration-300 ${isSelected ? 'ring-blue-500 bg-blue-500/5' : 'ring-white/5 hover:ring-white/20'}`}>

                                                <div className="p-6 md:p-8 flex flex-col items-center text-center space-y-5 md:space-y-6">
                                                    {/* Radio Button Style Indicator */}
                                                    <div className="absolute top-4 left-4 md:top-6 md:left-6">
                                                        <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                                                            {isSelected && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white stroke-[4]" />}
                                                        </div>
                                                    </div>

                                                    {/* Candidate Photo / Circle */}
                                                    <div className="relative">
                                                        <div className={`w-32 h-32 md:w-48 md:h-48 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${isSelected ? 'ring-4 ring-blue-500' : 'ring-1 ring-white/10'}`}>
                                                            {candidate.photo_url ? (
                                                                <img
                                                                    src={candidate.photo_url}
                                                                    alt={candidate.full_name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                                    <span className="text-3xl md:text-4xl font-black text-white opacity-20">
                                                                        {candidate.full_name?.charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isSelected && (
                                                            <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-widest shadow-xl">
                                                                Selected
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Name & Bio */}
                                                    <div className="space-y-2 md:space-y-3">
                                                        <h4 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase group-hover:text-blue-400 transition-colors">
                                                            {candidate.full_name}
                                                        </h4>
                                                        <p className="text-[10px] md:text-xs text-slate-400 font-medium leading-relaxed italic opacity-80 line-clamp-2 max-w-[200px]">
                                                            "{candidate.bio || 'No description provided.'}"
                                                        </p>
                                                    </div>

                                                    <button className={`w-full py-2.5 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 group-hover:bg-white/10'}`}>
                                                        {isSelected ? 'Candidate Selected' : 'Choose Candidate'}
                                                    </button>
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
                    <Card className="bg-slate-950 border border-white/5 p-8 md:p-12 relative overflow-hidden group">
                        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] group-hover:bg-blue-500/10 transition-all duration-700" />

                        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 md:gap-12">
                            <div className="max-w-xl space-y-4 md:space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                                        <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">Authorize Submission</h3>
                                </div>
                                <p className="text-sm md:text-slate-400 font-medium leading-relaxed opacity-70">
                                    By clicking below, you attest that these selections represent your formal mandate. Your unique credentials will be retired and your ballot cryptographically signed.
                                </p>
                            </div>

                            <div className="shrink-0 w-full lg:w-auto">
                                <Button
                                    onClick={handleSubmitBallot}
                                    disabled={submitting}
                                    className={`w-full lg:w-80 h-20 md:h-24 text-xs md:text-sm font-black uppercase tracking-[0.3em] transition-all duration-300 ${progress === 100 ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.2)]' : 'bg-slate-800 opacity-50 cursor-not-allowed'}`}
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
                                <p className="text-[9px] md:text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] text-center mt-6">Secure Terminal V4.2.0</p>
                            </div>
                        </div>
                    </Card>
                </section>
            </main>

            <footer className="py-12 border-t border-white/5 bg-slate-950/50">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
                    <div className="flex items-center gap-4">
                        <Logo className="w-6 h-6 grayscale" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Secure, Audited Election Environment</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicBallot;
