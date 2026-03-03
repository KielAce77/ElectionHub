import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabasePublic as supabase } from '../../lib/supabasePublic';
import { Card, Button, Badge, Logo } from '../../components/ui';
import { Loader2, BarChart3, Activity, ArrowLeft, TrendingUp, Users, Award, Calendar } from 'lucide-react';
import ResultsChart from '../../components/ResultsChart';
import { motion } from 'framer-motion';

const CandidateRow = ({ rank, name, affiliation, votes, percentage, isWinner }) => {
    return (
        <div className={`flex items-center gap-6 py-4 px-4 rounded-xl transition-all ${isWinner ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black ${isWinner ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {rank}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${isWinner ? 'text-blue-900' : 'text-slate-900'}`}>{name || 'Unnamed candidate'}</p>
                    {isWinner && <Award className="w-4 h-4 text-blue-600" />}
                </div>
                {affiliation && (
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-1 italic">"{affiliation}"</p>
                )}
                <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner border border-white/5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full transition-all duration-500 ${isWinner ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20' : 'bg-slate-400'}`}
                    />
                </div>
            </div>
            <div className="w-24 text-right">
                <p className={`text-sm font-black ${isWinner ? 'text-blue-700' : 'text-slate-900'}`}>{votes.toLocaleString()}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    {percentage.toFixed(1)}%
                </p>
            </div>
        </div>
    );
};

const PublicResults = () => {
    const { electionId } = useParams();
    const [loading, setLoading] = useState(true);
    const [election, setElection] = useState(null);
    const [positions, setPositions] = useState([]);
    const [votesByCandidate, setVotesByCandidate] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        fetchResults();
    }, [electionId]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            if (!electionId) return;

            const { data: chosenElection, error: electionError } = await supabase
                .from('elections')
                .select('*')
                .eq('id', electionId)
                .single();

            if (electionError || !chosenElection) {
                throw new Error('Election results are not publicly available or election not found.');
            }

            setElection(chosenElection);

            const [{ data: positionsData, error: positionsError }, { data: votes, error: votesError }] =
                await Promise.all([
                    supabase
                        .from('positions')
                        .select('*, candidates (*)')
                        .eq('election_id', chosenElection.id),
                    supabase
                        .from('votes')
                        .select('candidate_id')
                        .eq('election_id', chosenElection.id),
                ]);

            if (positionsError) throw positionsError;
            if (votesError) throw votesError;

            setPositions(positionsData || []);

            const counts = (votes || []).reduce((acc, v) => {
                if (!v.candidate_id) return acc;
                acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
                return acc;
            }, {});
            setVotesByCandidate(counts);
        } catch (err) {
            console.error('Error loading public election results:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalRegistered = election?.total_expected_voters || 0;
    const totalVotesCast = Object.values(votesByCandidate).reduce((sum, v) => sum + v, 0);
    const turnoutPct = totalRegistered > 0 ? (totalVotesCast / totalRegistered) * 100 : 0;

    const effectiveStatus = election?.status || 'UNKNOWN';

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
                <Loader2 className="w-12 h-12 text-blue-500 animate-[spin_2s_linear_infinite] mb-6" />
                <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-[10px]">Accessing Real-time Tally</p>
            </div>
        );
    }

    if (!election) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
                <Card className="max-w-md bg-slate-900 border-white/5 p-12 text-center">
                    <Activity className="w-12 h-12 text-slate-700 mx-auto mb-6" />
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Access Denied</h2>
                    <p className="text-slate-500 mt-4 font-medium italic">This election results page is unavailable or the link is invalid.</p>
                    <Button className="mt-8 w-full font-black uppercase tracking-widest" onClick={() => navigate('/vote')}>Return Home</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/vote')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest">
                            <ArrowLeft className="w-4 h-4" /> Exit
                        </button>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <div className="flex items-center gap-3">
                            <Logo className="w-8 h-8" iconClassName="w-4 h-4" />
                            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">ElectionHub Results</h2>
                        </div>
                    </div>
                    <Badge variant={effectiveStatus === 'active' ? 'success' : 'neutral'} className="font-black px-4 py-1.5 text-[9px] uppercase tracking-widest">
                        {effectiveStatus}
                    </Badge>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-16 space-y-16">
                <header className="space-y-6">
                    <div className="flex items-center gap-3 text-blue-700 font-black text-[10px] uppercase tracking-[0.4em]">
                        <Activity className="w-3.5 h-3.5" /> Certified Data Feed
                    </div>
                    <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-tight max-w-4xl">
                        {election.title}
                    </h1>
                    <p className="text-xl text-slate-500 font-medium italic border-l-4 border-slate-200 pl-8 leading-relaxed max-w-3xl">
                        {election.description}
                    </p>
                </header>

                {/* Global Stats */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="p-8 border-slate-200/60 bg-white">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Estimated Voters</p>
                            <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{totalRegistered.toLocaleString()}</p>
                    </Card>
                    <Card className="p-8 border-slate-200/60 bg-white ring-2 ring-blue-600 ring-offset-4 ring-offset-slate-50">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Ballots Digitized</p>
                            <Activity className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{totalVotesCast.toLocaleString()}</p>
                    </Card>
                    <Card className="p-8 border-slate-200/60 bg-white">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Current Participation</p>
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-black text-slate-900 tracking-tighter">{turnoutPct.toFixed(1)}%</p>
                            <div className="flex-grow h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600" style={{ width: `${turnoutPct}%` }} />
                            </div>
                        </div>
                    </Card>
                </section>

                {/* Categories */}
                <div className="space-y-40 py-20">
                    {positions.map((position) => {
                        const results = position.candidates.map(c => ({
                            id: c.id,
                            name: c.full_name,
                            votes: votesByCandidate[c.id] || 0,
                            bio: c.bio
                        })).sort((a, b) => b.votes - a.votes);

                        const totalForPos = results.reduce((s, c) => s + c.votes, 0) || 1;

                        return (
                            <div key={position.id} className="space-y-12">
                                <div className="flex items-center gap-6">
                                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{position.title}</h3>
                                    <div className="h-px bg-slate-200 flex-grow" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                    <Card className="lg:col-span-2 p-10 bg-white border-slate-200 border-2 rounded-3xl shadow-xl shadow-slate-200/20">
                                        <ResultsChart results={results} />
                                    </Card>
                                    <Card className="p-10 bg-white border-slate-200 rounded-3xl flex flex-col">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Live Distribution</h4>
                                        <div className="space-y-2 flex-grow overflow-y-auto">
                                            {results.map((r, idx) => (
                                                <CandidateRow
                                                    key={r.id}
                                                    rank={idx + 1}
                                                    name={r.name}
                                                    affiliation={r.bio}
                                                    votes={r.votes}
                                                    percentage={(r.votes / totalForPos) * 100}
                                                    isWinner={idx === 0 && r.votes > 0}
                                                />
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            <footer className="mt-20 py-16 bg-white border-t border-slate-200">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <Logo className="w-10 h-10 mx-auto mb-6 opacity-20" grayscale />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Digitally Certified by ElectionHub</p>
                </div>
            </footer>
        </div>
    );
};

export default PublicResults;
