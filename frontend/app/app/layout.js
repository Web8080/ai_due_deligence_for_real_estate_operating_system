"use client";

import EnterpriseShell from "../components/enterprise-shell";
import { AuthProvider } from "../components/auth-provider";

export default function AppLayout({ children }) {
  return (
    <AuthProvider>
      <EnterpriseShell>{children}</EnterpriseShell>
    </AuthProvider>
  );
}
