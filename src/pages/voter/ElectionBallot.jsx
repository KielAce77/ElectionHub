import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge } from '../../components/ui';
import { ArrowLeft, Check, AlertCircle, ShieldCheck, Loader2, User, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ElectionBallot = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [election, setElection] = useState(null);
    const [positions, setPositions] = useState([]);
    const [selections, setSelections] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [alreadyVoted, setAlreadyVoted] = useState(false);

    useEffect(() => {
        fetchBallotData();
    }, [id, profile]);

    const fetchBallotData = async () => {
        if (!profile) return;
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
            console.error('Error fetching ballot:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (positionId, candidateId) => {
        setSelections(prev => ({ ...prev, [positionId]: candidateId }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const votesToInsert = Object.entries(selections).map(([posId, candId]) => ({
                voter_id: profile.id, election_id: id, position_id: posId, candidate_id: candId
            }));

            const { error } = await supabase.from('votes').insert(votesToInsert);
            if (error) throw error;
            navigate('/voter');
        } catch (err) {
            alert('Election submission failed: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
        </div>
    );

    if (alreadyVoted) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-md text-center py-12 px-8">
                <ShieldCheck className="w-16 h-16 text-blue-700 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Electronic Ballot Received</h2>
                <p className="text-slate-500 mb-8 font-medium">Your submission for this mandate has already been verified and entered into the secure ledger. Only one entry is permitted per official.</p>
                <Button className="w-full" onClick={() => navigate('/voter')}>Return to Secure Governance</Button>
            </Card>
        </div>
    );

    const allSelected = positions.every(p => selections[p.id]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 py-4 px-6 md:px-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button onClick={() => navigate('/voter')} className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Exit Ballot
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{election?.title}</h1>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Formal Polling Instrument</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                        <Badge variant="primary">SECURE SESSION</Badge>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
                <section className="bg-blue-50 border border-blue-100 rounded-lg p-6 flex items-start gap-4">
                    <Info className="w-5 h-5 text-blue-700 mt-1 flex-shrink-0" />
                    <div className="text-sm">
                        <h4 className="font-bold text-blue-900 uppercase tracking-tight mb-1">Mandate Instructions</h4>
                        <p className="text-blue-700 font-medium leading-relaxed">
                            Please select exactly one candidate for each of the following positions. Your selections will be cryptographically sealed upon submission. You cannot modify your ballot once cast.
                        </p>
                    </div>
                </section>

                {positions.map((position, idx) => (
                    <div key={position.id} className="space-y-8 fade-in" style={{ animationDelay: `${idx * 0.1}s` }}>
                        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                            <div className="flex items-center gap-4">
                                <span className="text-4xl font-black text-slate-100 italic tabular-nums">
                                    0{idx + 1}
                                </span>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{position.title}</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Election Category</p>
                                </div>
                            </div>
                            <Badge variant={selections[position.id] ? 'success' : 'warning'}>
                                {selections[position.id] ? 'Selection Made' : 'Pending Selection'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {position.candidates.map((candidate) => (
                                <div
                                    key={candidate.id}
                                    onClick={() => handleSelect(position.id, candidate.id)}
                                    className={`
                    relative cursor-pointer transition-all duration-300
                    ${selections[position.id] === candidate.id
                                            ? 'translate-y-[-2px] -selection-active'
                                            : 'hover:translate-y-[-2px]'}
                  `}
                                >
                                    <Card className={`
                    h-full flex items-center gap-5 p-5 border-2
                    ${selections[position.id] === candidate.id
                                            ? 'border-blue-700 bg-blue-50/30'
                                            : 'border-slate-200 hover:border-slate-300 bg-white shadow-none'}
                  `}>
                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 shadow-inner">
                                            {candidate.photo_url ? (
                                                <img src={candidate.photo_url} alt={candidate.full_name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                                                    <User className="w-8 h-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <h4 className="font-bold text-slate-900 text-lg tracking-tight uppercase">
                                                {candidate.full_name}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1 italic">
                                                {candidate.bio || 'Formal candidate statement pending organizational review.'}
                                            </p>
                                        </div>
                                        {selections[position.id] === candidate.id && (
                                            <div className="bg-blue-700 text-white rounded-full p-1.5 shadow-lg flex-shrink-0">
                                                <Check className="w-4 h-4 stroke-[3px]" />
                                            </div>
                                        )}
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="pt-12 border-t border-slate-200">
                    <Button
                        className="w-full py-10 text-2xl h-[80px]"
                        disabled={!allSelected}
                        onClick={() => setConfirming(true)}
                    >
                        Authenticate & Submit Ballot
                    </Button>
                    {!allSelected && (
                        <p className="text-center text-slate-400 mt-6 text-sm font-bold uppercase tracking-widest">
                            Please finalize all category selections to authorize submission.
                        </p>
                    )}
                </div>
            </main>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirming && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-lg"
                        >
                            <Card className="p-10 text-center shadow-2xl ring-1 ring-black/5">
                                <ShieldCheck className="w-16 h-16 text-blue-700 mx-auto mb-6" />
                                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">Authorize Submission</h3>
                                <p className="text-slate-500 mb-10 font-medium leading-relaxed">
                                    You are about to cast your final ballot. This action will initiate a cryptographic signature process. Once confirmed, your vote is permanent and verifiable.
                                </p>

                                <div className="flex flex-col gap-4">
                                    <Button
                                        variant="primary" size="lg" className="w-full py-5 text-xl"
                                        onClick={handleSubmit} disabled={submitting}
                                    >
                                        {submitting ? 'Authenticating...' : 'Confirm Submission'}
                                    </Button>
                                    <Button
                                        variant="ghost" className="w-full font-bold text-slate-400"
                                        onClick={() => setConfirming(false)} disabled={submitting}
                                    >
                                        Cancel and Review
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ElectionBallot;
