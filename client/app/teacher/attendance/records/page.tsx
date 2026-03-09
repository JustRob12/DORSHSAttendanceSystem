"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SubjectDate {
    day: string;
    start_time: string;
    end_time: string;
}

interface Subject {
    subject_id: number;
    subject_name: string;
    grade: number;
    subject_dates: SubjectDate[];
}

const DAY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    Monday: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    Tuesday: { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
    Wednesday: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    Thursday: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    Friday: { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" },
};

function fmt12h(time: string) {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function AttendanceRecordsPage() {
    const router = useRouter();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const raw = sessionStorage.getItem("user");
                if (!raw) { router.push("/login"); return; }
                const { teacherId } = JSON.parse(raw);

                const { data, error } = await supabase
                    .from("assigned_subject")
                    .select(`
                        subject:subject_id (
                            subject_id, subject_name, grade,
                            subject_dates(day, start_time, end_time)
                        )
                    `)
                    .eq("teacher_id", teacherId);

                if (error) throw error;
                if (data) setSubjects(data.map((d: any) => d.subject as Subject));
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [router]);

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>Attendance Records</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.5rem" }}>Select a subject to view and export attendance records.</p>
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3", background: "white", borderRadius: "16px", border: "1px dashed #e5e5e5" }}>
                    <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                    <p>Loading subjects...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : subjects.length === 0 ? (
                <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e5e5e5", padding: "4rem 2rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#404040" }}>No Subjects Assigned</h3>
                    <p style={{ fontSize: "0.875rem", color: "#737373" }}>You don&apos;t have any classes assigned yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjects.map(sub => {
                        const sorted = [...(sub.subject_dates || [])].sort((a, b) => {
                            const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                            return order.indexOf(a.day) - order.indexOf(b.day);
                        });
                        return (
                            <button
                                key={sub.subject_id}
                                onClick={() => router.push(`/teacher/attendance/records/${sub.subject_id}`)}
                                style={{
                                    background: "white", borderRadius: "16px", border: "1px solid #e5e5e5",
                                    padding: "1.5rem", textAlign: "left", cursor: "pointer",
                                    boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)",
                                    transition: "transform 0.2s, box-shadow 0.2s",
                                    display: "flex", flexDirection: "column", gap: "1rem",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 25px -5px rgba(0,0,0,0.1)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px -5px rgba(0,0,0,0.05)"; }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#0a0a0a", margin: 0, textAlign: "left" }}>{sub.subject_name}</h3>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", background: "#f3f4f6", color: "#525252", whiteSpace: "nowrap", marginLeft: "0.5rem" }}>Grade {sub.grade}</span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                    {sorted.length === 0 ? (
                                        <p style={{ fontSize: "0.8125rem", color: "#a3a3a3", fontStyle: "italic", margin: 0 }}>No schedule</p>
                                    ) : sorted.map((d, i) => {
                                        const col = DAY_COLORS[d.day] || { bg: "#f5f5f5", border: "#e5e5e5", text: "#737373" };
                                        return (
                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: col.bg, padding: "0.375rem 0.625rem", borderRadius: "6px", border: `1px solid ${col.border}` }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: col.text }}>{d.day}</span>
                                                <span style={{ fontSize: "0.6875rem", color: "#525252" }}>{fmt12h(d.start_time)} – {fmt12h(d.end_time)}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "0.5rem", color: "#14b8a6", fontSize: "0.8125rem", fontWeight: 600 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                    View Records
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
