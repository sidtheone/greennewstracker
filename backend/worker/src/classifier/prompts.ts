/**
 * OpenAI Classification Prompts
 * 
 * System and user prompts for environmental news classification
 */

import { CLASSIFICATION_SCHEMA } from './types.js';

// System prompt for classification
export const SYSTEM_PROMPT = `You are an expert environmental news classifier. Your task is to analyze news articles and classify them according to environmental categories, sentiment, and extract key information.

## Classification Categories

1. **climate_change** - Global warming, carbon emissions, extreme weather, sea level rise, climate policy, adaptation
2. **renewable_energy** - Solar, wind, hydroelectric, geothermal, biomass, energy storage, grid modernization
3. **pollution** - Air, water, soil contamination, plastic pollution, noise/light pollution
4. **conservation** - Wildlife protection, habitat restoration, endangered species, marine/forest conservation
5. **sustainability** - Circular economy, sustainable business, green building, sustainable agriculture, ethical consumption
6. **policy_regulation** - Environmental law, international agreements, government initiatives, corporate regulations, carbon pricing
7. **technology_innovation** - Carbon capture, green/clean tech, environmental monitoring, smart cities
8. **biodiversity** - Species discovery, ecosystem services, genetic diversity, invasive species, ecological balance
9. **waste_management** - Recycling, composting, waste reduction, landfill management, hazardous waste
10. **transportation** - Electric vehicles, public transit, cycling infrastructure, sustainable aviation, green shipping
11. **agriculture** - Organic farming, regenerative agriculture, precision agriculture, sustainable fishing, agroforestry
12. **urban_planning** - Green spaces, sustainable cities, urban forestry, smart growth, transit-oriented development
13. **water_resources** - Water conservation, water quality, drought management, flood control, water treatment
14. **other** - General environmental topics, education/awareness, community initiatives

## Sentiment Analysis

- **positive**: Good news, progress, success stories, positive developments, solutions
- **negative**: Bad news, disasters, failures, negative impacts, problems
- **neutral**: Factual reporting, balanced coverage, mixed outcomes, uncertain outcomes

## Guidelines

1. **Category Selection**: Choose the most relevant category based on the primary environmental topic
2. **Subcategory**: Provide a specific subcategory if applicable (e.g., "solar" under renewable_energy)
3. **Confidence Scores**: 
   - confidence_env: How confident are you about the category (0-1)?
   - confidence_sentiment: How confident are you about the sentiment (0-1)?
4. **Keywords**: Extract 3-10 relevant environmental terms, concepts, or entities
5. **Summary**: Provide a concise 1-2 sentence summary of the article's main point

## Important Notes

- Focus on environmental aspects even if the article covers other topics
- If the article is not clearly environmental, classify as "other"
- Be objective and evidence-based in your analysis
- Consider the overall tone and framing when determining sentiment
- Confidence scores should reflect uncertainty in ambiguous cases
- Keywords should be specific and relevant to environmental topics`;

// User prompt template
export function createUserPrompt(input: {
  title: string;
  description?: string;
  content?: string;
  url?: string;
}): string {
  const { title, description, content, url } = input;
  
  let prompt = `Please classify the following environmental news article:\n\n`;
  
  prompt += `**Title:** ${title}\n\n`;
  
  if (url) {
    prompt += `**URL:** ${url}\n\n`;
  }
  
  if (description) {
    prompt += `**Description:**\n${description}\n\n`;
  }
  
  if (content) {
    // Truncate content if too long
    const maxLength = 4000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;
    prompt += `**Content:**\n${truncatedContent}\n\n`;
  }
  
  prompt += `Please provide a classification following the schema below. Respond with valid JSON only.`;
  
  return prompt;
}

// Batch classification prompt
export function createBatchPrompt(inputs: Array<{
  title: string;
  description?: string;
  content?: string;
  url?: string;
}>): string {
  let prompt = `Please classify the following ${inputs.length} environmental news articles.\n\n`;
  
  inputs.forEach((input, index) => {
    prompt += `## Article ${index + 1}\n\n`;
    prompt += `**Title:** ${input.title}\n\n`;
    
    if (input.url) {
      prompt += `**URL:** ${input.url}\n\n`;
    }
    
    if (input.description) {
      prompt += `**Description:**\n${input.description}\n\n`;
    }
    
    if (input.content) {
      const maxLength = 2000;
      const truncatedContent = input.content.length > maxLength 
        ? input.content.substring(0, maxLength) + '...' 
        : input.content;
      prompt += `**Content:**\n${truncatedContent}\n\n`;
    }
    
    prompt += `---\n\n`;
  });
  
  prompt += `Please provide classifications for all articles. Respond with a JSON array of classification objects following the schema below.`;
  
  return prompt;
}

