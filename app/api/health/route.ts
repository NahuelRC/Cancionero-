import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'

export async function GET() {
  try {
    await connectDB()
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    return NextResponse.json({ ok: true, db: dbState })
  } catch {
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503 })
  }
}
