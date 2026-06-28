export interface InteractionAlert {
  severity: 'Safe' | 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  drugInteractions?: string[];
  allergyConflicts?: string[];
}

export async function checkDrugInteraction(
  drugName: string,
  patientHistory: { allergies: string[]; activeMedications: string[] }
): Promise<InteractionAlert> {
  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    // Mock response if no API key is provided
    return mockInteractionCheck(drugName, patientHistory);
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'PharmaCore e-Prescribe'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free', // Default fast model
        messages: [
          {
            role: "system",
            content: "You are an expert clinical pharmacist AI. Analyze the prescribed drug against the patient's history for allergies and drug interactions. Return ONLY valid JSON in this format: { \"severity\": \"Safe\" | \"Low\" | \"Medium\" | \"High\" | \"Critical\", \"message\": \"string explaining the interaction or safety\", \"drugInteractions\": [\"list of conflicting meds\"], \"allergyConflicts\": [\"list of allergies triggered\"] }. If perfectly safe, severity should be 'Safe'. Do not include markdown formatting or extra text."
          },
          {
            role: "user",
            content: `Prescribed Drug: ${drugName}\nPatient Allergies: ${patientHistory.allergies.join(', ') || 'None'}\nPatient Active Medications: ${patientHistory.activeMedications.join(', ') || 'None'}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('API Request failed');
    }

    const data = await response.json();
    let rawContent = data.choices?.[0]?.message?.content || "";
    
    // Clean up potential markdown blocks
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed: InteractionAlert = JSON.parse(rawContent);
    
    // Validate severity
    if (!['Safe', 'Low', 'Medium', 'High', 'Critical'].includes(parsed.severity)) {
       parsed.severity = 'Medium';
    }

    return parsed;

  } catch (error) {
    console.error("AI Interaction Check Failed:", error);
    return mockInteractionCheck(drugName, patientHistory);
  }
}

// Fallback Mock System if AI fails or no key
function mockInteractionCheck(drugName: string, patientHistory: { allergies: string[]; activeMedications: string[] }): InteractionAlert {
  const lowerDrug = drugName.toLowerCase();
  
  // 1. Check Allergies (Mock logic)
  const allergyConflicts = patientHistory.allergies.filter(a => lowerDrug.includes(a.toLowerCase()) || (a.toLowerCase() === 'penicillin' && lowerDrug.includes('amoxicillin')));
  if (allergyConflicts.length > 0) {
    return {
      severity: 'Critical',
      message: `CRITICAL ALLERGY ALERT: Patient has a known allergy to ${allergyConflicts.join(', ')}. Do not prescribe.`,
      allergyConflicts
    };
  }

  // 2. Check Drug Interactions (Mock logic)
  const activeMedsLower = patientHistory.activeMedications.map(m => m.toLowerCase());
  
  if (lowerDrug.includes('ibuprofen') || lowerDrug.includes('nsaid')) {
    if (activeMedsLower.some(m => m.includes('warfarin') || m.includes('blood thinner'))) {
       return {
         severity: 'High',
         message: 'HIGH RISK: Combining NSAIDs with Warfarin significantly increases the risk of severe bleeding.',
         drugInteractions: ['Warfarin']
       };
    }
  }

  if (lowerDrug.includes('azithromycin') || lowerDrug.includes('clarithromycin')) {
    if (activeMedsLower.some(m => m.includes('simvastatin') || m.includes('atorvastatin'))) {
       return {
         severity: 'Medium',
         message: 'CAUTION: Increased risk of myopathy and rhabdomyolysis when combining macrolide antibiotics with certain statins.',
         drugInteractions: ['Statin']
       };
    }
  }

  // Safe
  return {
    severity: 'Safe',
    message: 'No significant drug interactions or allergy conflicts detected based on patient history.'
  };
}
