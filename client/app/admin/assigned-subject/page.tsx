"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
type Day = typeof DAYS[number];
const GRADES = [7, 8, 9, 10, 11, 12];

interface SubjectDate {
    day: string;
    start_time: string;
    end_time: string;
}
interface Subject {
    subject_id: number;
    subject_name: string;
    subject_description: string | null;
    grade: number;
    subject_dates: SubjectDate[];
    assigned_subject?: { teacher_id: number; teacher: { firstname: string; lastname: string; middlename: string | null; profile_picture: string | null } }[];
}
interface Teacher {
    teacher_id: number;
    firstname: string;
    lastname: string;
    middlename: string | null;
    profile_picture: string | null;
}
interface AssignedTeacher {
    teacher_id: number;
    teacher: { firstname: string; lastname: string; middlename: string | null; profile_picture: string | null };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt12h(time: string): string {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

const DAY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    Monday: { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    Tuesday: { bg: "#f3e8ff", text: "#7e22ce", border: "#e9d5ff" },
    Wednesday: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    Thursday: { bg: "#ffedd5", text: "#c2410c", border: "#fed7aa" },
    Friday: { bg: "#fce7f3", text: "#be185d", border: "#fbcfe8" },
};

const GRADE_COLORS: Record<number, { bg: string; text: string }> = {
    7: { bg: "#dbeafe", text: "#1d4ed8" },
    8: { bg: "#f3e8ff", text: "#7e22ce" },
    9: { bg: "#dcfce7", text: "#15803d" },
    10: { bg: "#ffedd5", text: "#c2410c" },
    11: { bg: "#fce7f3", text: "#be185d" },
    12: { bg: "#fee2e2", text: "#b91c1c" },
};

// ── Icon components ────────────────────────────────────────────────────────────
const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
);
const UserPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" />
    </svg>
);
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);
const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
);
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const UserAvatarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
);

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px",
    border: "1px solid #e5e5e5", fontSize: "0.875rem", color: "#0a0a0a",
    outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif",
};

