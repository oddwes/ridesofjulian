import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ size = 20 }: { size?: number }) => {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className={`size-${size} animate-spin`} />
    </div>
  );
};
