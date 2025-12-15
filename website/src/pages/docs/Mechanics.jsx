import React from 'react';
import { Badge, DisplayText, CodeBlock } from '../../components/UI';
import { AlertTriangle } from 'lucide-react';

export default function Mechanics() {
    return (
        <div className="space-y-16 animate-in fade-in duration-500">
            <div>
                <Badge>Under the Hood</Badge>
                <DisplayText size="md" className="mb-6">How It Works</DisplayText>
                <p className="text-xl text-[#737373] leading-relaxed">
                    Vibechck uses a combination of AST analysis, regex heuristics, and registry lookups to detect AI-generated anti-patterns.
                </p>
            </div>

            <div className="space-y-12">
                {/* HALLUCINATION */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-[#FAFAFA] flex items-center gap-3">
                        <span className="text-3xl">👻</span> Hallucination Detector
                    </h2>
                    <div className="pl-4 border-l border-[#262626] space-y-4">
                        <p className="text-[#A3A3A3] leading-relaxed">
                            LLMs often invent packages that <em>sound</em> real but don't exist. This is dangerous because it can lead to "typosquatting" attacks where a malicious actor registers the hallucinated name.
                        </p>
                        <div className="bg-[#111] p-4 text-sm font-mono text-[#737373] border border-[#262626]">
                            <strong className="text-[#FAFAFA]">Algorithm:</strong><br />
                            1. Parse file AST to find all `import` / `require` nodes.<br />
                            2. Check if package is in `package.json` dependencies.<br />
                            3. If missing, query NPM/PyPI/Crates.io registry API.<br />
                            4. If registry returns 404 -&gt; <span className="text-[#FF3D00]">Flag as Hallucination</span>.
                        </div>
                    </div>
                </section>

                {/* LAZINESS */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-[#FAFAFA] flex items-center gap-3">
                        <span className="text-3xl">😴</span> Laziness Linter
                    </h2>
                    <div className="pl-4 border-l border-[#262626] space-y-4">
                        <p className="text-[#A3A3A3] leading-relaxed">
                            AI models often truncate code with comments like <code>// ... rest of implementation</code> to save tokens. They also tend to write "hollow" error handlers.
                        </p>
                        <ul className="list-disc list-inside text-[#A3A3A3] space-y-2">
                            <li><strong>Placeholder Comments:</strong> Regex scan for "todo", "fixme", "rest of code", "...".</li>
                            <li><strong>Hollow Catch:</strong> AST scan for `catch (e) { }` blocks with 0 statements inside.</li>
                            <li><strong>Comment Density:</strong> We calculate `(comment_lines / total_lines)`. If &gt; 20% (or &gt; 40% for tests), it triggers a warning for "yapping" (excessive explanation of non-existent code).</li>
                        </ul>
                    </div>
                </section>

                {/* SECURITY */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-[#FAFAFA] flex items-center gap-3">
                        <span className="text-3xl">🔒</span> Security Sentinel
                    </h2>
                    <div className="pl-4 border-l border-[#262626] space-y-4">
                        <p className="text-[#A3A3A3] leading-relaxed">
                            Detects secrets committed to code. Unlike generic secret scanners, this is tuned for the context of likely AI mistakes (e.g., hardcoded API keys in `main.py`).
                        </p>
                        <p className="text-[#A3A3A3]">
                            It calculates Shannon Entropy for string literals assigned to variables like `KEY`, `SECRET`, `TOKEN`. High entropy strings (random-looking characters) trigger an alert.
                        </p>
                    </div>
                </section>

                {/* ARCHITECTURE */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-[#FAFAFA] flex items-center gap-3">
                        <span className="text-3xl">🏗️</span> Architecture Scanner
                    </h2>
                    <div className="pl-4 border-l border-[#262626] space-y-4">
                        <p className="text-[#A3A3A3] leading-relaxed">
                            Calculates complexity metrics to identify code that's becoming unmaintainable.
                        </p>
                        <ul className="list-disc list-inside text-[#A3A3A3] space-y-2">
                            <li><strong>God Functions:</strong> Flags functions exceeding reasonable length (&gt;100 lines) or cyclomatic complexity. These monolithic functions are hard to test, debug, and maintain.</li>
                            <li><strong>Circular Dependencies:</strong> Analyzes the import graph to find loops that cause runtime crashes and make refactoring nearly impossible.</li>
                            <li><strong>Unused Exports:</strong> Detects dead code that's exported but never imported anywhere, cluttering your codebase.</li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
}