// Few-shot examples for better classification
export const FEW_SHOT_EXAMPLES = [
  {
    input: {
      title: 'New Solar Farm Breaks Ground in California',
      description: 'A 500MW solar farm has begun construction, expected to power 150,000 homes and reduce carbon emissions by 400,000 tons annually.',
    },
    output: {
      category: 'renewable_energy',
      subcategory: 'solar',
      confidence_env: 0.95,
      confidence_sentiment: 0.90,
      sentiment: 'positive',
      keywords: ['solar farm', 'renewable energy', 'carbon emissions', 'clean power'],
      summary: 'A new 500MW solar farm construction begins in California, expected to power 150,000 homes and significantly reduce carbon emissions.',
    },
  },
  {
    input: {
      title: 'Oil Spill Devastates Marine Life in Gulf Coast',
      description: 'An offshore oil rig malfunction released thousands of barrels of crude oil, causing extensive damage to marine ecosystems and local fisheries.',
    },
    output: {
      category: 'pollution',
      subcategory: 'water_pollution',
      confidence_env: 0.98,
      confidence_sentiment: 0.95,
      sentiment: 'negative',
      keywords: ['oil spill', 'marine pollution', 'ecosystem damage', 'environmental disaster'],
      summary: 'An offshore oil rig malfunction caused a major oil spill in the Gulf Coast, devastating marine ecosystems and local fisheries.',
    },
  },
  {
    input: {
      title: 'EU Passes New Carbon Pricing Legislation',
      description: 'The European Parliament approved expanded carbon pricing mechanisms, setting higher emission targets for industries across the bloc.',
    },
    output: {
      category: 'policy_regulation',
      subcategory: 'carbon_pricing',
      confidence_env: 0.92,
      confidence_sentiment: 0.85,
      sentiment: 'positive',
      keywords: ['carbon pricing', 'EU legislation', 'emission targets', 'climate policy'],
      summary: 'The EU approved expanded carbon pricing legislation with higher emission targets for industries across the bloc.',
    },
  },
];

// Create prompt with few-shot examples
export function createPromptWithExamples(input: {
  title: string;
  description?: string;
  content?: string;
  url?: string;
}): string {
  let prompt = SYSTEM_PROMPT + '\n\n';
  
  prompt += `## Examples\n\n`;
  
  FEW_SHOT_EXAMPLES.forEach((example, index) => {
    prompt += `### Example ${index + 1}\n\n`;
    prompt += `**Input:**\n`;
    prompt += `Title: ${example.input.title}\n`;
    if (example.input.description) {
      prompt += `Description: ${example.input.description}\n`;
    }
    prompt += `\n**Output:**\n`;
    prompt += `${JSON.stringify(example.output, null, 2)}\n\n`;
  });
  
  prompt += `## Task\n\n`;
  prompt += createUserPrompt(input);
  
  return prompt;
}

// Get the JSON schema for structured output
export function getStructuredOutputSchema() {
  return {
    name: 'environmental_classification',
    description: 'Classification of environmental news article',
    strict: true,
    schema: CLASSIFICATION_SCHEMA,
  };
}

// Validation prompt for low-confidence results
export function createValidationPrompt(
  originalResult: any,
  input: {
    title: string;
    description?: string;
    content?: string;
  }
): string {
  return `You previously classified this article with low confidence. Please review and provide a more confident classification if possible.

**Original Classification:**
${JSON.stringify(originalResult, null, 2)}

**Article:**
Title: ${input.title}
${input.description ? `Description: ${input.description}` : ''}
${input.content ? `Content: ${input.content.substring(0, 2000)}...` : ''}

Please reconsider the classification and provide your best assessment. If you're still uncertain, maintain your original classification but explain your reasoning.`;
}
