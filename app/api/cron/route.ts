import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Check authorization for cron jobs
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Unauthorized cron request blocked
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cron job executed successfully
  
  return NextResponse.json({ 
    ok: true,
    timestamp: new Date().toISOString(),
    message: 'Cron job executed successfully'
  });
}