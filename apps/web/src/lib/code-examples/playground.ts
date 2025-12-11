export const curlExample = (apiKey?: string) => /* bash */ `
curl --request POST \\
  --url https://api.agentset.ai/v1/namespace/{{namespace}}/search \\
  --header 'Authorization: Bearer ${apiKey ?? "<token>"}' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "query": "<string>",
  "topK": 15,
  "includeMetadata": true
}'
`;

export const tsSdkExample = (apiKey?: string) => /* typescript */ `
import { Agentset } from "agentset";

const agentset = new Agentset({
  apiKey: "${apiKey ?? "YOUR_API_KEY"}",
});

const ns = agentset.namespace("{{namespace}}");

const results = await ns.search({ query: "YOUR QUERY" });
console.log(results);
`;

export const aiSdkExample = (apiKey?: string) => /* typescript */ `
import { Agentset } from "agentset";
import { DEFAULT_PROMPT, makeAgentsetTool } from "@agentset/ai-sdk";
import { generateText } from "ai";

const agentset = new Agentset({
  apiKey: "${apiKey ?? "YOUR_API_KEY"}",
});
const ns = agentset.namespace("{{namespace}}");

const result = await generateText({
  model: gpt4o,
  tools: {
    knowledgeBase: makeAgentsetTool(ns),
  },
  system: DEFAULT_SYSTEM_PROMPT,
  messages: [
    {
      role: 'user',
      content: '<question>',
    },
  ],
  maxSteps: 3,
});
console.log(result);
`;

export const pythonExample = (apiKey?: string) => /* python */ `
from agentset import Agentset
from openai import OpenAI as OpenAIClient

client = Agentset(
    namespace_id="{{namespace}}",
    token="${apiKey ?? "YOUR_API_KEY"}",
)

openai = OpenAIClient()

query = "What are the key findings?"

# Search for relevant context
results = client.search.execute(query=query)
context = "\n\n".join([r.text for r in results.data])

# Generate a response
response = openai.responses.create(
    model="gpt-5.1",
    input=[
        {
            "role": "system",
            "content": f"Answer questions based on the following context:\n\n{context}",
        },
        {
            "role": "user",
            "content": query,
        },
    ],
)

print(response.output_text)
`;
