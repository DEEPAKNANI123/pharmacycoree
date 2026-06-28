export interface ParsedPrescription {
  patientName?: string;
  doctorDetails?: string;
  hospitalDetails?: string;
  medicines: {
    name: string;
    prescribedDoseTiming: string;
    conditionTreated: string;
    standardDose: string;
  }[];
}

// Helper to repair truncated JSON response
export function repairJson(content: string): string {
  let cleaned = content.trim();
  
  // Ensure we start with '{'
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new Error("No opening brace found");
  }
  cleaned = cleaned.substring(firstBrace);
  
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let repaired = '';
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escaped) {
      escaped = false;
      repaired += char;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      repaired += char;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      repaired += char;
      continue;
    }
    
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
    
    repaired += char;
  }
  
  if (inString) {
    repaired += '"';
  }
  
  // Recursively clean up trailing commas, colons, or unfinished keys in the repaired string
  let progress = true;
  while (progress) {
    progress = false;
    repaired = repaired.trim();
    
    if (repaired.endsWith(',') || repaired.endsWith(':')) {
      repaired = repaired.slice(0, -1);
      progress = true;
    } else {
      const lastComma = repaired.lastIndexOf(',');
      const lastOpenBrace = repaired.lastIndexOf('{');
      const lastOpenBracket = repaired.lastIndexOf('[');
      const lastBoundary = Math.max(lastComma, lastOpenBrace, lastOpenBracket);
      
      if (lastBoundary !== -1) {
        const tail = repaired.substring(lastBoundary + 1).trim();
        // If the tail starts with a quote but lacks a matching close, or lacks colon/value, strip it
        if (tail.startsWith('"') && (!tail.includes(':') || tail.endsWith(':') || (tail.match(/"/g) || []).length < 2)) {
          repaired = repaired.substring(0, lastBoundary);
          progress = true;
        }
      }
    }
  }
  
  while (stack.length > 0) {
    const open = stack.pop();
    repaired = repaired.trim();
    if (repaired.endsWith(',')) {
      repaired = repaired.slice(0, -1);
    }
    if (open === '{') {
      repaired += '}';
    } else if (open === '[') {
      repaired += ']';
    }
  }
  
  return repaired;
}

// Helper to clean details and default to 'General' if empty/missing/unspecified
export function cleanDetails(value: any): string {
  if (value === null || value === undefined) return 'General';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
  const lowerStr = str.toLowerCase();
  return str === '' || lowerStr === 'n/a' || lowerStr === 'not specified' || lowerStr === 'unknown' ? 'General' : str;
}

// Fallback to extract medicines using simple regex if JSON parsing completely fails
export function attemptManualRegexExtraction(str: string): ParsedPrescription {
  const result: ParsedPrescription = {
    patientName: "",
    doctorDetails: "",
    hospitalDetails: "",
    medicines: []
  };

  const patientMatch = str.match(/"patientName"\s*:\s*"([^"]*)"/);
  if (patientMatch) result.patientName = patientMatch[1];

  const doctorMatch = str.match(/"doctorDetails"\s*:\s*"([^"]*)"/);
  if (doctorMatch) result.doctorDetails = doctorMatch[1];

  const hospitalMatch = str.match(/"hospitalDetails"\s*:\s*"([^"]*)"/);
  if (hospitalMatch) result.hospitalDetails = hospitalMatch[1];

  result.patientName = cleanDetails(result.patientName);
  result.doctorDetails = cleanDetails(result.doctorDetails);
  result.hospitalDetails = cleanDetails(result.hospitalDetails);

  // Match all medication name matches
  const nameRegex = /"name"\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = nameRegex.exec(str)) !== null) {
    const startIdx = match.index;
    const nextMatch = str.indexOf('"name"', startIdx + 1);
    const segment = nextMatch !== -1 ? str.substring(startIdx, nextMatch) : str.substring(startIdx);

    const timingMatch = segment.match(/"prescribedDoseTiming"\s*:\s*"([^"]*)"/);
    const conditionMatch = segment.match(/"conditionTreated"\s*:\s*"([^"]*)"/);
    const standardMatch = segment.match(/"standardDose"\s*:\s*"([^"]*)"/);

    result.medicines.push({
      name: cleanDetails(match[1]),
      prescribedDoseTiming: cleanDetails(timingMatch ? timingMatch[1] : ""),
      conditionTreated: cleanDetails(conditionMatch ? conditionMatch[1] : ""),
      standardDose: cleanDetails(standardMatch ? standardMatch[1] : "")
    });
  }

  return result;
}

// Extraction and parsing of JSON with fallback repair and manual regex capabilities
export function extractAndParseJSON(content: string | null | undefined): ParsedPrescription {
  let sanitized = (content || "").trim();
  
  const firstBrace = sanitized.indexOf('{');
  const lastBrace = sanitized.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    sanitized = sanitized.substring(firstBrace, lastBrace + 1);
  }
  
  let parsed: ParsedPrescription;
  
  try {
    parsed = JSON.parse(sanitized);
  } catch (firstError) {
    console.warn("Standard JSON parsing failed, attempting repair:", firstError);
    try {
      const repaired = repairJson(content || "");
      parsed = JSON.parse(repaired);
    } catch (repairError) {
      console.error("JSON repair failed, attempting manual regex extraction:", repairError);
      try {
        parsed = attemptManualRegexExtraction(content || "");
      } catch (fallbackError) {
        throw new Error(`Failed to parse AI response into JSON: ${content}`);
      }
    }
  }

  // Normalize details to 'General' if they are missing or N/A
  parsed.patientName = cleanDetails(parsed.patientName);
  parsed.doctorDetails = cleanDetails(parsed.doctorDetails);
  parsed.hospitalDetails = cleanDetails(parsed.hospitalDetails);

  if (parsed.medicines) {
    parsed.medicines = parsed.medicines.map(med => ({
      name: cleanDetails(med.name),
      prescribedDoseTiming: cleanDetails(med.prescribedDoseTiming),
      conditionTreated: cleanDetails(med.conditionTreated),
      standardDose: cleanDetails(med.standardDose)
    }));
  }

  return parsed;
}
