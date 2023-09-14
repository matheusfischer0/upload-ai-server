import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path from "node:path";
import { pipeline } from "node:stream";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import fs from "node:fs";
import { prisma } from "../lib/prisma";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 30, // 30mb
    },
  });

  app.post("/videos", async (request, response) => {
    const data = await request.file();

    if (!data) {
      return response.status(400).send({ error: "Missing File Input" });
    }

    const extension = path.extname(data.filename);

    if (extension !== ".mp3") {
      return response
        .status(400)
        .send({ error: "Invalid input type, please Upload a MP3" });
    }

    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`;

    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    await pump(data.file, fs.createWriteStream(uploadDestination));

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination,
      },
    });

    return response.send({ video });
  });
}