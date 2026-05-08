import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/login?type=recovery')
}
