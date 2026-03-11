import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Input, Badge } from '../../components/ui';
import {
    Loader2, Save, Plus, Trash2, Calendar, Users,
    Settings, Layout, ArrowLeft, Image as ImageIcon,
    Type, Globe, Shield, LogOut, Ticket, Download,
    Copy, Check, BarChart3, ChevronRight, ListCheck,
    UserPlus, Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const ElectionManager = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile, signOut, loading: authLoading } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const isEditing = !!id;

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [tokensLoading, setTokensLoading] = useState(false);

    const [election, setElection] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        status: 'upcoming',
        total_expected_voters: 0,
        tokens_generated: false
    });

    const [positions, setPositions] = useState([
        { title: '', candidates: [{ full_name: '', bio: '', photo_url: '' }] }
    ]);

    const [showTokensModal, setShowTokensModal] = useState(false);
    const [tokens, setTokens] = useState([]);
    const [recentlyCopiedToken, setRecentlyCopiedToken] = useState(null);
    const [recentlyCopiedLink, setRecentlyCopiedLink] = useState(false);
    const [resultsByCandidate, setResultsByCandidate] = useState({});
    const positionsEndRef = useRef(null);

    const handleSignOutClick = async () => {
        // Clear draft when logging out
        localStorage.removeItem('election_draft');
        localStorage.removeItem('positions_draft');
        await signOut();
        navigate('/login', { replace: true });
    };

    // Data Persistence: Load Draft
    useEffect(() => {
        if (!isEditing) {
            const savedElection = localStorage.getItem('election_draft');
            const savedPositions = localStorage.getItem('positions_draft');

            if (savedElection) {
                try {
                    setElection(JSON.parse(savedElection));
                } catch (e) {
                    console.error('Failed to parse election draft');
                }
            }

            if (savedPositions) {
                try {
                    setPositions(JSON.parse(savedPositions));
                } catch (e) {
                    console.error('Failed to parse positions draft');
                }
            }
        }
    }, [isEditing]);

    // Data Persistence: Save Draft
    useEffect(() => {
        if (!isEditing && !loading) {
            localStorage.setItem('election_draft', JSON.stringify(election));
            localStorage.setItem('positions_draft', JSON.stringify(positions));
        }
    }, [election, positions, isEditing, loading]);

    useEffect(() => {
        if (isEditing && id) {
            const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            if (!isUuid) {
                toast.error('Invalid election link. Returning to dashboard.');
                navigate('/admin/', { replace: true });
                setLoading(false);
                return;
            }
        }

        if (isEditing && id) {
            fetchElectionDetails();
        } else {
            // Initialize state for a new election entry to ensure the UI remains responsive.
            setLoading(false);
        }
    }, [isEditing, id]);

    useEffect(() => {
        if (!id || !isEditing || !showTokensModal) return;

        const channel = supabase
            .channel(`tokens_${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'voting_tokens',
                    filter: `election_id=eq.${id}`
                },
                (payload) => {
                    setTokens((current) =>
                        current.map((t) => (t.id === payload.new.id ? { ...t, is_used: payload.new.is_used, used_at: payload.new.used_at } : t))
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, isEditing, showTokensModal]);

    const fetchElectionDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('elections')
                .select('*, positions(*, candidates(*))')
                .eq('id', id)
                .single();
            if (error) throw error;
            setElection(data);
            setPositions(data.positions || []);

            // Aggregate the total number of votes received by each candidate for this election.
            const { data: votes, error: votesError } = await supabase
                .from('votes')
                .select('candidate_id')
                .eq('election_id', id);

            if (!votesError && votes) {
                const counts = votes.reduce((acc, v) => {
                    if (!v.candidate_id) return acc;
                    acc[v.candidate_id] = (acc[v.candidate_id] || 0) + 1;
                    return acc;
                }, {});
                setResultsByCandidate(counts);
            } else {
                setResultsByCandidate({});
            }
        } catch (err) {
            console.error('Error:', err);
            toast.error('Failed to load election details.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPosition = () => {
        setPositions([...positions, { title: '', candidates: [{ full_name: '', bio: '', photo_url: '' }] }]);
        // Delay scroll slightly to ensure DOM has updated
        setTimeout(() => {
            positionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleRemovePosition = (posIndex) => {
        setPositions((prev) => prev.filter((_, idx) => idx !== posIndex));
    };

    const handleAddCandidate = (posIndex) => {
        const newPositions = [...positions];
        newPositions[posIndex].candidates.push({ full_name: '', bio: '', photo_url: '' });
        setPositions(newPositions);
    };

    const handleCandidatePhotoUpload = async (posIndex, candIndex, file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file.');
            return;
        }

        try {
            const candidate = positions[posIndex].candidates[candIndex];
            const safeName = (candidate.full_name || file.name).toLowerCase().replace(/[^\w\d]+/g, '-');
            const path = `elections/${id || 'new'}/positions/${posIndex}/candidates/${candIndex}-${Date.now()}-${safeName}`;

            const { data, error } = await supabase.storage
                .from('candidate-photos')
                .upload(path, file, { upsert: true });

            if (error) throw error;

            const { data: publicData } = supabase.storage
                .from('candidate-photos')
                .getPublicUrl(data.path);

            const url = publicData?.publicUrl;
            if (!url) {
                toast.error('Could not get public URL for photo.');
                return;
            }

            const updated = [...positions];
            updated[posIndex].candidates[candIndex].photo_url = url;
            setPositions(updated);
            toast.success('Candidate photo uploaded.');
        } catch (err) {
            console.error('Photo upload error:', err);
            toast.error('Failed to upload photo. Please try again.');
        }
    };

    const handleRemoveCandidate = (posIndex, candIndex) => {
        const newPositions = [...positions];
        newPositions[posIndex].candidates = newPositions[posIndex].candidates.filter((_, idx) => idx !== candIndex);
        setPositions(newPositions);
    };

    const handleCopyVotingLink = async () => {
        const link = `${window.location.origin}/vote`;
        try {
            await navigator.clipboard.writeText(link);
            setRecentlyCopiedLink(true);
            toast.success('Voting link copied to clipboard');
            setTimeout(() => setRecentlyCopiedLink(false), 3000);
        } catch (err) {
            toast.error('Failed to copy link.');
        }
    };

    const handleGenerateTokens = async () => {
        if (!isEditing) {
            toast.error('Please save the election first before generating tokens.');
            return;
        }

        if (election.total_expected_voters <= 0) {
            toast.error('Please specify the total expected voters.');
            return;
        }

        setGenerating(true);
        try {
            const { error } = await supabase.rpc('generate_election_tokens', {
                target_election_id: id
            });

            if (error) throw error;

            toast.success(`${election.total_expected_voters} tokens generated successfully.`);

            // Update state locally and trigger refresh
            setElection(prev => ({ ...prev, tokens_generated: true }));
            await fetchElectionDetails();
            await handleLoadTokens(); // Automatically open tokens modal
        } catch (err) {
            console.error('Generation error:', err);
            toast.error(err.message || 'Failed to generate tokens.');
        } finally {
            setGenerating(false);
        }
    };

    const handleLoadTokens = async () => {
        if (!isEditing) return;
        setTokensLoading(true);
        try {
            const { data, error } = await supabase
                .from('voting_tokens')
                .select('id, token, is_used, used_at, created_at')
                .eq('election_id', id)
                .order('created_at', { ascending: true })
                .limit(500);

            if (error) throw error;

            setTokens(data || []);
            setShowTokensModal(true);
        } catch (err) {
            console.error('Token load error:', err);
            toast.error('Failed to load tokens for this election.');
        } finally {
            setTokensLoading(false);
        }
    };

    const handleCopyToken = async (tokenValue) => {
        try {
            await navigator.clipboard.writeText(tokenValue);
            setRecentlyCopiedToken(tokenValue);
            toast.success('Token copied to clipboard');
            setTimeout(() => {
                setRecentlyCopiedToken((current) => (current === tokenValue ? null : current));
            }, 2000);
        } catch (err) {
            console.error('Clipboard error:', err);
            toast.error('Could not copy token. Please copy it manually.');
        }
    };

    const handleCopyAllTokens = async () => {
        if (!tokens.length) {
            toast.error('There are no tokens to copy for this election.');
            return;
        }
        try {
            const allTokens = tokens.map((t) => t.token).join('\n');
            await navigator.clipboard.writeText(allTokens);
            toast.success('All tokens copied to clipboard.');
        } catch (err) {
            console.error('Clipboard error (copy all):', err);
            toast.error('Could not copy all tokens. Please try again.');
        }
    };

    const handleDownloadTokensPdf = async () => {
        if (!tokens.length) {
            toast.error('There are no tokens to export for this election.');
            return;
        }
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            const title = election.title || 'Election Tokens';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(title, 14, 16);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Total tokens: ${tokens.length} • Generated for: ${election.total_expected_voters || 'N/A'
                } voters`,
                14,
                24,
            );

            let y = 32;
            const pageHeight = doc.internal.pageSize.getHeight();

            tokens.forEach((t, index) => {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(`${index + 1}. ${t.token}`, 14, y);
                y += 6;
            });

            const safeTitle = title.replace(/[^\w\d]+/g, '_').toLowerCase();
            doc.save(`${safeTitle || 'election'}_tokens.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            toast.error('Could not generate PDF. Please ensure jsPDF is installed.');
        }
    };


    const handleSave = async (e) => {
        e.preventDefault();
        console.log('ElectionManager: handleSave initiated', {
            userId: user?.id,
            profile,
            organizationId: profile?.organization_id,
            hasProfile: !!profile
        });

        if (!election.title || !election.start_date || !election.end_date) {
            toast.error('Please fill in all required fields.');
            return;
        }

        // Validate Candidate Names
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            if (!pos.title.trim()) {
                toast.error(`Please provide a title for Position #${i + 1}`);
                return;
            }
            for (let j = 0; j < pos.candidates.length; j++) {
                const cand = pos.candidates[j];
                if (!cand.full_name.trim()) {
                    toast.error(`Candidate name is compulsory (Position: ${pos.title}, Candidate #${j + 1})`);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            // Ensure the administrator has a valid organizational context before proceeding.
            // This verification is handled by the security layer.
            if (!profile?.organization_id) {
                throw new Error('Your administrator profile is still syncing. Please wait 1–2 seconds and try again.');
            }

            const electionPayload = {
                ...election,
                organization_id: profile.organization_id,
                // Exclude related positions and candidates from the main payload for separate processing.
                positions: undefined
            };

            let electionId = id;
            if (isEditing) {
                console.log('ElectionManager: updating existing election', { electionPayload });
                const { error } = await supabase.from('elections').update(electionPayload).eq('id', id);
                if (error) throw error;
            } else {
                console.log('ElectionManager: creating new election', { electionPayload });
                const { data, error } = await supabase.from('elections').insert(electionPayload).select().single();
                if (error) throw error;
                electionId = data.id;
            }

            // Synchronize positions and candidates with the database.
            for (const pos of positions) {
                const { data: posData, error: posError } = await supabase
                    .from('positions')
                    .upsert({
                        id: pos.id || undefined,
                        title: pos.title,
                        election_id: electionId
                    })
                    .select()
                    .single();
                if (posError) throw posError;

                for (const cand of pos.candidates) {
                    const { error: candError } = await supabase.from('candidates').upsert({
                        id: cand.id || undefined,
                        full_name: cand.full_name,
                        bio: cand.bio,
                        photo_url: cand.photo_url,
                        position_id: posData.id
                    });
                    if (candError) throw candError;
                }
            }

            toast.success('Election saved successfully.');
            // Clear draft after successful save
            if (!isEditing) {
                localStorage.removeItem('election_draft');
                localStorage.removeItem('positions_draft');
            }
            if (!isEditing) navigate(`/admin/elections/${electionId}/`);
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Failed to save election: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 py-3 md:py-4 px-4 md:px-8 shadow-sm mobile-glass-header">
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                    <button onClick={() => navigate('/admin/')} className="text-slate-500 hover:text-slate-900 flex items-center gap-1 md:gap-2 font-black text-[10px] uppercase tracking-widest transition-colors shrink-0 clickable">
                        <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Back Home</span>
                    </button>
                    <div className="text-center min-w-0 flex-1">
                        <h1 className="text-sm md:text-xl font-black text-slate-900 tracking-tight truncate uppercase italic">{isEditing ? 'Settings' : 'New Election'}</h1>
                        <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] truncate hidden xs:block">Configure</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        {isEditing && (
                            <Button
                                variant="secondary"
                                onClick={() => navigate(`/admin/results/${id}/`)}
                                className="hidden sm:flex gap-2 px-4 h-10 md:h-12 border-indigo-200 text-indigo-700 font-bold text-xs uppercase rounded-xl"
                            >
                                <BarChart3 className="w-4 h-4" /> <span className="hidden lg:inline">Results</span>
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2 px-4 md:px-8 h-10 md:h-12 shadow-blue-700/20 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl">
                            <Save className="w-4 h-4" /> <span>{saving ? '...' : 'Save'}</span>
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowLogoutModal(true)}
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-100 transition-all font-bold p-2 md:p-3 h-10 w-10 md:h-11 md:w-11 shadow-sm rounded-xl"
                        >
                            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
                {/* Token Issuance and Control */}
                {isEditing && (
                    <div className="space-y-6">
                        <Card className="border-blue-100 bg-blue-50/30 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                                    <Ticket className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 uppercase tracking-tight">Tokens</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                        {election.tokens_generated ? 'Tokens are ready' : 'Tokens not generated yet'}
                                    </p>
                                </div>
                            </div>

                            {!election.tokens_generated ? (
                                <div className="flex items-center gap-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ready to go</p>
                                        <p className="text-sm font-black text-blue-700">{election.total_expected_voters} Keys</p>
                                    </div>
                                    <Button
                                        onClick={handleGenerateTokens}
                                        disabled={generating || election.total_expected_voters <= 0}
                                        className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-blue-600/20 w-full sm:w-auto text-[10px] md:text-sm h-11 md:h-12"
                                    >
                                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Generate Tokens
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                                    <Badge variant="success" className="h-10 px-4 md:px-6 text-[9px] md:text-xs tracking-widest shrink-0">
                                        {election.total_expected_voters} READY
                                    </Badge>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={tokensLoading}
                                        onClick={handleLoadTokens}
                                        className="gap-2 font-bold text-[9px] md:text-[11px] uppercase tracking-widest h-10 px-4"
                                    >
                                        {tokensLoading ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> <span className="hidden xs:inline">Loading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Ticket className="w-3.5 h-3.5" /> View Tokens
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* Share Voting Link Section */}
                        <Card className="border-slate-200 bg-white p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <Send className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Voting Link</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Share this with voters</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="flex-grow bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-mono text-slate-500 truncate max-w-[200px] md:max-w-xs">
                                    {window.location.origin}/vote
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCopyVotingLink}
                                    className="gap-2 shrink-0 h-9 font-bold text-[10px] uppercase tracking-widest"
                                >
                                    {recentlyCopiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {recentlyCopiedLink ? 'Copied' : 'Copy Link'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                <Card className="shadow-none border-slate-200 p-6 md:p-8 space-y-6 md:space-y-10 rounded-2xl md:rounded-3xl">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Settings className="w-4 h-4 text-blue-700" />
                        Basic Info
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="md:col-span-2">
                            <Input
                                label="Title"
                                placeholder="e.g. 2024 Election"
                                value={election.title}
                                innerClassName="h-14 md:h-12 text-base font-bold rounded-xl"
                                onChange={(e) => setElection({ ...election, title: e.target.value })}
                            />
                        </div>
                        <Input
                            label="Total Voters"
                            type="number"
                            min="1"
                            placeholder="e.g. 100"
                            value={election.total_expected_voters}
                            innerClassName="h-14 md:h-12 font-black rounded-xl"
                            onChange={(e) => setElection({ ...election, total_expected_voters: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                            disabled={election.tokens_generated}
                        />
                        <div className="flex flex-col justify-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center gap-2"><Shield className="w-3 h-3" /> Protocol Description</p>
                            <p className="text-[10px] md:text-xs text-slate-500 leading-relaxed font-medium italic">
                                {election.tokens_generated
                                    ? "LOCKED"
                                    : "Protocol details"}
                            </p>
                        </div>
                        <Input
                            label="Start Date"
                            type="datetime-local"
                            min={new Date().toISOString().substring(0, 16)}
                            value={election.start_date ? election.start_date.substring(0, 16) : ''}
                            innerClassName="h-14 md:h-12 rounded-xl"
                            onChange={(e) => setElection({ ...election, start_date: e.target.value })}
                        />
                        <Input
                            label="End Date"
                            type="datetime-local"
                            min={election.start_date ? election.start_date.substring(0, 16) : new Date().toISOString().substring(0, 16)}
                            value={election.end_date ? election.end_date.substring(0, 16) : ''}
                            innerClassName="h-14 md:h-12 rounded-xl"
                            onChange={(e) => setElection({ ...election, end_date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">Protocol Description</label>
                        <textarea
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-slate-900 text-sm md:text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all min-h-[120px] md:min-h-[140px]"
                            placeholder="Briefly explain what this election is about..."
                            value={election.description}
                            onChange={(e) => setElection({ ...election, description: e.target.value })}
                        />
                    </div>
                </Card>

                <div className="space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <ListCheck className="w-4 h-4 text-blue-700" />
                            Positions & Candidates
                        </h3>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleAddPosition}
                            className="gap-2 font-black uppercase tracking-wider text-[10px] bg-slate-100 hover:bg-slate-200 border-none px-4"
                            disabled={election.status === 'active' || election.status === 'closed'}
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Position
                        </Button>
                    </div>

                    {positions.map((pos, posIdx) => (
                        <Card key={posIdx} className="space-y-6 border-none shadow-none bg-white border-l-4 border-blue-700 rounded-none rounded-r-lg ring-1 ring-slate-200 p-8">
                            <div className="flex justify-between gap-6 items-start">
                                <Input
                                    label={`Position Name ${posIdx + 1}`}
                                    placeholder="e.g., President"
                                    value={pos.title}
                                    onChange={(e) => {
                                        const newPositions = [...positions];
                                        newPositions[posIdx].title = e.target.value;
                                        setPositions(newPositions);
                                    }}
                                />
                                {election.status !== 'active' && election.status !== 'closed' && (
                                    <button
                                        className="mt-7 text-slate-300 hover:text-red-600 transition-colors"
                                        title="Remove Position"
                                        type="button"
                                        onClick={() => handleRemovePosition(posIdx)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-6 pt-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                    List of Candidates
                                    <span className="h-[1px] bg-slate-100 flex-grow"></span>
                                </p>
                                <div className="space-y-4">
                                    {pos.candidates.map((cand, candIdx) => (
                                        <div key={candIdx} className="relative group bg-slate-50/50 rounded-2xl p-4 md:p-6 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                                            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                                {/* Candidate Photo Preview/Upload */}
                                                <div className="shrink-0">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white shadow-inner flex items-center justify-center overflow-hidden border border-slate-200">
                                                            {cand.photo_url ? (
                                                                <img
                                                                    src={cand.photo_url}
                                                                    alt={cand.full_name || 'Candidate'}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <ImageIcon className="w-6 h-6 md:w-8 md:h-8 text-slate-200" />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                                                        </div>
                                                        <label className="w-full">
                                                            <div className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] py-2 px-3 rounded-lg text-center cursor-pointer transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                                                                Upload
                                                            </div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                disabled={election.status === 'active' || election.status === 'closed'}
                                                                onChange={(e) =>
                                                                    handleCandidatePhotoUpload(
                                                                        posIdx,
                                                                        candIdx,
                                                                        e.target.files?.[0] || null
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Name & Bio Inputs */}
                                                <div className="flex-grow w-full space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <Input
                                                            label="Full Name"
                                                            placeholder="Enter name..."
                                                            value={cand.full_name}
                                                            innerClassName="h-11"
                                                            onChange={(e) => {
                                                                const newPositions = [...positions];
                                                                newPositions[posIdx].candidates[candIdx].full_name = e.target.value;
                                                                setPositions(newPositions);
                                                            }}
                                                            disabled={election.status === 'active' || election.status === 'closed'}
                                                        />
                                                        <Input
                                                            label="Credentials / Bio"
                                                            placeholder="Short description..."
                                                            value={cand.bio}
                                                            innerClassName="h-11"
                                                            onChange={(e) => {
                                                                const newPositions = [...positions];
                                                                newPositions[posIdx].candidates[candIdx].bio = e.target.value;
                                                                setPositions(newPositions);
                                                            }}
                                                            disabled={election.status === 'active' || election.status === 'closed'}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] md:text-[10px] text-slate-400 font-medium uppercase tracking-wider text-center md:text-left">
                                                        * Tip: Square image (Max 2MB)
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="absolute top-2 right-2 md:relative md:top-0 md:right-0">
                                                    {(election.status !== 'active' && election.status !== 'closed') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveCandidate(posIdx, candIdx)}
                                                            className="p-3 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                            title="Remove Candidate"
                                                        >
                                                            <Trash2 className="w-5 h-5 md:w-5 md:h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {election.status !== 'active' && election.status !== 'closed' && (
                                    <button
                                        onClick={() => handleAddCandidate(posIdx)}
                                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-600 bg-slate-50/50 hover:bg-blue-50/80 transition-all font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                                    >
                                        <UserPlus className="w-4 h-4" /> Add New Candidate
                                    </button>
                                )}

                                {/* Real-time Voting Progress */}
                                {Object.keys(resultsByCandidate).length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                                            Live Results
                                        </p>
                                        <div className="space-y-2">
                                            {pos.candidates.map((cand) => {
                                                const votesForCandidate = resultsByCandidate[cand.id] || 0;
                                                return (
                                                    <div
                                                        key={cand.id}
                                                        className="flex items-center justify-between text-xs font-bold text-slate-600"
                                                    >
                                                        <span>{cand.full_name || 'Unnamed candidate'}</span>
                                                        <span className="text-blue-700">
                                                            {votesForCandidate} vote{votesForCandidate === 1 ? '' : 's'}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                    <div ref={positionsEndRef} />
                </div>
            </main>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
                    <Card className="relative w-full max-w-md bg-white shadow-2xl overflow-hidden border-none scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                                <LogOut className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Sign Out</h3>
                            <p className="text-slate-500 font-medium mb-8">Are you sure you want to end your session? Your unsaved changes will be lost.</p>
                            <div className="flex gap-4">
                                <Button variant="secondary" className="flex-1 font-bold" onClick={() => setShowLogoutModal(false)}>
                                    Cancel
                                </Button>
                                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold" onClick={handleSignOutClick}>
                                    Sign Out
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Tokens Viewer Modal - Redesigned for Mobile */}
            {showTokensModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setShowTokensModal(false)}
                    />
                    <Card className="relative w-full max-w-3xl bg-white shadow-2xl overflow-hidden border-none rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="p-5 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Tokens</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">
                                    {tokens.length} codes issued
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCopyAllTokens}
                                    className="text-slate-600 font-black px-3 py-2 text-[9px] uppercase tracking-widest h-9 flex-1 md:flex-initial"
                                >
                                    Copy All
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleDownloadTokensPdf}
                                    className="text-slate-600 font-black px-3 py-2 text-[9px] uppercase tracking-widest h-9 flex-1 md:flex-initial"
                                >
                                    PDF
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setShowTokensModal(false)}
                                    className="text-white bg-slate-900 font-black px-3 py-2 text-[9px] uppercase tracking-widest h-9 md:bg-white md:text-slate-500"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                        <div className="p-5 overflow-y-auto flex-grow bg-slate-50/50">
                            {tokens.length === 0 ? (
                                <p className="text-sm text-slate-400 font-bold uppercase py-10 text-center tracking-widest">
                                    No tokens found.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="hidden md:grid grid-cols-12 gap-2 bg-white border border-slate-100 rounded-xl px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        <span className="col-span-6">Token Code</span>
                                        <span className="col-span-3 text-center">Status</span>
                                        <span className="col-span-3 text-right">Action</span>
                                    </div>
                                    <div className="space-y-2">
                                        {tokens.map((t) => {
                                            const isCopied = recentlyCopiedToken === t.token;
                                            return (
                                                <div
                                                    key={t.id}
                                                    className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between md:justify-start gap-4 flex-1">
                                                        <span className="font-mono text-sm md:text-base font-black tracking-[0.2em] text-slate-900 border-b-2 border-slate-100 pb-1 md:border-none">
                                                            {t.token}
                                                        </span>
                                                        <Badge
                                                            variant={t.is_used ? 'neutral' : 'success'}
                                                            className="text-[9px] px-2 py-0.5 tracking-widest font-black"
                                                        >
                                                            {t.is_used ? 'USED' : 'READY'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-end pt-2 md:pt-0 border-t border-slate-50 md:border-none">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => handleCopyToken(t.token)}
                                                            className="w-full md:w-auto gap-2 text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl"
                                                        >
                                                            {isCopied ? (
                                                                <>
                                                                    <Check className="w-4 h-4" /> Copied
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="w-4 h-4" /> Copy Code
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ElectionManager;
