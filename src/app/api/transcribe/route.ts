
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function parseFormData(request: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
    const readable = request.body as any;
    if (!readable) {
        throw new Error('Request body is not readable');
    }

    // formidable expects a raw NodeJS request object, but we have a Next.js request.
    // We can adapt it by passing the headers and the readable stream.
    return new Promise((resolve, reject) => {
        const form = formidable({});
        form.parse({ headers: request.headers, readable }, (err, fields, files) => {
            if (err) {
                reject(err);
            } else {
                resolve({ fields, files });
            }
        });
    });
}


export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const { files } = await parseFormData(request);
    const audioFile = files.audio;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file uploaded' }, { status: 400 });
    }
    
    // formidable wraps the file in an array
    const file = Array.isArray(audioFile) ? audioFile[0] : audioFile;

    if (!file || !file.filepath) {
        return NextResponse.json({ error: 'Invalid file data' }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: await fs.readFile(file.filepath),
      model: 'whisper-1',
    });

    // Clean up the temporary file
    await fs.unlink(file.filepath);

    return NextResponse.json({ transcript: transcription.text });

  } catch (error: any) {
    console.error('Error during transcription:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio', details: error.message }, { status: 500 });
  }
}
