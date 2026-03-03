import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge, Logo } from '../../components/ui';
import { ArrowLeft, Check, ShieldCheck, Loader2, User, Send, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ElectionBallot = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [election, setElection] = useState(null);
    const [positions, setPositions] = useState([]);
    const [selections, setSelections] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alreadyVoted, setAlreadyVoted] = useState(false);

    useEffect(() => {
        if (profile) fetchBallotData();
    }, [id, profile]);

    const fetchBallotData = async () => {
        try {
            const { data: electionData, error: electionError } = await supabase
                .from('elections').select('*').eq('id', id).single();

            if (electionError) throw electionError;
            if (electionData.status !== 'active') { navigate('/voter'); return; }
            setElection(electionData);

            const { data: posData, error: posError } = await supabase
                .from('positions').select('*, candidates(*)').eq('election_id', id);

            if (posError) throw posError;
            setPositions(posData);

            const { data: voteData } = await supabase
                .from('votes').select('id').eq('election_id', id).eq('voter_id', profile.id).limit(1);

            if (voteData?.length > 0) setAlreadyVoted(true);
        } catch (err) {
            console.error('Ballot retrieval error:', err);
            toast.error('Identity check failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (positionId, candidateId) => {
        setSelections(prev => ({ ...prev, [positionId]: candidateId }));
    };

    const handleSubmit = async () => {
        if (Object.keys(selections).length < positions.length) {
            toast.error('Clear mandate required for all positions.');
            return;
        }

        setSubmitting(true);
        try {
            const votesToInsert = Object.entries(selections).map(([posId, candId]) => ({
                voter_id: profile.id,
                election_id: id,
                position_id: posId,
                candidate_id: candId
            }));

            const { error } = await supabase.from('votes').insert(votesToInsert);
            if (error) throw error;

            toast.success('Ballot officially cast and sealed.');
            navigate('/voter');
        } catch (err) {
            toast.error(err.message || 'Transmission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-6" />
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Establishing Secure Context</p>
            </div>
        </div>
    );

    if (alreadyVoted) return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0c10] p-6">
            <Card className="max-w-md bg-slate-900 border-white/5 p-12 text-center shadow-2xl">
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
                    <ShieldCheck className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Identity Detected</h2>
                <p className="text-slate-400 mb-10 font-medium leading-relaxed italic">
                    Our cryptographically secured ledger indicates that your mandate has already been recorded for this election. Multiple entries are prohibited.
                </p>
                <Button className="w-full h-14 font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500" onClick={() => navigate('/voter')}>
                    Exit Secure Portal
                </Button>
            </Card>
        </div>
    );

    const progress = Math.round((Object.keys(selections).length / positions.length) * 100) || 0;

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-200">
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 py-4 px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button onClick={() => navigate('/voter')} className="text-slate-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all">
                        <ArrowLeft className="w-4 h-4" /> Cancel Session
                    </button>

                    <div className="text-center hidden sm:block">
                        <h1 className="text-sm font-black text-white uppercase tracking-[0.3em]">{election?.title || 'Ballot Loading'}</h1>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Internal Organization Mandate</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        </div>
                        <Badge variant="primary" className="bg-blue-500/10 text-blue-400 border-none font-black italic">PROCESSED {progress}%</Badge>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-20 space-y-32">
                <section className="relative overflow-hidden p-12 rounded-[2.5rem] bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-white/5">
                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
                        <ShieldCheck className="w-64 h-64 text-blue-500" />
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-5xl font-black text-white tracking-tighter leading-tight mb-6">Electronic Mandate Delivery</h2>
                        <p className="text-xl text-slate-400 font-medium leading-relaxed italic border-l-4 border-blue-500 pl-8">
                            Identify the candidate who represents your organizational priorities for the ensuing term. Each category requires exactly one selection to authorize terminal submission.
                        </p>
                    </div>
                </section>

                <div className="space-y-40">
                    {positions.map((position, pIdx) => (
                        <motion.section
                            key={position.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="space-y-12"
                        >
                            <div className="flex items-end gap-6 pb-6 border-b border-white/5">
                                <div className="text-7xl font-black text-white/5 italic tabular-nums leading-none">0{pIdx + 1}</div>
                                <div className="flex-grow">
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tight">{position.title}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.5em] mt-2">Active Mandate Category</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant={selections[position.id] ? 'success' : 'neutral'} className={`h-8 px-6 text-[10px] font-black uppercase tracking-widest ${selections[position.id] ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-transparent'}`}>
                                        {selections[position.id] ? 'SELECTION VERIFIED' : 'PENDING ACTION'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {position.candidates.map((candidate) => {
                                    const isSelected = selections[position.id] === candidate.id;
                                    return (
                                        <motion.div
                                            key={candidate.id}
                                            whileHover={{ y: -8 }}
                                            transition={{ type: "spring", stiffness: 300 }}
                                            onClick={() => handleSelect(position.id, candidate.id)}
                                            className="cursor-pointer group"
                                        >
                                            <Card className={`relative h-full overflow-hidden border-none bg-slate-900/40 hover:bg-slate-900/60 ring-1 transition-all duration-300 ${isSelected ? 'ring-blue-500 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.3)]' : 'ring-white/5 hover:ring-white/20 shadow-none'}`}>

                                                <div className="relative aspect-[4/5] overflow-hidden bg-slate-950">
                                                    {candidate.photo_url ? (
                                                        <img src={candidate.photo_url} alt={candidate.full_name} className={`w-full h-full object-cover transition-transform duration-1000 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center opacity-20">
                                                            <User className="w-16 h-16" />
                                                            <span className="text-[10px] uppercase font-black tracking-widest mt-4">Profile Missing</span>
                                                        </div>
                                                    )}

                                                    {/* Overlays */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                                                    {isSelected && <div className="absolute inset-0 bg-blue-500/10 mix-blend-color" />}

                                                    {/* Selection Marker */}
                                                    <AnimatePresence>
                                                        {isSelected && (
                                                            <motion.div
                                                                initial={{ scale: 0, rotate: -20 }}
                                                                animate={{ scale: 1, rotate: 0 }}
                                                                className="absolute top-6 right-6 bg-blue-500 text-white rounded-full p-2.5 shadow-2xl ring-4 ring-slate-950"
                                                            >
                                                                <Check className="w-5 h-5 stroke-[4]" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <div className="p-8 space-y-4">
                                                    <div>
                                                        <h4 className="text-xl font-black text-white tracking-tight uppercase group-hover:text-blue-400 transition-colors">{candidate.full_name}</h4>
                                                        <div className="h-0.5 w-8 bg-blue-500 mt-3 group-hover:w-full transition-all duration-500" />
                                                    </div>
                                                    <p className="text-sm text-slate-400 font-medium leading-relaxed italic opacity-80 h-20 line-clamp-3 overflow-hidden">
                                                        "{candidate.bio || 'Credentials under organizational review.'}"
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

                <div className="pt-24 border-t border-white/5 flex flex-col items-center">
                    <div className="max-w-2xl text-center mb-12">
                        <AlertCircle className="w-12 h-12 text-slate-700 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Terminal Authorization</h3>
                        <p className="text-slate-500 font-medium leading-relaxed italic">
                            Validate your selections before initiating the terminal transmission protocol. This ballot will be cryptographically sealed. This action is irreversible.
                        </p>
                    </div>

                    <Button
                        disabled={progress < 100 || submitting}
                        onClick={handleSubmit}
                        className={`w-full max-w-sm h-20 text-sm font-black uppercase tracking-[0.4em] transition-all duration-500 ${progress === 100 ? 'bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-500/20' : 'bg-slate-800 text-slate-600 opacity-50 cursor-not-allowed'}`}
                    >
                        {submitting ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 animate-spin" /> Authorizing...
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                {progress === 100 ? 'Confirm Identity & Cast' : 'Mandate Incomplete'}
                                {progress === 100 && <Send className="w-5 h-5" />}
                            </div>
                        )}
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default ElectionBallot;
