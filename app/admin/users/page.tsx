import { userRepository } from "@/lib/db/repository"
import UsersPageClient from "./users-page-client"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UsersPage() {
  // Fetch users data with SSR
  const users = await userRepository.findAll()
  
  return <UsersPageClient initialUsers={users} />
}