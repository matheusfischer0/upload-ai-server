import { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";

import { prisma } from "../lib/prisma";
import { openai } from "../lib/openai";

import { z } from "zod";

const paramsSchema = z.object({ videoId: z.string().uuid() });
const bodySchema = z.object({
  prompt: z.string(),
});

export async function createTranscriptionRoute(app: FastifyInstance) {
  app.post("/videos/:videoId/transcription", async (request, res) => {
    const { videoId } = paramsSchema.parse(request.params);

    const { prompt } = bodySchema.parse(request.body);

    const video = await prisma.video.findUniqueOrThrow({
      where: { id: videoId },
    });

    const videoPath = video.path;

    const audioReadStream = createReadStream(videoPath);

    const openaiResponse = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: "whisper-1",
      language: "pt",
      response_format: "json",
      temperature: 0,
      prompt,
    });

    const transcription = openaiResponse.text;

    await prisma.video.update({
      where: { id: videoId },
      data: { transcription },
    });

    return { transcription };
  });
}
