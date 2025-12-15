
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs, createReadStream, IncomingMessage } from 'fs';
import formidable from 'formidable';
import type { NextApiRequest } from 'next';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function parseFormData(req: Request): Promise<{ fields: formidable.Fields, files: formidable.Files }> {
    const formidableRequest = await fromNodeLikeRequest(req);
    return new Promise((resolve, reject) => {
        const form = formidable({});
        form.parse(formidableRequest, (err, fields, files) => {
            if (err) {
                return reject(err);
            }
            resolve({ fields, files });
        });
    });
}

async function fromNodeLikeRequest(request: Request) {
    const headers = new Headers(request.headers);
    const body = request.body;

    const req = {
        headers: headers as any,
        [Symbol.asyncIterator]: async function* () {
            const reader = body?.getReader();
            if (!reader) {
                return;
            }
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        return;
                    }
                    yield value;
                }
            } finally {
                reader.releaseLock();
            }
        },
    } as IncomingMessage;
    return req;
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
    
    const file = Array.isArray(audioFile) ? audioFile[0] : audioFile;

    if (!file || !file.filepath) {
        return NextResponse.json({ error: 'Invalid file data' }, { status: 400 });
    }

    // Pass the file stream directly to the OpenAI API
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(file.filepath),
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
