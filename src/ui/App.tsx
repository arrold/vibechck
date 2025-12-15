import React, { useState, useEffect } from 'react';
import { Box, Text, Static, Newline } from 'ink';
import { Alert, AlertSeverity } from '../types/index.js';

interface AppProps {
    alerts: Alert[];
    scanning: boolean;
    verbose?: boolean;
}

const SCORING = {
    CRITICAL_WEIGHT: 20,
    HIGH_WEIGHT: 10,
    MEDIUM_WEIGHT: 5,
    LOW_WEIGHT: 2,
    MULTIPLIER: 5,
    BASE_SCORE: 100,
};

const THRESHOLDS = {
    EXCELLENT: 90,
    GOOD: 70,
    MAX_LOW_ISSUES: 50,
    LOW_TRUNCATE_COUNT: 5,
};

export const App: React.FC<AppProps> = ({ alerts, scanning, verbose }) => {
    // Group alerts by severity
    const critical = alerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    const high = alerts.filter(a => a.severity === AlertSeverity.HIGH);
    const medium = alerts.filter(a => a.severity === AlertSeverity.MEDIUM);
    const low = alerts.filter(a => a.severity === AlertSeverity.LOW);
    const lowCount = low.length;

    // Filter low alerts if too many
    const showLow = (verbose || lowCount <= THRESHOLDS.MAX_LOW_ISSUES) ? low : low.slice(0, THRESHOLDS.LOW_TRUNCATE_COUNT);

    const visibleAlerts = [...critical, ...high, ...medium, ...showLow];

    // Group by file
    const groupedAlerts: Record<string, Alert[]> = {};
    visibleAlerts.forEach(alert => {
        if (!groupedAlerts[alert.file]) groupedAlerts[alert.file] = [];
        groupedAlerts[alert.file].push(alert);
    });

    // Silence output during scanning to prevent log pollution/double-writes
    if (scanning) {
        return null;
    }

    // Non-linear scoring model to prevent 0/100 on large projects
    // Uses logarithmic scaling so that the first few issues hurt the most
    // and subsequent issues have diminishing returns on the penalty.
    const score = Math.max(0, Math.round(SCORING.BASE_SCORE
        - (Math.log10(1 + critical.length * SCORING.MULTIPLIER) * SCORING.CRITICAL_WEIGHT)
        - (Math.log10(1 + high.length * SCORING.MULTIPLIER) * SCORING.HIGH_WEIGHT)
        - (Math.log10(1 + medium.length) * SCORING.MEDIUM_WEIGHT)
        - (Math.log10(1 + low.length) * SCORING.LOW_WEIGHT)
    ));

    const getScoreColor = (s: number) => {
        if (s >= THRESHOLDS.EXCELLENT) return 'green';
        if (s >= THRESHOLDS.GOOD) return 'yellow';
        return 'red';
    };

    return (
        <Box flexDirection="column" padding={1}>
            <Box borderStyle="double" borderColor={scanning ? 'blue' : getScoreColor(score)} paddingX={1}>
                {scanning ? (
                    <Text>Vibechck Score: <Text color="blue" bold>Calculating...</Text></Text>
                ) : (
                    <Text>Vibechck Score: <Text color={getScoreColor(score)} bold>{score}/100</Text></Text>
                )}
            </Box>

            <Box marginTop={1}>
                <Text bold underline>Analysis Report:</Text>
            </Box>

            <Box flexDirection="column" marginTop={1}>
                {critical.length > 0 && (
                    <Text color="red">🚨 Critical Issues: {critical.length}</Text>
                )}
                {high.length > 0 && (
                    <Text color="red">❌ High Issues: {high.length}</Text>
                )}
                {medium.length > 0 && (
                    <Text color="yellow">⚠️ Medium Issues: {medium.length}</Text>
                )}
                {low.length > 0 && (
                    <Text color="blue">ℹ️ Low Issues: {low.length}</Text>
                )}
                {alerts.length === 0 && (
                    <Text color="green">✨ No issues found! Your code passes the vibe check.</Text>
                )}
            </Box>

            <Newline />

            <Box flexDirection="column" marginTop={1}>
                {Object.entries(groupedAlerts).map(([file, fileAlerts]) => (
                    <Box key={file} flexDirection="column" marginBottom={1} borderColor="gray" borderStyle="single" paddingX={1}>
                        <Text bold underline>{file} ({fileAlerts.length})</Text>
                        {fileAlerts.map((alert, i) => (
                            <Box key={i} flexDirection="column" marginLeft={1} marginTop={0}>
                                <Box>
                                    <Text color={
                                        alert.severity === AlertSeverity.CRITICAL ? 'red' :
                                            alert.severity === AlertSeverity.HIGH ? 'red' :
                                                alert.severity === AlertSeverity.MEDIUM ? 'yellow' : 'blue'
                                    } bold>
                                        [{alert.severity.toUpperCase()}] {alert.rule}
                                        {alert.rule === 'god-function' && <Text color="yellow" bold> 👑 (God Function)</Text>}
                                    </Text>
                                    <Text>: {alert.message}</Text>
                                </Box>
                                {alert.suggestion && (
                                    <Box marginLeft={2}>
                                        <Text color="gray">💡 {alert.suggestion}</Text>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                ))}

                {!verbose && lowCount > THRESHOLDS.MAX_LOW_ISSUES && (
                    <Box marginTop={1} borderColor="blue" borderStyle="round" paddingX={1}>
                        <Text color="blue">ℹ️ ... plus {lowCount - THRESHOLDS.LOW_TRUNCATE_COUNT} more Low severity issues (hidden to reduce noise). Run with --verbose to see all.</Text>
                    </Box>
                )}
            </Box>

            {scanning && <Text>Scanning...</Text>}
        </Box>
    );
};
