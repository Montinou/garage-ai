import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { supabaseMocks } from './supabase';
import { agentApiMocks } from './agent-api';

// Mock server for HTTP requests during testing
export const server = setupServer(
  // Supabase API mocks
  ...supabaseMocks,
  
  // Agent API mocks
  ...agentApiMocks,
  
  // Default fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled request: ${request.method} ${request.url}`);
    return new HttpResponse(null, { status: 404 });
  })
);