import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge, Logo } from '../../components/ui';
import {
    Ticket, Vote, Calendar, TrendingUp, Plus,
    ChevronRight, BarChart3, LogOut, ShieldCheck,
    FileText, Activity, Layers, ArrowUpRight, Loader2, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title as ChartTitle, Tooltip, Legend, Filler, BarElement
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    ChartTitle, Tooltip, Legend, Filler, BarElement
);

const AdminDashboard = () => {
    const { user, profile, signOut, loading: authLoading } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [electionToDelete, setElectionToDelete] = useState(null);
    const [stats, setStats] = useState({
        issuedTokens: 0,
        usedTokens: 0,
        activeElections: 0,
        turnout: '0%'
    });
    const [elections, setElections] = useState([]);
    const [activityData, setActivityData] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (authLoading) return;

        // If we have an organization ID, let's go.
        if (profile?.organization_id) {
            setDataLoading(true);
            fetchDashboardData();
        } else if (profile) {
            // If we have a profile but no org ID, wait a bit for repair/sync logic in AuthContext to finish
            const timer = setTimeout(() => {
                if (profile?.organization_id) {
                    fetchDashboardData();
                } else {
                    setDataLoading(false);
                }
            }, 1500);
            return () => clearTimeout(timer);
        } else if (!authLoading) {
            // Auth is done and no profile?
            setDataLoading(false);
        }
    }, [authLoading, profile?.id, profile?.organization_id]);

    const fetchDashboardData = async () => {
        try {
            if (!profile?.organization_id) return;
            const { data: electionData, error: electionError } = await supabase
                .from('elections')
                .select(`
                    *,
                    voting_tokens (id, is_used, used_at)
                `)
                .eq('organization_id', profile.organization_id)
                .order('created_at', { ascending: false });

            if (electionError) throw electionError;

            if (electionData) {
                setElections(electionData);
                let totalIssued = 0;
                let totalUsed = 0;
                let activeCount = 0;
                let activityTimestamps = [];

                const now = new Date();

                electionData.forEach(ele => {
                    const start = ele.start_date ? new Date(ele.start_date) : null;
                    const end = ele.end_date ? new Date(ele.end_date) : null;

                    const effectiveStatus =
                        now < (start || now) ? 'upcoming' :
                            end && now > end ? 'ended' :
                                'active';

                    if (effectiveStatus === 'active') activeCount++;

                    const tokens = ele.voting_tokens || [];
                    totalIssued += ele.total_expected_voters || 0;
                    const used = tokens.filter(t => t.is_used);
                    totalUsed += used.length;
                    used.forEach(t => {
                        if (t.used_at) activityTimestamps.push(new Date(t.used_at).toLocaleDateString());
                    });
                });

                setStats({
                    issuedTokens: totalIssued,
                    usedTokens: totalUsed,
                    activeElections: activeCount,
                    turnout: totalIssued > 0 ? Math.round((totalUsed / totalIssued) * 100) + '%' : '0%'
                });

                const dateCounts = activityTimestamps.reduce((acc, date) => {
                    acc[date] = (acc[date] || 0) + 1;
                    return acc;
                }, {});

                const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b));

                let cumulative = 0;
                const activity = sortedDates.map(date => {
                    const usedOnDate = dateCounts[date];
                    cumulative += usedOnDate;
                    const turnoutPct = totalIssued > 0 ? (cumulative / totalIssued) * 100 : 0;
                    return { date, used: usedOnDate, turnoutPct };
                });

                setActivityData(activity);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            toast.error('Could not load election data.');
        } finally {
            setDataLoading(false);
        }
    };

    const handleDeleteElection = async (id) => {
        if (!id) return;
        try {
            const { error } = await supabase
                .from('elections')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setElections(prev => prev.filter(e => e.id !== id));
            toast.success('Election deleted successfully');
            setElectionToDelete(null);
            fetchDashboardData();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Failed to delete election');
        }
    };

    const chartData = {
        labels: activityData.length > 0 ? activityData.map(d => d.date) : ['Initial'],
        datasets: [
            {
                fill: true,
                label: 'Ballots Cast',
                data: activityData.length > 0 ? activityData.map(d => d.used) : [0],
                borderColor: '#2563eb', // blue-600
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 8,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                yAxisID: 'y',
            },
            {
                fill: false,
                label: 'Turnout %',
                data: activityData.length > 0 ? activityData.map(d => Math.round(d.turnoutPct)) : [0],
                borderColor: '#10b981', // emerald-500
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 3,
                borderDash: [5, 5], // Dashed line for percentage
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                yAxisID: 'y1',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 11, weight: '700' },
                    padding: 20,
                    color: '#1e293b'
                }
            },
            tooltip: {
                backgroundColor: '#0f172a',
                padding: 12,
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                cornerRadius: 8,
                callbacks: {
                    label: (context) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.datasetIndex === 1) {
                            label += `${context.parsed.y}%`;
                        } else {
                            label += `${context.parsed.y} tokens`;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'BALLOTS REDEEMED',
                    font: { size: 9, weight: '900' },
                    color: '#94a3b8',
                    padding: { bottom: 10 }
                },
                grid: { color: '#f1f5f9' },
                ticks: { stepSize: 1, color: '#64748b', font: { size: 10, weight: '600' } }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10, weight: '600' } },
                title: {
                    display: true,
                    text: 'EVENT TIMELINE',
                    font: { size: 9, weight: '900' },
                    color: '#94a3b8',
                    padding: { top: 10 }
                }
            },
            y1: {
                position: 'right',
                beginAtZero: true,
                max: 100,
                title: {
                    display: true,
                    text: 'TURNOUT RATIO',
                    font: { size: 9, weight: '900' },
                    color: '#94a3b8',
                    padding: { bottom: 10 }
                },
                grid: { drawOnChartArea: false },
                ticks: { color: '#059669', font: { size: 10, weight: '600' }, callback: (v) => `${v}%` },
            },
        },
    };

    const handleSignOutClick = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    // Display a loading indicator during the initial authentication phase.
    // Dashboard analytics will update in the background for a responsive experience.
    if (authLoading || (dataLoading && elections.length === 0)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Admin Console...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Administrative Navigation */}
            <nav className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-20 mobile-glass-header">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4 md:gap-6">
                        <button
                            type="button"
                            onClick={() => {
                                navigate('/admin/');
                                fetchDashboardData();
                            }}
                            className="flex items-center gap-2 md:gap-3 hover:opacity-90 transition-opacity"
                        >
                            <div className="bg-blue-700 p-1.5 rounded-lg text-white shrink-0 shadow-lg shadow-blue-500/20">
                                <Logo className="w-4 h-4 md:w-5 md:h-5" iconClassName="w-2.5 h-2.5 md:w-3 md:h-3" />
                            </div>
                            <span className="font-black text-slate-900 tracking-tighter text-lg md:text-xl uppercase truncate max-w-[140px] md:max-w-none">
                                Admin Console
                            </span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 text-right">
                        <div className="hidden sm:block">
                            <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Logged in as</p>
                            <p className="text-xs md:text-sm font-bold text-slate-900 truncate max-w-[150px]">
                                {profile?.full_name || user?.user_metadata?.full_name || user?.email}
                            </p>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowLogoutModal(true)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-100 transition-all font-bold px-3 md:px-5 h-10 md:h-12 flex items-center gap-2 md:rounded-xl"
                        >
                            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="hidden lg:inline text-xs uppercase tracking-widest">Sign Out</span>
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-10">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-6">
                    <div className="space-y-1 w-full md:w-auto">
                        <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]">
                            <Activity className="w-3.5 h-3.5" /> Operations Dashboard
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">Election Intelligence</h1>
                        <p className="text-sm text-slate-500 font-medium md:whitespace-nowrap">
                            Managing <span className="text-indigo-700 font-black uppercase tracking-tight">{profile?.organizations?.name || 'Your Organization'}</span>
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <Button className="gap-2 w-full sm:px-8 h-14 md:h-[52px] shadow-xl shadow-blue-700/20 text-xs font-black uppercase tracking-widest md:rounded-xl" onClick={() => navigate('/admin/elections/')}>
                            <Plus className="w-5 h-5 md:w-4 md:h-4" /> Start New Election
                        </Button>
                        <Button
                            className="gap-2 w-full sm:px-8 h-14 md:h-[52px] font-black text-xs uppercase tracking-[0.15em] bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 text-white md:rounded-xl"
                            onClick={() => navigate('/admin/results/')}
                        >
                            <BarChart3 className="w-5 h-5 md:w-4 md:h-4" /> View Results
                        </Button>
                    </div>
                </header>

                {/* Operational Statistics */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-12">
                    {[
                        { label: 'Tokens', value: stats.issuedTokens, icon: Ticket, trend: 'SECURE', color: 'text-blue-700' },
                        { label: 'Active', value: stats.activeElections, icon: Activity, trend: 'STABLE', color: 'text-emerald-600' },
                        { label: 'Ballots', value: stats.usedTokens, icon: Vote, trend: 'LIVE', color: 'text-indigo-600' },
                        { label: 'Turnout', value: stats.turnout, icon: TrendingUp, trend: 'TRACKED', color: 'text-orange-600' },
                    ].map((stat, i) => (
                        <Card key={i} className="flex flex-col justify-between p-5 md:p-6 shadow-none border-slate-200 mobile-stats-card">
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-slate-50 p-2 rounded-lg md:rounded-xl border border-slate-100">
                                    <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
                                </div>
                                <span className={`hidden xs:inline text-[8px] font-black border px-2 py-0.5 rounded-full tracking-widest ${i % 2 === 0 ? 'text-blue-500 border-blue-100 bg-blue-50/50' : 'text-slate-400 border-slate-200'}`}>
                                    {stat.trend}
                                </span>
                            </div>
                            <div>
                                <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.1em]">{stat.label}</p>
                                <p className="text-2xl md:text-3xl font-black text-slate-900 mt-0.5 tabular-nums tracking-tighter leading-none">{stat.value}</p>
                            </div>
                        </Card>
                    ))}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-12">
                        <Card className="shadow-none border-slate-200 p-6 md:p-8">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-blue-700" />
                                        Voting Activity
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-tight">Timeline of cryptographic redemptions</p>
                                </div>
                                <Badge variant="primary" className="hidden xs:block">LIVE ANALYTICS</Badge>
                            </div>
                            <div className="h-[250px] md:h-[300px] relative">
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        </Card>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-700" />
                                    Election Registry
                                </h3>
                                <button className="text-[10px] font-black text-blue-700 uppercase tracking-widest md:hidden">View All</button>
                            </div>
                            <div className="space-y-4">
                                {elections.map((election) => {
                                    const usedCount = election.voting_tokens?.filter(t => t.is_used).length || 0;
                                    const total = election.total_expected_voters || 0;
                                    const electionTurnout = total > 0 ? Math.round((usedCount / total) * 100) : 0;

                                    const now = new Date();
                                    const start = election.start_date ? new Date(election.start_date) : null;
                                    const end = election.end_date ? new Date(election.end_date) : null;

                                    const effectiveStatus =
                                        start && now < start ? 'upcoming' :
                                            end && now > end ? 'ended' :
                                                'active';

                                    return (
                                        <div
                                            key={election.id}
                                            className="pro-card hover:bg-slate-50/50 transition-all p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4 election-item"
                                            onClick={() => navigate(`/admin/elections/${election.id}`)}
                                        >
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className={`w-1 md:w-1.5 h-12 md:h-12 rounded-full ${effectiveStatus === 'active' ? 'bg-emerald-500 shadow-md shadow-emerald-500/20 animate-pulse' : effectiveStatus === 'upcoming' ? 'bg-blue-400' : 'bg-slate-300'}`} />
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-black text-slate-900 text-lg md:text-xl uppercase tracking-tighter truncate leading-tight mb-1">{election.title}</h4>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 font-bold text-[9px] md:text-xs uppercase tracking-tight">
                                                        <span className="flex items-center gap-1">
                                                            <Ticket className="w-2.5 h-2.5" /> {usedCount}/{total} <span className="mobile-hide">Tokens</span>
                                                        </span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="flex items-center gap-1 text-blue-700">
                                                            <TrendingUp className="w-2.5 h-2.5" /> {electionTurnout}% <span className="mobile-hide">Turnout</span>
                                                        </span>
                                                        <span className="text-slate-300 mobile-hide">•</span>
                                                        <span className="truncate mobile-hide">Ends {new Date(election.end_date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t border-slate-50 md:border-none">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={effectiveStatus === 'active' ? 'success' : 'neutral'} className="text-[8px] md:text-[9px] font-black">
                                                        {effectiveStatus.toUpperCase()}
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/admin/results/${election.id}/`);
                                                        }}
                                                        className="h-11 w-11 md:h-12 md:w-12 p-0 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                                        title="View Results"
                                                    >
                                                        <BarChart3 className="w-5 h-5 md:w-5 md:h-5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setElectionToDelete(election);
                                                        }}
                                                        className="h-11 w-11 md:h-12 md:w-12 p-0 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border-none"
                                                        title="Delete Election"
                                                    >
                                                        <Trash2 className="w-5 h-5 md:w-5 md:h-5" />
                                                    </Button>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Delete Election Confirmation Modal */}
                    {electionToDelete && (
                        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
                            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setElectionToDelete(null)}></div>
                            <Card className="relative w-full max-w-md bg-white shadow-2xl overflow-hidden border-none rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom duration-300">
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                        <Trash2 className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Delete Election?</h3>
                                    <p className="text-slate-500 font-medium mb-8">
                                        Are you sure you want to delete <span className="text-slate-900 font-bold">"{electionToDelete.title}"</span>?
                                        This action will permanently remove all associated candidates, tokens, and records.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <Button className="w-full h-14 bg-red-600 hover:bg-red-700 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-red-600/20 rounded-xl" onClick={() => handleDeleteElection(electionToDelete.id)}>
                                            Delete Permanently
                                        </Button>
                                        <Button variant="secondary" className="w-full h-14 font-black text-xs uppercase tracking-widest rounded-xl" onClick={() => setElectionToDelete(null)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    <div className="space-y-8">
                        <Card className="bg-slate-950 border-none text-white p-8 overflow-hidden relative rounded-2xl md:rounded-3xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 mb-8 relative z-10">
                                Org Snapshot
                            </h3>
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Active Events</span>
                                    <span className="text-lg font-black text-white italic tabular-nums">
                                        {stats.activeElections}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Total Tokens</span>
                                    <span className="text-lg font-black text-white tabular-nums">
                                        {stats.issuedTokens}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Verified Votes</span>
                                    <span className="text-lg font-black text-emerald-400 tabular-nums">
                                        {stats.usedTokens}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        <Card className="shadow-none border-slate-200 bg-white p-8 rounded-2xl md:rounded-3xl">
                            <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-900 mb-6 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-700" />
                                Security Protocols
                            </h4>
                            <ul className="space-y-6">
                                <li className="flex gap-4 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-700 mt-1.5 shrink-0"></div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                                        Tokens are strictly single-use and non-transferable.
                                    </p>
                                </li>
                                <li className="flex gap-4 group">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-700 mt-1.5 shrink-0"></div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
                                        Ensure voters receive their 12-char codes via encrypted channels.
                                    </p>
                                </li>
                            </ul>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowLogoutModal(false)}></div>
                    <Card className="relative w-full max-w-md bg-white shadow-2xl overflow-hidden border-none rounded-t-3xl sm:rounded-3xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                                <LogOut className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">End Session?</h3>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed">Are you sure you want to sign out? You will need to re-authenticate to access the administrative console.</p>
                            <div className="flex flex-col gap-3">
                                <Button className="w-full h-14 bg-red-600 hover:bg-red-700 font-black text-xs uppercase tracking-widest rounded-xl" onClick={handleSignOutClick}>
                                    Sign Out Now
                                </Button>
                                <Button variant="secondary" className="w-full h-14 font-black text-xs uppercase tracking-widest rounded-xl" onClick={() => setShowLogoutModal(false)}>
                                    Stay Connected
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );

};

export default AdminDashboard;
