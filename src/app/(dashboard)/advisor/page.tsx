import { redirect } from 'next/navigation'

// The standalone Advisor page was retired on 2026-10-22: its Financial
// Checkup now lives as a simplified card on the Overview page.
export default function AdvisorPage() {
  redirect('/overview')
}
