import {handleAccountRequest} from '@/lib/account-http.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return handleAccountRequest(request); }
export async function POST(request: Request) { return handleAccountRequest(request); }
