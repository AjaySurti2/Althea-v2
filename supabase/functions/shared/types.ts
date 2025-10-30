/**
 * Unified Medical Report Data Structure
 * Used by both OpenAI and Anthropic parsers to ensure consistent output
 */

export interface UnifiedMedicalReport {
  // Patient Information
  patient_info: {
    name: string;
    age?: string;
    gender?: string;
    contact?: string;
    address?: string;
    id?: string;
  };

  // Laboratory Details
  lab_details: {
    lab_name: string;
    doctor?: string;
    report_id?: string;
    report_date?: string; // YYYY-MM-DD format
    test_date?: string;   // YYYY-MM-DD format
  };

  // Date information (for backward compatibility)
  dates?: {
    test_date?: string;
    report_date?: string;
  };

  // Nested panel structure (organized by test categories)
  panels: Panel[];

  // Flat metrics structure (for quick access and backward compatibility)
  key_metrics: KeyMetric[];

  // Flat test results (alternative format for compatibility)
  test_results?: TestResult[];

  // AI-generated summary
  summary?: string;

  // Metadata for tracking
  profile_name?: string;
  report_date?: string;
  lab_name?: string;
  doctor_name?: string;
  doctor_info?: {
    name?: string;
    specialty?: string;
  };
}

export interface Panel {
  panel_name: string;
  tests: Test[];
}

export interface Test {
  test_name: string;
  value: string;
  unit?: string;
  range_min?: string;
  range_max?: string;
  range_text?: string;
  status?: TestStatus;
  category?: string;
}

export interface KeyMetric {
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  interpretation?: TestStatus;
}

export interface TestResult {
  test_name: string;
  value: string;
  unit?: string;
  reference_range?: string;
  status?: TestStatus;
}

export type TestStatus =
  | "NORMAL"
  | "HIGH"
  | "LOW"
  | "CRITICAL"
  | "ABNORMAL"
  | "PENDING";

export interface ParsingMetadata {
  provider: "openai" | "anthropic";
  model: string;
  attempt_number: number;
  fallback_used: boolean;
  processing_time_ms: number;
  extraction_method: "vision" | "pdf" | "text";
  validation: {
    isValid: boolean;
    issues: string[];
  };
}

export interface ParsingResult {
  success: boolean;
  data?: UnifiedMedicalReport;
  metadata: ParsingMetadata;
  error?: string;
}

/**
 * Convert panels structure to flat key_metrics array
 */
export function panelsToKeyMetrics(panels: Panel[]): KeyMetric[] {
  const metrics: KeyMetric[] = [];

  for (const panel of panels) {
    for (const test of panel.tests) {
      metrics.push({
        test_name: test.test_name,
        value: test.value,
        unit: test.unit || "",
        reference_range: test.range_text || `${test.range_min || ""}-${test.range_max || ""}`.replace(/^-$/, ""),
        interpretation: test.status,
      });
    }
  }

  return metrics;
}

/**
 * Convert panels structure to flat test_results array
 */
export function panelsToTestResults(panels: Panel[]): TestResult[] {
  const results: TestResult[] = [];

  for (const panel of panels) {
    for (const test of panel.tests) {
      results.push({
        test_name: test.test_name,
        value: test.value,
        unit: test.unit || "",
        reference_range: test.range_text || `${test.range_min || ""}-${test.range_max || ""}`,
        status: test.status,
      });
    }
  }

  return results;
}

/**
 * Validate parsed medical report data
 */
export function validateParsedData(data: Partial<UnifiedMedicalReport>): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check patient name
  const patientName = data.patient_info?.name?.toLowerCase() || "";
  const invalidNames = ["john doe", "jane doe", "patient name", "sample", "test patient", "name", "unknown"];
  if (!patientName || invalidNames.some(n => patientName.includes(n))) {
    issues.push("Invalid or placeholder patient name");
  }

  // Check for panels
  if (!data.panels || !Array.isArray(data.panels) || data.panels.length === 0) {
    issues.push("No panels extracted");
  } else {
    let totalTests = 0;
    for (const panel of data.panels) {
      if (!panel.tests || !Array.isArray(panel.tests)) {
        issues.push(`Panel "${panel.panel_name || 'unknown'}" has no tests`);
        continue;
      }
      totalTests += panel.tests.length;

      // Check for invalid test data
      const invalidTests = panel.tests.filter(t =>
        !t.value ||
        t.value === "N/A" ||
        t.value === "XX" ||
        t.value === "" ||
        t.test_name?.toLowerCase().includes("sample") ||
        t.test_name?.toLowerCase().includes("test name")
      );

      if (invalidTests.length > 0) {
        issues.push(`${invalidTests.length} invalid/placeholder tests in panel "${panel.panel_name}"`);
      }
    }

    if (totalTests === 0) {
      issues.push("No tests extracted from any panel");
    }
  }

  // Check lab details
  if (!data.lab_details?.lab_name || data.lab_details.lab_name.toLowerCase().includes("sample")) {
    issues.push("Invalid or missing lab name");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Calculate test status based on value and reference range
 */
export function calculateStatus(value: string, rangeMin?: string, rangeMax?: string, rangeText?: string): TestStatus {
  if (!value) return "PENDING";

  const numValue = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(numValue)) return "PENDING";

  // Try to parse from min/max
  if (rangeMin && rangeMax) {
    const min = parseFloat(rangeMin);
    const max = parseFloat(rangeMax);

    if (!isNaN(min) && !isNaN(max)) {
      if (numValue < min * 0.7 || numValue > max * 1.3) return "CRITICAL";
      if (numValue < min) return "LOW";
      if (numValue > max) return "HIGH";
      return "NORMAL";
    }
  }

  // Try to parse from range text
  if (rangeText) {
    const rangeMatch = rangeText.match(/([\d.]+)\s*[-–to]\s*([\d.]+)/i);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);

      if (numValue < min * 0.7 || numValue > max * 1.3) return "CRITICAL";
      if (numValue < min) return "LOW";
      if (numValue > max) return "HIGH";
      return "NORMAL";
    }
  }

  return "PENDING";
}
