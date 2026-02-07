"use client";

import { motion, useAnimation, Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface IconProps {
    className?: string;
    isHovered?: boolean;
}

const pathVariants: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
        pathLength: 1,
        opacity: 1,
        transition: {
            pathLength: { duration: 1.5, ease: "easeInOut" },
            opacity: { duration: 0.2 }
        }
    }
};

const useMobileAutoPlay = (controls: any) => {
    useEffect(() => {
        // Simple check for touch capability as a proxy for mobile/tablet intent
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (!isTouch) return;

        let timeout: NodeJS.Timeout;

        const trigger = () => {
            controls.start("visible").then(() => {
                setTimeout(() => {
                    controls.start("hidden");
                }, 2000); // Stay visible for 2s
            });

            // Schedule next run between 3s and 8s
            const delay = 3000 + Math.random() * 5000;
            timeout = setTimeout(trigger, delay);
        };

        // Initial delay
        timeout = setTimeout(trigger, Math.random() * 2000);

        return () => clearTimeout(timeout);
    }, [controls]);
};

export const RankTimeIcon = ({ className, isHovered }: IconProps) => {
    const controls = useAnimation();

    useEffect(() => {
        if (isHovered) {
            controls.start("visible");
        } else {
            controls.start("hidden");
        }
    }, [isHovered, controls]);

    useMobileAutoPlay(controls);

    return (
        <div className={className}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Coin Circle */}
                <motion.path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                />
                {/* Inner Ring */}
                <motion.path
                    d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.2 }}
                />
                {/* Star/Gem shape in middle */}
                <motion.path
                    d="M12 8L14.5 12L12 16L9.5 12L12 8Z"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.4 }}
                />
            </svg>
        </div>
    );
};

export const TokenPuzzleIcon = ({ className, isHovered }: IconProps) => {
    const controls = useAnimation();

    useEffect(() => {
        if (isHovered) {
            controls.start("visible");
        } else {
            controls.start("hidden");
        }
    }, [isHovered, controls]);

    useMobileAutoPlay(controls);

    return (
        <div className={className}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Puzzle Piece Left (Half Coin) */}
                <motion.path
                    d="M12 21C8.13401 21 5 17.866 5 14C5 10.134 8.13401 7 12 7V11C12 11 13 11 13 12C13 13 12 13 12 13V17C12 17 11 17 11 16C11 15 10 15 10 16C10 17 11 17 12 17V21Z"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                />
                {/* Puzzle Piece Right (Half Coin) */}
                <motion.path
                    d="M12 21V17C13.6569 17 15 15.6569 15 14C15 12.3431 13.6569 11 12 11V7C15.866 7 19 10.134 19 14C19 17.866 15.866 21 12 21Z"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.2 }}
                />
            </svg>
        </div>
    );
};

export const DuelIcon = ({ className, isHovered }: IconProps) => {
    const controls = useAnimation();

    useEffect(() => {
        if (isHovered) {
            controls.start("visible");
        } else {
            controls.start("hidden");
        }
    }, [isHovered, controls]);

    useMobileAutoPlay(controls);

    return (
        <div className={className}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                {/* Sword 1 (Right tilting) */}
                <motion.path
                    d="M14.5 4L20 9.5L9 20.5L3.5 15L14.5 4Z M3.5 15L2 22L9 20.5"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                />
                <motion.path
                    d="M5 19L10 14" // Center line
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.1 }}
                />

                {/* Sword 2 (Left tilting - Cross) */}
                <motion.path
                    d="M9.5 4L4 9.5L15 20.5L20.5 15L9.5 4Z M20.5 15L22 22L15 20.5"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.3 }}
                />
                <motion.path
                    d="M15 19L19 15" // Center line
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.4 }}
                />
            </svg>
        </div>
    );
};

export const ZenModeIcon = ({ className, isHovered }: IconProps) => {
    const controls = useAnimation();

    useEffect(() => {
        if (isHovered) {
            controls.start("visible");
        } else {
            controls.start("hidden");
        }
    }, [isHovered, controls]);

    useMobileAutoPlay(controls);

    return (
        <div className={className}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                {/* Circle */}
                <motion.path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                />
                {/* Question Mark */}
                <motion.path
                    d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.3 }}
                />
                <motion.path
                    d="M12 17H12.01"
                    variants={pathVariants}
                    initial="hidden"
                    animate={controls}
                    transition={{ delay: 0.5 }}
                />
            </svg>
        </div>
    );
};
