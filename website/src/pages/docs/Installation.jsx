import React from 'react';
import { Badge, DisplayText, CodeBlock } from '../../components/UI';

export default function Installation() {
    return (
        <div className="space-y-16 animate-in fade-in duration-500">
            <div>
                <Badge>Getting Started</Badge>
                <DisplayText size="md" className="mb-6">Installation & Integration</DisplayText>
                <p className="text-xl text-[#737373] leading-relaxed">
                    Get vibechck running in your project. We support local dev usage, CI/CD pipelines, and pre-commit hooks.
                </p>
            </div>

            {/* INSTALLATION */}
            <section id="installation" className="space-y-6 mt-16">
                <h2 className="text-3xl font-bold text-[#FAFAFA]">Installation</h2>
                <div className="h-[1px] w-full bg-[#262626] mb-8" />

                <p className="text-[#A3A3A3] leading-relaxed">
                    We recommend installing vibechck as a <span className="text-[#FAFAFA]">dev dependency</span> so your whole team uses the same version.
                </p>

                <div className="bg-[#111] border border-[#262626] p-6">
                    <h3 className="text-sm font-mono text-[#737373] mb-4 uppercase tracking-wider">Project Installation (Recommended)</h3>
                    <code className="text-[#FF3D00] font-mono text-lg block">
                        npm install --save-dev vibechck
                    </code>
                </div>

                <div className="bg-[#111] border border-[#262626] p-6">
                    <h3 className="text-sm font-mono text-[#737373] mb-4 uppercase tracking-wider">Global Installation</h3>
                    <code className="text-[#FAFAFA] font-mono block">
                        npm install -g vibechck
                    </code>
                </div>
            </section>

            {/* USAGE */}
            <section id="usage" className="space-y-6 mt-16">
                <h2 className="text-3xl font-bold text-[#FAFAFA]">Usage</h2>
                <div className="h-[1px] w-full bg-[#262626] mb-8" />

                <p className="text-[#A3A3A3] leading-relaxed">
                    Navigate to your project root and run the scanner. We automatically detect your environment and ignore folders like <span className="font-mono text-[#FAFAFA]">node_modules</span>.
                </p>

                <div className="bg-[#111] border border-[#262626] p-6 text-sm font-mono space-y-4">
                    <div>
                        <span className="text-[#737373]"># Run in current directory</span><br />
                        <span className="text-[#FAFAFA]">npx vibechck .</span>
                    </div>

                    <div>
                        <span className="text-[#737373]"># Run on specific folder</span><br />
                        <span className="text-[#FAFAFA]">npx vibechck ./src</span>
                    </div>

                    <div>
                        <span className="text-[#737373]"># Output as JSON (for CI/CD)</span><br />
                        <span className="text-[#FAFAFA]">npx vibechck --json {'>'} report.json</span>
                    </div>
                </div>
            </section>

            {/* PRE-COMMIT */}
            <section id="pre-commit" className="space-y-6 mt-16">
                <h2 className="text-3xl font-bold text-[#FAFAFA]">Pre-commit Hooks</h2>
                <div className="h-[1px] w-full bg-[#262626] mb-8" />

                <p className="text-[#A3A3A3] leading-relaxed">
                    The most effective way to improve code quality is to prevent bad code from ever being committed. We recommend using <a href="https://typicode.github.io/husky/" className="text-[#FF3D00] hover:underline" target="_blank">Husky</a>.
                </p>

                <div className="bg-[#111] border border-[#262626] p-6 text-sm font-mono">
                    <div className="mb-4">
                        <span className="text-[#737373]"># 1. Install Husky</span><br />
                        <span className="text-[#FAFAFA]">npm install --save-dev husky</span><br />
                        <span className="text-[#FAFAFA]">npx husky init</span>
                    </div>

                    <div>
                        <span className="text-[#737373]"># 2. Add validation hook</span><br />
                        <span className="text-[#FAFAFA]">echo "npx vibechck --module=hallucination,security" {'>'} .husky/pre-commit</span>
                    </div>
                </div>
                <p className="text-sm text-[#737373] italic">
                    Note: We recommend running only fast checks (hallucination, security) in pre-commit hooks to keep your workflow snappy.
                </p>
            </section>

            {/* CI/CD */}
            <section id="cicd" className="space-y-6 mt-16">
                <h2 className="text-3xl font-bold text-[#FAFAFA]">CI/CD Integration</h2>
                <div className="h-[1px] w-full bg-[#262626] mb-8" />

                <p className="text-[#A3A3A3] leading-relaxed mb-6">
                    Ensure nothing slips through the cracks by running a full scan in your pipeline.
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
        </div>
    );
}
