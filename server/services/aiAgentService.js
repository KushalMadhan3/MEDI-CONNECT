/**
 * AI Agent Service — Symptom → Doctor Specialist Matcher
 *
 * Takes a patient's symptom description (plain English) and returns the
 * 2-3 most relevant doctor specializations available on the platform.
 *
 * Two modes:
 *   1. LLM mode  — if OPENAI_API_KEY is set, uses the OpenAI-compatible API
 *                  to understand free-form symptoms (handles slang, misspellings).
 *   2. Fallback  — if no API key, uses a built-in keyword → specialization map
 *                  so the feature works offline / in demo (and never crashes).
 */
import { getDB } from '../config/mongodb.js';

// ---------------------------------------------------------------------------
// Keyword → specialization map (offline fallback + guard against LLM drift)
// ---------------------------------------------------------------------------
const SYMPTOM_MAP = {
  cardiology: ['heart', 'chest pain', 'chest', 'palpitation', 'blood pressure', 'bp', 'cardiac', 'breathless', 'shortness of breath', 'dizziness', 'tachycardia'],
  dermatology: ['skin', 'rash', 'acne', 'pimple', 'itching', 'eczema', 'psoriasis', 'hair loss', 'fungal', 'moles', 'dry skin'],
  orthopedics: ['bone', 'joint', 'knee', 'back pain', 'neck pain', 'shoulder', 'fracture', 'sprain', 'arthritis', 'muscle', 'spine', 'swelling'],
  neurology: ['headache', 'migraine', 'seizure', 'epilepsy', 'numbness', 'tremor', 'paralysis', 'memory', 'brain', 'stroke', 'parkinson'],
  'general-medicine': ['fever', 'cold', 'cough', 'flu', 'infection', 'vomiting', 'nausea', 'diarrhea', 'stomach ache', 'sore throat', 'general', 'weakness', 'fatigue', 'body pain'],
  pediatrics: ['child', 'baby', 'infant', 'kid', 'vaccination', 'immunization', 'toddler'],
  gynecology: ['pregnancy', 'pregnant', 'period', 'menstrual', 'women', 'women\u2019s health', 'fertility', 'pcos'],
  ophthalmology: ['eye', 'vision', 'blurred vision', 'eye pain', 'red eye', 'glasses', 'cataract', 'conjunctivitis'],
  psychiatry: ['anxiety', 'depression', 'stress', 'insomnia', 'sleep', 'mental', 'mood', 'panic', 'bipolar'],
  nephrology: ['kidney', 'urine', 'urinary', 'renal', 'dialysis', 'kidney stone'],
  pulmonology: ['asthma', 'breathing', 'lung', 'respiratory', 'bronchitis', 'pneumonia', 'tuberculosis', 'tb']
};

// Human-readable names for the internal keys above
const SPECIALIZATION_LABELS = {
  cardiology: 'Cardiology',
  dermatology: 'Dermatology',
  orthopedics: 'Orthopedics',
  neurology: 'Neurology',
  'general-medicine': 'General Medicine',
  pediatrics: 'Pediatrics',
  gynecology: 'Gynecology',
  ophthalmology: 'Ophthalmology',
  psychiatry: 'Psychiatry',
  nephrology: 'Nephrology',
  pulmonology: 'Pulmonology'
};

/**
 * Score each specialization by counting how many of its keywords appear
 * in the (lowercased) symptom text. Returns sorted [{key, label, score}].
 */
function matchByKeywords(query) {
  const lower = query.toLowerCase();
  const scored = Object.entries(SYMPTOM_MAP).map(([key, keywords]) => {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    return { key, label: SPECIALIZATION_LABELS[key], score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

/**
 * Ask the OpenAI-compatible API to map symptoms to specializations.
 * Returns [] if the call fails for any reason so we can fall back.
 */
async function matchByLLM(query) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const allowed = Object.values(SPECIALIZATION_LABELS).join(', ');
  const url = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              `You are a medical triage assistant. Given a patient's symptoms in plain English, ` +
              `map them to the most relevant doctor specializations. ` +
              `ONLY return one of these specializations, highest relevance first: ${allowed}. ` +
              `Respond ONLY with JSON: {"specializations": ["Cardiology", "..."]}. ` +
              `Return 1 to 3 specializations. Never invent specializations outside the allowed list.`
          },
          { role: 'user', content: `Symptoms: ${query}` }
        ]
      })
    });

    const text = await res.text();
    let body;
    try {
      body = JSON.parse(res.status === 204 ? '{}' : text);
    } catch (e) {
      body = {};
    }

    if (!res.ok || !body.choices || !body.choices[0]) {
      console.warn('⚠️  LLM failed, using keyword fallback:', body.error?.message || `HTTP ${res.status}`);
      return [];
    }

    const content = JSON.parse(body.choices[0].message?.content || '{}');
    const specs = Array.isArray(content.specializations) ? content.specializations : [];
    // Keep only specializations that exist on the platform
    return specs
      .map((s) => ({ key: s, label: s, score: 1 }))
      .filter((s) => Object.values(SPECIALIZATION_LABELS).includes(s.label));
  } catch (error) {
    console.warn('⚠️  LLM request error, using keyword fallback:', error.message);
    return [];
  }
}

/**
 * Main entry point — recommended doctor matching.
 * @param {string} query - patient's symptom description
 * @returns {Promise<Object>} { specializations, doctors, mode }
 */
export async function getDoctorRecommendations(query) {
  const db = getDB();
  const usersCollection = db.collection('users');

  // 1) Figure out which specializations match
  let ranked = await matchByLLM(query);
  let mode = 'llm';
  if (ranked.length === 0) {
    ranked = matchByKeywords(query);
    mode = ranked.length > 0 ? 'keyword' : 'none';
  }

  // 2) If nothing matched, default to General Medicine as a safe suggestion
  if (ranked.length === 0) {
    ranked = [{ key: 'general-medicine', label: 'General Medicine', score: 0 }];
    mode = 'fallback';
  }

  // 3) Fetch doctors for the top specializations (active only)
  const topKeys = ranked.slice(0, 3).map((s) => s.key);
  const matchingLabels = topKeys.map((k) => SPECIALIZATION_LABELS[k] || k);

  const doctors = await usersCollection
    .find({
      role: 'doctor',
      status: 'active',
      specialization: { $in: matchingLabels }
    })
    .project({ password: 0, email: 0, mobile: 0 })
    .limit(6)
    .toArray();

  return {
    specializations: ranked.slice(0, 3).map((s) => s.label),
    doctors: doctors.map((d) => ({
      id: d.id,
      name: d.name,
      specialization: d.specialization,
      experience: d.experience || '5+ years',
      rating: d.rating || 4.5,
      consultationPrice: d.consultationPrice || 500,
      image: d.image || null
    })),
    mode,
    note:
      mode === 'llm'
        ? 'Matched using AI language model'
        : mode === 'keyword'
        ? 'Matched using built-in symptom keywords (add OPENAI_API_KEY to .env for AI-powered matching)'
        : 'Could not identify a specific specialist — showing general medicine as a safe first step'
  };
}
