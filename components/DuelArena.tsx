"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Timer, X, Camera, Mic, MicOff, Zap, AlertTriangle, CheckCircle2, User, Swords, Star, Volume2, VolumeX } from "lucide-react";
import { Coin } from "@/app/page";
import { createClient } from "@/lib/supabase/client";

// --- Types ---

type DuelState = "SELECT_TYPE" | "SETUP" | "MATCHMAKING" | "READY_CHECK" | "BATTLE" | "VICTORY" | "DEFEAT" | "TIMEOUT";

interface DuelArenaProps {
    coins: Coin[];
    userPoints: number;
    onUpdatePoints: (newPoints: number) => void;
    onExit: () => void;
}

const STAKES = [
    { id: "STARTER", label: "STARTER", cost: 10, color: "from-blue-400 to-cyan-400" },
    { id: "PRO", label: "PRO", cost: 100, color: "from-purple-400 to-pink-400" },
    { id: "LEGEND", label: "LEGEND", cost: 1000, color: "from-amber-400 to-orange-400" },
];

export default function DuelArena({ coins, userPoints, onUpdatePoints, onExit }: DuelArenaProps) {
    const supabase = createClient();
    const [state, setState] = useState<DuelState>("SELECT_TYPE");
    const [selectedStake, setSelectedStake] = useState<number | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isOpponentMuted, setIsOpponentMuted] = useState(false);

    // --- PvP Matchmaking & Session ---
    const [duelId, setDuelId] = useState<string | null>(null);
    const [matchmakingEntryId, setMatchmakingEntryId] = useState<string | null>(null);
    const [opponent, setOpponent] = useState<{ id: string, name: string, image?: string } | null>(null);
    const [isLeader, setIsLeader] = useState(false); // Player 1 is the leader
    const [myId, setMyId] = useState<string | null>(null);
    const channelRef = useRef<any>(null);

    // --- Game Logic State ---
    const [myScore, setMyScore] = useState(0);
    const [opScore, setOpScore] = useState(0);
    const [currentRound, setCurrentRound] = useState(0);
    const [roundCoin, setRoundCoin] = useState<Coin | null>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [userStatus, setUserStatus] = useState<"ACTIVE" | "LOCKED" | "CORRECT">("ACTIVE");
    const [opStatus, setOpStatus] = useState<"ACTIVE" | "LOCKED" | "CORRECT">("ACTIVE");
    const [wrongSelectionIndex, setWrongSelectionIndex] = useState<number | null>(null);
    const [timer, setTimer] = useState(10);
    const [gameResult, setGameResult] = useState<"WIN" | "LOSS" | null>(null);

    // -- Clean up on unmount --
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setMyId(session.user.id);
        });

        return () => {
            if (matchmakingEntryId) cancelMatchmaking(matchmakingEntryId);
            if (channelRef.current) channelRef.current.unsubscribe();
            if (localStream) localStream.getTracks().forEach(t => t.stop());
        };
    }, [matchmakingEntryId, localStream]);

    const cancelMatchmaking = async (id: string) => {
        await fetch('/api/matchmaking', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entryId: id })
        });
    };

    const handleStakeSelect = (cost: number) => {
        if (userPoints < cost) {
            alert("Insufficient points!");
            return;
        }
        setSelectedStake(cost);
    };

    const startMatchmaking = async () => {
        if (!selectedStake) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            setLocalStream(stream);
            setPermissionGranted(true);
            setState("MATCHMAKING");

            const res = await fetch('/api/matchmaking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stake: selectedStake })
            });
            const data = await res.json();

            if (data.duelId) {
                // Instant match! User is Player 2 (Follower)
                setDuelId(data.duelId);
                setMatchmakingEntryId(data.entryId);
                setIsLeader(false);
                setupPvPSession(data.duelId);
            } else if (data.entryId) {
                setMatchmakingEntryId(data.entryId);
                setIsLeader(true); // User is Player 1 (Leader)

                // Start 15s timeout
                const timeout = setTimeout(() => {
                    if (state === "MATCHMAKING") {
                        setState("TIMEOUT");
                        cancelMatchmaking(data.entryId);
                    }
                }, 15000);

                // Subscribe to matchmaking queue changes
                const subscription = supabase
                    .channel('matchmaking')
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'MatchmakingQueue',
                        filter: `id=eq.${data.entryId}`
                    }, (payload) => {
                        if (payload.new.status === 'MATCHED' && payload.new.duelId) {
                            clearTimeout(timeout);
                            setDuelId(payload.new.duelId);
                            setupPvPSession(payload.new.duelId);
                        }
                    })
                    .subscribe();

                return () => {
                    clearTimeout(timeout);
                    subscription.unsubscribe();
                };
            }
        } catch (err) {
            console.error("Matchmaking error:", err);
            setState("SELECT_TYPE");
        }
    };

    const setupPvPSession = async (id: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const channel = supabase.channel(`duel:${id}`);
        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'game_event' }, (payload) => {
                handlePvPEvent(payload.payload);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    setState("READY_CHECK");
                    channel.send({
                        type: 'broadcast',
                        event: 'game_event',
                        payload: { type: 'JOINED', sender: session.user.id, name: session.user.user_metadata?.full_name }
                    });
                }
            });
    };

    const handlePvPEvent = (payload: any) => {
        if (payload.sender === myId) return; // Ignore own events

        switch (payload.type) {
            case 'JOINED':
                setOpponent({ id: payload.sender, name: payload.name });
                // If I'm leader, I can now start.
                break;
            case 'NEXT_ROUND':
                setRoundCoin(payload.coin);
                setOptions(payload.options);
                setUserStatus("ACTIVE");
                setOpStatus("ACTIVE");
                setWrongSelectionIndex(null);
                setTimer(10);
                setCurrentRound(payload.round);
                setState("BATTLE");
                break;
            case 'USER_STATUS':
                setOpStatus(payload.status);
                if (payload.status === 'CORRECT') {
                    setOpScore(payload.score);
                    if (payload.score >= 5) {
                        setState("DEFEAT");
                        setGameResult("LOSS");
                    }
                }
                break;
        }
    };

    // Helper: Generate Options (Correct + 3 Anagrams/Randoms)
    const generateOptions = (coin: Coin) => {
        const correct = coin.symbol.toUpperCase();
        const distractors = [
            correct.split('').reverse().join(''),
            correct.slice(1) + correct[0],
            correct[correct.length - 1] + correct.slice(0, -1)
        ].map(s => s === correct ? s + "X" : s);
        return [correct, ...distractors].sort(() => Math.random() - 0.5);
    };

    const broadcastRound = useCallback((round: number) => {
        if (!isLeader || !channelRef.current) return;

        const validCoins = coins.filter(c => c.market_cap_rank <= 100);
        const pool = validCoins.length >= 10 ? validCoins : coins;
        const randomCoin = pool[Math.floor(Math.random() * pool.length)];
        const opts = generateOptions(randomCoin);

        channelRef.current.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'NEXT_ROUND', round, coin: randomCoin, options: opts, sender: myId }
        });
    }, [coins, isLeader, myId]);

    const broadcastStatus = (status: "ACTIVE" | "LOCKED" | "CORRECT", score: number) => {
        channelRef.current?.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'USER_STATUS', status, score, sender: myId }
        });
    };

    // Battle Loop START
    const startGame = async () => {
        if (!isLeader) return;
        broadcastRound(1);
    };

    // Timer Logic
    useEffect(() => {
        if (state !== "BATTLE") return;
        const interval = setInterval(() => {
            setTimer(t => {
                if (t <= 1) {
                    if (isLeader) broadcastRound(currentRound + 1);
                    return 10;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [state, isLeader, currentRound, broadcastRound]);

    const handleOptionClick = (option: string, index: number) => {
        if (userStatus !== "ACTIVE" || !roundCoin) return;

        if (option === roundCoin.symbol.toUpperCase()) {
            const newScore = myScore + 1;
            setMyScore(newScore);
            setUserStatus("CORRECT");
            broadcastStatus("CORRECT", newScore);

            if (newScore >= 5) {
                setState("VICTORY");
                setGameResult("WIN");
                if (selectedStake) onUpdatePoints(userPoints + selectedStake);
            }
        } else {
            setUserStatus("LOCKED");
            setWrongSelectionIndex(index);
            broadcastStatus("LOCKED", myScore);
        }
    };

    // --- Renderers ---

    const renderMatchmaking = () => (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Swords className="w-12 h-12 text-white animate-pulse" />
                </div>
            </div>
            <h3 className="text-2xl font-black italic text-white animate-pulse uppercase tracking-[0.2em]">Searching for Player...</h3>
            <div className="flex flex-col items-center gap-2 mt-4">
                <div className="text-white/40 font-mono text-xs">Staked: {selectedStake} <Star className="w-3 h-3 inline" /></div>
                <div className="text-purple-400 font-black text-xl">00:{(15 - (Math.floor(Date.now() / 1000) % 15)).toString().padStart(2, '0')}</div>
            </div>
        </div>
    );

    const renderTimeout = () => (
        <div className="flex flex-col items-center justify-center h-full gap-8 p-6 text-center">
            <div className="p-8 rounded-full bg-red-500/10 border-4 border-red-500/20">
                <AlertTriangle className="w-20 h-20 text-red-500 animate-bounce" />
            </div>
            <div>
                <h2 className="text-4xl font-black italic text-white mb-2 uppercase">NO PLAYERS ONLINE</h2>
                <p className="text-white/40 font-medium max-w-xs mx-auto">We couldn't find an opponent for this stake. Try again or select a different amount.</p>
            </div>
            <button
                onClick={() => setState("SETUP")}
                className="bg-white text-black text-xl font-black py-4 px-12 rounded-full uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl"
            >
                Retry Search
            </button>
            <button onClick={onExit} className="text-white/20 text-xs font-bold hover:text-white transition-colors">
                RETURN TO MENU
            </button>
        </div>
    );

    const renderReadyCheck = () => (
        <div className="flex flex-col items-center justify-center h-full gap-8">
            <h2 className="text-4xl font-black italic text-white animate-pulse">OPPONENT FOUND!</h2>
            <div className="flex gap-10 items-center">
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-4xl border-2 border-white/20">👤</div>
                    <span className="text-white font-black mt-3 tracking-widest">YOU</span>
                </div>
                <div className="text-4xl font-black text-red-500 italic">VS</div>
                <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center text-4xl border-2 border-red-500/20 overflow-hidden">
                        {opponent?.image ? <img src={opponent.image} alt="op" className="w-full h-full object-cover" /> : "🎮"}
                    </div>
                    <span className="text-purple-400 font-black mt-3 tracking-widest uppercase">{opponent?.name || "JOINING..."}</span>
                </div>
            </div>
            <button
                onClick={startGame}
                disabled={!opponent}
                className={`text-xl font-black py-5 px-16 rounded-full uppercase tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all transform hover:scale-105 ${opponent ? 'bg-green-500 text-white' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
            >
                Fight!
            </button>
        </div>
    );

    // --- (Rest of renderBattle, renderResult, renderSetup etc. remain similar but with opStatus updates) ---
    // Mapping existing render functions to new state

    const renderTypeSelection = () => (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto relative z-20 px-6">
            <h2 className="text-4xl font-black italic text-white mb-16 uppercase tracking-widest text-center">Select Duel Type</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setState("SETUP")}
                    className="group relative h-80 rounded-[40px] bg-gradient-to-br from-blue-600 to-cyan-400 p-1 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    <div className="relative h-full bg-black/40 backdrop-blur-md rounded-[38px] p-8 flex flex-col items-center justify-center border border-white/10 group-hover:border-white/50 transition-colors">
                        <div className="mb-6 p-6 bg-white/10 rounded-full">
                            <Star className="w-16 h-16 text-yellow-400 fill-yellow-400" />
                        </div>
                        <h3 className="text-3xl font-black italic uppercase text-white mb-2">Points Arena</h3>
                        <p className="text-white/60 font-medium text-sm">Real Players • Instant Match</p>
                        <div className="mt-8 px-6 py-2 bg-white text-black font-black uppercase tracking-widest rounded-full text-xs">
                            Play Now
                        </div>
                    </div>
                </motion.button>

                <div className="relative h-80 rounded-[40px] bg-gradient-to-br from-gray-800 to-gray-900 p-1 overflow-hidden opacity-40 grayscale cursor-not-allowed">
                    <div className="relative h-full bg-black/60 backdrop-blur-md rounded-[38px] p-8 flex flex-col items-center justify-center border border-white/5">
                        <div className="mb-6 p-6 bg-white/5 rounded-full">
                            <Zap className="w-16 h-16 text-purple-400" />
                        </div>
                        <h3 className="text-3xl font-black italic uppercase text-white/50 mb-2">Real Crypto</h3>
                        <p className="text-white/30 font-medium text-sm">Wager actual tokens</p>
                        <div className="mt-8 px-6 py-2 bg-white/10 text-white/40 font-black uppercase tracking-widest rounded-full text-xs border border-white/10">
                            Coming Soon
                        </div>
                    </div>
                </div>
            </div>
            <button onClick={onExit} className="mt-16 text-white/30 text-xs font-bold hover:text-white transition-colors">BACK TO MENU</button>
        </div>
    );

    const renderSetup = () => (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto relative z-20">
            <h2 className="text-4xl font-black italic text-white mb-2 uppercase">CHOOSE STAKE</h2>
            <p className="text-white/50 mb-10 font-bold tracking-widest text-xs">WINNER TAKES ALL</p>

            <div className="flex flex-col gap-4 w-full px-6">
                {STAKES.map((stake) => (
                    <button
                        key={stake.id}
                        onClick={() => handleStakeSelect(stake.cost)}
                        className={`relative group w-full h-24 rounded-3xl border-2 transition-all overflow-hidden flex items-center px-8 ${selectedStake === stake.cost ? "border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "border-white/10 bg-white/5 hover:border-white/30"} ${userPoints < stake.cost ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
                        disabled={userPoints < stake.cost}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r ${stake.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                        <div className="flex-1 text-left">
                            <div className="text-[10px] font-black opacity-30 tracking-[0.3em] uppercase">{stake.label}</div>
                            <div className="text-3xl font-black italic flex items-center gap-2">
                                {stake.cost} <Star className="w-6 h-6 fill-current" />
                            </div>
                        </div>
                        {selectedStake === stake.cost && <div className="bg-white text-black p-2 rounded-full shadow-lg"><CheckCircle2 className="w-6 h-6" /></div>}
                    </button>
                ))}
            </div>

            <div className="mt-10 w-full px-6">
                <button
                    onClick={startMatchmaking}
                    disabled={!selectedStake}
                    className={`w-full py-6 rounded-full font-black text-xl tracking-widest uppercase transition-all ${selectedStake ? "bg-white text-black hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95" : "bg-white/10 text-white/20 cursor-not-allowed"}`}
                >
                    Find Match
                </button>
                <p className="mt-4 text-[10px] text-white/40 text-center font-bold tracking-widest">15S MATCHMAKING GUARANTEE</p>
            </div>
            <button onClick={() => setState("SELECT_TYPE")} className="mt-6 text-white/20 text-xs font-bold hover:text-white transition-colors">BACK</button>
        </div>
    );

    const renderBattle = () => (
        <div className="h-full w-full flex flex-col relative overflow-hidden">
            {/* Top Half: Opponent */}
            <div className={`flex-1 relative bg-gray-900 border-b-4 border-red-500/30 flex items-center justify-center overflow-hidden transition-all duration-500 ${opScore > myScore ? 'bg-red-500/10' : ''}`}>
                <div className="absolute top-8 left-8 flex gap-3 z-20">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-10 h-2.5 rounded-full transition-all duration-500 ${i < opScore ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-white/10'}`} />
                    ))}
                </div>
                {/* Simulated Opponent Video Feed Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none opacity-40" />
                <div className="relative flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500/30 flex items-center justify-center text-6xl shadow-2xl overflow-hidden">
                        {opponent?.image ? <img src={opponent.image} alt="op" className="w-full h-full object-cover" /> : "👤"}
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-black text-red-400 tracking-widest uppercase shadow-lg backdrop-blur-md">
                        {opponent?.name || "OPPONENT"}
                    </div>
                </div>

                {/* Status Overlays */}
                <AnimatePresence>
                    {opStatus === "LOCKED" && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-red-950/60 backdrop-blur-md flex flex-col items-center justify-center z-30">
                            <X className="w-20 h-20 text-red-500 mb-2 drop-shadow-[0_0_20px_#ef4444]" />
                            <span className="text-red-500 font-black italic text-2xl tracking-tighter uppercase">Locked Out</span>
                        </motion.div>
                    )}
                    {opStatus === "CORRECT" && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-green-500/20 backdrop-blur-md flex items-center justify-center z-30 border-b-4 border-green-500">
                            <CheckCircle2 className="w-24 h-24 text-green-500 drop-shadow-[0_0_20px_#22c55e]" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Central Round Header */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4">
                <div className="relative group">
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl group-hover:bg-white/40 transition-all duration-1000" />
                    <div className="relative w-36 h-36 rounded-full bg-black border-4 border-white/20 p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden">
                        {roundCoin && <img src={roundCoin.image} alt="coin" className="w-full h-full rounded-full object-cover animate-pulse" />}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-4xl font-black italic text-white drop-shadow-[0_0_10px_black]">{timer}s</div>
                    </div>
                </div>
                <div className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                    <span className="text-xs font-black italic tracking-[0.3em] text-white/40">ROUND {currentRound}</span>
                </div>
            </div>

            {/* Bottom Half: User */}
            <div className="flex-1 relative bg-black flex flex-col justify-end p-8 overflow-hidden border-t-4 border-green-500/30">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none scale-x-[-1]" autoPlay playsInline muted />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

                <div className="absolute top-8 right-8 flex gap-3 z-20">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-10 h-2.5 rounded-full transition-all duration-500 ${i < myScore ? 'bg-green-500 shadow-[0_0_15px_#22c55e]' : 'bg-white/10'}`} />
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10 w-full max-w-sm mx-auto mb-4">
                    {options.map((opt, i) => {
                        const isWrongSelection = wrongSelectionIndex === i;
                        const isCorrectSelection = userStatus === "CORRECT" && opt === roundCoin?.symbol.toUpperCase();
                        return (
                            <button
                                key={i}
                                onClick={() => handleOptionClick(opt, i)}
                                disabled={userStatus !== "ACTIVE"}
                                className={`h-20 rounded-2xl font-black text-3xl uppercase tracking-widest transition-all duration-300 border-2 ${userStatus !== "ACTIVE" && !isCorrectSelection && !isWrongSelection ? 'bg-white/5 text-white/10 border-white/5 cursor-not-allowed' : isWrongSelection ? 'bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_30px_#ef444444]' : isCorrectSelection ? 'bg-green-500/20 text-green-500 border-green-500/50 shadow-[0_0_30px_#22c55e44]' : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/30 active:scale-95 shadow-xl'}`}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
                <div className="relative z-10 text-center">
                    <p className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase">Identify Correct Symbol</p>
                </div>

                <AnimatePresence>
                    {userStatus === "LOCKED" && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-red-950/60 backdrop-blur-md flex flex-col items-center justify-center z-30">
                            <X className="w-20 h-20 text-red-500 mb-2 drop-shadow-[0_0_20px_#ef4444]" />
                            <span className="text-red-500 font-black italic text-2xl tracking-tighter uppercase">Locked Out</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    const renderResult = () => (
        <div className="flex flex-col items-center justify-center h-full gap-8 relative z-20 p-6 text-center">
            <motion.div initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}>
                <div className="text-[12rem] drop-shadow-[0_0_50px_rgba(255,255,255,0.2)]">{gameResult === "WIN" ? "🏆" : "💀"}</div>
            </motion.div>
            <div className="space-y-2">
                <h2 className={`text-7xl font-black italic uppercase tracking-tighter ${gameResult === "WIN" ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400" : "text-red-500 animate-pulse"}`}>
                    {gameResult === "WIN" ? "Legendary Victory" : "Crushing Defeat"}
                </h2>
                <p className="text-white/40 font-black tracking-[0.4em] uppercase text-xs">{gameResult === "WIN" ? "The Arena is Yours" : "Training Required"}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-xl w-full max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-white/40 font-black uppercase text-[10px] tracking-widest">Rewards Claimed</span>
                    <span className={`font-black text-2xl ${gameResult === "WIN" ? "text-green-400" : "text-white/20"}`}>
                        {gameResult === "WIN" ? `+${selectedStake ? selectedStake * 2 : 0}` : "0"} <Star className="w-6 h-6 inline fill-current" />
                    </span>
                </div>
                <div className="w-full h-px bg-white/10 mb-4" />
                <div className="flex justify-between items-center text-xs font-bold text-white/20 uppercase tracking-widest">
                    <span>Rank Points</span>
                    <span>+25 XP</span>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-sm">
                <button
                    onClick={onExit}
                    className="w-full bg-white text-black text-xl font-black py-6 rounded-[30px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                >
                    Return to Mission Control
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col font-sans overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e1b4b_0%,_transparent_70%)] opacity-30 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none brightness-50" />

            {state === "SELECT_TYPE" && renderTypeSelection()}
            {state === "SETUP" && renderSetup()}
            {state === "MATCHMAKING" && renderMatchmaking()}
            {state === "READY_CHECK" && renderReadyCheck()}
            {state === "BATTLE" && renderBattle()}
            {(state === "VICTORY" || state === "DEFEAT") && renderResult()}
            {state === "TIMEOUT" && renderTimeout()}

            <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        </div>
    );
}
