
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { promises as fs, createReadStream } from 'fs';
import formidable, { File } from 'formidable';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to parse the form data with formidable
async function parseFormData(request: Request): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        // formidable's parse method can directly handle the stream from request.body
        form.parse(request as any, (err, fields, files) => {
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
    
    // formidable can return an array of files, so we handle that
    const file = Array.isArray(audioFile) ? audioFile[0] : audioFile;

    if (!file || !file.filepath) {
        return NextResponse.json({ error: 'Invalid file data' }, { status: 400 });
    }

    // Pass the file stream directly to the OpenAI API
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(file.filepath),
      model: 'whisper-1',
    });

    // Clean up the temporary file created by formidable
    await fs.unlink(file.filepath);

    return NextResponse.json({ transcript: transcription.text });

  } catch (error: any) {
    console.error('Error during transcription:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio', details: error.message }, { status: 500 });
  }
}
