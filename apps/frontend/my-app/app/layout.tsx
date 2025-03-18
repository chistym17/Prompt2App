import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next"
import { Figtree } from "next/font/google"
import { cn } from '@/lib/utils'
import { meta } from '@/lib/constants'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from "@/components/app-sidebar"

import "./globals.css"

import { ClerkProvider } from "@clerk/nextjs"

const figtree = Figtree({
	variable: "--font-figtree",
	subsets: ["latin"],
	weight: "300",
});

export const metadata: Metadata = {
	title: meta.title,
	description: meta.description
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body
					className={cn(`font-sans selection:bg-teal-400/70 selection:text-white dark:selection:bg-teal-200/20 dark:selection:text-teal-200 antialiased`,
						figtree.variable
					)}
				>
					{/* <Particles
						quantityDesktop={350}
						quantityMobile={100}
						ease={80}
						color={"#14b8a6"}
						refresh
					/> */}
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange
					>

						<SidebarProvider defaultOpen={false} className="relative">
							<AppSidebar />
							{children}
						</SidebarProvider>
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}


