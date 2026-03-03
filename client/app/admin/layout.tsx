"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserSession {
    id: number;
    username: string;
    role: string;
}

// Sub-nav icon helper
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
        {
            label: "Dashboard",
            href: "/admin/dashboard",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>,
        },
        {
            label: "Students",
            icon: <Icon d="M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5" />,
            children: [
                { label: "Register Student", href: "/admin/register-student" },
                { label: "View Students", href: "/admin/view-students" },
            ],
        },
        {
            label: "Register Teacher",
            href: "/admin/register-teacher",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" /></svg>,
        },
        {
            label: "Add Subject",
            href: "/admin/add-subject",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="12" y1="8" x2="12" y2="14" /><line x1="9" y1="11" x2="15" y2="11" /></svg>,
        },
    ];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<UserSession | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Track which parent groups are expanded
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        // Auto-expand "Students" if on a student page
        return { Students: true };
    });

    useEffect(() => {
        const raw = sessionStorage.getItem("user");
        if (!raw) { router.push("/login"); return; }
        const parsed = JSON.parse(raw);
        if (parsed.role !== "admin") { router.push("/login"); return; }
        setUser(parsed);
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem("user");
        router.push("/login");
    };

    if (!user) return null;

    const toggleGroup = (label: string) => {
        setExpanded(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const isActive = (href: string) => pathname === href;
    const isGroupActive = (children: { href: string }[]) => children.some(c => pathname === c.href);

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

            {/* ── HEADER ── */}
            <header style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
                height: "60px", background: "#ffffff", borderBottom: "1px solid #e5e5e5",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 1.5rem",
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
                    <span style={{ fontSize: "0.6875rem", fontWeight: 500, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "20px" }}>Admin</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.875rem", color: "#737373" }}>{user.username}</span>
                    <button onClick={handleLogout} style={{ padding: "0.375rem 0.875rem", borderRadius: "6px", border: "1px solid #e5e5e5", background: "white", fontSize: "0.8125rem", color: "#0a0a0a", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
                        onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                        Sign out
                    </button>
                </div>
            </header>

            <div style={{ display: "flex", flex: 1, paddingTop: "60px" }}>

                {/* ── SIDEBAR ── */}
                <aside style={{
                    position: "fixed", top: "60px", left: 0, bottom: 0,
                    width: sidebarOpen ? "220px" : "0px",
                    overflow: "hidden",
                    background: "#ffffff", borderRight: "1px solid #e5e5e5",
                    display: "flex", flexDirection: "column",
                    transition: "width 0.2s ease",
                    zIndex: 40,
                }}>
                    <div style={{ padding: "1rem 0", minWidth: "220px" }}>
                        <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 1rem 0.5rem" }}>
                            Navigation
                        </p>
                        <nav style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {NAV.map(item => {
                                // ── Simple link (no children)
                                if (!item.children) {
                                    const active = isActive(item.href!);
                                    return (
                                        <Link key={item.label} href={item.href!} style={{
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

                                // ── Group with sub-nav
                                const groupActive = isGroupActive(item.children);
                                const open = expanded[item.label] ?? groupActive;

                                return (
                                    <div key={item.label}>
                                        {/* Group header */}
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

                                        {/* Sub-items */}
                                        {open && (
                                            <div style={{ paddingLeft: "1rem" }}>
                                                {item.children.map(child => {
                                                    const childActive = isActive(child.href);
                                                    return (
                                                        <Link key={child.href} href={child.href} style={{
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
                                                            <span style={{ width: 4, height: 4, borderRadius: "50%", background: childActive ? "#16a34a" : "#d4d4d4", flexShrink: 0 }} />
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

                    <div style={{ marginTop: "auto", padding: "1rem", borderTop: "1px solid #e5e5e5", minWidth: "220px" }}>
                        <p style={{ fontSize: "0.6875rem", color: "#a3a3a3", textAlign: "center" }}>© 2026 DORSHS</p>
                    </div>
                </aside>

                {/* ── MAIN CONTENT ── */}
                <main style={{
                    flex: 1, marginLeft: sidebarOpen ? "220px" : "0px",
                    transition: "margin-left 0.2s ease",
                    background: "#f9fafb", minHeight: "calc(100vh - 60px)",
                }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
