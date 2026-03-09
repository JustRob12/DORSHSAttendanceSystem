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


export default function StudentSchedulesPage() {
    const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studentGrade, setStudentGrade] = useState<number | null>(null);
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) {
                    setIsLoading(false);
                    return;
                }
                const { studentId, id: accountId } = JSON.parse(userObj);

                // 1. Get student grade (for display)
                const { data: stdData, error: stdErr } = await supabase
                    .from("students")
                    .select("grade")
                    .eq("student_id", studentId)
                    .single();

                if (stdErr || !stdData) throw new Error("Could not find student grade level.");
                setStudentGrade(stdData.grade);

                // 2. Fetch enrolled subjects via join table
                const { data: enrData, error: enrErr } = await supabase
                    .from("student_on_subject")
                    .select(`
                        subject:subject_id (
                            subject_id, subject_name, grade, subject_description, 
                            subject_dates(day, start_time, end_time),
                            assigned_subject(teacher_id, teacher(firstname, lastname, middlename, profile_picture))
                        )
                    `)
                    .eq("student_account_id", accountId);

                if (enrErr) throw enrErr;

                if (enrData) {
                    const mappedSubjects = enrData.map(item => item.subject as unknown as Subject);
                    setEnrolledSubjects(mappedSubjects);
                }
            } catch (err: unknown) {
                console.error("Error fetching schedules:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedules();
    }, []);

    const groupedByDay: Record<string, { subject: Subject, time: SubjectDate }[]> = {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
    };

    enrolledSubjects.forEach(sub => {
        sub.subject_dates?.forEach(date => {
            if (groupedByDay[date.day]) {
                groupedByDay[date.day].push({ subject: sub, time: date });
            }
        });
    });

    Object.keys(groupedByDay).forEach(day => {
        groupedByDay[day].sort((a, b) => a.time.start_time.localeCompare(b.time.start_time));
    });

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>My Schedules</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.5rem" }}>
                    View your weekly class schedule based on your enrolled subjects {studentGrade ? `(Grade ${studentGrade})` : ""}.
                </p>
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3", background: "white", borderRadius: "16px", border: "1px dashed #e5e5e5" }}>
                    <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                    <p>Loading your schedule...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : enrolledSubjects.length === 0 ? (
                <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e5e5e5", padding: "4rem 2rem", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)", textAlign: "center" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#404040", marginBottom: "0.5rem" }}>No Subjects Enrolled</h3>
                    <p style={{ fontSize: "0.875rem", color: "#737373" }}>You haven't enrolled in any subjects yet. Visit the Add Subject page to enroll.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                    {Object.keys(groupedByDay).map(day => {
                        const dayData = groupedByDay[day];

                        if (dayData.length === 0) return null;

                        const isExpanded = expandedDay === day;

                        return (
                            <div
                                key={day}
                                style={{
                                    borderBottom: "1px solid #e2e8f0"
                                }}
                            >
                                <button
                                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                                    style={{
                                        width: "100%", padding: "1rem 0", background: "transparent", border: "none",
                                        color: "#0f172a", fontSize: "1rem", fontWeight: 500,
                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                                        textAlign: "left", outline: "none", transition: "all 0.2s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                                >
                                    <span>{day}</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "#64748b" }}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>

                                {isExpanded && (
                                    <div style={{ paddingBottom: "1rem" }}>
                                        <div style={{ overflowX: "auto", width: "100%", maxWidth: "100vw", WebkitOverflowScrolling: "touch" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "600px" }}>
                                                <thead>
                                                    <tr style={{ background: "#f8fafc" }}>
                                                        <th style={{ padding: "1rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Subject</th>
                                                        <th style={{ padding: "1rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Instructor</th>
                                                        <th style={{ padding: "1rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dayData.map((item, idx) => {
                                                        const teacherData = item.subject.assigned_subject && item.subject.assigned_subject.length > 0
                                                            ? item.subject.assigned_subject[0].teacher
                                                            : null;

                                                        const teacherNameStr = teacherData
                                                            ? `${teacherData.firstname} ${teacherData.lastname}`
                                                            : "No instructor assigned";

                                                        const teacherImg = teacherData?.profile_picture;

                                                        return (
                                                            <tr key={idx} style={{ borderBottom: idx === dayData.length - 1 ? "none" : "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                                                                <td style={{ padding: "1.25rem 1.5rem" }}>
                                                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                                                        <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>{item.subject.subject_name}</span>
                                                                        <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Grade {item.subject.grade}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: "1.25rem 1.5rem" }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f1f5f9", flexShrink: 0, overflow: "hidden", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                            {teacherImg ? (
                                                                                <img src={teacherImg} alt={teacherNameStr} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                                            ) : (
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4-4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                                            )}
                                                                        </div>
                                                                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#334155" }}>{teacherNameStr}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: "1.25rem 1.5rem", whiteSpace: "nowrap" }}>
                                                                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.625rem", background: "#f1f5f9", borderRadius: "6px", color: "#475569" }}>
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                                        <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                                                                            {fmt12h(item.time.start_time)} – {fmt12h(item.time.end_time)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
