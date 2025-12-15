
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import formidable from 'formidable';
import type { NextApiRequest } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function parseFormData(req: Request): Promise<{ fields: formidable.Fields, files: formidable.Files }> {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        // The formidable parse method expects a Node.js IncomingMessage, 
        // which is not directly available in Next.js App Router API routes.
        // We adapt the Next.js request for formidable.
        // This is a common pattern for using formidable in this environment.
        form.parse(req as unknown as NextApiRequest, (err, fields, files) => {
            if (err) {
                return reject(err);
            }
            resolve({ fields, files });
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
    
    const file = Array.isArray(audioFile) ? audioFile[0] : audioFile;

    if (!file || !file.filepath) {
        return NextResponse.json({ error: 'Invalid file data' }, { status: 400 });
    }

    // Create a read stream from the file path to pass to OpenAI
    const fileStream = await fs.readFile(file.filepath);

    const transcription = await openai.audio.transcriptions.create({
      file: {
        value: fileStream,
        name: file.originalFilename || 'audio.webm'
      },
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
