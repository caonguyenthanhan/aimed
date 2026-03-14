import { NextRequest, NextResponse } from 'next/server';

const backendUrl = (process.env.CPU_SERVER_URL || process.env.BACKEND_URL || 'http://localhost:8000').trim().replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Forward the form data to the backend
    const response = await fetch(`${backendUrl}/v1/speech-to-text`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Speech-to-text API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process speech-to-text' },
      { status: 500 }
    );
  }
}
