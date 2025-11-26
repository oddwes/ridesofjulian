import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ size = 20 }: { size?: number | string }) => {
  const sizeNum = typeof size === 'string' ? 20 : size;
  return (
    <Loader2 className={`size-${sizeNum} animate-spin`} />
  )
};
