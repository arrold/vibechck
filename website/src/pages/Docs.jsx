import React from 'react';
import { Navbar, Footer } from '../components/Layout';
import { Section, DisplayText, Badge } from '../components/UI';

export default function Docs() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] font-sans overflow-x-hidden selection:bg-[#FF3D00] selection:text-[#0A0A0A]">
            <Navbar />

            <div className="pt-32 pb-20 px-6 max-w-[1000px] mx-auto">
                <div className="mb-16">
                    <Badge>Documentation</Badge>
                    <DisplayText size="lg" className="mb-6">Getting Started</DisplayText>
                    <p className="text-xl text-[#737373] leading-relaxed">
                        Everything you need to know to get vibechck running in your project.
                    </p>
                </div>

                <div className="space-y-16">
                    {/* INSTALLATION */}
                    <section id="installation" className="space-y-6">
                        <h2 className="text-3xl font-bold text-[#FAFAFA]">Installation</h2>
                        <div className="h-[1px] w-full bg-[#262626] mb-8" />

                        <p className="text-[#A3A3A3] leading-relaxed">
                            vibechck is meant to be used as a global CLI tool or a dev dependency in your project. We recommend installing it globally for quick access.
                        </p>

                        <div className="bg-[#111] border border-[#262626] p-6 rounded-none">
                            <h3 className="text-sm font-mono text-[#737373] mb-4 uppercase tracking-wider">Project Installation (Recommended)</h3>
                            <code className="text-[#FF3D00] font-mono text-lg block">
                                npm install --save-dev vibechck
                            </code>
                        </div>

                        <div className="bg-[#111] border border-[#262626] p-6 rounded-none">
                            <h3 className="text-sm font-mono text-[#737373] mb-4 uppercase tracking-wider">Global Installation</h3>
                            <code className="text-[#FAFAFA] font-mono block">
                                npm install -g vibechck
                            </code>
                        </div>
                    </section>

                    {/* USAGE */}
                    <section id="usage" className="space-y-6">
                        <h2 className="text-3xl font-bold text-[#FAFAFA]">Usage</h2>
                        <div className="h-[1px] w-full bg-[#262626] mb-8" />

                        <p className="text-[#A3A3A3] leading-relaxed">
                            Navigate to your project root and run the scanner. We automatically detect your environment and ignore folders like <span className="font-mono text-[#FAFAFA]">node_modules</span>.
                        </p>

                        <div className="bg-[#111] border border-[#262626] p-6 text-sm font-mono space-y-4">
                            <div>
                                <span className="text-[#737373]"># Run in current directory</span><br />
                                <span className="text-[#FAFAFA]">vibechck .</span>
                            </div>

                            <div>
                                <span className="text-[#737373]"># Run on specific folder</span><br />
                                <span className="text-[#FAFAFA]">vibechck ./src</span>
                            </div>

                            <div>
                                <span className="text-[#737373]"># Output as JSON (for CI/CD)</span><br />
                                <span className="text-[#FAFAFA]">vibechck --json {'>'} report.json</span>
                            </div>
                        </div>
                    </section>

                    {/* CI/CD */}
                    <section id="cicd" className="space-y-6">
                        <h2 className="text-3xl font-bold text-[#FAFAFA]">CI/CD Integration</h2>
                        <div className="h-[1px] w-full bg-[#262626] mb-8" />

                        <p className="text-[#A3A3A3] leading-relaxed mb-6">
                            Prevent bad code from merging by running vibechck in your pipeline.
                        </p>

                        <h3 className="text-xl font-bold text-[#FAFAFA] mb-4">GitHub Actions</h3>
                        <div className="bg-[#111] border border-[#262626] p-6 overflow-x-auto text-sm font-mono">
                            <pre className="text-[#A3A3A3]">
                                {`name: Vibechck
on: [push, pull_request]

jobs:
  vibechck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run Vibechck
        run: npx vibechck --severity=critical,high`}
                            </pre>
                        </div>
                    </section>

                    {/* CONFIGURATION */}
                    <section id="configuration" className="space-y-6">
                        <h2 className="text-3xl font-bold text-[#FAFAFA]">Configuration</h2>
                        <div className="h-[1px] w-full bg-[#262626] mb-8" />

                        <p className="text-[#A3A3A3] leading-relaxed">
                            Vibechck is zero-config by default, but you can tune it by creating a <span className="font-mono text-[#FAFAFA]">.vibechck.yaml</span> file in your project root.
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
  hallucination: true
  laziness: true
  security: true
  architecture: true

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
  threshold: 20 # percent of comment density allowed`}
                            </pre>
                        </div>
                    </section>

                    {/* DEEP DIVE: HOW IT WORKS */}
                    <section id="mechanics" className="space-y-12 pt-12">
                        <div>
                            <Badge>Under the Hood</Badge>
                            <DisplayText size="md">How it Works</DisplayText>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-[#FF3D00] mb-3">👻 Hallucination Detector</h3>
                                <p className="text-[#A3A3A3] leading-relaxed">
                                    <strong>Methodology:</strong> Scans all import statements (`import`, `require`, `from`) and cross-references them against your `package.json`. If a package is imported but not defined locally, it queries public registries (NPM, PyPI, Crates.io) to see if the package even <em>exists</em>.
                                </p>
                                <div className="mt-2 text-sm text-[#737373] bg-[#1A1A1A] p-3 border border-[#262626]">
                                    <strong>Why?</strong> LLMs often hallucinate convenient package names (e.g., `react-use-auth-magic`) that don't exist, breaking usage.
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-[#FF3D00] mb-3">😴 Laziness Linter</h3>
                                <p className="text-[#A3A3A3] leading-relaxed">
                                    <strong>Methodology:</strong> Uses heuristics to detect "placeholder" coding styles. It scans ASTs and comments for:
                                </p>
                                <ul className="list-disc list-inside mt-2 text-[#A3A3A3] space-y-1 ml-4">
                                    <li>Generic comments: `// ... rest of code`, `// TODO: implement`, `// fixme`</li>
                                    <li>Empty catch blocks: `catch (e) { }` (silently swallowing errors)</li>
                                    <li>Comment Density: Files that are >40% comments usually indicate LLM "yapping" explaining code that isn't there.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-[#FF3D00] mb-3">🔒 Security Sentinel</h3>
                                <p className="text-[#A3A3A3] leading-relaxed">
                                    <strong>Methodology:</strong> A regex-based secret scanner tuned for AI-specific leaks. It looks for High-Entropy strings assigned to variable names like `apiKey`, `secret`, `password`, and specific cloud provider tokens (AWS, Stripe, OpenAI).
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-[#FF3D00] mb-3">🏗️ Architecture Scanner</h3>
                                <p className="text-[#A3A3A3] leading-relaxed">
                                    <strong>Methodology:</strong> Calculates complexity metrics.
                                </p>
                                <ul className="list-disc list-inside mt-2 text-[#A3A3A3] space-y-1 ml-4">
                                    <li><strong>God Functions:</strong> Flags functions exceeding reasonable length (e.g., >100 lines) or complexity.</li>
                                    <li><strong>Circular Dependencies:</strong> Analyzes the import graph to find loops that cause runtime crashes.</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <Footer />
        </div>
    );
}
