import React from 'react';
import { Badge, DisplayText, CodeBlock } from '../../components/UI';

export default function Configuration() {
    return (
        <div className="space-y-16 animate-in fade-in duration-500">
            <div>
                <Badge>Reference</Badge>
                <DisplayText size="md" className="mb-6">Configuration</DisplayText>
                <p className="text-xl text-[#737373] leading-relaxed">
                    Fine-tune the detection engine to suit your codebase's unique needs.
                </p>
            </div>


            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-[#FAFAFA]" style={{ marginTop: '3rem' }}>The .vibechck.yaml File</h2>
                <div className="h-[1px] w-full bg-[#262626] mb-8" />

                <p className="text-[#A3A3A3] leading-relaxed">
                    Vibechck looks for a <span className="font-mono text-[#FAFAFA]">.vibechck.yaml</span> (or <code>.json</code>) file in your project root. If none is found, it uses sensible defaults.
                </p>

                <div className="bg-[#111] border border-[#262626] p-6 overflow-x-auto text-sm font-mono">
                    <pre className="text-[#A3A3A3]">
                        {`# .vibechck.yaml

# Filter results by severity (defaults to all)
severity:
  - critical
  - high
  - medium

# Enable/Disable specific detection modules
modules:
  hallucination: true   # Check for phantom packages
  laziness: true        # Check for empty blocks/TODOs
  security: true        # Check for hardcoded secrets
  architecture: true    # Check for complexity/cycles

# Fine-grained ignore rules (uses glob patterns)
ignoreRules:
  "magic-number":
    - "tests/**/*.ts"
    - "scripts/*.js"
  "god-function":
    - "legacy/**/*.js"
  "no-todo":
    - "src/wip/**/*"

# Module-specific settings
laziness:
  threshold: 20       # Percent of comment density allowed (default: 20)
  ignoreTests: true   # Allow higher density in test files
`}
                    </pre>
                </div>
            </section>

            <section className="space-y-6">
                <h2 className="text-3xl font-bold text-[#FAFAFA]" style={{ marginTop: '6rem' }}>Rule Reference</h2>
                <div className="h-[1px] w-full bg-[#262626] mb-8" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border border-[#262626] p-6">
                        <h3 className="text-[#FF3D00] font-mono font-bold mb-2">hallucinated-package</h3>
                        <p className="text-[#737373] text-sm">
                            Checks imports against `package.json` and public registries.
                        </p>
                    </div>
                    <div className="border border-[#262626] p-6">
                        <h3 className="text-[#FF3D00] font-mono font-bold mb-2">lazy-implementation</h3>
                        <p className="text-[#737373] text-sm">
                            Detects empty catch blocks, "..." comments, and hollow functions.
                        </p>
                    </div>
                    <div className="border border-[#262626] p-6">
                        <h3 className="text-[#FF3D00] font-mono font-bold mb-2">hardcoded-secret</h3>
                        <p className="text-[#737373] text-sm">
                            Scans for high-entropy strings assigned to sensitive variable names.
                        </p>
                    </div>
                    <div className="border border-[#262626] p-6">
                        <h3 className="text-[#FF3D00] font-mono font-bold mb-2">god-function</h3>
                        <p className="text-[#737373] text-sm">
                            flags functions that are too long (&gt;100 lines) or cyclomatic complex.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
