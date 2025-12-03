
'use server';

export type University = { name: string; country: string; };

export async function searchUniversities(query: string): Promise<University[]> {
    'use server';
    if (!query) {
        return [];
    }
    try {
        const url = `https://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            return [];
        }
        
        const data = await response.json();

        // Ensure unique university names
        const uniqueNames = new Set<string>();
        const uniqueUniversities: University[] = [];
        for (const uni of data) {
            if (uni.name && !uniqueNames.has(uni.name)) {
                uniqueNames.add(uni.name);
                uniqueUniversities.push({ name: uni.name, country: uni.country });
            }
        }
        return uniqueUniversities.slice(0, 50);

    } catch (error) {
        if (error instanceof Error) {
            console.error("Failed to fetch universities:", error.message);
        } else {
            console.error("An unknown error occurred while fetching universities");
        }
        return [];
    }
}

    