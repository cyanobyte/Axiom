/**
 * Purpose: Reserve the seam for live OpenAI or Codex-backed agent execution.
 * Responsibilities:
 * - Represent the production provider path in adapter selection.
 * - Validate the minimum provider configuration needed for live execution.
 * - Execute live provider requests against the OpenAI Responses API.
 * - Keep provider-specific logic out of authored intent files.
 */

/**
 * Create a live provider adapter placeholder for a named capability.
 *
 * @param {string} agentName
 * @param {object} [config={}]
 * @returns {object}
 */
export function createOpenAIAgentAdapter(agentName, config = {}) {
  return {
    async run(input) {
      if (!config.apiKey) {
        throw new Error(`Missing OpenAI API key for ${agentName}`);
      }

      if (!config.model) {
        throw new Error(`Missing OpenAI model for ${agentName}`);
      }

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          input: serializeInput(input)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed for ${agentName}: ${response.status}`);
      }

      const data = await response.json();
      return extractOutputText(data);
    }
  };
}

/**
 * Convert runtime input into a stable provider input payload.
 *
 * @param {unknown} input
 * @returns {string}
 */
function serializeInput(input) {
  if (typeof input === 'string') {
    return input;
  }

  if (input && typeof input === 'object' && typeof input.prompt === 'string') {
    return input.prompt;
  }

  return JSON.stringify(input, null, 2);
}

/**
 * Extract the output text from an OpenAI Responses API payload.
 *
 * @param {object} data
 * @returns {string}
 */
function extractOutputText(data) {
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  const chunks = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join('\n');
}
