import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabasePublic as supabase } from '../../lib/supabasePublic';
import { Card, Button, Badge, Logo } from '../../components/ui';
import { Loader2, BarChart3, Activity, ArrowLeft, TrendingUp, Users, Award, Calendar } from 'lucide-react';
import ResultsChart from '../../components/ResultsChart';
import { motion } from 'framer-motion';

const CandidateRow = ({ rank, name, affiliation, votes, percentage, isWinner, photoUrl }) => {
    return (
        <div className={`flex items-center gap-6 py-4 px-4 rounded-xl transition-all ${isWinner ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-black shrink-0 ${isWinner ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {rank}
            </div>

            <div className="relative shrink-0">
                <div className={`w-12 h-12 rounded-xl overflow-hidden border ${isWinner ? 'w-16 h-16 border-blue-200 ring-4 ring-blue-50/50' : 'border-slate-200'} transition-all`}>
                    {photoUrl ? (
                        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-slate-300" />
                        </div>
                    )}
                </div>
                {isWinner && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-lg">
                        <Award className="w-3 h-3" />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${isWinner ? 'text-blue-900 text-base' : 'text-slate-900'}`}>{name || 'Unnamed candidate'}</p>
                    {isWinner && <Badge variant="success" className="text-[8px] font-black tracking-widest px-1.5">WINNER</Badge>}
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
        if (!electionId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);

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
            <nav className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button onClick={() => navigate('/vote')} className="flex items-center gap-1.5 md:gap-2 text-slate-500 hover:text-slate-900 font-black text-[9px] md:text-[10px] uppercase tracking-widest whitespace-nowrap">
                            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden xs:inline">Exit</span>
                        </button>
                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                            <Logo className="w-6 h-6 md:w-8 md:h-8 shrink-0" iconClassName="w-3 h-3 md:w-4 md:h-4" />
                            <h2 className="text-xs md:text-sm font-black text-slate-900 tracking-tight uppercase truncate">Results Portal</h2>
                        </div>
                    </div>
                    <Badge variant={effectiveStatus === 'active' ? 'success' : 'neutral'} className="font-black px-2 md:px-4 py-1.5 text-[8px] md:text-[9px] uppercase tracking-widest shrink-0">
                        {effectiveStatus}
                    </Badge>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-16 space-y-16">
                <header className="space-y-4 md:space-y-6">
                    <div className="flex items-center gap-3 text-blue-700 font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em]">
                        <Activity className="w-3 md:w-3.5 h-3 md:h-3.5" /> Certified Data Feed
                    </div>
                    <h1 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight max-w-4xl">
                        {election.title}
                    </h1>
                    <p className="text-base md:text-xl text-slate-500 font-medium italic border-l-4 border-slate-200 pl-6 md:pl-8 leading-relaxed max-w-3xl opacity-80">
                        {election.description}
                    </p>
                </header>

                {/* Global Stats */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    <Card className="p-6 md:p-8 border-slate-200/60 bg-white">
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Registered</p>
                            <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter truncate">{totalRegistered.toLocaleString()}</p>
                    </Card>
                    <Card className="p-6 md:p-8 border-slate-200/60 bg-white ring-2 ring-blue-600/50 ring-offset-4 ring-offset-slate-50">
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Votes Cast</p>
                            <Activity className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter truncate">{totalVotesCast.toLocaleString()}</p>
                    </Card>
                    <Card className="p-6 md:p-8 border-slate-200/60 bg-white sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center justify-between mb-6 md:mb-8">
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-widest">Turnout Rate</p>
                            <TrendingUp className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex items-baseline justify-between md:justify-start gap-4">
                            <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter shrink-0">{turnoutPct.toFixed(1)}%</p>
                            <div className="flex-grow max-w-[120px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                            bio: c.bio,
                            photo_url: c.photo_url
                        })).sort((a, b) => b.votes - a.votes);

                        const totalForPos = results.reduce((s, c) => s + c.votes, 0) || 1;

                        return (
                            <div key={position.id} className="space-y-12">
                                <div className="flex items-center gap-6">
                                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{position.title}</h3>
                                    <div className="h-px bg-slate-200 flex-grow" />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                                    <Card className="lg:col-span-2 p-6 md:p-10 bg-white border-slate-200 border md:border-2 rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200/20">
                                        <ResultsChart results={results} />
                                    </Card>
                                    <Card className="p-6 md:p-10 bg-white border-slate-200 rounded-2xl md:rounded-3xl flex flex-col">
                                        <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mb-6 md:mb-10">Live Distribution</h4>
                                        <div className="space-y-1 md:space-y-2 flex-grow overflow-y-auto max-h-[400px] md:max-h-none pr-1 md:pr-2 custom-scrollbar">
                                            {results.map((r, idx) => (
                                                <CandidateRow
                                                    key={r.id}
                                                    rank={idx + 1}
                                                    name={r.name}
                                                    affiliation={r.bio}
                                                    votes={r.votes}
                                                    percentage={(r.votes / totalForPos) * 100}
                                                    isWinner={idx === 0 && r.votes > 0}
                                                    photoUrl={r.photo_url}
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