export default function AssignedSubjectPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterGrade, setFilterGrade] = useState("");
    const [search, setSearch] = useState("");

    // ── Assign modal state
    const [modal, setModal] = useState<{
        open: boolean;
        subject: Subject | null;
        teachers: Teacher[];
        assigned: AssignedTeacher[];
        teacherSearch: string;
        assigning: number | null;
        unassigning: number | null;
        loadingTeachers: boolean;
    }>({
        open: false, subject: null, teachers: [], assigned: [],
        teacherSearch: "", assigning: null, unassigning: null, loadingTeachers: false,
    });

    // ── Delete modal state
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; subject: Subject | null }>({ open: false, subject: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Edit modal state
    const [editModal, setEditModal] = useState<{ open: boolean; subject: Subject | null }>({ open: false, subject: null });
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editGrade, setEditGrade] = useState("7");
    const [editSchedules, setEditSchedules] = useState<{ day: Day; startTime: string; endTime: string }[]>([]);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editError, setEditError] = useState("");

    // ── Load subjects
    const loadSubjects = useCallback(async () => {
        setIsLoading(true);
        let q = supabase
            .from("subject")
            .select("subject_id, subject_name, subject_description, grade, subject_dates(day, start_time, end_time), assigned_subject(teacher_id, teacher(firstname, lastname, middlename, profile_picture))")
            .order("grade")
            .order("subject_name");
        if (filterGrade) q = q.eq("grade", parseInt(filterGrade));
        const { data } = await q;
        setSubjects((data as unknown as Subject[]) ?? []);
        setIsLoading(false);
    }, [filterGrade]);

    useEffect(() => { loadSubjects(); }, [loadSubjects]);

    // ── Delete actions
    const handleDelete = async () => {
        if (!deleteModal.subject) return;
        setIsDeleting(true);
        // Cascades to subject_dates and assigned_subject
        await supabase.from("subject").delete().eq("subject_id", deleteModal.subject.subject_id);
        setDeleteModal({ open: false, subject: null });
        setIsDeleting(false);
        loadSubjects();
    };

    // ── Edit opening
    const openEditModal = (subject: Subject) => {
        setEditName(subject.subject_name);
        setEditDesc(subject.subject_description || "");
        setEditGrade(subject.grade.toString());
        setEditSchedules(subject.subject_dates.map(d => ({
            day: d.day as Day,
            startTime: d.start_time.slice(0, 5), // 'HH:MM:SS' -> 'HH:MM'
            endTime: d.end_time.slice(0, 5)
        })));
        setEditError("");
        setEditModal({ open: true, subject });
    };

    // ── Edit Schedule modifications
    const selectedDays = new Set(editSchedules.map(s => s.day));
    const addEditScheduleRow = (day: Day) => {
        if (selectedDays.has(day)) return;
        setEditSchedules(prev => [...prev, { day, startTime: "08:00", endTime: "09:00" }]);
    };
    const removeEditScheduleRow = (i: number) => setEditSchedules(prev => prev.filter((_, idx) => idx !== i));
    const updateEditSchedule = (i: number, field: "startTime" | "endTime", value: string) =>
        setEditSchedules(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

    // ── Edit save
    const handleEditSave = async () => {
        const subjectId = editModal.subject?.subject_id;
        if (!subjectId) return;
        setEditError("");
        if (!editName.trim()) return setEditError("Subject name is required.");
        if (editSchedules.length === 0) return setEditError("Add at least one day schedule.");
        for (const s of editSchedules) {
            if (s.startTime >= s.endTime) return setEditError(`End time must be after start time for ${s.day}.`);
        }

        setIsSavingEdit(true);
        try {
            const { error: subjectError } = await supabase.from("subject").update({
                subject_name: editName.trim(),
                subject_description: editDesc.trim() || null,
                grade: parseInt(editGrade)
            }).eq("subject_id", subjectId);
            if (subjectError) throw subjectError;

            const { error: delError } = await supabase.from("subject_dates").delete().eq("subject_id", subjectId);
            if (delError) throw delError;

            const { error: insError } = await supabase.from("subject_dates").insert(
                editSchedules.map(s => ({
                    subject_id: subjectId,
                    day: s.day,
                    start_time: s.startTime,
                    end_time: s.endTime
                }))
            );
            if (insError) throw insError;

            setEditModal({ open: false, subject: null });
            loadSubjects();
        } catch (err: any) {
            setEditError(err.message || "An error occurred.");
        } finally {
            setIsSavingEdit(false);
        }
    };

    // ── Open assign modal (existing logic)
    const openModal = async (subject: Subject) => {
        setModal(m => ({ ...m, open: true, subject, teacherSearch: "", loadingTeachers: true, assigning: null, unassigning: null }));
        const [{ data: teachers }, { data: assigned }] = await Promise.all([
            supabase.from("teacher").select("teacher_id, firstname, lastname, middlename, profile_picture").order("lastname"),
            supabase.from("assigned_subject")
                .select("teacher_id, teacher(firstname, lastname, middlename, profile_picture)")
                .eq("subject_id", subject.subject_id),
        ]);
        setModal(m => ({
            ...m,
            teachers: (teachers as Teacher[]) ?? [],
            assigned: (assigned as unknown as AssignedTeacher[]) ?? [],
            loadingTeachers: false,
        }));
    };

    const assignTeacher = async (teacher: Teacher) => {
        if (!modal.subject) return;
        if (modal.assigned.some(a => a.teacher_id === teacher.teacher_id)) return;
        setModal(m => ({ ...m, assigning: teacher.teacher_id }));
        await supabase.from("assigned_subject").insert({
            subject_id: modal.subject.subject_id,
            teacher_id: teacher.teacher_id,
        });
        const { data } = await supabase.from("assigned_subject")
            .select("teacher_id, teacher(firstname, lastname, middlename, profile_picture)")
            .eq("subject_id", modal.subject.subject_id);
        setModal(m => ({ ...m, assigned: (data as unknown as AssignedTeacher[]) ?? [], assigning: null }));
        loadSubjects();
    };

    const unassignTeacher = async (teacherId: number) => {
        if (!modal.subject) return;
        setModal(m => ({ ...m, unassigning: teacherId }));
        await supabase.from("assigned_subject").delete()
            .eq("subject_id", modal.subject.subject_id)
            .eq("teacher_id", teacherId);
        setModal(m => ({ ...m, assigned: m.assigned.filter(a => a.teacher_id !== teacherId), unassigning: null }));
        loadSubjects();
    };

    const displayed = subjects.filter(s => {
        if (!search.trim()) return true;
        return s.subject_name.toLowerCase().includes(search.toLowerCase());
    });

    const filteredTeachers = modal.teachers.filter(t => {
        const q = modal.teacherSearch.toLowerCase();
        if (!q) return true;
        return `${t.firstname} ${t.lastname}`.toLowerCase().includes(q);
    });

    const selectStyle: React.CSSProperties = {
        padding: "0.4375rem 0.75rem", borderRadius: "8px",
        border: "1px solid #e5e5e5", fontSize: "0.8125rem",
        color: "#0a0a0a", background: "white", cursor: "pointer",
        fontFamily: "Inter, sans-serif", outline: "none",
    };

    return (
        <div className="p-4 md:p-8" style={{ fontFamily: "Inter, sans-serif" }}>
            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>Assigned Subject</h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>Click a subject to assign or change its teacher.</p>
            </div>

            {/* Filter bar */}
            <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <div style={{ position: "relative", flex: "1 1 180px", maxWidth: "260px" }}>
                    <span style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "#a3a3a3" }}>
                        <SearchIcon />
                    </span>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search subject…"
                        style={{ ...selectStyle, paddingLeft: "2rem", width: "100%", boxSizing: "border-box", cursor: "text" }} />
                </div>
                <select style={selectStyle} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
                    <option value="">All Grades</option>
                    {[7, 8, 9, 10, 11, 12].map(g => <option key={g} value={g}>Grade {g}</option>)}
                </select>
                <button onClick={() => { setFilterGrade(""); setSearch(""); }}
                    style={{ ...selectStyle, background: "#f5f5f5", color: "#737373" }}>
                    Clear
                </button>
                <span style={{ marginLeft: "auto", fontSize: "0.8125rem", color: "#737373" }}>
                    {isLoading ? "Loading…" : `${displayed.length} subject${displayed.length !== 1 ? "s" : ""}`}
                </span>
            </div>

            {/* Subject cards grid */}
            {isLoading ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#a3a3a3" }}>Loading subjects…</div>
            ) : displayed.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#a3a3a3" }}>No subjects found</div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                    {displayed.map(subject => {
                        const gc = GRADE_COLORS[subject.grade] ?? { bg: "#f5f5f5", text: "#737373" };
                        const sorted = [...subject.subject_dates].sort((a, b) => {
                            const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                            return order.indexOf(a.day) - order.indexOf(b.day);
                        });
                        const isAssigned = subject.assigned_subject && subject.assigned_subject.length > 0;
                        const cardBg = isAssigned ? "#f0fdf4" : "white";
                        const cardBorder = isAssigned ? "#bbf7d0" : "#e5e5e5";
                        const hoverBorder = isAssigned ? "#22c55e" : "#16a34a";

                        return (
                            <div key={subject.subject_id}
                                onClick={() => openModal(subject)}
                                style={{
                                    background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: "14px",
                                    padding: "1.25rem", cursor: "pointer", transition: "all 0.15s",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "relative"
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
                                    e.currentTarget.style.borderColor = hoverBorder;
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    // Show action buttons
                                    const actions = e.currentTarget.querySelector('.subject-actions') as HTMLElement;
                                    if (actions) actions.style.opacity = "1";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                                    e.currentTarget.style.borderColor = cardBorder;
                                    e.currentTarget.style.transform = "translateY(0)";
                                    const actions = e.currentTarget.querySelector('.subject-actions') as HTMLElement;
                                    if (actions) actions.style.opacity = "0";
                                }}
                            >
                                {/* Action Buttons Header (Right top) */}
                                <div className="subject-actions" style={{ position: "absolute", top: "0.75rem", right: "0.75rem", display: "flex", gap: "0.25rem", opacity: 0, transition: "opacity 0.15s" }}
                                    onClick={e => e.stopPropagation()} // Prevent opening assign modal
                                >
                                    <button onClick={() => openEditModal(subject)}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", background: "white", border: "1px solid #e5e5e5", color: "#525252", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                                        title="Edit Subject">
                                        <PencilIcon />
                                    </button>
                                    <button onClick={() => setDeleteModal({ open: true, subject })}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                                        title="Delete Subject">
                                        <TrashIcon />
                                    </button>
                                </div>

                                {/* Card header */}
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem", paddingRight: "3rem" }}>
                                    <div>
                                        <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0a0a0a", marginBottom: "2px" }}>{subject.subject_name}</h3>
                                        {subject.subject_description && (
                                            <p style={{ fontSize: "0.75rem", color: "#737373", lineHeight: 1.4 }}>{subject.subject_description}</p>
                                        )}
                                    </div>
                                    <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", background: gc.bg, color: gc.text, flexShrink: 0, marginLeft: "0.5rem" }}>
                                        Grade {subject.grade}
                                    </span>
                                </div>

                                {/* Schedule chips */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                    {sorted.map(d => {
                                        const dc = DAY_COLORS[d.day] ?? { bg: "#f5f5f5", text: "#737373", border: "#e5e5e5" };
                                        return (
                                            <div key={d.day} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <span style={{ fontSize: "0.6875rem", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: dc.bg, color: dc.text, border: `1px solid ${dc.border}`, minWidth: "70px", textAlign: "center" }}>{d.day}</span>
                                                <span style={{ fontSize: "0.8125rem", color: "#525252" }}>{fmt12h(d.start_time)} – {fmt12h(d.end_time)}</span>
                                            </div>
                                        );
                                    })}
                                    {sorted.length === 0 && <span style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>No schedule set</span>}
                                </div>

                                {/* Assigned teachers OR Assign hint */}
                                <div style={{ marginTop: "0.875rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                    {isAssigned ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned To:</span>
                                            {subject.assigned_subject!.map(a => (
                                                <div key={a.teacher_id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a" }}>
                                                    {a.teacher.profile_picture ? (
                                                        <img src={a.teacher.profile_picture} alt={a.teacher.lastname} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #e5e5e5" }} />
                                                    ) : (
                                                        <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                            <UserAvatarIcon />
                                                        </div>
                                                    )}
                                                    <span>{a.teacher.lastname}, {a.teacher.firstname}{a.teacher.middlename ? ` ${a.teacher.middlename[0]}.` : ""}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#16a34a", fontSize: "0.75rem", fontWeight: 500 }}>
                                            <UserPlusIcon /> Click to assign teacher
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── ASSIGN MODAL ── */}
            {modal.open && modal.subject && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "88vh", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
                            <div>
                                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0a0a0a" }}>{modal.subject.subject_name}</h2>
                                <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "2px" }}>Grade {modal.subject.grade} · Assign a teacher to this subject</p>
                            </div>
                            <button onClick={() => setModal(m => ({ ...m, open: false }))}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#a3a3a3", padding: "4px", display: "flex", flexShrink: 0 }}>
                                <XIcon />
                            </button>
                        </div>

                        {modal.assigned.length > 0 && (
                            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
                                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Currently Assigned</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                    {modal.assigned.map(a => (
                                        <div key={a.teacher_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                                {a.teacher.profile_picture ? (
                                                    <img src={a.teacher.profile_picture} alt={a.teacher.lastname} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #bbf7d0" }} />
                                                ) : (
                                                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#fff", border: "1px solid #bbf7d0", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        <UserAvatarIcon />
                                                    </div>
                                                )}
                                                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a" }}>
                                                    {a.teacher.lastname}, {a.teacher.firstname}{a.teacher.middlename ? ` ${a.teacher.middlename[0]}.` : ""}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => unassignTeacher(a.teacher_id)}
                                                disabled={modal.unassigning === a.teacher_id}
                                                title="Remove assignment"
                                                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "0.25rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: modal.unassigning === a.teacher_id ? 0.6 : 1 }}>
                                                <TrashIcon /> {modal.unassigning === a.teacher_id ? "Removing…" : "Remove"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ padding: "1rem 1.5rem", flexShrink: 0 }}>
                            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Search Teacher</p>
                            <div style={{ position: "relative" }}>
                                <span style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "#a3a3a3" }}>
                                    <SearchIcon />
                                </span>
                                <input
                                    type="text" autoFocus value={modal.teacherSearch}
                                    onChange={e => setModal(m => ({ ...m, teacherSearch: e.target.value }))}
                                    placeholder="Type a name to search…"
                                    style={{ width: "100%", padding: "0.5rem 0.75rem 0.5rem 2rem", borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}
                                />
                            </div>
                        </div>

                        <div style={{ overflowY: "auto", padding: "0 1.5rem 1.25rem" }}>
                            {modal.loadingTeachers ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "#a3a3a3" }}>Loading teachers…</div>
                            ) : filteredTeachers.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "#a3a3a3" }}>No teachers found</div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                    {filteredTeachers.map(t => {
                                        const alreadyAssigned = modal.assigned.some(a => a.teacher_id === t.teacher_id);
                                        const isAssigning = modal.assigning === t.teacher_id;
                                        return (
                                            <div key={t.teacher_id} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                padding: "0.625rem 0.875rem", borderRadius: "10px",
                                                background: alreadyAssigned ? "#f0fdf4" : "#fafafa",
                                                border: `1px solid ${alreadyAssigned ? "#bbf7d0" : "#f0f0f0"}`,
                                                transition: "background 0.1s",
                                            }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                                    {t.profile_picture ? (
                                                        <img src={t.profile_picture} alt={t.lastname} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #e5e5e5" }} />
                                                    ) : (
                                                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#fff", border: "1px solid #e5e5e5", color: "#a3a3a3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                            <UserAvatarIcon />
                                                        </div>
                                                    )}
                                                    <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a" }}>
                                                        {t.lastname}, {t.firstname}{t.middlename ? ` ${t.middlename[0]}.` : ""}
                                                    </p>
                                                </div>
                                                {alreadyAssigned ? (
                                                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#16a34a", background: "#dcfce7", padding: "2px 10px", borderRadius: "20px" }}>Assigned</span>
                                                ) : (
                                                    <button
                                                        onClick={() => assignTeacher(t)}
                                                        disabled={!!modal.assigning}
                                                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", background: "#16a34a", color: "white", border: "none", padding: "0.3125rem 0.75rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 500, cursor: modal.assigning ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", opacity: isAssigning ? 0.6 : 1 }}>
                                                        <UserPlusIcon /> {isAssigning ? "Assigning…" : "Assign"}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE MODAL ── */}
            {deleteModal.open && deleteModal.subject && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden" }}>
                        <div style={{ padding: "1.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "50%", background: "#fef2f2", color: "#dc2626" }}><TrashIcon /></div>
                                <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0a0a0a" }}>Delete Subject</h2>
                            </div>
                            <p style={{ fontSize: "0.875rem", color: "#525252", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                                Are you sure you want to delete <strong>{deleteModal.subject.subject_name}</strong>?
                            </p>
                            <p style={{ fontSize: "0.8125rem", color: "#dc2626", background: "#fef2f2", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #fecaca" }}>
                                This action cannot be undone. All assigned teachers and schedules will be permanently removed.
                            </p>
                        </div>
                        <div style={{ padding: "1rem 1.5rem", background: "#f9fafb", borderTop: "1px solid #e5e5e5", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button onClick={() => setDeleteModal({ open: false, subject: null })}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #d4d4d4", background: "white", color: "#525252", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={isDeleting}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#dc2626", color: "white", fontSize: "0.875rem", fontWeight: 500, cursor: isDeleting ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", opacity: isDeleting ? 0.7 : 1 }}>
                                {isDeleting ? "Deleting…" : "Delete Subject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {editModal.open && editModal.subject && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "720px", maxHeight: "90vh", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0a0a0a", display: "flex", alignItems: "center", gap: "0.5rem" }}><PencilIcon /> Edit Subject</h2>
                            <button onClick={() => setEditModal({ open: false, subject: null })}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#a3a3a3", display: "flex" }}>
                                <XIcon />
                            </button>
                        </div>

                        {editError && (
                            <div style={{ margin: "1rem 1.5rem 0", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "0.875rem", color: "#dc2626" }}>
                                {editError}
                            </div>
                        )}

                        <div className="overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Left: Details */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Subject Name *</label>
                                    <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Grade *</label>
                                    <select value={editGrade} onChange={e => setEditGrade(e.target.value)} style={inputStyle}>
                                        {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Description</label>
                                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                                </div>
                            </div>

                            {/* Right: Schedule */}
                            <div>
                                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Weekly Schedule</label>
                                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                                    {DAYS.map(day => {
                                        const taken = selectedDays.has(day);
                                        const col = DAY_COLORS[day];
                                        return (
                                            <button key={day} onClick={() => addEditScheduleRow(day)} disabled={taken}
                                                style={{
                                                    padding: "0.25rem 0.625rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 500,
                                                    border: `1px solid ${taken ? "#e5e5e5" : col.border}`,
                                                    background: taken ? "#f5f5f5" : col.bg,
                                                    color: taken ? "#a3a3a3" : col.text,
                                                    cursor: taken ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem"
                                                }}>
                                                {!taken && <PlusIcon />} {day.slice(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                                {editSchedules.length === 0 ? (
                                    <div style={{ padding: "1.5rem", textAlign: "center", background: "#f9fafb", borderRadius: "8px", border: "1px dashed #e5e5e5", fontSize: "0.8125rem", color: "#a3a3a3" }}>
                                        No schedule added. Add a day above.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        {editSchedules.map((s, i) => {
                                            const col = DAY_COLORS[s.day];
                                            return (
                                                <div key={s.day} style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr 28px", gap: "0.5rem", alignItems: "center", background: col.bg, border: `1px solid ${col.border}`, borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
                                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: col.text }}>{s.day.slice(0, 3)}</span>
                                                    <input type="time" value={s.startTime} onChange={e => updateEditSchedule(i, "startTime", e.target.value)} style={{ ...inputStyle, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} />
                                                    <input type="time" value={s.endTime} onChange={e => updateEditSchedule(i, "endTime", e.target.value)} style={{ ...inputStyle, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} />
                                                    <button onClick={() => removeEditScheduleRow(i)} style={{ background: "none", border: "none", color: col.text, cursor: "pointer", opacity: 0.7, display: "flex" }}><TrashIcon /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ padding: "1rem 1.5rem", background: "#f9fafb", borderTop: "1px solid #e5e5e5", display: "flex", justifyContent: "flex-end", gap: "0.75rem", flexShrink: 0 }}>
                            <button onClick={() => setEditModal({ open: false, subject: null })}
                                style={{ padding: "0.5625rem 1rem", borderRadius: "8px", border: "1px solid #d4d4d4", background: "white", color: "#525252", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={handleEditSave} disabled={isSavingEdit}
                                style={{ padding: "0.5625rem 1rem", borderRadius: "8px", border: "none", background: "#16a34a", color: "white", fontSize: "0.875rem", fontWeight: 500, cursor: isSavingEdit ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", opacity: isSavingEdit ? 0.7 : 1 }}>
                                {isSavingEdit ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
