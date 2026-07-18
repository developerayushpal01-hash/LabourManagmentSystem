import type { ReactNode } from "react"
import ContractorRoute from "@/app/components/contractor-route"

type SettingsLayoutProps = {
  children: ReactNode
}

const SettingsLayout = ({ children }: SettingsLayoutProps) => (
  <ContractorRoute>{children}</ContractorRoute>
)

export default SettingsLayout
