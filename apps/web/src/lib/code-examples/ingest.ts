export const curlExample = (apiKey?: string) => /* bash */ `
curl --request POST \\
  --url https://api.agentset.ai/v1/namespace/{{namespace}}/ingest-jobs \\
  --header 'Authorization: Bearer ${apiKey ?? "<token>"}' \\
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

export const tsSdkExample = (apiKey?: string) => /* typescript */ `
import { Agentset } from "agentset";

const agentset = new Agentset({
  apiKey: "${apiKey ?? "YOUR_API_KEY"}",
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

export const pythonExample = (apiKey?: string) => /* python */ `
from agentset import Agentset

client = Agentset(
    namespace_id="{{namespace}}",
    token="${apiKey ?? "YOUR_API_KEY"}",
)

job = client.ingest_jobs.create(
    payload={
        "type": "FILE",
        "fileUrl": "https://example.com/file.pdf",
        "fileName": "document.pdf",
    },
    config={
        "chunkSize": 2048,
        "mode": "balanced",
        "metadata": {
            "foo": "bar",
        },
    }
)

print(f"Upload started: {job.data.id}")
`;
