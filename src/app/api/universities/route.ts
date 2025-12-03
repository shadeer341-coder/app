import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Name query parameter is required' }, { status: 400 });
  }

  try {
    const apiResponse = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(name)}`);
    
    if (!apiResponse.ok) {
      // Forward the error from the external API
      return NextResponse.json({ error: `API responded with status: ${apiResponse.status}` }, { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    
    // Ensure unique university names and limit results
    const uniqueNames = new Set<string>();
    const uniqueUniversities: { name: string; country: string }[] = [];
    for (const uni of data) {
        if (uni.name && !uniqueNames.has(uni.name)) {
            uniqueNames.add(uni.name);
            uniqueUniversities.push({ name: uni.name, country: uni.country });
        }
    }

    return NextResponse.json(uniqueUniversities.slice(0, 10));
  } catch (error) {
    if (error instanceof Error) {
        console.error("Failed to fetch from universities API:", error.message);
        return NextResponse.json({ error: 'Failed to fetch from external API', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
