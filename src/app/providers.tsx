"use client";

import { FTPProvider } from "@/components/FTP";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FTPProvider>
      {children}
    </FTPProvider>
  );
}
