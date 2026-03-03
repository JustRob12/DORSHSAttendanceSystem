"use client";

import { useCallback, useEffect, useState } from "react";
import { decryptPassword } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";

interface Student {
    student_id: number;
    firstname: string;
    lastname: string;
    middlename: string | null;
    lrn: number;
    grade: number;
    section: string | null;
    gender: string | null;
    account_students: { username: string; password: string }[] | null;
}

const GRADES = [7, 8, 9, 10, 11, 12];

const SendIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

export default function ViewStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterGrade, setFilterGrade] = useState("");
    const [filterSection, setFilterSection] = useState("");
    const [filterGender, setFilterGender] = useState("");
    const [search, setSearch] = useState("");
    const [sections, setSections] = useState<string[]>([]);

    // open default mail client with pre-filled credentials
    const sendCredentials = (email: string, username: string, encryptedPw: string) => {
        const plain = decryptPassword(encryptedPw);
        const subject = encodeURIComponent("Your SciTrack Login Credentials");
        const body = encodeURIComponent(
            `Dear Student,\n\nHere are your login credentials for the SciTrack – DORSHS Attendance System:\n\n  Username: ${username}\n  Password: ${plain}\n\nPlease keep these credentials safe and do not share them with anyone.\n\nBest regards,\nDORSHS Admin`
        );
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const loadStudents = useCallback(async () => {
        setIsLoading(true);
        let q = supabase
            .from("students")
            .select("student_id, firstname, lastname, middlename, lrn, grade, section, gender, account_students(username, password)")
            .order("lastname", { ascending: true })
            .order("firstname", { ascending: true });

        if (filterGrade) q = q.eq("grade", parseInt(filterGrade));
        if (filterSection) q = q.ilike("section", filterSection);
        if (filterGender) q = q.ilike("gender", filterGender);

        const { data } = await q;
        setStudents((data as Student[]) ?? []);
        setIsLoading(false);
    }, [filterGrade, filterSection, filterGender]);

    useEffect(() => {
        supabase.from("students").select("section").then(({ data }) => {
            const unique = [...new Set((data ?? []).map(s => s.section).filter(Boolean))] as string[];
            setSections(unique.sort());
        });
    }, []);

    useEffect(() => { loadStudents(); }, [loadStudents]);

    const displayed = students.filter(s => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return s.firstname.toLowerCase().includes(q) || s.lastname.toLowerCase().includes(q) || String(s.lrn).includes(q);
    });

    const selectStyle: React.CSSProperties = {
        padding: "0.4375rem 0.75rem", borderRadius: "8px",
        border: "1px solid #e5e5e5", fontSize: "0.8125rem",
        color: "#0a0a0a", background: "white", cursor: "pointer",
        fontFamily: "Inter, sans-serif", outline: "none",
    };
    const th: React.CSSProperties = {
        padding: "0.625rem 0.875rem", fontSize: "0.6875rem", fontWeight: 600,
        color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em",
        textAlign: "left", whiteSpace: "nowrap", background: "#f9fafb",
        borderBottom: "1px solid #e5e5e5",
    };
    const td: React.CSSProperties = {
        padding: "0.625rem 0.875rem", fontSize: "0.875rem", color: "#0a0a0a",
        borderBottom: "1px solid #f5f5f5", whiteSpace: "nowrap",
    };

    return (
        <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif" }}>

            <div style={{ marginBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>View Students</h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>Browse, filter, and send login credentials to students.</p>
            </div>

            {/* Filter bar */}
            <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "280px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2"
                        style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)" }}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search name or LRN…"
                        style={{ ...selectStyle, paddingLeft: "2rem", width: "100%", boxSizing: "border-box", cursor: "text" }} />
                </div>

                <select style={selectStyle} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                    <option value="">All Grades</option>
                    {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>

                <select style={selectStyle} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                    <option value="">All Sections</option>
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select style={selectStyle} value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>

                <button onClick={() => { setFilterGrade(""); setFilterSection(""); setFilterGender(""); setSearch(""); }}
                    style={{ ...selectStyle, background: "#f5f5f5", color: "#737373" }}>
                    Clear
                </button>

                <span style={{ marginLeft: "auto", fontSize: "0.8125rem", color: "#737373" }}>
                    {isLoading ? "Loading…" : `${displayed.length} student${displayed.length !== 1 ? "s" : ""}`}
                </span>
            </div>

            {/* Table */}
            <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {isLoading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#a3a3a3" }}>Loading students…</div>
                ) : displayed.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center" }}>
                        <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎓</p>
                        <p style={{ fontSize: "0.9375rem", color: "#a3a3a3", fontWeight: 500 }}>No students found</p>
                        <p style={{ fontSize: "0.8125rem", color: "#d4d4d4", marginTop: "4px" }}>Try adjusting your filters</p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={th}>#</th>
                                    <th style={th}>LRN</th>
                                    <th style={th}>Last Name</th>
                                    <th style={th}>First Name</th>
                                    <th style={th}>Middle Name</th>
                                    <th style={th}>Gender</th>
                                    <th style={th}>Grade</th>
                                    <th style={th}>Section</th>
                                    <th style={th}>Username (Email)</th>
                                    <th style={th}>Send Credentials</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayed.map((s, i) => {
                                    const account = s.account_students?.[0];
                                    return (
                                        <tr key={s.student_id}
                                            style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.1s" }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}
                                        >
                                            <td style={{ ...td, color: "#a3a3a3", fontSize: "0.75rem" }}>{i + 1}</td>
                                            <td style={td}><code style={{ fontSize: "0.75rem", color: "#525252" }}>{s.lrn}</code></td>
                                            <td style={{ ...td, fontWeight: 500 }}>{s.lastname}</td>
                                            <td style={td}>{s.firstname}</td>
                                            <td style={{ ...td, color: "#737373" }}>{s.middlename || "—"}</td>
                                            <td style={td}>
                                                {s.gender ? (
                                                    <span style={{
                                                        fontSize: "0.75rem", fontWeight: 500, padding: "2px 8px", borderRadius: "20px",
                                                        background: s.gender.toLowerCase() === "male" ? "#dbeafe" : "#fce7f3",
                                                        color: s.gender.toLowerCase() === "male" ? "#1d4ed8" : "#be185d",
                                                    }}>{s.gender}</span>
                                                ) : "—"}
                                            </td>
                                            <td style={td}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "20px" }}>
                                                    Grade {s.grade}
                                                </span>
                                            </td>
                                            <td style={td}>{s.section || "—"}</td>

                                            {/* Username */}
                                            <td style={{ ...td, color: "#2563eb", fontSize: "0.8125rem" }}>
                                                {account?.username ?? <span style={{ color: "#d4d4d4" }}>—</span>}
                                            </td>

                                            {/* Send credentials button */}
                                            <td style={td}>
                                                {account ? (
                                                    <button
                                                        onClick={() => sendCredentials(account.username, account.username, account.password)}
                                                        title={`Send credentials to ${account.username}`}
                                                        style={{
                                                            display: "inline-flex", alignItems: "center", gap: "0.375rem",
                                                            padding: "0.3125rem 0.75rem", borderRadius: "6px",
                                                            background: "#16a34a", color: "white", border: "none",
                                                            fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                                                            fontFamily: "Inter, sans-serif", transition: "opacity 0.15s",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                                                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                                                    >
                                                        <SendIcon /> Send
                                                    </button>
                                                ) : <span style={{ color: "#d4d4d4" }}>—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
