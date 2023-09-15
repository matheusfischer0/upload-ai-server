import { FastifyInstance } from "fastify";
import { z } from "zod";
import { streamToResponse, OpenAIStream, StreamingTextResponse } from "ai";
import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

export async function generateAiCompletionRoute(app: FastifyInstance) {
  app.post("/ai/complete", async (req, reply) => {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    });

    const { videoId, prompt, temperature } = bodySchema.parse(req.body);

    const video = await prisma.video.findUniqueOrThrow({
      where: {
        id: videoId,
      },
    });

    if (!video.transcription) {
      return reply
        .status(400)
        .send({ error: "Video transcription was not generated yet." });
    }

    const promptMessage = prompt.replace(
      "{transcription}",
      video.transcription
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k-0613",
      temperature,
      stream: true,
      messages: [{ role: "user", content: promptMessage }],
    });

    const stream = OpenAIStream(completion);

    // streamToResponse(stream, reply);

    streamToResponse(stream, reply.raw, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
    });
    // Respond with the stream
    // return new StreamingTextResponse(stream, {
    //   headers: {
    //     "Access-Control-Allow-Origin": "*",
    //     "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    //   },
    // });
  });
}
