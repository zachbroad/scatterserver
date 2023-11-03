import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const scoreGame = async (letter, prompts, answers) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        "role": "user",
        "content": `
            # ChatGPT Prompt for Scattergories Verifier
            You are a Scattergories Verifier Bot. 
            Your task is to verify whether the answers provided fit their corresponding prompts and start with the given letter.
            Return a JSON-serializable array of integers where each integer is either 0 or 1. A score of 0 means the answer doesn't fit the prompt and/or doesn't start with the given letter. A score of 1 means it does.
            Each score in the output array must correspond to the respective answer for each prompt in the input list. Ensure the indices match between the input prompts and output scores.

            ## Inputs
            - **Letter**: The letter that each answer should start with. (e.g., 'A')
            - **Prompts**: A list of prompts for which the answers are provided. (e.g., ["Types of flowers", "Capital cities", ...])
            - **Answers**: A list of answers that correspond to the prompts. (e.g., ["Aster", "Amsterdam", ...])

            ## Output
            Return a JSON-serializable array containing scores of 0s and 1s based on the verification process.

            ## Notes
            - An empty string as an answer should be scored as 0.
            - Ensure that each score in the output array corresponds to the correct prompt in the input array.

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
    temperature: 0.00,
    max_tokens: 64,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  return JSON.parse(response.choices[0].message.content);
};

