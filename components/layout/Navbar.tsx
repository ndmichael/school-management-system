"use client";

import { useState, useEffect, useMemo, useCallback, type MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type MainRole = "admin" | "student" | "academic_staff" | "non_academic_staff";

type ProfileMini = {
  id: string;
  main_role: MainRole | null;
};

const DASHBOARD_BY_ROLE: Record<MainRole, string> = {
  admin: "/dashboard/admin",
  student: "/dashboard/student",
  academic_staff: "/dashboard/academic_staff",
  non_academic_staff: "/dashboard/non_academic_staff",
};

const ACCOUNT_BY_ROLE: Record<MainRole, { href: string; label: string }> = {
  admin: { href: "/dashboard/admin/settings", label: "Settings" },
  academic_staff: { href: "/dashboard/academic_staff/settings", label: "Settings" },
  non_academic_staff: { href: "/dashboard/non_academic_staff/settings", label: "Settings" },
  student: { href: "/dashboard/student/profile", label: "Profile" },
};

export function Navbar() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<MainRole | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll handler for About section anchors
  const handleAboutClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/about") {
      e.preventDefault();
      const targetId = (e.currentTarget.getAttribute("href") || "").replace("/about", "");
      const element = document.querySelector(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        setIsMobileMenuOpen(false);
      }
    } else {
      setIsMobileMenuOpen(false);
    }
  };

  const loadAuth = useCallback(async (): Promise<void> => {
    setAuthLoading(true);

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes.user;

    if (userErr || !user) {
      setUserId(null);
      setRole(null);
      setAuthLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, main_role")
      .eq("id", user.id)
      .maybeSingle()
      .returns<ProfileMini>();

    if (pErr || !profile) {
      // user exists but profile row not readable/doesn't exist
      setRole(null);
      setAuthLoading(false);
      return;
    }

    setRole(profile.main_role);
    setAuthLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await loadAuth();
      if (cancelled) return;
    };

    void run();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void loadAuth();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadAuth]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Programs", href: "/programs" },
    { label: "Admissions", href: "/admissions" },
    { label: "Contact", href: "/contact" },
  ] as const;

  const isAuthed = !!userId;

  const dashboardHref = role ? DASHBOARD_BY_ROLE[role] : "/dashboard";
  const account = role ? ACCOUNT_BY_ROLE[role] : { href: "/dashboard", label: "Account" };

  const onLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUserId(null);
    setRole(null);
    setIsMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/40"
          : "bg-white/30 backdrop-blur-sm"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* LOGO (unchanged layout) */}
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/logo.png"
              alt="SYK Health Tech"
              width={160}
              height={140}
              priority
            />
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={link.label === "About" ? handleAboutClick : undefined}
                className="px-4 py-2 rounded-lg font-medium text-sm text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                {link.label}
              </Link>
            ))}

            {/* CTA (same look, just conditional) */}
            {!authLoading && !isAuthed ? (
              <>
                <Link
                  href="/login"
                  className="px-5 py-2 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/apply"
                  className="relative px-6 py-2 rounded-lg font-medium text-sm bg-primary-600 text-white overflow-hidden group"
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </>
            ) : null}

            {!authLoading && isAuthed ? (
              <>
                <Link
                  href={dashboardHref}
                  className="px-5 py-2 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Dashboard
                </Link>

                <Link
                  href={account.href}
                  className="relative px-6 py-2 rounded-lg font-medium text-sm bg-primary-600 text-white overflow-hidden group"
                >
                  <span className="relative z-10">{account.label}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-secondary-600 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="px-5 py-2 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : null}
          </div>

          {/* MOBILE NAV BUTTON */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 shadow-xl animate-in slide-in-from-top duration-300">
          <div className="px-6 py-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={link.label === "About" ? handleAboutClick : () => setIsMobileMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-primary-50 hover:text-primary-600 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile CTA */}
            <div className="pt-4 space-y-2">
              {!authLoading && !isAuthed ? (
                <>
                  <Link
                    href="/login"
                    className="block w-full text-center px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/apply"
                    className="block w-full text-center px-4 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              ) : null}

              {!authLoading && isAuthed ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="block w-full text-center px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>

                  <Link
                    href={account.href}
                    className="block w-full text-center px-4 py-3 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {account.label}
                  </Link>

                  <button
                    type="button"
                    onClick={() => void onLogout()}
                    className="block w-full text-center px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
