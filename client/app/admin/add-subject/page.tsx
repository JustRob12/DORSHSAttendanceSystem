"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
type Day = typeof DAYS[number];
const GRADES = [7, 8, 9, 10, 11, 12];

interface DaySchedule { day: Day; startTime: string; endTime: string; }
interface RecentSubject {
    subject_id: number; subject_name: string; grade: number;
    created_at: string;
    subject_dates: { day: string; start_time: string; end_time: string }[];
}

function fmt12h(time: string) {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

const DAY_COLORS: Record<Day, { bg: string; border: string; text: string }> = {
    Monday: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    Tuesday: { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
    Wednesday: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
    Thursday: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    Friday: { bg: "#fdf2f8", border: "#fbcfe8", text: "#be185d" },
};

function PlusIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}
function TrashIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5625rem 0.75rem", borderRadius: "8px",
    border: "1px solid #e5e5e5", fontSize: "0.875rem", color: "#0a0a0a",
    outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif", background: "white",
};
const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem",
};

export default function AddSubjectPage() {
    const [subjectName, setSubjectName] = useState("");
    const [description, setDescription] = useState("");
    const [grade, setGrade] = useState("7");
    const [schedules, setSchedules] = useState<DaySchedule[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [recentSubjects, setRecentSubjects] = useState<RecentSubject[]>([]);

    const selectedDays = new Set(schedules.map(s => s.day));

    const loadRecent = useCallback(async () => {
        const { data } = await supabase
            .from("subject")
            .select("subject_id, subject_name, grade, created_at, subject_dates(day, start_time, end_time)")
            .order("created_at", { ascending: false })
            .limit(8);
        setRecentSubjects((data as RecentSubject[]) ?? []);
    }, []);

    useEffect(() => { loadRecent(); }, [loadRecent]);

    const addScheduleRow = (day: Day) => {
        if (selectedDays.has(day)) return;
        setSchedules(prev => [...prev, { day, startTime: "08:00", endTime: "09:00" }]);
    };
    const removeScheduleRow = (i: number) => setSchedules(prev => prev.filter((_, idx) => idx !== i));
    const updateSchedule = (i: number, field: "startTime" | "endTime", value: string) =>
        setSchedules(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

    const handleSubmit = async () => {
        setErrorMsg(""); setSuccessMsg("");
        if (!subjectName.trim()) { setErrorMsg("Subject name is required."); return; }
        if (schedules.length === 0) { setErrorMsg("Add at least one day schedule."); return; }
        for (const s of schedules) {
            if (s.startTime >= s.endTime) { setErrorMsg(`End time must be after start time for ${s.day}.`); return; }
        }
        setIsSubmitting(true);
        try {
            const { data: subjectData, error: subjectError } = await supabase
                .from("subject")
                .insert({ subject_name: subjectName.trim(), subject_description: description.trim() || null, grade: parseInt(grade) })
                .select("subject_id").single();
            if (subjectError) throw new Error(subjectError.message);
            const { error: datesError } = await supabase.from("subject_dates").insert(
                schedules.map(s => ({ subject_id: subjectData.subject_id, day: s.day, start_time: s.startTime, end_time: s.endTime }))
            );
            if (datesError) throw new Error(datesError.message);
            setSuccessMsg(`✓ "${subjectName.trim()}" added for Grade ${grade}!`);
            setSubjectName(""); setDescription(""); setGrade("7"); setSchedules([]);
            loadRecent();
        } catch (err: unknown) {
            setErrorMsg((err as Error).message);
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="p-4 md:p-8" style={{ fontFamily: "Inter, sans-serif" }}>
            {/* Header */}
            <div style={{ marginBottom: "1.75rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>Add Subject</h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>Create a new subject with its weekly schedule.</p>
            </div>

            {errorMsg && (
                <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", fontSize: "0.875rem", color: "#dc2626" }}>{errorMsg}</div>
            )}
            {successMsg && (
                <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", fontSize: "0.875rem", color: "#16a34a" }}>{successMsg}</div>
            )}

            {/* ── SIDE BY SIDE: Details LEFT | Schedule RIGHT ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 mb-5 items-start">

                {/* LEFT: Subject Details */}
                <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0a0a0a" }}>Subject Details</h2>

                    <div>
                        <label style={labelStyle}>Subject Name <span style={{ color: "#ef4444" }}>*</span></label>
                        <input value={subjectName} onChange={e => setSubjectName(e.target.value)}
                            placeholder="e.g. Mathematics, Science…"
                            style={inputStyle} />
                    </div>

                    <div>
                        <label style={labelStyle}>Grade <span style={{ color: "#ef4444" }}>*</span></label>
                        <select value={grade} onChange={e => setGrade(e.target.value)}
                            style={{ ...inputStyle, cursor: "pointer" }}>
                            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="Optional description…" rows={3}
                            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
                    </div>

                    <button onClick={handleSubmit} disabled={isSubmitting}
                        style={{
                            width: "100%", padding: "0.625rem", borderRadius: "8px", background: "#16a34a",
                            color: "white", border: "none", fontSize: "0.9375rem", fontWeight: 600,
                            cursor: isSubmitting ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif",
                            opacity: isSubmitting ? 0.7 : 1, marginTop: "0.25rem",
                        }}>
                        {isSubmitting ? "Saving…" : "Save Subject"}
                    </button>
                </div>

                {/* RIGHT: Weekly Schedule */}
                <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "14px", padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.125rem" }}>
                        <div>
                            <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0a0a0a" }}>Weekly Schedule</h2>
                            <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "2px" }}>Add the days and times this subject meets.</p>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#a3a3a3", background: "#f5f5f5", padding: "3px 10px", borderRadius: "20px" }}>
                            {schedules.length} day{schedules.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Day buttons */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                        {DAYS.map(day => {
                            const taken = selectedDays.has(day);
                            const col = DAY_COLORS[day];
                            return (
                                <button key={day} onClick={() => addScheduleRow(day)} disabled={taken}
                                    style={{
                                        padding: "0.3125rem 0.75rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 500,
                                        border: `1px solid ${taken ? "#e5e5e5" : col.border}`,
                                        background: taken ? "#f5f5f5" : col.bg,
                                        color: taken ? "#a3a3a3" : col.text,
                                        cursor: taken ? "default" : "pointer", fontFamily: "Inter, sans-serif",
                                        display: "inline-flex", alignItems: "center", gap: "0.25rem", transition: "all 0.1s",
                                    }}>
                                    {!taken && <PlusIcon />} {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Schedule rows */}
                    {schedules.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", background: "#fafafa", borderRadius: "10px", border: "1px dashed #e5e5e5" }}>
                            <p style={{ fontSize: "0.875rem", color: "#a3a3a3" }}>Click a day above to add its time slot</p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {schedules.map((s, i) => {
                                const col = DAY_COLORS[s.day];
                                return (
                                    <div key={s.day}
                                        className="flex flex-col sm:grid sm:grid-cols-[90px_1fr_1fr_32px] gap-3 sm:gap-2.5 items-start sm:items-center"
                                        style={{
                                            background: col.bg, border: `1px solid ${col.border}`,
                                            borderRadius: "10px", padding: "0.75rem 0.875rem",
                                        }}>
                                        <div className="flex w-full sm:w-auto justify-between items-center sm:block">
                                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: col.text }}>{s.day}</span>

                                            <button onClick={() => removeScheduleRow(i)} title="Remove"
                                                className="sm:hidden block hover:opacity-100 transition-opacity"
                                                style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.55, padding: "4px" }}>
                                                <TrashIcon />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 w-full gap-2 sm:gap-3 sm:contents">
                                            <div className="flex flex-col min-w-0">
                                                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: col.text, marginBottom: "0.2rem" }}>Start</label>
                                                <input type="time" value={s.startTime} onChange={e => updateSchedule(i, "startTime", e.target.value)}
                                                    style={{ ...inputStyle, fontSize: "0.75rem", padding: "0.375rem 0.5rem", minWidth: 0, width: "100%" }} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: col.text, marginBottom: "0.2rem" }}>End</label>
                                                <input type="time" value={s.endTime} onChange={e => updateSchedule(i, "endTime", e.target.value)}
                                                    style={{ ...inputStyle, fontSize: "0.75rem", padding: "0.375rem 0.5rem", minWidth: 0, width: "100%" }} />
                                            </div>
                                        </div>

                                        <button onClick={() => removeScheduleRow(i)} title="Remove"
                                            className="hidden sm:flex hover:opacity-100 transition-opacity"
                                            style={{ background: "none", border: "none", cursor: "pointer", color: col.text, opacity: 0.55, padding: "4px" }}>
                                            <TrashIcon />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── HISTORY (bottom, not clickable) ── */}
            <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0a0a0a" }}>Recently Added</h2>
                    <span style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>Latest 8 subjects</span>
                </div>
                {recentSubjects.length === 0 ? (
                    <div style={{ padding: "2.5rem", textAlign: "center", color: "#a3a3a3", fontSize: "0.875rem" }}>No subjects added yet</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                            <thead>
                                <tr>
                                    {["Subject", "Grade", "Days & Times", "Added"].map(h => (
                                        <th key={h} style={{ padding: "0.5rem 1.25rem", fontSize: "0.6875rem", fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "left", background: "#f9fafb", borderBottom: "1px solid #e5e5e5", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {recentSubjects.map((s, i) => {
                                    const sorted = [...s.subject_dates].sort((a, b) => {
                                        const o = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                                        return o.indexOf(a.day) - o.indexOf(b.day);
                                    });
                                    return (
                                        <tr key={s.subject_id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                            <td style={{ padding: "0.625rem 1.25rem", fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a", borderBottom: "1px solid #f5f5f5" }}>{s.subject_name}</td>
                                            <td style={{ padding: "0.625rem 1.25rem", borderBottom: "1px solid #f5f5f5" }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: "#dcfce7", color: "#15803d" }}>Grade {s.grade}</span>
                                            </td>
                                            <td style={{ padding: "0.625rem 1.25rem", borderBottom: "1px solid #f5f5f5" }}>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                                    {sorted.map(d => {
                                                        const col = DAY_COLORS[d.day as Day] ?? { bg: "#f5f5f5", border: "#e5e5e5", text: "#737373" };
                                                        return (
                                                            <span key={d.day} style={{ fontSize: "0.7rem", fontWeight: 500, padding: "2px 7px", borderRadius: "20px", background: col.bg, color: col.text, whiteSpace: "nowrap" }}>
                                                                {d.day.slice(0, 3)} {fmt12h(d.start_time)}–{fmt12h(d.end_time)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td style={{ padding: "0.625rem 1.25rem", fontSize: "0.8125rem", color: "#737373", borderBottom: "1px solid #f5f5f5", whiteSpace: "nowrap" }}>
                                                {new Date(s.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
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
