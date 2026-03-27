import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuthToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invoiceId } = await params

  // 1. Verify auth
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const claims = await verifyAuthToken(authToken || '')
  if (!claims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { privyId: claims.userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 2. Find invoice and verify ownership
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { userId: true },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Fetch all messages for the invoice
  const messages = await prisma.invoiceMessage.findMany({
    where: { invoiceId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      senderType: true,
      senderName: true,
      content: true,
      createdAt: true,
    },
  })

  // 4. Return results
  return NextResponse.json({ messages })
}
