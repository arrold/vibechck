import React, { useState, useEffect } from 'react';
import { App } from './App.js';
import { AnalysisEngine } from '../core/AnalysisEngine.js';
import { VibechckConfig, Report as AnalysisReport } from '../types/index.js';

interface RunnerProps {
    directory: string;
    config: VibechckConfig;
    verbose?: boolean;
    onComplete: (exitCode: number) => void;
}

export const VibechckRunner: React.FC<RunnerProps> = ({ directory, config, verbose, onComplete }) => {
    const [scanning, setScanning] = useState(true);
    const [report, setReport] = useState<AnalysisReport | null>(null);

    useEffect(() => {
        const runAnalysis = async () => {
            try {
                const engine = new AnalysisEngine();
                const result = await engine.analyze(directory, config);
                setReport(result);
            } catch (error) {
                console.error("Analysis failed:", error);
            } finally {
                setScanning(false);
            }
        };

        runAnalysis();
    }, [directory, config]); // Run once

    useEffect(() => {
        if (!scanning && report) {
            // onComplete(0);
        }
    }, [scanning, report]);

    return <App alerts={report ? report.alerts : []} scanning={scanning} verbose={verbose} />;
};
