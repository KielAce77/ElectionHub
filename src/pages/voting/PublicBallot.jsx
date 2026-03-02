import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabasePublic as supabase } from '../../lib/supabasePublic';
import { Button, Logo, Card, Badge } from '../../components/ui';
import { Check, ShieldAlert, Loader2, Send, ArrowLeft } from 'lucide-react';
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
            // 1. Verify token again and get election_id
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

            // 2. Get Election details
            const { data: electionData, error: electionError } = await supabase
                .from('elections')
                .select('*')
                .eq('id', tokenData.election_id)
                .single();

            if (electionError || !electionData) {
                toast.error('Election is not active.');
                navigate('/vote');
                return;
            }

            const now = new Date();
            const start = electionData.start_date ? new Date(electionData.start_date) : null;
            const end = electionData.end_date ? new Date(electionData.end_date) : null;
            const withinWindow =
                (!start || now >= start) &&
                (!end || now <= end);

            // Explicitly block only when we're outside the voting window,
            // or when the election has been marked as closed.
            // (We do not update status from the public portal.)
            if (!withinWindow || electionData.status === 'closed') {
                toast.error('Election is not active.');
                navigate('/vote');
                return;
            }

            // 3. Get Positions and Candidates
            const { data: positionsData, error: positionsError } = await supabase
                .from('positions')
                .select(`
                    *,
                    candidates (*)
                `)
                .eq('election_id', electionData.id);

            if (positionsError) throw positionsError;

            setElection(electionData);
            setPositions(positionsData);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Failed to load ballot.');
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
        // Validation: Must select all (if required) or at least check if all positions are covered
        if (Object.keys(selections).length < positions.length) {
            toast.error('Please make a selection for all positions.');
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

            if (error) {
                throw error;
            }

            toast.success('Ballot submitted successfully. Your voice has been heard.');
            navigate('/vote'); // Redirect back with success message
        } catch (err) {
            console.error('Submission error:', err);
            toast.error(err.message || 'Failed to submit ballot.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-700 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Decrypting Private Ballot...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Logo className="w-8 h-8" iconClassName="w-5 h-5" />
                        <div>
                            <h1 className="font-black text-slate-900 leading-tight uppercase tracking-tight text-sm">Secure Ballot</h1>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ElectionHub Portal</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Badge variant="success">Active Session</Badge>
                        <div className="h-4 w-px bg-slate-200" />
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{token.substring(0, 4)}...{token.substring(8)}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{election?.title}</h2>
                    <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{election?.description}</p>
                </div>

                <div className="space-y-16">
                    {positions.map((position) => (
                        <section key={position.id}>
                            <div className="flex items-baseline gap-4 mb-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{position.title}</h3>
                                <div className="h-px flex-1 bg-slate-200" />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Select One</span>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                {position.candidates.map((candidate) => (
                                    <button
                                        key={candidate.id}
                                        onClick={() => handleSelect(position.id, candidate.id)}
                                        className={`group relative flex items-start gap-4 p-6 rounded-2xl border-2 transition-all duration-300 text-left ${selections[position.id] === candidate.id
                                                ? 'border-blue-700 bg-blue-50/50 shadow-xl shadow-blue-700/5'
                                                : 'border-white bg-white hover:border-slate-200 hover:shadow-lg'
                                            }`}
                                    >
                                        <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selections[position.id] === candidate.id
                                                ? 'border-blue-700 bg-blue-700 text-white'
                                                : 'border-slate-200 bg-slate-50 group-hover:border-slate-300'
                                            }`}>
                                            {selections[position.id] === candidate.id && <Check className="w-4 h-4 stroke-[3]" />}
                                        </div>

                                        <div className="flex-1">
                                            {candidate.photo_url ? (
                                                <img
                                                    src={candidate.photo_url}
                                                    alt={candidate.full_name}
                                                    className="w-16 h-16 rounded-xl object-cover mb-4 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                                                    <Badge variant="neutral">{candidate.full_name.charAt(0)}</Badge>
                                                </div>
                                            )}
                                            <h4 className={`text-lg font-black tracking-tight ${selections[position.id] === candidate.id ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                {candidate.full_name}
                                            </h4>
                                            <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                                                {candidate.bio}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Submit Section */}
                <div className="mt-20 pt-12 border-t border-slate-200">
                    <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 p-8 opacity-10">
                            <ShieldAlert className="w-32 h-32" />
                        </div>

                        <div className="relative z-10 max-w-lg">
                            <h3 className="text-2xl font-black mb-4 tracking-tight">Ready to cast your ballot?</h3>
                            <p className="text-slate-400 mb-8 font-medium leading-relaxed">
                                Please review your selections. Once submitted, your token will be permanently invalidated and your vote recorded cryptographically.
                            </p>

                            <Button
                                onClick={handleSubmitBallot}
                                disabled={submitting}
                                className="h-16 px-12 bg-blue-600 hover:bg-blue-500 text-white border-none text-sm font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20"
                            >
                                {submitting ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Finalizing...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        Cast Official Ballot <Send className="w-5 h-5" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicBallot;
