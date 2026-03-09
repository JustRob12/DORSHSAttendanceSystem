"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

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

export default function DaySchedulePage() {
    const params = useParams();
    const rawDayParam = (params.day as string) || "";
    // Capitalize mapped day (monday -> Monday)
    const activeDayString = rawDayParam.charAt(0).toUpperCase() + rawDayParam.slice(1);

    const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) {
                    setIsLoading(false);
                    return;
                }
                const { id: accountId } = JSON.parse(userObj);

                // Fetch enrolled subjects mapping assigned_subject and dates securely via join
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

    // Extract & Chronological Sort Data Block matching explicitly this parameter Date Day Matrix
    const mappedDayEvents: { subject: Subject; time: SubjectDate }[] = [];

    enrolledSubjects.forEach(sub => {
        sub.subject_dates?.forEach(date => {
            if (date.day === activeDayString) {
                mappedDayEvents.push({ subject: sub, time: date });
            }
        });
    });

    mappedDayEvents.sort((a, b) => a.time.start_time.localeCompare(b.time.start_time));

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>

            <div style={{ marginBottom: "2rem" }}>
                <Link href="/student/my-schedules" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", marginBottom: "1rem", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#0f172a"} onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Back to Overview
                </Link>

                <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                    {activeDayString} Schedule
                </h1>
                <p style={{ fontSize: "0.9375rem", color: "#64748b", marginTop: "0.25rem" }}>
                    Detailed list of the classes you are attending this {activeDayString}.
                </p>
            </div>

            {isLoading ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3", background: "white", borderRadius: "16px", border: "1px dashed #e5e5e5" }}>
                    <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                    <p>Loading schedule...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : mappedDayEvents.length === 0 ? (
                <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "4rem 2rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>No Schedule</h3>
                    <p style={{ fontSize: "0.875rem", color: "#64748b" }}>You don't have any classes scheduled on a {activeDayString}.</p>
                </div>
            ) : (
                <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    <th style={{ padding: "1rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Subject</th>
                                    <th style={{ padding: "1rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Instructor</th>
                                    <th style={{ padding: "1rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappedDayEvents.map((item, idx) => {
                                    const teacherData = item.subject.assigned_subject && item.subject.assigned_subject.length > 0
                                        ? item.subject.assigned_subject[0].teacher
                                        : null;

                                    const teacherNameStr = teacherData
                                        ? `${teacherData.firstname} ${teacherData.lastname}`
                                        : "No instructor assigned";

                                    const teacherImg = teacherData?.profile_picture;

                                    return (
                                        <tr key={idx} style={{ borderBottom: idx === mappedDayEvents.length - 1 ? "none" : "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
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
}
