import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        const processCallback = async () => {
            try {
                // The Supabase JS client automatically extracts the code/token
                // from the URL when getSession() is called.
                const { error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    throw sessionError;
                }
                
                // Once properly authenticated, redirect to the dashboard
                navigate('/admin', { replace: true });
            } catch (err) {
                console.error("Auth callback error:", err);
                setErrorMsg(err.message);
                // Redirect user to login after a short delay on error
                setTimeout(() => navigate('/login', { replace: true }), 3500);
            }
        };

        processCallback();
    }, [navigate]);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white text-blue-700">
            {errorMsg ? (
                <div className="flex flex-col items-center">
                    <h2 className="text-red-500 font-bold mb-2">Verification Error</h2>
                    <p className="text-sm text-slate-500 mb-6">{errorMsg}</p>
                    <p className="text-xs text-slate-400 mt-4 uppercase tracking-[0.2em] font-black">Routing Back...</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Verifying Identity...</p>
                </div>
            )}
        </div>
    );
};

export default AuthCallback;
