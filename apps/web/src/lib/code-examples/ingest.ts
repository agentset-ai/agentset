export const curlExample = /* bash */ `
curl --request POST \\
  --url https://api.agentset.ai/v1/namespace/{{namespace}}/ingest-jobs \\
  --header 'Authorization: Bearer <token>' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "payload": {
    "type": "TEXT",
    "text": "This is some content to ingest into the knowledge base.",
    "name": "Introduction"
  },
  "config": {
    "chunkSize": 512,
    "maxChunkSize": 1024,
    "chunkOverlap": 10,
    "metadata": {},
    "chunkingStrategy": "basic",
    "strategy": "auto"
  }
}'
`;

export const tsSdkExample = /* typescript */ `
import { Agentset } from "agentset";

const agentset = new Agentset({
  apiKey: "YOUR_API_KEY",
});

const ns = agentset.namespace("{{namespace}}");

const result = await ns.ingestion.create({ 
  payload: {
    type: "TEXT",
    text: "This is some content to ingest into the knowledge base.",
    name: "Introduction",
  },
  config: {
    chunkSize: 512,
    maxChunkSize: 1024,
    chunkOverlap: 10,
    metadata: {},
    chunkingStrategy: "basic",
    strategy: "auto",
  },
});
console.log(result);
`;
