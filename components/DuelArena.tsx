"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Timer, X, Camera, Mic, MicOff, Zap, AlertTriangle, CheckCircle2, User, Swords, Star, Volume2, VolumeX } from "lucide-react";
import { Coin } from "@/app/page";

// --- Types ---

type DuelState = "SELECT_TYPE" | "SETUP" | "MATCHMAKING" | "READY_CHECK" | "BATTLE" | "VICTORY" | "DEFEAT";

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
    const [state, setState] = useState<DuelState>("SELECT_TYPE");
    const [selectedStake, setSelectedStake] = useState<number | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isOpponentMuted, setIsOpponentMuted] = useState(false);

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
    // TypeScript doesn't like useState<"WIN" | "LOSS" | null>(null) sometimes in this env, but let's try standard
    const [gameResult, setGameResult] = useState<"WIN" | "LOSS" | null>(null);

    // Mock Opponent
    const opponentRef = useRef({ name: "CryptoBot_9000", avatar: "🤖" });

    // -- Setup & Permissions --
    useEffect(() => {
        // Init logic
    }, []);

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
        } catch (err) {
            console.error("Camera denied:", err);
            alert("Camera access is required for Duel Mode.");
        }
    };

    // Fix: Attach stream to video element whenever ref or stream changes
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [videoRef.current, localStream, state]); // Re-run on state change (e.g. entering BATTLE)

    // Helper: Generate Options (Correct + 3 Anagrams/Randoms)
    const generateOptions = useCallback((coin: Coin) => {
        const correct = coin.symbol.toUpperCase();
        // Simple anagram/distractor generator
        const distractors = [
            correct.split('').reverse().join(''),
            correct.slice(1) + correct[0],
            correct[correct.length - 1] + correct.slice(0, -1)
        ].map(s => s === correct ? s + "X" : s); // Fallback if palindrome

        // Shuffle
        const all = [correct, ...distractors].sort(() => Math.random() - 0.5);
        setOptions(all);
    }, []);

    // Helper: Next Round
    const nextRound = useCallback(() => {
        if (!coins || coins.length === 0) return;

        // Filter for Rank 1-100 (if enough coins exist)
        const validCoins = coins.filter(c => c.market_cap_rank <= 100);
        const pool = validCoins.length >= 10 ? validCoins : coins;

        const randomCoin = pool[Math.floor(Math.random() * pool.length)];
        setRoundCoin(randomCoin);
        generateOptions(randomCoin);
        setUserStatus("ACTIVE");
        setOpStatus("ACTIVE");
        setWrongSelectionIndex(null);
        setTimer(10);
        setCurrentRound(r => r + 1);
    }, [coins, generateOptions]);

    // Matchmaking Simulation
    useEffect(() => {
        if (state === "MATCHMAKING") {
            const timeout = setTimeout(() => {
                setState("READY_CHECK");
            }, 3000); // 3s delay
            return () => clearTimeout(timeout);
        }
    }, [state]);

    // Battle Loop
    useEffect(() => {
        if (state === "BATTLE") {
            nextRound(); // Start first round
        }
    }, [state, nextRound]);

    // Timer Logic
    useEffect(() => {
        if (state !== "BATTLE") return;
        const interval = setInterval(() => {
            setTimer(t => {
                if (t <= 1) {
                    // Timeout -> Next round (No points)
                    nextRound();
                    return 10;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [state, nextRound]);

    // AI Logic
    useEffect(() => {
        if (state !== "BATTLE" || !roundCoin || !selectedStake || opStatus !== "ACTIVE") return;

        // AI reacts between 2s and 8s depending on stake (Starter=Slow, Legend=Fast)
        const difficulty = selectedStake === 10 ? 0.3 : selectedStake === 100 ? 0.6 : 0.9;
        const reactionTime = Math.max(1000, 8000 - (difficulty * 6000) + (Math.random() * 2000));

        const timeout = setTimeout(() => {
            // Check if user already won
            if (userStatus === "CORRECT") return;

            // 80% chance to be right on Legend, 40% on Starter
            const isCorrect = Math.random() < difficulty;
            if (isCorrect) {
                setOpStatus("CORRECT");
                setOpScore(s => {
                    const newScore = s + 1;
                    if (newScore >= 5) {
                        setState("DEFEAT");
                        setGameResult("LOSS");
                    } else {
                        // Small delay before next round for visual feedback
                        setTimeout(nextRound, 1000);
                    }
                    return newScore;
                });
            } else {
                // Wrong
                setOpStatus("LOCKED");
                // If user is also locked, end round after delay
                if (userStatus === "LOCKED") {
                    setTimeout(nextRound, 1500);
                }
            }
        }, reactionTime);

        return () => clearTimeout(timeout);
    }, [state, roundCoin, selectedStake, nextRound, opStatus, userStatus]);


    const handleOptionClick = (option: string, index: number) => {
        if (userStatus !== "ACTIVE" || !roundCoin) return;

        if (option === roundCoin.symbol.toUpperCase()) {
            // Correct
            setUserStatus("CORRECT");
            setMyScore(s => {
                const newScore = s + 1;
                if (newScore >= 5) {
                    setState("VICTORY");
                    setGameResult("WIN");
                    if (selectedStake) onUpdatePoints(userPoints + selectedStake); // Win pot
                } else {
                    // Small delay before next round for visual feedback
                    setTimeout(nextRound, 1000);
                }
                return newScore;
            });
        } else {
            // Wrong
            setUserStatus("LOCKED");
            setWrongSelectionIndex(index);
            // If opponent is also locked, end round after delay
            if (opStatus === "LOCKED") {
                setTimeout(nextRound, 1500);
            }
        }
    };

    // --- Renderers ---

    const renderTypeSelection = () => (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto relative z-20 px-6">
            <h2 className="text-4xl font-black italic text-white mb-16 uppercase tracking-widest text-center">Select Duel Type</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Points Mode (Active) */}
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
                        <p className="text-white/60 font-medium text-sm">Play for fun & rank up</p>
                        <div className="mt-8 px-6 py-2 bg-white text-black font-black uppercase tracking-widest rounded-full text-xs">
                            Play Now
                        </div>
                    </div>
                </motion.button>

                {/* Crypto Mode (Disabled) */}
                <div className="relative h-80 rounded-[40px] bg-gradient-to-br from-gray-800 to-gray-900 p-1 overflow-hidden opacity-60 grayscale cursor-not-allowed">
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

            <button onClick={onExit} className="mt-16 text-white/30 text-xs font-bold hover:text-white transition-colors">
                BACK TO MENU
            </button>
        </div>
    );

    const renderSetup = () => (
        <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto relative z-20">
            <h2 className="text-4xl font-black italic text-white mb-2">CHOOSE STAKE</h2>
            <p className="text-white/50 mb-10 font-bold tracking-widest text-xs">WINNER TAKES ALL</p>

            <div className="flex flex-col gap-4 w-full">
                {STAKES.map((stake) => (
                    <button
                        key={stake.id}
                        onClick={() => handleStakeSelect(stake.cost)}
                        className={`relative group w-full h-24 rounded-2xl border-2 transition-all overflow-hidden flex items-center px-6 ${selectedStake === stake.cost
                            ? "border-white bg-white/10"
                            : "border-white/10 bg-white/5 hover:border-white/30"
                            } ${userPoints < stake.cost ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
                        disabled={userPoints < stake.cost}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r ${stake.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                        <div className="flex-1 text-left">
                            <div className="text-xs font-black opacity-50 tracking-[0.2em]">{stake.label}</div>
                            <div className="text-3xl font-black italic flex items-center gap-2">
                                {stake.cost} <Star className="w-5 h-5 fill-current" />
                            </div>
                        </div>
                        {selectedStake === stake.cost && (
                            <div className="bg-white text-black p-2 rounded-full">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-10 w-full">
                <div className="flex items-center gap-4 mb-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <Camera className="w-6 h-6 text-white/50" />
                    <div className="text-xs text-white/50 leading-tight">
                        Camera access required for<br />Real-Time PvP validation.
                    </div>
                </div>

                <button
                    onClick={startMatchmaking}
                    disabled={!selectedStake}
                    className={`w-full py-6 rounded-full font-black text-xl tracking-widest uppercase transition-all ${selectedStake
                        ? "bg-white text-black hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                        : "bg-white/10 text-white/20 cursor-not-allowed"
                        }`}
                >
                    Find Match
                </button>
            </div>

            <button onClick={onExit} className="mt-6 text-white/30 text-xs font-bold hover:text-white transition-colors">
                BACK TO MENU
            </button>
        </div>
    );

    const renderMatchmaking = () => (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Swords className="w-12 h-12 text-white animate-pulse" />
                </div>
            </div>
            <h3 className="text-2xl font-black italic text-white animate-pulse">SEARCHING...</h3>
            <div className="flex items-center gap-2 mt-2 text-white/40 font-mono text-xs">
                Staked: {selectedStake} <Star className="w-3 h-3" />
            </div>
        </div>
    );

    const renderReadyCheck = () => (
        <div className="flex flex-col items-center justify-center h-full gap-8">
            <h2 className="text-4xl font-black italic text-white animate-pulse">OPPONENT FOUND!</h2>
            <div className="flex gap-10 items-center">
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-4xl">👤</div>
                    <span className="text-white font-bold mt-2">YOU</span>
                </div>
                <div className="text-2xl font-black text-red-500">VS</div>
                <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center text-4xl">{opponentRef.current.avatar}</div>
                    <span className="text-white/50 font-bold mt-2 text-xs">{opponentRef.current.name}</span>
                </div>
            </div>
            <button
                onClick={() => setState("BATTLE")}
                className="bg-green-500 hover:bg-green-400 text-white text-xl font-black py-4 px-12 rounded-full uppercase tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all transform hover:scale-105"
            >
                Start Battle
            </button>
        </div>
    );

    const renderBattle = () => (
        <div className="h-full w-full flex flex-col relative">
            {/* Top Half: Opponent */}
            <div className={`flex-1 relative bg-gray-900 border-b-4 border-red-500/50 flex items-center justify-center overflow-hidden transition-colors ${opScore > myScore ? 'bg-red-900/20' : ''}`}>
                <div className="absolute top-4 left-4 flex gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-8 h-2 rounded-full ${i < opScore ? 'bg-red-500' : 'bg-white/10'}`} />
                    ))}
                </div>
                <div className="text-6xl opacity-20 filter grayscale">{opponentRef.current.avatar}</div>
                <div className="absolute bottom-4 right-4 text-xs font-mono text-white/30">{opponentRef.current.name}</div>

                {/* Lockout Overlay */}
                {opStatus === "LOCKED" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-red-950/40 backdrop-blur-sm flex items-center justify-center z-10"
                    >
                        <div className="flex flex-col items-center">
                            <X className="w-12 h-12 text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                            <span className="text-red-500 font-black italic text-xl tracking-tighter">LOCKED OUT</span>
                        </div>
                    </motion.div>
                )}

                {/* Correct Overlay */}
                {opStatus === "CORRECT" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-green-950/20 backdrop-blur-sm flex items-center justify-center z-10"
                    >
                        <CheckCircle2 className="w-16 h-16 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                    </motion.div>
                )}

                {/* Audio Toggle */}
                <button
                    onClick={() => setIsOpponentMuted(!isOpponentMuted)}
                    className="absolute top-4 right-4 p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors border border-white/10"
                >
                    {isOpponentMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white/50" />}
                </button>
            </div>

            {/* Center Arena */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
                <div className="w-24 h-24 bg-black rounded-full border-4 border-white/20 p-4 shadow-2xl flex items-center justify-center relative">
                    {roundCoin && (
                        <img src={roundCoin.image} alt="coin" className="w-full h-full rounded-full object-cover" />
                    )}
                    <div className="absolute -top-12 text-2xl font-black text-white drop-shadow-lg">{timer}s</div>
                </div>
            </div>

            {/* Bottom Half: Player */}
            <div className="flex-1 relative bg-black flex flex-col justify-end p-6 overflow-hidden">
                {/* Video Background (Self) */}
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" autoPlay playsInline muted />

                {/* Lockout Overlay */}
                {userStatus === "LOCKED" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-red-950/40 backdrop-blur-sm flex items-center justify-center z-10"
                    >
                        <div className="flex flex-col items-center">
                            <X className="w-12 h-12 text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                            <span className="text-red-500 font-black italic text-xl tracking-tighter">LOCKED OUT</span>
                        </div>
                    </motion.div>
                )}

                {/* Correct Overlay */}
                {userStatus === "CORRECT" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-green-950/20 backdrop-blur-sm flex items-center justify-center z-10"
                    >
                        <CheckCircle2 className="w-16 h-16 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                    </motion.div>
                )}

                {/* Score */}
                <div className="absolute top-4 right-4 flex gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-8 h-2 rounded-full ${i < myScore ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-white/10'}`} />
                    ))}
                </div>

                {/* Controls */}
                <div className="grid grid-cols-2 gap-4 relative z-10 w-full max-w-sm mx-auto">
                    {options.map((opt, i) => {
                        const isWrongSelection = wrongSelectionIndex === i;
                        const isCorrectSelection = userStatus === "CORRECT" && opt === roundCoin?.symbol.toUpperCase();

                        return (
                            <button
                                key={i}
                                onClick={() => handleOptionClick(opt, i)}
                                disabled={userStatus !== "ACTIVE"}
                                className={`h-16 rounded-xl font-black text-2xl uppercase tracking-widest transition-all ${userStatus !== "ACTIVE" && !isCorrectSelection && !isWrongSelection ? 'bg-white/5 text-white/20 cursor-not-allowed border-none' :
                                    isWrongSelection ? 'bg-red-500/20 text-red-500 border-2 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
                                        isCorrectSelection ? 'bg-green-500/20 text-green-500 border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)]' :
                                            'bg-white/10 hover:bg-white/20 text-white border-2 border-white/10'
                                    }`}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderResult = () => (
        <div className="flex flex-col items-center justify-center h-full gap-6 relative z-20">
            <div className="text-8xl">{gameResult === "WIN" ? "🏆" : "💀"}</div>
            <h2 className={`text-6xl font-black italic uppercase ${gameResult === "WIN" ? "text-yellow-400" : "text-red-500"}`}>
                {gameResult === "WIN" ? "VICTORY!" : "DEFEAT"}
            </h2>
            {gameResult === "WIN" && (
                <div className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                    You won <span className="text-yellow-400">{selectedStake ? selectedStake * 2 : 0}</span> <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                </div>
            )}
            <button
                onClick={onExit}
                className="bg-white text-black text-xl font-black py-4 px-12 rounded-full uppercase tracking-widest hover:scale-105 transition-transform"
            >
                Return to Menu
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col font-sans">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black pointer-events-none" />

            {state === "SELECT_TYPE" && renderTypeSelection()}
            {state === "SETUP" && renderSetup()}
            {state === "MATCHMAKING" && renderMatchmaking()}
            {state === "READY_CHECK" && renderReadyCheck()}
            {state === "BATTLE" && renderBattle()}
            {(state === "VICTORY" || state === "DEFEAT") && renderResult()}

            {/* Hidden video element for permission check / background stream */}
            <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        </div>
    );
}
