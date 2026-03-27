import { NextRequest, NextResponse } from 'next/server'

// Signup is disabled — K8s RBAC handles user access
export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      allowed: false,
      message: 'Signup is disabled. Access is managed by the cluster administrator.',
    },
    { status: 200 }
  )
}
