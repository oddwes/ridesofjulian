"use client";

import { FtpContext } from "@/components/FTP";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FtpContext.Provider value={250}>
      {children}
    </FtpContext.Provider>
  );
}
