"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Trophy, ArrowLeft, Crown } from "lucide-react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

// Mock data for initial design
const MOCK_LEADERBOARD = [
    { id: "1", name: "CZ_Master", stars: 12500, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz1" },
    { id: "2", name: "CryptoWhale", stars: 9800, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz2" },
    { id: "3", name: "EthMaximist", stars: 8500, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz3" },
    { id: "4", name: "Satoshi_N", stars: 7400, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz4" },
    { id: "5", name: "BinanceBoy", stars: 6200, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz5" },
    { id: "6", name: "TraderJoe", stars: 5500, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz6" },
    { id: "7", name: "SolanaSurfer", stars: 4900, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz7" },
    { id: "8", name: "DogeFather", stars: 4200, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz8" },
    { id: "9", name: "MaticMan", stars: 3800, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz9" },
    { id: "10", name: "PepePepe", stars: 3100, image: "https://api.dicebear.com/7.x/avataaars/svg?seed=cz10" },
];

export default function LeaderboardPage() {
    const supabase = createClient();
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    // Find current user in mock or simulate
    const currentUserRank = 42;

    return (
        <div className="min-h-screen bg-[#06060c] text-white font-sans selection:bg-purple-500/30">
            {/* Animated Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e1b4b_0%,_transparent_50%)] pointer-events-none" />
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none brightness-50 contrast-150" />

            <main className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-32">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className="group p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
                        <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div className="text-center">
                        <h1 className="text-3xl font-black italic tracking-tighter uppercase mb-1">Hall of Fame</h1>
                        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-purple-400">Global Ranking</p>
                    </div>
                    <div className="w-12" /> {/* Spacer */}
                </div>

                {/* Podium */}
                <div className="flex items-end justify-center gap-4 mb-20 pt-10">
                    {/* 2nd Place */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col items-center"
                    >
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-full border-4 border-slate-400 p-1 bg-slate-900 overflow-hidden shadow-[0_0_20px_rgba(148,163,184,0.3)]">
                                <img src={MOCK_LEADERBOARD[1].image} alt="2nd" className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-400 rounded-full flex items-center justify-center text-black font-black italic shadow-lg">2</div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black truncate w-24 mb-1">{MOCK_LEADERBOARD[1].name}</p>
                            <div className="flex items-center justify-center gap-1.5 text-slate-400 font-bold">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs">{MOCK_LEADERBOARD[1].stars.toLocaleString()}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div
                        initial={{ y: -10, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="flex flex-col items-center -mt-8"
                    >
                        <div className="relative mb-4">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute -top-10 left-1/2 -translate-x-1/2"
                            >
                                <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                            </motion.div>
                            <div className="w-28 h-28 rounded-full border-4 border-yellow-400 p-1.5 bg-yellow-950/20 overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.4)]">
                                <img src={MOCK_LEADERBOARD[0].image} alt="1st" className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-black font-black italic shadow-lg text-lg">1</div>
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black italic truncate w-32 mb-1 drop-shadow-lg">{MOCK_LEADERBOARD[0].name}</p>
                            <div className="flex items-center justify-center gap-1.5 text-yellow-400 font-black">
                                <Star className="w-4 h-4 fill-current" />
                                <span>{MOCK_LEADERBOARD[0].stars.toLocaleString()}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center"
                    >
                        <div className="relative mb-4">
                            <div className="w-20 h-20 rounded-full border-4 border-orange-700/60 p-1 bg-orange-950/30 overflow-hidden shadow-[0_0_20px_rgba(194,65,12,0.3)]">
                                <img src={MOCK_LEADERBOARD[2].image} alt="3rd" className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-700 rounded-full flex items-center justify-center text-black font-black italic shadow-lg text-sm">3</div>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-black truncate w-24 mb-1">{MOCK_LEADERBOARD[2].name}</p>
                            <div className="flex items-center justify-center gap-1.5 text-orange-500 font-bold">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs">{MOCK_LEADERBOARD[2].stars.toLocaleString()}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {MOCK_LEADERBOARD.slice(3).map((user, index) => (
                        <motion.div
                            key={user.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 * index }}
                            className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                        >
                            <span className="w-8 text-center font-black italic text-white/30 group-hover:text-white/60 transition-colors">
                                {index + 4}
                            </span>
                            <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full border border-white/10" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{user.name}</p>
                                <div className="flex items-center gap-1 text-[10px] font-black text-white/40 uppercase tracking-widest mt-0.5">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    <span>Ranked</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1.5 font-black text-white group-hover:text-purple-400 transition-colors">
                                    <Star className="w-3.5 h-3.5 fill-purple-400" />
                                    <span>{user.stars.toLocaleString()}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>

            {/* Floating Footer: Current User Rank */}
            {session?.user && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-50">
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="max-w-2xl mx-auto p-5 bg-purple-600 rounded-[30px] shadow-[0_0_30px_rgba(147,51,234,0.5)] flex items-center gap-5 border border-purple-400/30"
                    >
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center font-black italic text-xl border-2 border-white/40 shadow-inner">
                            #{currentUserRank}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black tracking-widest uppercase text-white/60">Your Standing</p>
                            <h4 className="text-xl font-black italic leading-tight">{session.user.name || "Anonymous User"}</h4>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1.5 font-black text-white text-lg">
                                <Star className="w-5 h-5 fill-white" />
                                {/* @ts-ignore */}
                                <span>{(session.user.stars || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] font-black tracking-widest uppercase text-white/60 mt-1">Total Stars</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
