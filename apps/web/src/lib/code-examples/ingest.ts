export const curlExample = /* bash */ `
curl --request POST \\
  --url https://api.agentset.ai/v1/namespace/{{namespace}}/ingest-jobs \\
  --header 'Authorization: Bearer <token>' \\
  --header 'Content-Type: application/json' \\
  --data '{
  "payload": {
    "type": "FILE",
    "fileUrl": "https://example.com/file.pdf",
    "fileName": "file.pdf"
  },
  "config": {
    "chunkSize": 2048,
    "mode": "balanced",
    "metadata": {
      "foo": "bar"
    }
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
    type: "FILE",
    fileUrl: "https://example.com/file.pdf",
    fileName: "file.pdf",
  },
  config: {
    chunkSize: 2048,
    mode: "balanced",
    metadata: {
      foo: "bar",
    },
  },
});
console.log(result);
`;
