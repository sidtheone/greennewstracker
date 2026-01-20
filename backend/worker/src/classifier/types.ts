/**
 * Classification Types and Schemas
 * 
 * Defines types for OpenAI classification with structured output
 */

// Environment categories
export type EnvironmentCategory = 
  | 'climate_change'
  | 'renewable_energy'
  | 'pollution'
  | 'conservation'
  | 'sustainability'
  | 'policy_regulation'
  | 'technology_innovation'
  | 'biodiversity'
  | 'waste_management'
  | 'transportation'
  | 'agriculture'
  | 'urban_planning'
  | 'water_resources'
  | 'other';

// Sentiment types
export type SentimentType = 'positive' | 'negative' | 'neutral';

// Subcategories for each main category
export const SUBCATEGORIES: Record<EnvironmentCategory, string[]> = {
  climate_change: [
    'global_warming',
    'carbon_emissions',
    'extreme_weather',
    'sea_level_rise',
    'climate_policy',
    'adaptation',
  ],
  renewable_energy: [
    'solar',
    'wind',
    'hydroelectric',
    'geothermal',
    'biomass',
    'energy_storage',
    'grid_modernization',
  ],
  pollution: [
    'air_pollution',
    'water_pollution',
    'soil_contamination',
    'plastic_pollution',
    'noise_pollution',
    'light_pollution',
  ],
  conservation: [
    'wildlife_protection',
    'habrestoration',
    'endangered_species',
    'marine_conservation',
    'forest_conservation',
  ],
  sustainability: [
    'circular_economy',
    'sustainable_business',
    'green_building',
    'sustainable_agriculture',
    'ethical_consumption',
  ],
  policy_regulation: [
    'environmental_law',
    'international_agreements',
    'government_initiatives',
    'corporate_regulations',
    'carbon_pricing',
  ],
  technology_innovation: [
    'carbon_capture',
    'green_tech',
    'clean_tech',
    'environmental_monitoring',
    'smart_cities',
  ],
  biodiversity: [
    'species_discovery',
    'ecosystem_services',
    'genetic_diversity',
    'invasive_species',
    'ecological_balance',
  ],
  waste_management: [
    'recycling',
    'composting',
    'waste_reduction',
    'landfill_management',
    'hazardous_waste',
  ],
  transportation: [
    'electric_vehicles',
    'public_transit',
    'cycling_infrastructure',
    'sustainable_aviation',
    'green_shipping',
  ],
  agriculture: [
    'organic_farming',
    'regenerative_agriculture',
    'precision_agriculture',
    'sustainable_fishing',
    'agroforestry',
  ],
  urban_planning: [
    'green_spaces',
    'sustainable_cities',
    'urban_forestry',
    'smart_growth',
    'transit_oriented_development',
  ],
  water_resources: [
    'water_conservation',
    'water_quality',
    'drought_management',
    'flood_control',
    'water_treatment',
  ],
  other: [
    'general_environmental',
    'education_awareness',
    'community_initiatives',
  ],
};

// Classification result from OpenAI
export interface ClassificationResult {
  category: EnvironmentCategory;
  subcategory?: string;
  confidence_env: number; // 0-1
  confidence_sentiment: number; // 0-1
  sentiment: SentimentType;
  keywords: string[];
  summary: string;
}

// Input for classification
export interface ClassificationInput {
  title: string;
  description?: string;
  content?: string;
  url?: string;
}

// Batch classification result
export interface BatchClassificationResult {
  results: ClassificationResult[];
  totalTokens: number;
  totalCost: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

// OpenAI API response structure
export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Structured output schema for OpenAI
export const CLASSIFICATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    category: {
      type: 'string' as const,
      enum: [
        'climate_change',
        'renewable_energy',
        'pollution',
        'conservation',
        'sustainability',
        'policy_regulation',
        'technology_innovation',
        'biodiversity',
        'waste_management',
        'transportation',
        'agriculture',
        'urban_planning',
        'water_resources',
        'other',
      ],
      description: 'The primary environmental category of the article',
    },
    subcategory: {
      type: 'string' as const,
      description: 'A more specific subcategory within the main category',
    },
    confidence_env: {
      type: 'number' as const,
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for the category classification (0-1)',
    },
    confidence_sentiment: {
      type: 'number' as const,
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for the sentiment classification (0-1)',
    },
    sentiment: {
      type: 'string' as const,
      enum: ['positive', 'negative', 'neutral'],
      description: 'The overall sentiment of the article',
    },
    keywords: {
      type: 'array' as const,
      items: {
        type: 'string' as const,
      },
      minItems: 3,
      maxItems: 10,
      description: 'Key environmental terms and concepts mentioned in the article',
    },
    summary: {
      type: 'string' as const,
      maxLength: 500,
      description: 'A brief summary of the article (max 500 characters)',
    },
  },
  required: [
    'category',
    'confidence_env',
    'confidence_sentiment',
    'sentiment',
    'keywords',
    'summary',
  ],
};

// Validation thresholds
export const CLASSIFICATION_THRESHOLDS = {
  MIN_CONFIDENCE_ENV: 0.70,
  MIN_CONFIDENCE_SENTIMENT: 0.65,
  MIN_CONTENT_LENGTH: 100,
  MAX_CONTENT_LENGTH: 10000,
} as const;

// Cost calculation
export interface CostCalculation {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

// Pricing (as of 2024, GPT-4o-mini)
export const PRICING = {
  GPT_4O_MINI: {
    input: 0.15 / 1_000_000, // $0.15 per 1M tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M tokens
  },
  GPT_4O: {
    input: 2.50 / 1_000_000,
    output: 10.00 / 1_000_000,
  },
} as const;

// Calculate cost based on token usage
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: keyof typeof PRICING = 'GPT_4O_MINI'
): CostCalculation {
  const pricing = PRICING[model];
  
  const inputCost = (inputTokens * pricing.input);
  const outputCost = (outputTokens * pricing.output);
  
  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

// Validate classification result
export function validateClassification(
  result: ClassificationResult
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check confidence thresholds
  if (result.confidence_env < CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_ENV) {
    errors.push(
      `Environment confidence ${result.confidence_env} below threshold ` +
      `${CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_ENV}`
    );
  }
  
  if (result.confidence_sentiment < CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_SENTIMENT) {
    errors.push(
      `Sentiment confidence ${result.confidence_sentiment} below threshold ` +
      `${CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_SENTIMENT}`
    );
  }
  
  // Check category
  if (!Object.keys(SUBCATEGORIES).includes(result.category)) {
    errors.push(`Invalid category: ${result.category}`);
  }
  
  // Check subcategory if provided
  if (result.subcategory) {
    const validSubcategories = SUBCATEGORIES[result.category as EnvironmentCategory];
    if (validSubcategories && !validSubcategories.includes(result.subcategory)) {
      errors.push(`Invalid subcategory ${result.subcategory} for category ${result.category}`);
    }
  }
  
  // Check keywords
  if (!Array.isArray(result.keywords) || result.keywords.length < 3) {
    errors.push('Must have at least 3 keywords');
  }
  
  // Check summary
  if (!result.summary || result.summary.length < 50) {
    errors.push('Summary must be at least 50 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Check if classification meets thresholds
export function meetsThresholds(result: ClassificationResult): boolean {
  return (
    result.confidence_env >= CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_ENV &&
    result.confidence_sentiment >= CLASSIFICATION_THRESHOLDS.MIN_CONFIDENCE_SENTIMENT
  );
}
