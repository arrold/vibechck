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
                            Create a <span className="font-mono text-[#FAFAFA]">.vibechck.yaml</span> (or .json) file in your root to customize rules.
                        </p>

                        <div className="bg-[#111] border border-[#262626] p-6 overflow-x-auto text-sm font-mono">
                            <pre className="text-[#A3A3A3]">
                                {`severity:
  - critical
  - high
  - medium

modules:
  hallucination: true
  laziness: true
  security: true

ignoreRules:
  "magic-number":
    - "tests/**/*.ts"
  "god-function":
    - "legacy/**/*.js"`}
                            </pre>
                        </div>
                    </section>
                </div>
            </div>

            <Footer />
        </div>
    );
}
