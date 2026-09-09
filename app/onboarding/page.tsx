import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { MonthlySubscription as Subscription } from '@/models/MonthlySubscription'
import { getMonthlyPlan } from '@/lib/payments/mercadopago'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.rol === 'SUPER_ADMIN') redirect('/super-admin')
  if (session.user.onboardingStatus !== 'PENDING') redirect('/en-vivo')
  await connectDB()
  const subscription = await Subscription.findOne({ userId: session.user.id }).lean()
  return <OnboardingClient
    email={session.user.email}
    plan={getMonthlyPlan()}
    subscription={subscription ? {
      iglesiaName: subscription.iglesiaName, slug: subscription.slug,
      status: subscription.status, checkoutUrl: subscription.checkoutUrl ?? null,
      amount: subscription.amount,
    } : null}
  />
}
