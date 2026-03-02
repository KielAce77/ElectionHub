import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge, Logo } from '../../components/ui';
import { Loader2, BarChart3, Activity, ArrowLeft } from 'lucide-react';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const CandidateRow = ({ rank, name, affiliation, votes, percentage }) => {
  return (
    <div className="flex items-center gap-4 py-2 border-b last:border-b-0 border-slate-100">
      <div className="w-6 text-xs font-black text-slate-400 text-right">{rank}</div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900">{name || 'Unnamed candidate'}</p>
        {affiliation && (
          <p className="text-xs font-medium text-slate-400 mt-0.5">{affiliation}</p>
        )}
        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="w-24 text-right">
        <p className="text-xs font-bold text-slate-900">{votes}</p>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {percentage.toFixed(0)}%
        </p>
      </div>
    </div>
  );
};

const ElectionResults = () => {
  const { profile, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [votesByCandidate, setVotesByCandidate] = useState({});
  const navigate = useNavigate();
  const query = useQuery();

  useEffect(() => {
    if (authLoading) return;
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile?.organization_id, query.get('electionId')]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const orgId = profile?.organization_id;
      if (!orgId) {
        setElection(null);
        setPositions([]);
        setVotesByCandidate({});
        return;
      }

      const requestedElectionId = query.get('electionId');

      const { data: elections, error: electionsError } = await supabase
        .from('elections')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (electionsError) throw electionsError;

      const chosenElection =
        elections?.find((e) => e.id === requestedElectionId) || elections?.[0] || null;

      if (!chosenElection) {
        setElection(null);
        setPositions([]);
        setVotesByCandidate({});
        return;
      }

      setElection(chosenElection);

      const [{ data: positionsData, error: positionsError }, { data: votes, error: votesError }] =
        await Promise.all([
          supabase
            .from('positions')
            .select(
              `
              id,
              title,
              candidates (
                id,
                full_name,
                bio
              )
            `,
            )
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
    if (!election) return 'No Election';
    const now = new Date();
    const start = election.start_date ? new Date(election.start_date) : null;
    const end = election.end_date ? new Date(election.end_date) : null;

    if (start && now < start) return 'Upcoming';
    if (end && now > end) return 'Ended';
    return 'Active';
  };

  const effectiveStatus = computeStatus();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-xs font-bold uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-1.5 rounded-lg text-white">
                <Logo className="w-5 h-5" iconClassName="w-3 h-3" />
              </div>
              <span className="font-extrabold text-slate-900 tracking-tight text-xl uppercase">
                Admin Console
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
              <BarChart3 className="w-3.5 h-3.5" />
              Election Analytics
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Election Results</h1>
            <p className="text-slate-500 font-medium">
              {profile?.organizations?.name || user?.user_metadata?.org_name || 'Your Organization'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success" className="uppercase tracking-widest text-[10px]">
              Results Live
            </Badge>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Registered Voters', value: totalRegistered },
            { label: 'Total Votes Cast', value: totalVotesCast },
            {
              label: 'Turnout',
              value: `${totalRegistered > 0 ? Math.round(turnoutPct) : 0}%`,
            },
            { label: 'Election Status', value: effectiveStatus },
          ].map((stat, idx) => (
            <Card key={idx} className="flex flex-col justify-between p-6 shadow-none border-slate-200">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Activity className="w-5 h-5 text-blue-700" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">
                  {stat.label}
                </p>
                <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums tracking-tighter">
                  {stat.value}
                </p>
              </div>
            </Card>
          ))}
        </section>

        {/* Turnout progress */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
              Turnout Progress
            </p>
            <p className="text-sm font-black text-slate-900">
              {totalVotesCast}/{totalRegistered} voters
            </p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-700"
              style={{ width: `${Math.min(turnoutPct, 100)}%` }}
            />
          </div>
        </section>

        {/* Positions and Candidates */}
        <section className="space-y-8">
          {positions.map((position) => {
            const candidateTotals = position.candidates.map((c) => ({
              ...c,
              votes: votesByCandidate[c.id] || 0,
            }));
            candidateTotals.sort((a, b) => b.votes - a.votes);
            const totalForPosition = candidateTotals.reduce((s, c) => s + c.votes, 0) || 1;

            return (
              <Card
                key={position.id}
                className="shadow-none border-slate-200 bg-white rounded-2xl p-8 space-y-6"
              >
                <div className="flex items-baseline justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Position
                    </p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      {position.title}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Total Votes
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {candidateTotals.reduce((s, c) => s + c.votes, 0)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {candidateTotals.map((cand, idx) => (
                    <CandidateRow
                      key={cand.id}
                      rank={idx + 1}
                      name={cand.full_name}
                      affiliation={cand.bio}
                      votes={cand.votes}
                      percentage={(cand.votes / totalForPosition) * 100}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default ElectionResults;

