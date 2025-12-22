import { describe, it, expect } from "@jest/globals";
import { SarifFormatter } from "../../src/core/SarifFormatter.js";
import { AlertSeverity } from "../../src/types/index.js";

describe("SarifFormatter", () => {
    const formatter = new SarifFormatter();

    it("should convert absolute paths to relative paths", () => {
        const baseDir = "/mnt/data/web/project";
        const absoluteFile = "/mnt/data/web/project/src/main.ts";

        const report: any = {
            alerts: [
                {
                    id: "test-alert",
                    rule: "magic-number",
                    severity: AlertSeverity.LOW,
                    message: "Magic number detected",
                    file: absoluteFile,
                    line: 10,
                    column: 5,
                    module: "Architecture",
                    suggestion: "Extract to constant",
                },
            ],
            scanInfo: {
                directory: baseDir,
            },
        };

        const sarifString = formatter.generateSarifReport(report);
        const sarif = JSON.parse(sarifString);

        const result = sarif.runs[0].results[0];
        const uri = result.locations[0].physicalLocation.artifactLocation.uri;

        expect(uri).toBe("src/main.ts");
    });

    it("should handle already relative paths", () => {
        const baseDir = "/mnt/data/web/project";
        const relativeFile = "src/utils.ts";

        const report: any = {
            alerts: [
                {
                    id: "test-alert",
                    rule: "magic-number",
                    severity: AlertSeverity.LOW,
                    message: "Magic number detected",
                    file: relativeFile,
                    line: 10,
                    column: 5,
                    module: "Architecture",
                    suggestion: "Extract to constant",
                },
            ],
            scanInfo: {
                directory: baseDir,
            },
        };

        const sarifString = formatter.generateSarifReport(report);
        const sarif = JSON.parse(sarifString);
        const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;

        expect(uri).toBe("src/utils.ts");
    });

    it("should use forward slashes regardless of platform", () => {
        const baseDir = "/mnt/data";
        const absoluteFile = "/mnt/data/subdir/file.ts";

        const report: any = {
            alerts: [
                {
                    id: "test-alert",
                    rule: "magic-number",
                    severity: AlertSeverity.LOW,
                    message: "Magic number detected",
                    file: absoluteFile,
                    line: 10,
                    column: 5,
                    module: "Architecture",
                    suggestion: "Extract to constant",
                },
            ],
            scanInfo: { directory: baseDir },
        };

        const sarifString = formatter.generateSarifReport(report);
        const sarif = JSON.parse(sarifString);
        const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;

        expect(uri).toBe("subdir/file.ts");
        expect(uri).not.toContain("\\");
    });
});
