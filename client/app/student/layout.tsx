"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserSession {
    id: number;
    username: string;
    role: string;
    studentId?: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────
const DashboardIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
);
const QrCodeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M12 14v7" /><path d="M16 12h5" /><path d="M7 12h2" /></svg>
);
const LibraryIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></svg>
);
const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

const NAV = [
    { label: "Dashboard", href: "/student/dashboard", icon: <DashboardIcon /> },
    { label: "My QR Code", href: "/student/my-qr-code", icon: <QrCodeIcon /> },
    { label: "Add Subject", href: "/student/add-subject", icon: <LibraryIcon /> },
    { label: "My Schedules", href: "/student/my-schedules", icon: <CalendarIcon /> },
    { label: "Profile", href: "/student/profile", icon: <UserIcon /> },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [user, setUser] = useState<UserSession | null>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);

    useEffect(() => {
        const raw = sessionStorage.getItem("user");
        if (raw) {
            const parsed = JSON.parse(raw);
            setUser(parsed);

            if (parsed.studentId) {
                supabase
                    .from("students")
                    .select("profilepicture")
                    .eq("student_id", parsed.studentId)
                    .single()
                    .then(({ data, error }) => {
                        if (!error && data?.profilepicture) {
                            setProfilePic(data.profilepicture);
                        }
                    });
            }
        }
        setIsMounted(true);
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setSidebarOpen(false);
            else setSidebarOpen(true);
        };
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        router.push("/login");
    };

    if (!isMounted) return null;

    const isActive = (href: string) => pathname === href;

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Inter, sans-serif", background: "#f9fafb" }}>
            {/* ── HEADER ── */}
            <header style={{
                position: "fixed", top: 0, left: 0, right: 0, height: "60px",
                background: "white", borderBottom: "1px solid #e5e5e5",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 1.5rem", zIndex: 50
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <button
                        onClick={() => setSidebarOpen(v => !v)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#737373", display: "flex", alignItems: "center" }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <Image src="/images/logo/DORSHS.png" alt="DORSHS Logo" width={32} height={32} style={{ borderRadius: "6px" }} />
                    <span style={{ fontWeight: 600, color: "#0a0a0a", fontSize: "0.9375rem" }}>SciTrack</span>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 500, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "20px" }}>Student</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            style={{
                                width: "36px", height: "36px", borderRadius: "50%", background: "#f3f4f6",
                                border: profilePic ? "none" : "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", color: "#525252", padding: 0, transition: "background 0.2s", overflow: "hidden"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#e5e7eb"}
                            onMouseLeave={e => e.currentTarget.style.background = "#f3f4f6"}
                        >
                            {profilePic ? (
                                <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <UserIcon />
                            )}
                        </button>

                        {dropdownOpen && (
                            <>
                                <div onClick={() => setDropdownOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                                <div style={{
                                    position: "absolute", top: "calc(100% + 8px)", right: 0, width: "220px",
                                    background: "white", border: "1px solid #e5e5e5", borderRadius: "8px",
                                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                    zIndex: 50, overflow: "hidden", display: "flex", flexDirection: "column"
                                }}>
                                    <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #f5f5f5", display: "flex", flexDirection: "column" }}>
                                        <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#0a0a0a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {user ? user.username : "Student"}
                                        </p>
                                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#737373", marginTop: "2px", textTransform: "capitalize" }}>
                                            {user ? user.role : "Student"}
                                        </p>
                                    </div>
                                    <div style={{ padding: "0.375rem" }}>
                                        <Link href="/student/profile" onClick={() => setDropdownOpen(false)} style={{
                                            width: "100%", textAlign: "left", padding: "0.5rem 0.625rem",
                                            background: "transparent", border: "none", borderRadius: "4px",
                                            fontSize: "0.875rem", color: "#0a0a0a", cursor: "pointer",
                                            display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none"
                                        }} onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <UserIcon />
                                            Profile
                                        </Link>
                                    </div>
                                    <div style={{ padding: "0.375rem", borderTop: "1px solid #f5f5f5" }}>
                                        <button onClick={handleLogout} style={{
                                            width: "100%", textAlign: "left", padding: "0.5rem 0.625rem",
                                            background: "transparent", border: "none", borderRadius: "4px",
                                            fontSize: "0.875rem", color: "#dc2626", cursor: "pointer",
                                            display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "Inter, sans-serif"
                                        }} onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                            Log out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <div style={{ display: "flex", flex: 1, paddingTop: "60px" }}>

                {/* ── MOBILE BACKDROP ── */}
                {isMobile && sidebarOpen && (
                    <div
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            position: "fixed", top: "60px", left: 0, right: 0, bottom: 0,
                            background: "rgba(0, 0, 0, 0.4)", zIndex: 30,
                            backdropFilter: "blur(2px)"
                        }}
                    />
                )}

                {/* ── SIDEBAR ── */}
                <aside style={{
                    position: "fixed", top: "60px", left: 0, bottom: 0,
                    width: "220px",
                    transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
                    background: "#ffffff", borderRight: "1px solid #e5e5e5",
                    display: "flex", flexDirection: "column",
                    transition: "transform 0.3s ease",
                    zIndex: 40,
                }}>
                    <div style={{ padding: "1rem 0", minWidth: "220px", overflowY: "auto", flex: 1 }}>
                        <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 1rem 0.5rem" }}>
                            Navigation
                        </p>
                        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {NAV.map(item => {
                                const active = isActive(item.href);
                                return (
                                    <Link key={item.label} href={item.href}
                                        onClick={() => { if (isMobile) setSidebarOpen(false); }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "0.625rem",
                                            padding: "0.5625rem 1rem", margin: "0 0.5rem", borderRadius: "8px",
                                            fontSize: "0.875rem", fontWeight: active ? 500 : 400,
                                            color: active ? "#16a34a" : "#404040",
                                            background: active ? "#f0fdf4" : "transparent",
                                            textDecoration: "none", transition: "background 0.15s",
                                            whiteSpace: "nowrap",
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f5f5f5"; }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                                        <span style={{ color: active ? "#16a34a" : "#737373", flexShrink: 0 }}>{item.icon}</span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div style={{ marginTop: "auto", padding: "1rem", borderTop: "1px solid #e5e5e5", minWidth: "220px" }}>
                        <p style={{ fontSize: "0.6875rem", color: "#a3a3a3", textAlign: "center" }}>© 2026 DORSHS</p>
                    </div>
                </aside>

                <main style={{
                    flex: 1,
                    minWidth: 0,
                    marginLeft: isMobile ? "0px" : (sidebarOpen ? "220px" : "0px"),
                    transition: "margin-left 0.3s ease",
                    background: "#f9fafb", minHeight: "calc(100vh - 60px)",
                    padding: "0 1rem",
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
