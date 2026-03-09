"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SubjectDate {
    day: string;
    start_time: string;
    end_time: string;
}

interface AssignedTeacher {
    teacher_id: number;
    teacher: { firstname: string; lastname: string; middlename: string | null; profile_picture: string | null };
}

interface Subject {
    subject_id: number;
    subject_name: string;
    grade: number;
    subject_description: string | null;
    subject_dates: SubjectDate[];
    assigned_subject?: AssignedTeacher[];
}

function fmt12h(time: string) {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

const DAY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    Monday: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    Tuesday: { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
    Wednesday: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    Thursday: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    Friday: { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" },
};

export default function StudentAddSubjectPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [studentAccountId, setStudentAccountId] = useState<number | null>(null);
    const [studentGrade, setStudentGrade] = useState<number | null>(null);
    const [enrollingMap, setEnrollingMap] = useState<Record<number, boolean>>({});
    const [message, setMessage] = useState<{ text: string, type: "success" | "error" } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) {
                    setIsLoading(false);
                    return;
                }
                const { studentId, id: accountId } = JSON.parse(userObj);
                setStudentAccountId(accountId);

                // 1. Get student grade
                const { data: stdData, error: stdErr } = await supabase
                    .from("students")
                    .select("grade")
                    .eq("student_id", studentId)
                    .single();

                if (stdErr || !stdData) throw new Error("Could not find student grade level.");
                setStudentGrade(stdData.grade);

                // 2. Get subjects for this grade
                const { data: subData, error: subErr } = await supabase
                    .from("subject")
                    .select("subject_id, subject_name, grade, subject_description, subject_dates(day, start_time, end_time), assigned_subject(teacher_id, teacher(firstname, lastname, middlename, profile_picture))")
                    .eq("grade", stdData.grade)
                    .order("subject_name");

                if (subErr) throw subErr;
                setSubjects((subData as unknown as Subject[]) || []);

                // 3. Get currently enrolled subjects
                const { data: enrData, error: enrErr } = await supabase
                    .from("student_on_subject")
                    .select("subject_id")
                    .eq("student_account_id", accountId);

                if (!enrErr && enrData) {
                    setEnrolledIds(new Set(enrData.map(e => e.subject_id)));
                }

            } catch (err: unknown) {
                console.error("Error fetching catalog:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCatalog();
    }, []);

    const handleEnroll = async (subjectId: number) => {
        if (!studentAccountId || enrollingMap[subjectId]) return;

        setEnrollingMap(prev => ({ ...prev, [subjectId]: true }));
        setMessage(null);

        try {
            const { error } = await supabase
                .from("student_on_subject")
                .insert({
                    student_account_id: studentAccountId,
                    subject_id: subjectId
                });

            if (error) throw error;

            setEnrolledIds(prev => {
                const ns = new Set(prev);
                ns.add(subjectId);
                return ns;
            });
            setMessage({ text: "Successfully enrolled in subject!", type: "success" });

            setTimeout(() => setMessage(null), 3000);
        } catch (err: unknown) {
            setMessage({ text: "Failed to enroll in subject.", type: "error" });
            console.error(err);
        } finally {
            setEnrollingMap(prev => ({ ...prev, [subjectId]: false }));
        }
    };

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>Enroll in Subjects</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.5rem" }}>
                    Browse and add subjects available for your grade level {studentGrade ? `(Grade ${studentGrade})` : ""}.
                </p>
                {message && (
                    <div style={{
                        marginTop: "1rem", padding: "1rem", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500,
                        background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
                        color: message.type === "success" ? "#16a34a" : "#dc2626",
                        border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`
                    }}>
                        {message.text}
                    </div>
                )}
            </div>

            <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center" }}>
                <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
                    <svg style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#a3a3a3" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search subjects by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "0.875rem 1rem 0.875rem 2.875rem", borderRadius: "12px", border: "1px solid #e5e5e5", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3", background: "white", borderRadius: "16px", border: "1px dashed #e5e5e5" }}>
                    <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                    <p>Loading available subjects...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : subjects.length === 0 ? (
                <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e5e5e5", padding: "4rem 2rem", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)", textAlign: "center" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#404040", marginBottom: "0.5rem" }}>No Subjects Available</h3>
                    <p style={{ fontSize: "0.875rem", color: "#737373" }}>Your administrator hasn't added any subjects for Grade {studentGrade} yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects
                        .filter(s => s.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) && !enrolledIds.has(s.subject_id))
                        .map(sub => {
                            const isProcessing = enrollingMap[sub.subject_id];

                            // Sort days 
                            const sortedDates = [...(sub.subject_dates || [])].sort((a, b) => {
                                const o = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                                return o.indexOf(a.day) - o.indexOf(b.day);
                            });

                            return (
                                <div key={sub.subject_id} style={{
                                    background: "white", borderRadius: "16px", overflow: "hidden",
                                    border: `1px solid #e5e5e5`,
                                    boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)",
                                    display: "flex", flexDirection: "column",
                                    transition: "transform 0.2s, box-shadow 0.2s",
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 25px -5px rgba(0,0,0,0.1)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px -5px rgba(0,0,0,0.05)"; }}
                                >
                                    <div style={{ padding: "1.5rem", borderBottom: "1px solid #f5f5f5", position: "relative", overflow: "hidden" }}>
                                        {/* background decoration */}
                                        <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "#f0fdf4", borderRadius: "50%", opacity: 0.5, zIndex: 0 }}></div>

                                        <div style={{ position: "relative", zIndex: 1 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                                                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0a0a0a" }}>{sub.subject_name}</h3>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", background: "#f3f4f6", color: "#525252" }}>
                                                    Grade {sub.grade}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: "0.875rem", color: "#737373", lineHeight: 1.5, minHeight: "2.5rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                                {sub.subject_description || "No description provided."}
                                            </p>

                                            {/* Teacher Info */}
                                            <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", background: "#f0fdf4", color: "#16a34a" }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                </div>
                                                <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#525252" }}>
                                                    {sub.assigned_subject && sub.assigned_subject.length > 0
                                                        ? `${sub.assigned_subject[0].teacher.firstname} ${sub.assigned_subject[0].teacher.lastname}`
                                                        : "No teacher assigned"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ padding: "1.25rem 1.5rem", background: "#fafafa", flexGrow: 1 }}>
                                        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Schedule</p>
                                        {sortedDates.length === 0 ? (
                                            <p style={{ fontSize: "0.8125rem", color: "#a3a3a3", fontStyle: "italic" }}>No schedule assigned</p>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                {sortedDates.map((d, i) => {
                                                    const col = DAY_COLORS[d.day] || { bg: "#f5f5f5", border: "#e5e5e5", text: "#737373" };
                                                    return (
                                                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "0.5rem 0.75rem", borderRadius: "8px", border: `1px solid ${col.border}` }}>
                                                            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: col.text }}>{d.day}</span>
                                                            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#525252" }}>{fmt12h(d.start_time)} – {fmt12h(d.end_time)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: "1.25rem 1.5rem", background: "white", borderTop: "1px solid #f5f5f5" }}>
                                        <button
                                            onClick={() => handleEnroll(sub.subject_id)}
                                            disabled={isProcessing}
                                            style={{
                                                width: "100%", padding: "0.75rem", borderRadius: "10px", fontSize: "0.9375rem", fontWeight: 600,
                                                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "all 0.2s",
                                                background: isProcessing ? "#cbd5e1" : "#16a34a",
                                                color: isProcessing ? "#64748b" : "white",
                                                border: "none",
                                                cursor: isProcessing ? "default" : "pointer",
                                                boxShadow: isProcessing ? "none" : "0 4px 12px rgba(22, 163, 74, 0.2)"
                                            }}
                                            onMouseEnter={e => { if (!isProcessing) e.currentTarget.style.background = "#15803d" }}
                                            onMouseLeave={e => { if (!isProcessing) e.currentTarget.style.background = "#16a34a" }}
                                        >
                                            {isProcessing ? "Processing..." : "Enroll Now"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
