import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ size = 20 }: { size?: number }) => {
  return (
    <Loader2 className={`size-${size} animate-spin`} />
  )
};
