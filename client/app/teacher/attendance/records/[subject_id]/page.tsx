"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface AttendanceRecord {
    attendance_id: number;
    timein: string;
    student_name: string;
    lrn: string;
    grade: string | null;
    section: string | null;
}

interface SubjectInfo {
    subject_id: number;
    subject_name: string;
    grade: number;
}

function fmt(ts: string) {
    return new Date(ts + "Z").toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export default function SubjectAttendanceRecords() {
    const params = useParams();
    const router = useRouter();
    const subjectId = Number(params.subject_id);

    const [subject, setSubject] = useState<SubjectInfo | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [teacherName, setTeacherName] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                const raw = sessionStorage.getItem("user");
                if (!raw) { router.push("/login"); return; }
                const { teacherId } = JSON.parse(raw);

                // Get teacher name
                const { data: teacherRow } = await supabase
                    .from("teachers")
                    .select("first_name, last_name")
                    .eq("teacher_id", teacherId)
                    .single();
                if (teacherRow) setTeacherName(`${teacherRow.last_name}, ${teacherRow.first_name}`);

                // Get subject info
                const { data: subRow, error: subErr } = await supabase
                    .from("subject")
                    .select("subject_id, subject_name, grade")
                    .eq("subject_id", subjectId)
                    .single();
                if (subErr || !subRow) return;
                setSubject(subRow);

                // Simple direct query — attendance now stores flat QR data
                const { data: attRows, error: attErr } = await supabase
                    .from("attendance")
                    .select("attendance_id, timein, student_name, lrn, grade, section")
                    .eq("subject_id", subjectId)
                    .order("timein", { ascending: false });

                if (attErr) throw attErr;
                setRecords(attRows || []);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [subjectId, router]);

    const filtered = records.filter(r =>
        r.student_name.toLowerCase().includes(search.toLowerCase()) ||
        r.lrn.includes(search)
    );

    const handleExport = () => {
        if (!subject) return;
        const ws = XLSX.utils.json_to_sheet(
            filtered.map((r, i) => ({
                "#": i + 1,
                "Student Name": r.student_name,
                "LRN": r.lrn,
                "Grade": r.grade ?? "",
                "Section": r.section ?? "",
                "Time In": fmt(r.timein),
            }))
        );
        ws["!cols"] = [{ wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 28 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        const filename = `${teacherName} - ${subject.subject_name}.xlsx`.replace(/[/\\?%*:|"<>]/g, "-");
        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>

            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
                <Link href="/teacher/attendance/records"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", marginBottom: "0.75rem" }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Back to Records
                </Link>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", width: "100%" }}>
                        <div style={{ flex: "1 1 auto", minWidth: 0, paddingRight: "1rem" }}>
                            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em", margin: 0, wordBreak: "break-word" }}>
                                {subject ? subject.subject_name : "Loading..."}
                            </h1>
                            {subject && <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "0.25rem" }}>Grade {subject.grade} · {records.length} total records</p>}
                        </div>

                        <button
                            onClick={handleExport}
                            disabled={isLoading || filtered.length === 0}
                            style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                background: filtered.length === 0 ? "#f3f4f6" : "#0f766e",
                                color: filtered.length === 0 ? "#9ca3af" : "white",
                                border: "none", padding: "0.625rem 1.25rem", borderRadius: "10px",
                                fontSize: "0.875rem", fontWeight: 600, cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                                boxShadow: filtered.length > 0 ? "0 4px 12px rgba(15,118,110,0.25)" : "none",
                                whiteSpace: "nowrap", flexShrink: 0
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: "1.25rem", position: "relative", maxWidth: "360px" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)" }}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                    type="text"
                    placeholder="Search by name or LRN..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: "100%", paddingLeft: "2.5rem", paddingRight: "1rem",
                        paddingTop: "0.625rem", paddingBottom: "0.625rem",
                        borderRadius: "10px", border: "1px solid #e5e5e5",
                        fontSize: "0.875rem", fontFamily: "inherit",
                        background: "white", outline: "none", boxSizing: "border-box",
                    }}
                />
            </div>

            {/* Table */}
            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e5e5", boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                {isLoading ? (
                    <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3" }}>
                        <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                        <p>Loading records...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#a3a3a3" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem", display: "block" }}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#404040", margin: "0 0 0.25rem" }}>No Records Found</h3>
                        <p style={{ fontSize: "0.875rem" }}>{search ? "Try a different search term." : "No attendance has been recorded for this subject yet."}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", width: "100%", maxWidth: "100vw", WebkitOverflowScrolling: "touch" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
                            <thead>
                                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e5e5" }}>
                                    {["#", "Student Name", "LRN", "Grade", "Section", "Time In"].map(h => (
                                        <th key={h} style={{ padding: "0.75rem 1.25rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((rec, i) => (
                                    <tr key={rec.attendance_id} style={{ borderBottom: "1px solid #f3f4f6", transition: "background 0.1s" }}
                                        onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
                                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                    >
                                        <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.8125rem", color: "#a3a3a3", fontWeight: 500 }}>{i + 1}</td>
                                        <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, color: "#0a0a0a", whiteSpace: "nowrap" }}>{rec.student_name}</td>
                                        <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.8125rem", color: "#525252", fontFamily: "monospace" }}>{rec.lrn}</td>
                                        <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.8125rem", color: "#525252" }}>{rec.grade ?? "—"}</td>
                                        <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.8125rem", color: "#525252" }}>{rec.section ?? "—"}</td>
                                        <td style={{ padding: "0.875rem 1.25rem", fontSize: "0.8125rem", color: "#525252", whiteSpace: "nowrap" }}>{fmt(rec.timein)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ padding: "0.75rem 1.25rem", background: "#f9fafb", borderTop: "1px solid #e5e5e5", fontSize: "0.75rem", color: "#737373" }}>
                            Showing {filtered.length} of {records.length} records
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
