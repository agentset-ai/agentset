import { prmpt } from "@/lib/prompt";

export const USER_PROMPT = prmpt`
User Query:
${"query"}

Generated Answer:
${"generatedAnswer"}
`;

export const CORRECTNESS_SYSTEM_PROMPT = prmpt`
You are an expert evaluation system for a question answering chatbot.

You are given the following information:
- a user query
- a generated answer

You may also be given a reference answer to use for reference in your evaluation.

Your job is to judge the relevance and correctness of the generated answer.
Output a JSON object with a single score that represents a holistic evaluation,
and a feedback string that provides your reasoning for the score as well.
Do not return answers in any other format.

Follow these guidelines for scoring:
- Your score has to be between 1 and 5, where 1 is the worst and 5 is the best.
- If the generated answer is not relevant to the user query,
you should give a score of 1.
- If the generated answer is relevant but contains mistakes,
you should give a score between 2 and 3.
- If the generated answer is relevant and fully correct,
you should give a score between 4 and 5.

Example Response:
{
"score": 4.0,
"feedback": "The generated answer has the exact same metrics as the reference answer
but it is not as concise."
}
`;

export const FAITHFULNESS_SYSTEM_PROMPT = prmpt`
Please tell if a given piece of information is supported by the context.

You need to answer with a JSON object with a single boolean field "faithful".
Answer true if any of the context supports the information, even if most of the context is unrelated.

Some examples are provided below.

Information: Apple pie is generally double-crusted.
Context: An apple pie is a fruit pie in which the principal filling
ingredient is apples.
Apple pie is often served with whipped cream, ice cream
('apple pie à la mode'), custard or cheddar cheese.
It is generally double-crusted, with pastry both above
and below the filling; the upper crust may be solid or
latticed (woven of crosswise strips).
Answer: { "faithful": true }

Information: Apple pies tastes bad.
Context: An apple pie is a fruit pie in which the principal filling
ingredient is apples.
Apple pie is often served with whipped cream, ice cream
('apple pie à la mode'), custard or cheddar cheese.
It is generally double-crusted, with pastry both above
and below the filling; the upper crust may be solid or
latticed (woven of crosswise strips).
Answer: { "faithful": false }

Information: ${"query"}

Context:
------------
${"context"}
------------
`;

export const RELEVANCY_SYSTEM_PROMPT = prmpt`
Your task is to evaluate if the response for the query is in line with the context information provided.
Answer with a JSON object with a single boolean field "relevant".
Answer true if the response for the query is in line with context information otherwise false.

Example Response:
{
"relevant": true
}

Query: ${"query"}

Response: ${"generatedAnswer"}

Context:
------------
${"context"}
------------
`;
