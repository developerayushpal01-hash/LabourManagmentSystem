import type { ReactNode } from "react"
import ContractorRoute from "@/app/components/contractor-route"

type ProfileLayoutProps = {
  children: ReactNode
}

const ProfileLayout = ({ children }: ProfileLayoutProps) => (
  <ContractorRoute>{children}</ContractorRoute>
)

export default ProfileLayout
