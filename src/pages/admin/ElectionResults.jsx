import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge, Logo } from '../../components/ui';
import { Loader2, BarChart3, Activity, ArrowLeft, TrendingUp, Users, Award, Calendar, LogOut, FileText } from 'lucide-react';
import ResultsChart from '../../components/ResultsChart';
import { motion } from 'framer-motion';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const CandidateRow = ({ rank, name, affiliation, votes, percentage, isWinner, photoUrl }) => {
  return (
    <div className={`flex items-center gap-6 py-4 px-4 rounded-xl transition-all ${isWinner ? 'bg-blue-50/50 ring-1 ring-blue-100 scale-[1.02] shadow-sm' : 'hover:bg-slate-50 opacity-80'}`}>
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
        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden shadow-inner">
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

const ElectionResults = () => {
  const { electionId } = useParams();
  const { profile, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [votesByCandidate, setVotesByCandidate] = useState({});
  const navigate = useNavigate();
  const query = useQuery();
  const [showLogoutModal, setShowLogoutModal] = useState(false); // Added for logout modal

  useEffect(() => {
    if (authLoading) return;

    if (profile?.organization_id) {
      setLoading(true); // Use setLoading for this component
      fetchResults();
    } else {
      // If no profile yet, but auth is done, we might be waiting for ensureProfile
      // We'll keep loading true for a bit longer to avoid flicker
      const timer = setTimeout(() => {
        if (!profile?.organization_id) setLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, profile?.id, profile?.organization_id, electionId, query.get('electionId')]); // Added electionId and query.get('electionId') to dependencies

  const fetchResults = async () => {
    try {
      setLoading(true);
      const orgId = profile?.organization_id;

      if (!orgId) {
        if (!authLoading) setLoading(false);
        return;
      }

      const requestedElectionId = electionId || query.get('electionId');

      const { data: elections, error: electionsError } = await supabase
        .from('elections')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (electionsError) throw electionsError;

      if (!elections || elections.length === 0) {
        setLoading(false);
        return;
      }

      const chosenElection =
        elections?.find((e) => e.id === requestedElectionId) || elections?.[0];

      if (!chosenElection) {
        setLoading(false);
        return;
      }

      setElection(chosenElection);

      const [{ data: positionsData, error: positionsError }, { data: votes, error: votesError }] =
        await Promise.all([
          supabase
            .from('positions')
            .select(`
              id,
              title,
              candidates (
                id,
                full_name,
                bio,
                photo_url
              )
            `)
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
      console.error('Error loading election results:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalRegistered = election?.total_expected_voters || 0;
  const totalVotesCast = Object.values(votesByCandidate).reduce((sum, v) => sum + v, 0);
  const turnoutPct = totalRegistered > 0 ? (totalVotesCast / totalRegistered) * 100 : 0;

  const computeStatus = () => {
    if (!election) return 'NONE';
    const now = new Date();
    const start = election.start_date ? new Date(election.start_date) : null;
    const end = election.end_date ? new Date(election.end_date) : null;

    if (start && now < start) return 'UPCOMING';
    if (end && now > end) return 'ENDED';
    return 'LIVE';
  };

  const effectiveStatus = computeStatus();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading Election Intelligence...</p>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full">
          <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Results Not Found</h2>
          <p className="text-slate-500 font-medium mb-8">We couldn't find any results for this election. Ensure you have the correct link or try returning to the dashboard.</p>
          <Button onClick={() => navigate('/admin')} className="w-full h-12">Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!election || !positions.length) return;

    let csvContent = `Election: ${election.title}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    positions.forEach(pos => {
      csvContent += `Position: ${pos.title}\n`;
      csvContent += `Rank,Candidate,Bio,Votes,Percentage\n`;

      const candidateTotals = pos.candidates.map((c) => ({
        id: c.id,
        name: c.full_name,
        votes: votesByCandidate[c.id] || 0,
        bio: c.bio
      })).sort((a, b) => b.votes - a.votes);

      const totalForPos = candidateTotals.reduce((s, c) => s + c.votes, 0) || 1;

      candidateTotals.forEach((cand, idx) => {
        const pct = ((cand.votes / totalForPos) * 100).toFixed(1);
        csvContent += `${idx + 1},"${cand.name}","${cand.bio || ''}",${cand.votes},${pct}%\n`;
      });
      csvContent += `\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${election.title.replace(/\s+/g, '_')}_Results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-30 transition-all">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4 md:gap-8">
            <button
              type="button"
              onClick={() => navigate('/admin/')}
              className="flex items-center gap-2 md:gap-3 text-slate-500 hover:text-blue-700 transition-all font-black text-[10px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] py-2 md:py-3"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Exit</span>
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <div className="bg-slate-950 p-1.5 rounded-xl shadow-lg shadow-black/10 shrink-0">
                <Logo className="w-4 h-4 md:w-5 md:h-5" iconClassName="w-2.5 h-2.5 md:w-3 md:h-3" />
              </div>
              <p className="text-xs font-black text-slate-950 tracking-tighter uppercase italic truncate max-w-[120px] md:max-w-none">Intelligence Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={effectiveStatus === 'LIVE' ? 'success' : 'neutral'} className="font-black tracking-[0.1em] md:tracking-[0.2em] px-2 md:px-4 py-1.5 text-[8px] md:text-[9px] shrink-0">
              <span className="hidden xs:inline">STATUS:</span> {effectiveStatus}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLogoutModal(true)}
              className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-100 transition-all font-bold px-3 md:px-4 h-10 w-10 md:h-11 md:w-auto flex items-center gap-2"
              title="Log Out"
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline uppercase text-[10px] tracking-widest">Sign Out</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12 space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 pb-4 border-b border-slate-200">
          <div className="space-y-2 md:space-y-3 w-full md:w-auto">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-blue-100">
              <Activity className="w-3 h-3" /> Audit-Ready Performance
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight md:leading-none">
              Real-time Results
            </h1>
            <p className="text-sm md:text-lg text-slate-500 font-medium">
              Data for <span className="text-slate-900 font-bold underline decoration-indigo-500/20 underline-offset-4 truncate inline-block max-w-[200px] md:max-w-none align-bottom">{election?.title}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button onClick={handleExportCSV} variant="secondary" className="gap-2 font-black text-[10px] uppercase tracking-widest border-slate-200 flex-1 md:flex-initial justify-center h-11">
              <FileText className="w-4 h-4" /> Export CSV
            </Button>
            <div className="hidden sm:flex flex-col items-end gap-1 ml-4 shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last synced</p>
              <p className="text-xs font-bold text-slate-900">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Expected Voters', value: totalRegistered, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Ballots', value: totalVotesCast, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            {
              label: 'Voter Turnout',
              value: `${totalRegistered > 0 ? turnoutPct.toFixed(1) : 0}%`,
              icon: TrendingUp,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50'
            },
            { label: 'Remaining', value: totalRegistered - totalVotesCast, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, idx) => (
            <Card key={idx} className="p-4 md:p-6 border-slate-200/60 shadow-none hover:shadow-xl hover:shadow-slate-200/40 transition-all flex md:flex-col justify-between items-center md:items-start gap-4">
              <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center shrink-0 md:mb-6`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 md:flex-initial text-right md:text-left">
                <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] mb-1">{stat.label}</p>
                <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter tabular-nums truncate">{stat.value.toLocaleString()}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
            <div className="max-w-sm">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">Participation Progress</h3>
              <p className="text-[11px] md:text-sm text-slate-500 font-bold leading-relaxed">
                Visualizing distribution of <span className="text-slate-900">{totalVotesCast.toLocaleString()}</span> ballots out of <span className="text-slate-900">{totalRegistered.toLocaleString()}</span> expected credentials.
              </p>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="flex justify-between items-end mb-3">
                <span className="text-3xl md:text-4xl font-black text-slate-900">{Math.round(turnoutPct)}%</span>
                <span className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest">{totalVotesCast} VALIDATED</span>
              </div>
              <div className="h-3 md:h-4 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(turnoutPct, 100)}%` }}
                  transition={{ duration: 1.5, ease: "anticipate" }}
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-16">
          {positions.map((position) => {
            const candidateTotals = position.candidates.map((c) => ({
              id: c.id,
              name: c.full_name,
              votes: votesByCandidate[c.id] || 0,
              bio: c.bio
            }));
            candidateTotals.sort((a, b) => b.votes - a.votes);
            const totalForPosition = candidateTotals.reduce((s, c) => s + c.votes, 0) || 1;
            const winnerId = candidateTotals[0].votes > 0 ? candidateTotals[0].id : null;

            return (
              <div key={position.id} className="space-y-6">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <h2 className="text-[10px] md:text-xs font-black text-blue-700 bg-blue-50 px-3 md:px-4 py-1.5 rounded-full uppercase tracking-[0.2em] md:tracking-[0.3em] truncate shrink-0">
                    Scope: {position.title}
                  </h2>
                  <div className="h-px bg-slate-200 flex-grow"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-2 p-8 shadow-none border-slate-200/80 bg-white rounded-3xl">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Statistical Distribution</h4>
                      <Badge variant="primary" className="text-[9px] font-black">LEAD: {candidateTotals[0].name.toUpperCase()}</Badge>
                    </div>
                    <ResultsChart results={candidateTotals} />
                  </Card>

                  <Card className="p-6 md:p-8 shadow-none border-slate-200/80 bg-white rounded-2xl md:rounded-3xl overflow-hidden flex flex-col">
                    <div className="mb-6 md:mb-8">
                      <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-widest">Certified Tally</h4>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mt-1">Breakdown by percentage</p>
                    </div>
                    <div className="space-y-1 flex-grow overflow-y-auto max-h-[400px] md:max-h-none pr-1 md:pr-2 custom-scrollbar">
                      {candidateTotals.map((cand, idx) => (
                        <CandidateRow
                          key={cand.id}
                          rank={idx + 1}
                          name={cand.name}
                          affiliation={cand.bio}
                          votes={cand.votes}
                          percentage={(cand.votes / totalForPosition) * 100}
                          isWinner={idx === 0 && cand.votes > 0}
                          photoUrl={position.candidates.find(c => c.id === cand.id)?.photo_url}
                        />
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <Card className="relative w-full max-w-md bg-white shadow-2xl overflow-hidden border-none scale-100 animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <LogOut className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Sign Out?</h3>
              <p className="text-slate-500 font-medium mb-8">Are you sure you want to end your administrative session? You will need to log in again to access the dashboard.</p>
              <div className="flex gap-4">
                <Button variant="secondary" className="flex-1 font-bold" onClick={() => setShowLogoutModal(false)}>
                  Stay Logged In
                </Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold text-white shadow-lg shadow-red-600/20" onClick={() => {
                  signOut();
                  navigate('/login');
                }}>
                  Sign Me Out
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ElectionResults;

