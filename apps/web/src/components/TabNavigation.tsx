"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabNavigation() {
  const pathname = usePathname();

  const tabs = [
    { name: "Calendar", path: "/" },
    { name: "Plan", path: "/plan" },
    { name: "Coach", path: "/coach" },
  ];

  return (
    <div className="hidden md:flex gap-8 justify-center">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`py-2 border-b-2 transition-colors ${
              isActive
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}

