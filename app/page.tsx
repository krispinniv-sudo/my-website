"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import {
  Trophy,
  Timer,
  Zap,
  Grid,
  ChevronRight,
  RotateCcw,
  User,
  Star,
  Lock,
  PlayCircle,
  X,
  Lightbulb,
  FastForward,
  Flame,
  Users,
  Camera,
  Mic,
  MicOff,
  Copy,
  Swords,
  LogOut,
  Calendar,
  Medal,
  Gamepad2,
  CheckCircle2
} from "lucide-react";
import { RankTimeIcon, TokenPuzzleIcon, DuelIcon, ZenModeIcon } from "../components/GameModeIcons";
import DuelArena from "../components/DuelArena";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

// --- Types & Constants ---
type GameState = "IDLE" | "LOADING" | "LEVEL_SELECT" | "PLAYING" | "GAMEOVER" | "MATCHMAKING" | "DUEL_BATTLE";
type GameMode = "RANK_TIME" | "TOKEN_PUZZLE" | "DUEL" | "ZEN";

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  market_cap_rank: number;
}

const SESSION_LIMIT = 300;
const PER_COIN_LIMIT = 20;

// Top 20 Fallback Coins (Market Cap Rank 1-20)
const FALLBACK_COINS: Coin[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", market_cap_rank: 1 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", market_cap_rank: 2 },
  { id: "tether", symbol: "USDT", name: "Tether", image: "https://assets.coingecko.com/coins/images/325/large/tether.png", market_cap_rank: 3 },
  { id: "solana", symbol: "SOL", name: "Solana", image: "https://assets.coingecko.com/coins/images/4128/large/solana.png", market_cap_rank: 4 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", market_cap_rank: 5 },
  { id: "ripple", symbol: "XRP", name: "XRP", image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", market_cap_rank: 6 },
  { id: "usd-coin", symbol: "USDC", name: "USDC", image: "https://assets.coingecko.com/coins/images/6319/large/usdc.png", market_cap_rank: 7 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", market_cap_rank: 8 },
  { id: "cardano", symbol: "ADA", name: "Cardano", image: "https://assets.coingecko.com/coins/images/975/large/cardano.png", market_cap_rank: 9 },
  { id: "tron", symbol: "TRX", name: "TRON", image: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png", market_cap_rank: 10 },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", image: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png", market_cap_rank: 11 },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", image: "https://assets.coingecko.com/coins/images/11939/large/shiba.png", market_cap_rank: 12 },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", image: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png", market_cap_rank: 13 },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png", market_cap_rank: 14 },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash", image: "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash.png", market_cap_rank: 15 },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", image: "https://assets.coingecko.com/coins/images/10365/large/near.png", market_cap_rank: 16 },
  { id: "matic-network", symbol: "MATIC", name: "Polygon", image: "https://assets.coingecko.com/coins/images/4713/large/polygon.png", market_cap_rank: 17 },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", image: "https://assets.coingecko.com/coins/images/2/large/litecoin.png", market_cap_rank: 18 },
  { id: "pepe", symbol: "PEPE", name: "Pepe", image: "https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg", market_cap_rank: 19 },
  { id: "dai", symbol: "DAI", name: "Dai", image: "https://assets.coingecko.com/coins/images/9956/large/Badge_DAI.png", market_cap_rank: 20 },
];

// --- Audio Helper ---
const playSound = (type: "hint" | "skip" | "success" | "combo" | "unlock" | "click" | "win" | "lose", points: number = 0) => {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const absPoints = Math.abs(points);
    // Audio scaling: louder for high points/combos. Base gain increased to 0.1 for visibility.
    const masterGain = Math.min(0.3, 0.1 + (absPoints / 100) * 0.2);

    switch (type) {
      case "click":
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(masterGain, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case "win":
        // Celebratory arpeggio
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(freq, now + i * 0.1);
          g.gain.setValueAtTime(0.15, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.3);
        });
        break;
      case "lose":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case "hint":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(masterGain, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case "skip":
        osc.type = "sine";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(masterGain, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case "success":
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(masterGain, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case "combo":
        osc.type = "square";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(masterGain * 1.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case "unlock":
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
    }
  } catch (e) { console.warn("Audio Context failed", e); }
};

// --- Components ---

const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value !== displayValue) {
      setIsUpdating(true);
      const isDecrease = value < displayValue;
      setDirection(isDecrease ? "down" : "up");
      const diff = value - displayValue;
      const step = diff > 0 ? Math.ceil(diff / 5) : Math.floor(diff / 5); // Faster steps

      const interval = setInterval(() => {
        setDisplayValue(prev => {
          if ((diff > 0 && prev + step >= value) || (diff < 0 && prev + step <= value)) {
            clearInterval(interval);
            setIsUpdating(false);
            setDirection(null);
            return value;
          }
          return prev + step;
        });
      }, 30); // Faster interval
      return () => clearInterval(interval);
    }
  }, [value, displayValue]);

  return (
    <motion.div
      animate={isUpdating ? {
        scale: [1, 1.3, 1],
        color: direction === "up" ? "#4ade80" : "#ef4444", // Green or Red
        textShadow: direction === "up"
          ? "0 0 20px rgba(74, 222, 128, 0.8)"
          : "0 0 20px rgba(239, 68, 68, 0.8)"
      } : { color: "#ffffff", textShadow: "none" }}
      transition={{ duration: 0.3 }}
      className={`inline-block font-black transition-colors`}
    >
      {displayValue}
    </motion.div>
  );
};

interface AnimationItem {
  id: number;
  value: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  onComplete?: () => void;
}

