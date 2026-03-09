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
    teacherId?: string;
}

// ── Icons ─────────────────────────────────────────────────────────────────
const DashboardIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
);
const ScanIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
);
const LibraryIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 6 4 14" /><path d="M12 6v14" /><path d="M8 8v12" /><path d="M4 4v16" /></svg>
);
const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const AttendanceIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
);
const Icon = ({ d }: { d: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const NAV: {
    label: string;
    href?: string;
    icon: React.ReactNode;
    children?: { label: string; href: string }[];
}[] = [
        { label: "Dashboard", href: "/teacher/dashboard", icon: <DashboardIcon /> },
        {
            label: "Attendance",
            icon: <AttendanceIcon />,
            children: [
                { label: "Scan", href: "/teacher/scan-attendance" },
                { label: "Records", href: "/teacher/attendance/records" },
            ],
        },
        { label: "My Subjects", href: "/teacher/my-subjects", icon: <LibraryIcon /> },
        { label: "Profile", href: "/teacher/profile", icon: <UserIcon /> },
    ];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [user, setUser] = useState<UserSession | null>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ Attendance: true });

    useEffect(() => {
        const raw = sessionStorage.getItem("user");
        if (raw) {
            const parsed = JSON.parse(raw);
            setUser(parsed);

            if (parsed.teacherId) {
                supabase
                    .from("teacher")
                    .select("profile_picture")
                    .eq("teacher_id", parsed.teacherId)
                    .single()
                    .then(({ data, error }) => {
                        if (!error && data?.profile_picture) {
                            setProfilePic(data.profile_picture);
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
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        router.push("/login");
    };

    if (!isMounted) return null;

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
    const isGroupActive = (children: { href: string }[]) => children.some(c => pathname === c.href || pathname.startsWith(c.href + "/"));
    const toggleGroup = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

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
                    <span style={{ fontSize: "0.6875rem", fontWeight: 500, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "20px" }}>Teacher</span>
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
                                            {user ? user.username : "Teacher"}
                                        </p>
                                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#737373", marginTop: "2px", textTransform: "capitalize" }}>
                                            {user ? user.role : "Teacher"}
                                        </p>
                                    </div>
                                    <div style={{ padding: "0.375rem" }}>
                                        <Link href="/teacher/profile" onClick={() => setDropdownOpen(false)} style={{
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
                    <div style={{ padding: "1rem 0", overflowY: "auto", flex: 1 }}>
                        <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 1rem 0.5rem" }}>
                            Navigation
                        </p>
                        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {NAV.map(item => {
                                if (!item.children) {
                                    const active = isActive(item.href!);
                                    return (
                                        <Link key={item.label} href={item.href!}
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
                                }

                                const groupActive = isGroupActive(item.children);
                                const open = expanded[item.label] ?? groupActive;

                                return (
                                    <div key={item.label}>
                                        <button
                                            onClick={() => toggleGroup(item.label)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: "0.625rem",
                                                padding: "0.5625rem 1rem", margin: "0 0.5rem", borderRadius: "8px",
                                                fontSize: "0.875rem", fontWeight: groupActive ? 500 : 400,
                                                color: groupActive ? "#16a34a" : "#404040",
                                                background: groupActive && !open ? "#f0fdf4" : "transparent",
                                                width: "calc(100% - 1rem)",
                                                border: "none", cursor: "pointer", textAlign: "left",
                                                transition: "background 0.15s", fontFamily: "Inter, sans-serif",
                                                whiteSpace: "nowrap",
                                            }}
                                            onMouseEnter={e => { if (!groupActive) e.currentTarget.style.background = "#f5f5f5"; }}
                                            onMouseLeave={e => { if (!groupActive) e.currentTarget.style.background = "transparent"; }}
                                        >
                                            <span style={{ color: groupActive ? "#16a34a" : "#737373", flexShrink: 0 }}>{item.icon}</span>
                                            <span style={{ flex: 1 }}>{item.label}</span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0, color: "#a3a3a3" }}>
                                                <path d="M6 9l6 6 6-6" />
                                            </svg>
                                        </button>

                                        {open && (
                                            <div style={{ paddingLeft: "1rem" }}>
                                                {item.children.map(child => {
                                                    const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                                                    return (
                                                        <Link key={child.href} href={child.href}
                                                            onClick={() => { if (isMobile) setSidebarOpen(false); }}
                                                            style={{
                                                                display: "flex", alignItems: "center", gap: "0.5rem",
                                                                padding: "0.4375rem 0.875rem", margin: "1px 0.5rem",
                                                                borderRadius: "6px", fontSize: "0.8125rem",
                                                                fontWeight: childActive ? 500 : 400,
                                                                color: childActive ? "#16a34a" : "#525252",
                                                                background: childActive ? "#f0fdf4" : "transparent",
                                                                textDecoration: "none", transition: "background 0.15s",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                            onMouseEnter={e => { if (!childActive) e.currentTarget.style.background = "#f5f5f5"; }}
                                                            onMouseLeave={e => { if (!childActive) e.currentTarget.style.background = "transparent"; }}
                                                        >
                                                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: childActive ? "#16a34a" : "#d4d4d4", flexShrink: 0, display: "inline-block" }} />
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </nav>
                    </div>

                    <div style={{ marginTop: "auto", padding: "1rem", borderTop: "1px solid #e5e5e5" }}>
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
