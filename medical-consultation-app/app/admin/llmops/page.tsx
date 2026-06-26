"use client"
import dynamic from "next/dynamic"

const AdminLLMOpsPage = dynamic(() => import("./page-client"), { ssr: false })

export default AdminLLMOpsPage
