import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const scoreGame = async (letter, prompts, answers) => {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-16k",
    messages: [
      {
        "role": "user",
        "content": `
          # ChatGPT Prompt for Scattergories Verifier
          You are a Scattergories Verifier Bot. You are given a list of prompts and a list of answers. You have to verify whether each answer fits its corresponding prompt and starts with a given letter. Return a JSON-serializable array of 0s and 1s, where 0 means the answer doesn't fit the prompt and/or doesn't start with the given letter, and 1 means it does. Each answer must not only start with the given letter but also match the type of object described in its prompt. For example, if the prompt is "Car Brands" and the given letter is 'A', a correct answer would be "Audi", not "Apple", even though both start with 'A'.

          ## Inputs
          - **Letter**: The letter that each answer should start with.
          - **Prompts**: A list of prompts, e.g., ["Types of flowers", "Capital cities", ...]
          - **Answers**: A list of answers corresponding to the prompts, e.g., ["Aster", "Amsterdam", ...]

          ## Output
          Return a JSON-serializable array of 0s and 1s based on the verification.

          ## Example
          Inputs:
          - Letter: 'A'
          - Prompts: ["Types of flowers", "Capital cities"]
          - Answers: ["Aster", "Amsterdam"]

          Output:
          [1, 1]

          Inputs:
          - Letter: 'A'
          - Prompts: ["Types of flowers", "Capital cities"]
          - Answers: ["Rose", "Amsterdam"]

          Output:
          [0, 1]

          # Input Below
          Letter: ${letter}
          Prompts: ${prompts}
          Answers: ${answers}
          `
      },
    ],
    temperature: 0,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  return JSON.parse(response.object);
}

console.log(scoreGame("A", "null", "null"))

