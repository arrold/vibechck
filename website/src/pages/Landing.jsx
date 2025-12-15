import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Coffee,
    AlertTriangle,
    Zap,
    ShieldAlert,
    Code2,
    ArrowRight,
    Search,
    Cpu,
    CheckCircle2
} from 'lucide-react';
import { Navbar, Footer } from '../components/Layout';
import { Button, Section, DisplayText, Badge } from '../components/UI';

// --- ANIMATION VARIANTS ---
const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.25, 0, 0, 1] }
    }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

// --- COMPONENTS ---
const CodeBlock = ({ code, fileName, errorLine }) => (
    <div className="font-mono text-sm bg-[#0F0F0F] border border-[#262626] p-4 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-[#262626] pb-2">
            <span className="text-[#737373] text-xs uppercase tracking-wider">{fileName}</span>
            <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-[#262626]" />
                <div className="w-2 h-2 rounded-full bg-[#262626]" />
            </div>
        </div>
        <div className="space-y-1 overflow-x-auto">
            {code.map((line, i) => (
                <div key={i} className={`flex ${i === errorLine ? 'bg-[#FF3D00]/10 -mx-4 px-4 border-l-2 border-[#FF3D00]' : ''}`}>
                    <span className="text-[#333] select-none w-8 text-right mr-4">{i + 1}</span>
                    <span className={`${i === errorLine ? 'text-[#FF3D00]' : 'text-[#A3A3A3]'}`}>
                        {line}
                    </span>
                    {i === errorLine && (
                        <span className="ml-4 text-[#FF3D00] text-xs flex items-center gap-1">
                            <AlertTriangle size={12} /> Hallucinated Import
                        </span>
                    )}
                </div>
            ))}
        </div>
    </div>
);

const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="group p-8 border border-[#262626] hover:border-[#FF3D00] transition-colors duration-300 bg-transparent hover:bg-[#1A1A1A]/30">
        <Icon className="w-8 h-8 text-[#FF3D00] mb-6" strokeWidth={1.5} />
        <h3 className="text-xl font-bold text-[#FAFAFA] mb-4 font-sans tracking-tight">{title}</h3>
        <p className="text-[#737373] leading-relaxed group-hover:text-[#A3A3A3] transition-colors">
            {description}
        </p>
    </div>
);

