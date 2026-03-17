"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
	const [mounted, setMounted] = useState(false);
	const { theme, setTheme } = useTheme();
	const pathname = usePathname();

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<header className="bg-white dark:bg-gray-800 shadow-sm">
			<nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex">
						<div className="flex-shrink-0 flex items-center">
							<Image
								src="/logo.svg"
								alt="Logo"
								width={32}
								height={32}
								className="dark:invert"
							/>
						</div>
						<div className="hidden sm:ml-6 sm:flex sm:space-x-8">
							<Link
								href="/"
								className={cn(
									"inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors",
									pathname === "/"
										? "border-blue-500 text-blue-600 dark:text-blue-400"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
								)}
							>
								Overview
							</Link>
							<Link
								href="/integrations"
								className={cn(
									"inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors",
									pathname === "/integrations"
										? "border-blue-500 text-blue-600 dark:text-blue-400"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
								)}
							>
								Integrations
							</Link>
							<Link
								href="/records"
								className={cn(
									"inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors",
									pathname === "/records"
										? "border-blue-500 text-blue-600 dark:text-blue-400"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
								)}
							>
								Records
							</Link>
							<Link
								href="/fields"
								className={cn(
									"inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors",
									pathname === "/fields"
										? "border-blue-500 text-blue-600 dark:text-blue-400"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
								)}
							>
								Fields
							</Link>
							<Link
								href="/files"
								className={cn(
									"inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors",
									pathname === "/files"
										? "border-blue-500 text-blue-600 dark:text-blue-400"
										: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
								)}
							>
								Files
							</Link>
						</div>
					</div>
					<div className="flex items-center">
						{mounted && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
								aria-label="Toggle dark mode"
							>
								{theme === "dark" ? (
									<Sun className="h-5 w-5" />
								) : (
									<Moon className="h-5 w-5" />
								)}
							</Button>
						)}
					</div>
				</div>
			</nav>
		</header>
	);
}