const GlobalAnimationOverlay = ({ animations }: { animations: AnimationItem[] }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {animations.map(anim => {
          const isNegative = anim.value < 0;
          return (
            <motion.div
              key={anim.id}
              initial={{
                opacity: 1,
                scale: 0.5,
                x: anim.startX,
                y: anim.startY
              }}
              animate={{
                opacity: [1, 1, 1, 0], // Stay visible until arrival
                scale: [0.5, 1.5, 1.5, 1],
                x: anim.targetX,
                y: anim.targetY
              }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              onAnimationComplete={() => anim.onComplete && anim.onComplete()}
              className={`absolute top-0 left-0 font-black flex items-center justify-center whitespace-nowrap
                ${isNegative ? 'text-red-500 text-4xl' : 'text-green-400 text-6xl'} 
                drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]`}
              style={{ transform: 'translate(-50%, -50%)' }} // Perfect centering
            >
              {isNegative ? "" : "+"}{anim.value}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};


const GlobalFloatingPoints = ({ points, x, y, targetX, targetY, onComplete, isNegative = false }: {
  points: number; x: number; y: number; targetX: number; targetY: number; onComplete?: () => void; isNegative?: boolean
}) => {
  const absPoints = Math.abs(points);
  const isHighValue = absPoints > 25;

  return (
    <motion.div
      initial={{ opacity: 0.8, scale: 0.5, x, y }}
      animate={{
        opacity: [0.8, 1, 1, 1, 0],
        scale: isHighValue ? [0.6, 2.5, 2.5, 1] : [0.5, 1.5, 1.5, 1],
        x: [x, targetX],
        y: [y, targetY]
      }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      onAnimationComplete={() => onComplete && onComplete()}
      className={`fixed pointer-events-none font-black z-[9999] flex items-center justify-center 
        ${isNegative ? 'text-red-500' : 'text-green-400'} 
        ${isHighValue ? 'text-7xl' : 'text-4xl'}`}
      style={{
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        overflow: 'visible',
        transform: 'translate(-50%, -50%)' // Global centering
      }}
    >
      <div className="relative">
        {isNegative ? "" : "+"}{points}

        {isHighValue && (
          <>
            <motion.div
              animate={{ rotate: 180, scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-yellow-400/20 blur-3xl rounded-full"
            />
            {[0, 45, 90, 135].map(deg => (
              <motion.div
                key={deg}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1, 0], x: [0, 50, 0], y: [0, -50, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: deg / 100 }}
                className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]"
                style={{ transform: `rotate(${deg}deg)` }}
              />
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
};

const TokenPuzzleLogo = ({ image, revealCount }: { image: string; revealCount: number }) => {
  // Generate random peek holes (circles)
  const holes = useRef(Array.from({ length: 15 }, () => ({
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    r: 12 + Math.random() * 8
  })));

  // revealCount determines how many holes we show (1-2 initially, more with hints)
  const visibleHoles = holes.current.slice(0, 2 + revealCount * 2);

  return (
    <div className="relative w-full h-full rounded-full overflow-hidden bg-[#0a0a0f] border-4 border-white/5">
      <svg width="0" height="0" className="absolute">
        <defs>
          <mask id="puzzle-mask" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="white" />
            {visibleHoles.map((h, i) => (
              <circle key={i} cx={h.x / 100} cy={h.y / 100} r={h.r / 100} fill="black" />
            ))}
          </mask>
        </defs>
      </svg>
      {/* The Censor Layer */}
      <div
        className="absolute inset-0 z-20 pointer-events-none bg-[#0d0d15]"
        style={{
          maskImage: 'url(#puzzle-mask)',
          WebkitMaskImage: 'url(#puzzle-mask)',
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%'
        }}
      />
      <img
        src={image}
        alt="Coin Logo"
        className="w-full h-full object-cover rounded-full z-10"
      />
    </div>
  );
};

const AchievementBanner = ({ text, subtext }: { text: string; subtext: string }) => (
  <motion.div
    initial={{ scale: 0.5, opacity: 0, y: 20 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 1.5, opacity: 0 }}
    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center pointer-events-none"
  >
    <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-1 rounded-3xl shadow-[0_0_50px_rgba(249,115,22,0.4)]">
      <div className="bg-[#0a0a0f] px-8 py-4 rounded-[22px] border border-white/10">
        <h2 className="text-4xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 whitespace-nowrap">
          {text}
        </h2>
        <p className="text-white/60 text-sm font-bold tracking-widest uppercase mt-1">{subtext}</p>
      </div>
    </div>
  </motion.div>
);

const LevelUnlockCeremony = ({ level, onClose }: { level: number; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 text-center"
  >
    <motion.div
      initial={{ scale: 0.5, y: 50 }}
      animate={{ scale: 1, y: 0 }}
      className="flex flex-col items-center"
    >
      <div className="relative mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500 rounded-full blur-3xl opacity-20"
        />
        <div className="relative bg-white/5 border-4 border-purple-500 p-8 rounded-full shadow-[0_0_50px_rgba(168,85,247,0.4)]">
          <Lock className="w-20 h-20 text-purple-400" />
        </div>
      </div>
      <h2 className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400 mb-2 uppercase">Level {level} Unlocked</h2>
      <p className="text-white/40 font-bold tracking-widest uppercase mb-8">You've reached a true Alpha state</p>
      <button
        onClick={onClose}
        className="px-12 py-4 bg-white text-black font-black uppercase italic rounded-full shadow-[0_10px_30px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
      >
        Continue
      </button>
    </motion.div>
  </motion.div>
);

const MatchmakingOverlay = ({ onCancel, onFound }: { onCancel: () => void; onFound: (stream: MediaStream) => void }) => {
  const [status, setStatus] = useState<'PERMISSION' | 'SEARCHING' | 'FOUND'>('PERMISSION');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Request permissions immediately
    const initCamera = async () => {
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
        setStatus('SEARCHING');

        // Mock Matchmaking Delay
        setTimeout(() => {
          setStatus('FOUND');
          setTimeout(() => onFound(localStream), 1500);
        }, 3000);
      } catch (err) {
        console.error("Camera permission denied:", err);
        alert("Camera and Microphone access is required for Duel Mode.");
        onCancel();
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
    >
      <div className="relative w-full max-w-md bg-[#0d0d15] border border-white/10 rounded-[40px] p-8 flex flex-col items-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-purple-500/10" />
        <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />

        <h2 className="relative z-10 text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 uppercase tracking-tighter">
          {status === 'PERMISSION' && "Accessing Satellites..."}
          {status === 'SEARCHING' && "Scanning Frequency..."}
          {status === 'FOUND' && "Target Locked!"}
        </h2>

        {/* Camera Preview or Loader */}
        <div className="relative w-48 h-48 rounded-full border-4 border-white/10 overflow-hidden mb-8 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full bg-black/50 flex items-center justify-center">
              <div className="w-icon h-icon animate-pulse text-white/20">
                <Camera className="w-12 h-12" />
              </div>
            </div>
          )}

          {/* Scanning Overlay */}
          {status === 'SEARCHING' && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-t-4 border-cyan-400 rounded-full opacity-50"
            />
          )}
        </div>

        <p className="relative z-10 text-white/40 text-xs font-bold uppercase tracking-widest mb-8 text-center">
          {status === 'PERMISSION' && "Please allow camera access"}
          {status === 'SEARCHING' && "Looking for a worthy opponent..."}
          {status === 'FOUND' && "Opponent Found. Initializing Battle."}
        </p>

        <button
          onClick={onCancel}
          className="relative z-10 px-8 py-3 rounded-full bg-white/5 border border-white/10 text-white/60 font-black uppercase text-xs hover:bg-white/10 transition-all"
        >
          Abort Mission
        </button>
      </div>
    </motion.div>
  );
};


export default function Home() {
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

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOutUser = async () => {
    await supabase.auth.signOut();
  };
  const [gameState, setGameState] = useState<GameState>("IDLE");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [currentCoin, setCurrentCoin] = useState<Coin | null>(null);
  const [userInput, setUserInput] = useState("");

  // Progression
  const [unlockedLevels, setUnlockedLevels] = useState(1);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelStreak, setLevelStreak] = useState(0);
  const [maxLevelStreak, setMaxLevelStreak] = useState(0);

  // Scoring & Stats
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(500);
  const [displayedTotalPoints, setDisplayedTotalPoints] = useState(500); // Visual ticker
  const [coinsIdentified, setCoinsIdentified] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [sessionNetPoints, setSessionNetPoints] = useState(0); // Tracking win/loss in current session
  const [opponentScore, setOpponentScore] = useState(0);

  // Timers
  const [perCoinTimer, setPerCoinTimer] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  // Game Modes
  type GameMode = "RANK_TIME" | "TOKEN_PUZZLE" | "DUEL" | "ZEN";
  const [gameMode, setGameMode] = useState<GameMode | null>("RANK_TIME");

  // UI States
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [globalAnimations, setGlobalAnimations] = useState<AnimationItem[]>([]);
  const [achievement, setAchievement] = useState<{ text: string; subtext: string } | null>(null);
  const [newUnlock, setNewUnlock] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [revealExtras, setRevealExtras] = useState(0); // For Token Puzzle mode
  // Duel Mode State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionInterval = useRef<NodeJS.Timeout | null>(null);
  const coinInterval = useRef<NodeJS.Timeout | null>(null);
  const hintButtonRef = useRef<HTMLButtonElement>(null);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const timerBarRef = useRef<HTMLDivElement>(null);
  const scoreCounterRef = useRef<HTMLDivElement>(null);

  const getRefCenter = (ref: React.RefObject<HTMLElement | null>) => {
    if (!ref.current) return { x: typeof window !== "undefined" ? window.innerWidth / 2 : 0, y: typeof window !== "undefined" ? window.innerHeight / 2 : 0 };
    const rect = ref.current.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  const triggerGlobalAnimation = (points: number, sourceRef: React.RefObject<HTMLElement | null>, targetRef: React.RefObject<HTMLElement | null>) => {
    const start = getRefCenter(sourceRef);
    const target = getRefCenter(targetRef);
    const id = Date.now();

    setGlobalAnimations(prev => [...prev, {
      id,
      value: points,
      startX: start.x,
      startY: start.y,
      targetX: target.x,
      targetY: target.y,
      onComplete: () => {
        setDisplayedTotalPoints(curr => curr + points);
        setGlobalAnimations(curr => curr.filter(a => a.id !== id));
      }
    }]);
  };

  // --- Data Sourcing ---
  const fetchCoins = async () => {
    setGameState("LOADING");
    try {
      // 1. Try Cache
      const cached = localStorage.getItem("cz_test_coins_v3");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 86400000) { // 24h cache
          setCoins(parsed.data);
          setGameState("IDLE");
          return;
        }
      }

      // 2. Try Parallel Fetch
      const pages = [1, 2, 3, 4];
      const fetchPromises = pages.map(p => {
        const apiKeyIdx = Math.floor(Math.random() * 2);
        // Use env var if available, otherwise fallback to public (rate limited)
        const demoKey = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
        const headers: HeadersInit = demoKey ? { "x-cg-demo-api-key": demoKey } : {};

        // Add query param for auth if using Pro key
        const authParam = demoKey ? `&x_cg_demo_api_key=${demoKey}` : "";

        return fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${p}&sparkline=false${authParam}`, {
          headers
        })
          .then(res => res.json());
      });

      const results = await Promise.all(fetchPromises);
      let allCoins: Coin[] = [];
      results.forEach(data => {
        const pageCoins = data.map((c: any) => ({
          id: c.id,
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          image: c.image,
          market_cap_rank: c.market_cap_rank
        }));
        allCoins = [...allCoins, ...pageCoins];
      });

      if (allCoins.length > 0) {
        localStorage.setItem("cz_test_coins_v3", JSON.stringify({
          timestamp: Date.now(),
          data: allCoins
        }));
        setCoins(allCoins);
      } else {
        throw new Error("Empty coins list");
      }
      setGameState("IDLE");
    } catch (error) {
      console.warn("Failed to fetch from API, using fallback:", error);
      // 3. Fallback to hardcoded list if API fails
      setCoins(FALLBACK_COINS);
      setGameState("IDLE");
    }
  };

  useEffect(() => {
    fetchCoins();

    const savedHL = localStorage.getItem("cz_test_highscore");
    if (savedHL) setHighScore(parseInt(savedHL));

    const savedTotal = localStorage.getItem("cz_test_total_points");
    if (savedTotal && parseInt(savedTotal) > 0) {
      setTotalPoints(parseInt(savedTotal));
      setDisplayedTotalPoints(parseInt(savedTotal));
    } else {
      setTotalPoints(500);
      setDisplayedTotalPoints(500);
      localStorage.setItem("cz_test_total_points", "500");
    }

    const savedUnlocked = localStorage.getItem("cz_test_unlocked_levels");
    if (savedUnlocked) setUnlockedLevels(parseInt(savedUnlocked));

    return () => {
      if (sessionInterval.current) clearInterval(sessionInterval.current);
      if (coinInterval.current) clearInterval(coinInterval.current);
    };
  }, []);

  // --- Game Mechanics ---

  const startNewGame = (level: number) => {
    setCurrentLevel(level);
    setGameState("PLAYING");
    setCurrentLevel(level);
    setGameState("PLAYING");
    setScore(totalPoints);
    setCoinsIdentified(0);
    setCombo(0);
    setLevelStreak(0);
    setMaxLevelStreak(0);
    setRevealExtras(0);
    setSessionNetPoints(0);
    setCoinsIdentified(0);
    setIsTimerPaused(false);
    setOpponentScore(0);

    // Timer setup:
    // Rank Time: Starts at 0, goes to 300 (session). 30 per coin.
    // Token Puzzle: Starts at 60, goes to 0 (session). Correct = +15.
    // Duel: Starts at 120, goes to 0.
    setSessionTimer(gameMode === "RANK_TIME" ? 0 : gameMode === "DUEL" ? 120 : 60);
    setPerCoinTimer(0);

    const minRank = (level - 1) * 50 + 1;
    const maxRank = level * 50;
    const pool = coins.filter(c => c.market_cap_rank >= minRank && c.market_cap_rank <= maxRank);

    if (pool.length === 0) {
      console.warn("Empty pool for Level", level, "- falling back to all available");
      pickRandomCoin(level, pool.length > 0 ? pool : coins);
    } else {
      pickRandomCoin(level, pool);
    }

    if (sessionInterval.current) clearInterval(sessionInterval.current);
    sessionInterval.current = setInterval(() => {
      setSessionTimer(prev => {
        if (gameMode === "RANK_TIME") {
          if (prev >= SESSION_LIMIT) {
            endGame();
            return prev;
          }
          return prev + 1;
        } else {
          // TOKEN PUZZLE and DUEL: Counts down
          if (prev <= 0) {
            endGame();
            return 0;
          }
          return prev - 1;
        }
      });
    }, 1000);
  };

  const endGame = useCallback(() => {
    setGameState("GAMEOVER");
    if (sessionInterval.current) clearInterval(sessionInterval.current);
    if (coinInterval.current) clearInterval(coinInterval.current);

    if (sessionNetPoints > 0) {
      playSound("win");
    } else {
      playSound("lose");
    }

    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("cz_test_highscore", score.toString());
    }
  }, [score, highScore, sessionNetPoints]);

  const pickRandomCoin = useCallback((level: number, providedPool?: Coin[]) => {
    let pool = providedPool;
    if (!pool) {
      const minRank = (level - 1) * 50 + 1;
      const maxRank = level * 50;
      pool = coins.filter(c => c.market_cap_rank >= minRank && c.market_cap_rank <= maxRank);
      if (pool.length === 0) pool = coins; // absolute fallback
    }

    if (pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    setCurrentCoin(pool[randomIndex]);
    setUserInput("");
    setPerCoinTimer(0);
    setHintUsed(false);
    setRevealExtras(0);

    // RE-INITIALIZE THE 30S TIMER
    if (coinInterval.current) clearInterval(coinInterval.current);
    coinInterval.current = setInterval(() => {
      setPerCoinTimer(prev => {
        if (prev >= PER_COIN_LIMIT) {
          setCombo(0);
          setLevelStreak(0);
          endGame();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [coins, endGame]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (currentCoin && val.length > currentCoin.symbol.length) return;
    setUserInput(val);

    if (currentCoin && val.toUpperCase() === currentCoin.symbol) {
      handleCorrectGuess();
    }
  };

  const updateTotalPoints = (delta: number) => {
    setTotalPoints(prev => {
      const newVal = Math.max(0, prev + delta);
      localStorage.setItem("cz_test_total_points", newVal.toString());
      return newVal;
    });
  };

  const handleHint = () => {
    if (!currentCoin || hintUsed || gameMode === "DUEL") return;

    if (gameMode === "TOKEN_PUZZLE") {
      setRevealExtras(prev => prev + 1);
      playSound("hint", -5);
      setHintUsed(true);
      updateTotalPoints(-5);
      setSessionNetPoints(prev => prev - 5);

      triggerGlobalAnimation(-5, hintButtonRef, scoreCounterRef);
      return;
    }

    const symbol = currentCoin.symbol;

    // Find all empty or incorrect indices
    const pendingIndices: number[] = [];
    for (let i = 0; i < symbol.length; i++) {
      const inputChar = (userInput[i] || "").toUpperCase();
      if (!inputChar || inputChar !== symbol[i]) {
        pendingIndices.push(i);
      }
    }

    if (pendingIndices.length === 0) return;

    // Pick one at random
    const randomIndex = pendingIndices[Math.floor(Math.random() * pendingIndices.length)];

    // Construct new input string
    const symbolChars = symbol.split('');
    const currentChars = userInput.split('');

    // Ensure the array is at least as long as required
    const maxLen = Math.max(userInput.length, randomIndex + 1);
    const newChars = Array.from({ length: maxLen }, (_, i) => {
      if (i === randomIndex) return symbolChars[i];
      return currentChars[i] || " "; // Space is a placeholder
    });

    const newVal = newChars.join('').trimEnd();
    setUserInput(newVal);

    playSound("hint", -5);
    setHintUsed(true);
    updateTotalPoints(-5);
    setSessionNetPoints(prev => prev - 5);

    triggerGlobalAnimation(-5, hintButtonRef, scoreCounterRef);

    if (newVal === symbol) setTimeout(() => handleCorrectGuess(), 300);
  };

  const handleSkip = () => {
    if (gameMode === "DUEL") return; // No skips in Duel
    playSound("skip", -15);
    updateTotalPoints(-15);
    setSessionNetPoints(prev => prev - 15);

    triggerGlobalAnimation(-15, skipButtonRef, scoreCounterRef);

    setCombo(0);
    setLevelStreak(0);

    setTimeout(() => {
      pickRandomCoin(currentLevel);
    }, 2500);
  };

  const calculatePoints = (timeTaken: number) => {
    if (timeTaken <= 5) return 50;
    if (timeTaken <= 10) return 20;
    if (timeTaken <= 20) return 10;
    return 1; // Always at least 1 point for correct guess
  };

  const handleCorrectGuess = () => {
    if (!currentCoin) return;
    const pts = gameMode === "RANK_TIME" ? calculatePoints(perCoinTimer) : 25;
    playSound("success", pts);
    const newCombo = combo + 1;
    const newLevelStreak = levelStreak + 1;
    let bonus = 0;

    if (newCombo % 15 === 0) {
      bonus = 300;
      setAchievement({ text: "CZ BOY", subtext: "15 IN A ROW! +300" });
      playSound("combo", 300);
    } else if (newCombo % 10 === 0) {
      bonus = 100;
      setAchievement({ text: "BIG WIN", subtext: "10 IN A ROW! +100" });
      playSound("combo", 100);
    } else if (newCombo % 5 === 0) {
      bonus = 50;
      setAchievement({ text: "COMBO", subtext: "5 IN A ROW! +50" });
      playSound("combo", 50);
    }

    const earned = pts + bonus;
    setScore(prev => prev + earned);
    updateTotalPoints(earned);
    setSessionNetPoints(prev => prev + earned);

    setSessionNetPoints(prev => prev + earned);

    // In Rank Time, points are time-based -> Origin: Timer Bar. 
    // In Token Puzzle, points are fixed -> Origin: Center (default) or Input (not tracked ideally, keeping center for now)
    const isTimeLinked = gameMode === "RANK_TIME";

    setSessionNetPoints(prev => prev + earned);

    // Fly to center (FloatingPoints logic now centers itself)
    // Fly to center (FloatingPoints logic now centers itself)
    triggerGlobalAnimation(earned, isTimeLinked ? timerBarRef : { current: null } as any, scoreCounterRef);

    if (gameMode === "TOKEN_PUZZLE") {
      setSessionTimer(prev => Math.min(60, prev + 15));
    }

    setCoinsIdentified(prev => prev + 1);
    setCombo(newCombo);
    setLevelStreak(newLevelStreak);
    if (newLevelStreak > maxLevelStreak) setMaxLevelStreak(newLevelStreak);


    if (newLevelStreak === 10 && currentLevel === unlockedLevels && unlockedLevels < 10) {
      const nextLevel = unlockedLevels + 1;
      setUnlockedLevels(nextLevel);
      localStorage.setItem("cz_test_unlocked_levels", nextLevel.toString());
      setNewUnlock(nextLevel);
      playSound("unlock");
    }

    setTimeout(() => {
      setAchievement(null);
    }, 2000);

    pickRandomCoin(currentLevel);
  };

  const copyReferral = () => {
    navigator.clipboard.writeText("https://cztest.app/ref/CZ_ALPHA_1");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- UI Layouts ---

  if (gameState === "LOADING") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.5)]" />
        <p className="mt-4 font-bold tracking-widest text-purple-400 animate-pulse uppercase">Fetching Chain Data...</p>
      </div>
    );
  }

  if (gameState === "LEVEL_SELECT") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white p-6 pb-20">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <button onClick={() => setGameState("IDLE")} className="p-2 bg-white/5 rounded-full"><RotateCcw className="w-6 h-6" /></button>
            <h2 className="text-3xl font-black italic tracking-tighter">SELECT LEVEL</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 10 }).map((_, i) => {
              const level = i + 1;
              const isLocked = level > unlockedLevels;
              return (
                <button
                  key={level}
                  disabled={isLocked}
                  onClick={() => startNewGame(level)}
                  className={`relative h-44 rounded-[40px] border-2 flex flex-col items-center justify-center transition-all overflow-hidden ${isLocked ? 'bg-white/5 border-white/5 opacity-50' : 'bg-gradient-to-br from-purple-600/20 to-transparent border-purple-500/30'
                    }`}
                >
                  {isLocked ? (
                    <>
                      <Lock className="w-10 h-10 text-white/10 mb-2" />
                      <span className="text-[px] font-black uppercase tracking-widest text-white/20 px-4 text-center">Reach 10-Streak in Lvl {level - 1}</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-12 h-12 text-purple-400 mb-2" />
                      <span className="text-2xl font-black italic">LVL {level}</span>
                      <span className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase">Ranks {((level - 1) * 50) + 1}-{level * 50}</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "GAMEOVER") {
    const isWinner = sessionNetPoints > 0;

    return (
      <div className={`min-h-screen ${isWinner ? 'bg-[#0a0a0f]' : 'bg-[#0f0a0a]'} text-white flex flex-col items-center justify-center p-6 text-center transition-colors duration-1000`}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm px-4"
        >
          <div className="mb-8 relative">
            <AnimatePresence mode="wait">
              {isWinner ? (
                <motion.div
                  key="win-header"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <Trophy className="w-16 h-16 text-yellow-400 mb-4 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                  <h2 className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-500 mb-2 uppercase">VICTORY</h2>
                </motion.div>
              ) : (
                <motion.div
                  key="lose-header"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <X className="w-16 h-16 text-red-500 mb-4 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                  <h2 className="text-5xl font-black italic text-red-500/80 mb-2 uppercase">TOUGH LUCK</h2>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="text-white/40 uppercase tracking-widest text-xs font-bold">Level {currentLevel} Session Results</p>
          </div>

          {gameMode === "DUEL" ? (
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="flex flex-col items-center">
                <div className="text-4xl font-black text-cyan-400 mb-2">{score}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">YOU</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="flex flex-col items-center">
                <div className="text-4xl font-black text-red-400 mb-2">{opponentScore}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">ENEMY</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-6">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white/5 border border-white/10 p-5 rounded-[28px] backdrop-blur-sm flex items-center justify-between"
              >
                <div className="text-left">
                  <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Points Change</div>
                  <div className={`text-2xl font-black flex items-center gap-2 ${sessionNetPoints >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {sessionNetPoints >= 0 ? "+" : ""}{sessionNetPoints}
                    <Star className="w-5 h-5 fill-current" />
                  </div>
                </div>
                <div className={`p-3 rounded-2xl ${isWinner ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                  <Star className="w-6 h-6 fill-current" />
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/5 border border-white/10 p-5 rounded-[28px] backdrop-blur-sm"
                >
                  <div className="text-2xl font-black text-purple-400 italic">{coinsIdentified}</div>
                  <div className="text-[9px] text-white/40 uppercase font-bold mt-1 tracking-tighter">Recognized</div>
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/5 border border-white/10 p-5 rounded-[28px] backdrop-blur-sm"
                >
                  <div className="text-2xl font-black text-cyan-400 italic">{maxLevelStreak}</div>
                  <div className="text-[9px] text-white/40 uppercase font-bold mt-1 tracking-tighter">Best Streak</div>
                </motion.div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                playSound("click");
                startNewGame(currentLevel);
              }}
              className={`w-full py-4 rounded-2xl ${isWinner ? 'bg-white text-black' : 'bg-white/10 text-white/60'} font-black text-lg uppercase italic flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl`}
            >
              <RotateCcw className="w-5 h-5" /> RESTART MISSION
            </button>
            <button
              onClick={() => {
                playSound("click");
                setGameState("IDLE");
              }}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-black text-lg uppercase italic flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <User className="w-5 h-5" /> HQ COMMAND
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0f] text-white font-sans overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence>
        {achievement && <AchievementBanner key="ach" {...achievement} />}
        {newUnlock && <LevelUnlockCeremony key="unlock" level={newUnlock} onClose={() => setNewUnlock(null)} />}
      </AnimatePresence>

      <GlobalAnimationOverlay animations={globalAnimations} />

      {/* Duel Mode Components */}

      {/* Progress Gauge */}
      {gameState === "PLAYING" && gameMode !== "DUEL" && (
        <div className="fixed right-8 sm:right-24 top-1/2 -translate-y-1/2 w-3 sm:w-5 h-[400px] bg-white/5 rounded-full border border-white/10 overflow-visible z-20">
          <motion.div
            initial={{ height: "0%" }}
            animate={{ height: `${(Math.min(levelStreak, 15) / 15) * 100}%` }}
            className="absolute bottom-0 w-full bg-gradient-to-t from-purple-600 via-fuchsia-500 to-cyan-400 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.5)]"
          />
          {[5, 10, 15].map(m => (
            <div key={m} className={`absolute left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center pointer-events-none transition-all duration-500 ${levelStreak >= m ? 'scale-125' : 'scale-100'}`} style={{ bottom: `${(m / 15) * 100}%`, marginBottom: '-16px' }}>
              <div className={`transition-all duration-500 rounded-full ${levelStreak >= m ? 'w-4 h-4 bg-white shadow-[0_0_15px_white]' : 'w-2 h-2 bg-white/20'}`} />
              <div className={`absolute left-8 text-[9px] font-black italic tracking-widest uppercase origin-left hidden sm:block ${levelStreak >= m ? 'text-white' : 'text-white/20'}`}>
                {m === 5 ? 'COMBO' : m === 10 ? 'NEXT LVL' : 'CZ BOY'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between p-6 pt-[max(1.5rem,env(safe-area-inset-top))] relative z-10 max-w-4xl mx-auto w-full">
        <div className="flex-1">
          {gameState === "PLAYING" && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full w-fit">
                <Timer className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono font-bold">
                  {gameMode === "RANK_TIME" ? (
                    <>
                      {Math.floor((SESSION_LIMIT - sessionTimer) / 60)}:
                      {((SESSION_LIMIT - sessionTimer) % 60).toString().padStart(2, '0')}
                    </>
                  ) : (
                    <>
                      {Math.floor(sessionTimer / 60)}:
                      {(sessionTimer % 60).toString().padStart(2, '0')}
                    </>
                  )}
                </span>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 ml-2">LEVEL {currentLevel}</div>
            </div>
          )}
        </div>

        <h1 className="text-4xl font-black tracking-tighter italic text-center [@media(max-height:700px)]:hidden">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-500 to-cyan-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            CZ TEST
          </span>
        </h1>

        <div className="flex-1 flex justify-end gap-3">
          {(gameState === "PLAYING" || gameState === "IDLE") && (
            <div
              ref={scoreCounterRef}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <div className="text-sm font-black min-w-[40px]">
                <AnimatedNumber value={displayedTotalPoints} />
              </div>
            </div>
          )}
          {gameState === "IDLE" && (
            <Link
              href="/leaderboard"
              className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              <Trophy className="w-6 h-6 text-yellow-400" />
            </Link>
          )}

          <ProfileSection
            onShowProfile={() => setShowProfile(true)}
            gameState={gameState}
            session={session}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-between py-10 px-6 [@media(max-height:700px)]:py-2 relative z-10 h-[calc(100vh-88px)] w-full max-w-5xl mx-auto">

        {gameState === "IDLE" ? (
          <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl">
            <h2 className="text-xl font-black italic tracking-widest text-purple-400 mb-8 uppercase">Select Game Mode</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full px-4 mt-20">
              {[
                {
                  id: "RANK_TIME",
                  title: "RANK TIME",
                  desc: "Identify tokens by rank before time runs out",
                  component: RankTimeIcon,
                  color: "from-purple-600 to-blue-600",
                  active: true
                },
                {
                  id: "TOKEN_PUZZLE",
                  title: "TOKEN PUZZLE",
                  desc: "The logo is hidden. Decode the fragments",
                  component: TokenPuzzleIcon,
                  color: "from-orange-600 to-red-600",
                  active: true
                },
                {
                  id: "DUEL",
                  title: "1v1 DUEL",
                  desc: "Live PvP Battle",
                  component: DuelIcon,
                  color: "from-cyan-600 to-blue-600",
                  active: true
                },
                {
                  id: "ZEN",
                  title: "ZEN MODE",
                  desc: "Coming Soon",
                  component: ZenModeIcon,
                  color: "from-green-600 to-emerald-600",
                  active: false
                }
              ].map((mode) => (
                <motion.button
                  key={mode.id}
                  whileHover={mode.active ? { scale: 1.02, y: -5 } : {}}
                  whileTap={mode.active ? { scale: 0.98 } : {}}
                  onMouseEnter={() => setHoveredMode(mode.id)}
                  onMouseLeave={() => setHoveredMode(null)}
                  onClick={() => {
                    if (!session) {
                      setShowProfile(true);
                      return;
                    }
                    if (mode.active) {
                      setGameMode(mode.id as GameMode);
                      if (mode.id === "DUEL") {
                        setGameState("PLAYING");
                      } else {
                        setGameState("LEVEL_SELECT");
                      }
                    }
                  }}
                  className={`relative group h-48 rounded-[40px] p-8 text-left overflow-hidden border-2 transition-all ${mode.active
                    ? 'bg-white/5 border-white/10 hover:border-white/20'
                    : 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mode.color} blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity`} />
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {/* <mode.icon className={`w-5 h-5 ${mode.active ? 'text-white' : 'text-white/20'}`} /> */}
                        <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50">Mode</span>
                      </div>
                      <h3 className="text-2xl font-black italic tracking-tighter mb-1">{mode.title}</h3>
                      <p className="text-xs text-white/40 font-medium leading-relaxed max-w-[180px]">{mode.desc}</p>
                    </div>

                    <div className="absolute right-4 bottom-4 opacity-100 scale-100 transition-all duration-500">
                      <mode.component className={`w-24 h-24 text-white/20 group-hover:text-white/40 transition-colors duration-500`} isHovered={hoveredMode === mode.id} />
                    </div>

                    {!mode.active && (
                      <div className="bg-white/5 w-fit px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">Coming Soon</div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
            <p className="mt-12 text-white/20 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">RANK TIME OVERHAUL ENABLED</p>
          </div>
        ) : gameMode === "DUEL" ? (
          <DuelArena
            coins={coins}
            userPoints={totalPoints}
            onUpdatePoints={setTotalPoints}
            onExit={() => {
              setGameMode(null);
              setGameState("IDLE");
            }}
          />
        ) : (
          /* Original Playing View */
          <div className="flex flex-col h-full w-full">
            {/* Timers & HUD */}
            <div className="w-full flex flex-col gap-4 mb-4 max-w-md">
              <div className="flex items-center gap-3">
                <div
                  ref={timerBarRef}
                  className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5"
                >
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${(perCoinTimer / PER_COIN_LIMIT) * 100}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${perCoinTimer > 25 ? 'bg-red-500 shadow-[0_0_20px_#ef4444]' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'}`}
                  />
                </div>
                <span className={`text-xs font-black min-w-8 text-right font-mono ${perCoinTimer > 25 ? 'text-red-500 animate-pulse' : 'text-white/60'}`}>
                  {PER_COIN_LIMIT - perCoinTimer}s
                </span>
              </div>

              <div className="flex items-center justify-center min-h-[40px] gap-4">
                {levelStreak > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-white/40"
                  >
                    <span className="text-[10px] font-black tracking-widest uppercase">Goal {levelStreak}/10</span>
                  </motion.div>
                )}
                {combo > 1 && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-600 px-5 py-2 rounded-full"
                  >
                    <Flame className="w-4 h-4 fill-white" />
                    <span className="text-xs font-black italic">{combo} COMBO</span>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Central Area */}
            <div className="relative flex flex-col items-center flex-1 justify-center -mt-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentCoin?.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0, x: 200 }}
                  className="relative w-56 h-56 sm:w-56 sm:h-56 [@media(max-height:700px)]:w-24 [@media(max-height:700px)]:h-24 rounded-full bg-white/5 border-4 border-white/10 flex items-center justify-center p-10 [@media(max-height:700px)]:p-4 backdrop-blur-2xl shadow-2xl"
                >
                  {currentCoin && (
                    gameMode === "TOKEN_PUZZLE" ? (
                      <TokenPuzzleLogo image={currentCoin.image} revealCount={revealExtras} />
                    ) : (
                      <motion.img
                        src={currentCoin.image}
                        alt="token"
                        onLoad={() => console.log("Image loaded:", currentCoin.symbol)}
                        onError={(e) => {
                          (e.target as any).src = "https://assets.coingecko.com/coins/images/1/large/bitcoin.png";
                        }}
                        className="w-full h-full object-cover rounded-full z-10"
                      />
                    )
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Input & HUD */}
            <div className="w-full max-w-sm flex flex-col items-center gap-8 mb-6 [@media(max-height:700px)]:gap-3 [@media(max-height:700px)]:mb-2 relative">
              <div className="flex gap-2.5 flex-wrap justify-center min-h-[70px]">
                {currentCoin?.symbol.split("").map((char, i) => (
                  <div key={i} className={`w-12 h-16 [@media(max-height:700px)]:w-10 [@media(max-height:700px)]:h-12 [@media(max-height:700px)]:text-xl rounded-[20px] border-2 flex items-center justify-center text-3xl font-black shadow-lg ${userInput[i] ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/5 bg-white/5 text-white/5'
                    }`}
                  >
                    {userInput[i] ? userInput[i].toUpperCase() : ""}
                    {(!userInput[i] || userInput[i] === "") && <div className="w-6 h-1 bg-white/10 rounded-full" />}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 w-full">
                <button
                  ref={hintButtonRef}
                  onClick={handleHint}
                  disabled={hintUsed}
                  className={`flex-1 flex flex-col items-center justify-center p-4 rounded-[32px] border-2 transition-all ${hintUsed ? 'opacity-20 pointer-events-none' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 active:scale-90 hover:border-yellow-500/60'
                    }`}
                >
                  <Lightbulb className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-black uppercase">Hint</span>
                  <span className="text-[8px] font-bold opacity-40 mt-0.5">-5 pts</span>
                </button>

                <button
                  ref={skipButtonRef}
                  onClick={handleSkip}
                  className="flex-1 flex flex-col items-center justify-center p-4 rounded-[32px] bg-red-500/10 border-2 border-red-500/30 text-red-500 active:scale-95 transition-all"
                >
                  <FastForward className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-black uppercase">Skip</span>
                  <span className="text-[8px] font-bold opacity-40 mt-0.5">-15 pts</span>
                </button>
              </div>

              <input
                ref={inputRef}
                type="text"
                autoFocus
                dir="ltr"
                lang="en"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="absolute inset-0 opacity-0 cursor-default w-full h-full"
                value={userInput}
                onChange={handleInput}
                onBlur={() => inputRef.current?.focus()}
              />

              <div className="flex items-center gap-2 text-white/20 text-[10px] font-black uppercase tracking-[0.5em] pb-2">
                <ChevronRight className="w-4 h-4 animate-pulse" /> Identify Token Symbol
              </div>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setShowProfile(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full max-w-lg bg-[#0d0d15] border-t sm:border border-white/5 rounded-t-[40px] sm:rounded-[50px] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-black italic tracking-tighter">ELITE PROFILE</h2>
                <button onClick={() => setShowProfile(false)} className="p-2 rounded-full bg-white/5"><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { label: "Elite Rank", value: `LEVEL ${unlockedLevels}`, icon: Trophy, color: "text-purple-400" },
                  { label: "Total Points", value: totalPoints, icon: Star, color: "text-yellow-400" },
                  { label: "Referral Link", value: "CZ_ALPHA_1", icon: Users, color: "text-cyan-400" },
                  { label: "High Score", value: highScore, icon: Gamepad2, color: "text-blue-400" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 p-5 rounded-[40px] border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className={`w-3 h-3 ${stat.color}`} />
                      <span className="text-[10px] text-white/20 uppercase font-black"></span>
                    </div>
                    <div className="text-xl font-black italic truncate">{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 p-8 rounded-[50px] border border-white/5 mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black italic">REFERRAL EARNINGS</h3>
                  <span className="text-xl font-black text-green-400">+{Math.floor(Math.max(0, totalPoints - 500) * 0.1)}</span>
                </div>
                <p className="text-[10px] text-white/20 font-bold uppercase mb-4">10% from every referred user</p>
                <div className="flex items-center justify-between bg-black/40 p-4 rounded-3xl border border-white/5">
                  <span className="text-white/20 font-mono text-[10px] truncate">cztest.app/ref/CZ_ALPHA_1</span>
                  <button onClick={copyReferral} className="p-2 bg-white/5 rounded-xl">
                    {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/40" />}
                  </button>
                </div>
              </div>

              {session ? (
                <button
                  onClick={() => signOutUser()}
                  className="w-full py-5 rounded-[30px] bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3 shadow-lg"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => signInWithGoogle()}
                  className="w-full py-5 rounded-[30px] bg-purple-600 border border-purple-400/50 text-white font-black uppercase tracking-widest hover:bg-purple-500 transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(147,51,234,0.3)]"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5 filter brightness-200" alt="Google" />
                  Sign In with Google
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

function ProfileSection({ onShowProfile, gameState, session }: { onShowProfile: () => void, gameState: GameState, session: any }) {

  if (session) {
    return (
      <button
        onClick={onShowProfile}
        className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm shadow-xl"
      >
        <img
          src={session.user?.image || ""}
          alt="Avatar"
          className="w-8 h-8 rounded-full border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
        />
        <div className="hidden sm:block text-left pr-2">
          <p className="text-[10px] font-black italic truncate max-w-[100px] leading-none uppercase">{session.user?.name}</p>
          <p className="text-[8px] font-black uppercase text-purple-400 leading-none mt-1">Player</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onShowProfile}
      className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm group flex items-center gap-2"
    >
      <User className="w-6 h-6 text-white/40 group-hover:text-purple-400 transition-colors" />
      <span className="text-[10px] font-black uppercase text-white/20 hidden sm:block">Sign In</span>
    </button>
  );
}