export default function Landing() {
    const currentVersion = "v0.1.0";

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] selection:bg-[#FF3D00] selection:text-[#0A0A0A] font-sans overflow-x-hidden">
            <Navbar />

            {/* HERO SECTION */}
            <div className="relative pt-20 min-h-screen flex flex-col lg:flex-row border-b border-[#262626]">
                {/* Left Content */}
                <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-20 lg:py-0 border-r border-[#262626]">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        className="max-w-3xl"
                    >
                        <motion.div variants={fadeUp}>
                            <Badge>{currentVersion} Release</Badge>
                        </motion.div>

                        <motion.div variants={fadeUp} className="mb-8">
                            <h1 className="text-6xl md:text-8xl lg:text-[7rem] font-bold tracking-tighter leading-[0.9] text-[#FAFAFA]">
                                DON'T SHIP<br />
                                <span className="text-[#FF3D00]">LAZY CODE.</span>
                            </h1>
                        </motion.div>

                        <motion.div variants={fadeUp} className="max-w-xl mb-12">
                            <p className="text-lg md:text-xl text-[#737373] leading-relaxed">
                                vibechck is the static analysis tool for the AI age. Detect hallucinations,
                                lazy implementation, and security shortcuts before they merge.
                            </p>
                        </motion.div>

                        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-6">
                            <Button variant="primary" className="text-lg" onClick={() => window.location.href = '/docs'}>
                                Get Started <ArrowRight size={20} />
                            </Button>
                            <div className="flex items-center gap-4 text-[#737373] font-mono text-sm px-4 py-3 bg-[#1A1A1A] border border-[#262626]">
                                <span>$ npm install --save-dev vibechck</span>
                                <div className="w-2 h-4 bg-[#FF3D00] animate-pulse" />
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Right Visual - "Sleepy Coder" Representation */}
                <div className="lg:w-[45%] bg-[#0F0F0F] relative overflow-hidden flex items-center justify-center min-h-[50vh] lg:min-h-auto border-t lg:border-t-0 border-[#262626]">
                    {/* Abstract "Sleepy Coder" Visual Composition */}
                    <div className="relative w-full h-full p-12 flex flex-col items-center justify-center">
                        {/* Background Noise/Grid */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]" />

                        {/* Central Monitor Element */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            className="relative z-10 w-full max-w-md aspect-video bg-[#0A0A0A] border border-[#333] shadow-2xl flex flex-col"
                        >
                            <div className="h-6 border-b border-[#333] flex items-center px-3 gap-2 bg-[#111]">
                                <div className="w-2 h-2 rounded-full bg-[#FF3D00]" />
                                <div className="w-2 h-2 rounded-full bg-[#333]" />
                            </div>
                            <div className="flex-1 p-4 font-mono text-xs text-[#555] overflow-hidden">
                                <div className="opacity-50">
                     // analyzing src/utils/ai_helper.ts...<br />
                     // warning: potential infinite recursion detected<br />
                     // error: 'fs/promises' import hallucinated in node12 env<br />
                                </div>
                                <div className="mt-4 text-[#FF3D00] animate-pulse whitespace-pre font-bold leading-tight">
                                    {"╔═══════════════════════════════════════╗\n║ VibeCheck Score: 62/100               ║\n╚═══════════════════════════════════════╝"}
                                </div>
                            </div>
                        </motion.div>

                        {/* The "Coder" Element (Stylized) */}
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-12"
                        >
                            <div className="relative">
                                {/* Coffee Cup */}
                                <Coffee size={120} strokeWidth={0.5} className="text-[#333] absolute -right-24 bottom-24 -rotate-12" />

                                {/* Silhouette Head/Shoulders */}
                                <div className="w-64 h-48 bg-[#1A1A1A] rounded-t-full border-t border-x border-[#333] relative overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {/* Sleepy Zzzs */}
                                        <motion.div
                                            animate={{ y: -20, opacity: [0, 1, 0], x: 10 }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                            className="text-[#FF3D00] font-bold text-2xl absolute top-10 right-10"
                                        >Z</motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* PROBLEM STATEMENT */}
            <Section className="border-b border-[#262626]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                    <div>
                        <h3 className="text-[#FF3D00] font-mono uppercase tracking-widest mb-6 text-sm">The Problem</h3>
                        <DisplayText size="md" className="mb-8">
                            AI writes code designed to pass tests, not to survive production.
                        </DisplayText>
                        <p className="text-[#737373] text-lg leading-relaxed max-w-md">
                            LLMs prioritize "looking correct" over being correct. They introduce subtle bugs, hallucinatory dependencies, and lazy error handling that standard linters miss.
                        </p>
                    </div>
                    <div className="space-y-8">
                        <CodeBlock
                            fileName="src/handlers/auth.ts"
                            errorLine={3}
                            code={[
                                "import { verify } from 'crypto';",
                                "import { db } from '../db';",
                                "import { check_permission } from 'auth-utils-v2'; // Does not exist",
                                "",
                                "export const login = async (req) => {",
                                "  try {",
                                "    await db.connect();",
                                "  } catch (e) {",
                                "    // TODO: fix later",
                                "  }",
                                "};"
                            ]}
                        />
                        <div className="flex gap-4 items-center text-sm text-[#737373]">
                            <AlertTriangle className="text-[#FF3D00]" size={16} />
                            <span>vibechck detects hallucinated packages instantly.</span>
                        </div>
                    </div>
                </div>
            </Section>

            {/* FEATURES GRID */}
            <Section id="features" className="border-b border-[#262626]">
                <div className="mb-20">
                    <Badge>Detection Engine</Badge>
                    <DisplayText size="lg">Catches the lazy stuff.</DisplayText>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                    <FeatureCard
                        icon={Zap}
                        title="Hallucination Detector"
                        description="Scans your imports against npm/pypi/cargo registries to ensure your AI assistant didn't just invent a convenient library."
                    />
                    <FeatureCard
                        icon={Code2}
                        title="Laziness Linter"
                        description="Flags `try/catch` blocks that silently swallow errors or contain comments like 'TODO: handle this' generated by tired LLMs."
                    />
                    <FeatureCard
                        icon={Cpu}
                        title="Complexity Analysis"
                        description="Detects 'God Functions' and overly complex logical structures that are a nightmare to maintain."
                    />
                    <FeatureCard
                        icon={ShieldAlert}
                        title="Security Sentinel"
                        description="Identifies code that looks secure but isn't—finding exposed secrets and basic security anti-patterns."
                    />
                    <FeatureCard
                        icon={Search}
                        title="Architecture Scanner"
                        description="Warns when files or functions are becoming too large (Complex Monoliths) or are circular."
                    />
                    <FeatureCard
                        icon={CheckCircle2}
                        title="Smart Suggestions"
                        description="Doesn't just complain. Generates actionable advice to tell you exactly how to simplify the mess."
                    />
                </div>
            </Section>

            {/* HOW IT WORKS */}
            <Section id="docs">
                <div className="flex flex-col lg:flex-row gap-20">
                    <div className="flex-1">
                        <Badge>Workflow</Badge>
                        <DisplayText size="md" className="mb-12">
                            Drop it in your CI/CD.<br />
                            It's just a binary.
                        </DisplayText>

                        <div className="space-y-12">
                            {[
                                { step: '01', title: 'Install', desc: 'npm install --save-dev vibechck' },
                                { step: '02', title: 'Scan', desc: 'Run `vibechck .` in your project root. We handle exclusions automatically.' },
                                { step: '03', title: 'Report', desc: 'Get a clear pass/fail score (0-100) and specific line-by-line errors.' }
                            ].map((item) => (
                                <div key={item.step} className="group flex gap-8 items-start">
                                    <span className="text-4xl font-bold text-[#262626] group-hover:text-[#FF3D00] transition-colors duration-300 font-mono">
                                        {item.step}
                                    </span>
                                    <div>
                                        <h4 className="text-xl font-bold text-[#FAFAFA] mb-2">{item.title}</h4>
                                        <p className="text-[#737373] max-w-xs">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-[#111] border border-[#262626] p-8 font-mono text-sm overflow-hidden">
                        <div className="flex gap-2 mb-6">
                            <div className="w-3 h-3 rounded-full bg-[#FF3D00]" />
                            <div className="w-3 h-3 rounded-full bg-[#333]" />
                            <div className="w-3 h-3 rounded-full bg-[#333]" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex text-[#737373]">
                                <span className="mr-4">$</span>
                                <span className="text-[#FAFAFA]">npx vibechck .</span>
                            </div>

                            <div className="text-[#FAFAFA]">
                                <span className="text-[#FF3D00]">➜</span> Scanning 42 files...
                            </div>

                            <div className="pl-4 border-l border-[#333] space-y-2 text-[#A3A3A3]">
                                <div>[src/utils/date.ts]</div>
                                <div className="text-[#FAFAFA]">
                                    <span className="text-[#FF3D00] font-bold">FAIL</span> Hallucination
                                </div>
                                <div className="text-[#737373]">
                                    Line 14: Package `moment-range-extended` does not exist in registry.
                                </div>
                            </div>

                            <div className="pl-4 border-l border-[#333] space-y-2 text-[#A3A3A3] mt-4">
                                <div>[src/api/user.ts]</div>
                                <div className="text-[#FAFAFA]">
                                    <span className="text-[#FF3D00] font-bold">FAIL</span> God Function
                                </div>
                                <div className="text-[#737373]">
                                    Line 45: Function `processUserProfile` is too complex (CC: 25). Break it down.
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-[#FF3D00]/10 text-[#FF3D00] border border-[#FF3D00]/20">
                                Final Score: 60/100.
                                Found 2 critical issues. Process exited with code 1.
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* CTA SECTION */}
            <section className="py-32 px-6 border-t border-[#262626] bg-[#0A0A0A] relative overflow-hidden">
                <div className="absolute inset-0 bg-[#FF3D00]/5" />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 text-[#FAFAFA]">
                        READY FOR A<br />VIBE CHECK?
                    </h2>
                    <p className="text-xl text-[#737373] mb-12 max-w-2xl mx-auto">
                        Stop letting LLMs merge bad code. Integrate vibechck into your workflow today.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Button variant="primary" className="text-xl px-12 py-6 border border-[#FF3D00] hover:bg-[#FF3D00] hover:text-[#0A0A0A]" onClick={() => window.location.href = 'https://www.npmjs.com/package/vibechck'}>
                            View on NPM
                        </Button>
                        <Button variant="ghost" className="text-xl px-12 py-6" onClick={() => window.location.href = 'https://github.com/arrold/vibechck'}>
                            View on GitHub
                        </Button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
