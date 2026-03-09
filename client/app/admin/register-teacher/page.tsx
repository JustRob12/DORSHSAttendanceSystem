"use client";

import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { encryptPassword } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";

// ─── Teacher password generator ──────────────────────────────────────────────────────
function generateTeacherPassword(firstName: string, lastName: string): string {
    const firstInitial = (firstName.trim()[0] ?? "X").toUpperCase();
    const lastStr = lastName.trim();
    const lastLetter = (lastStr[lastStr.length - 1] ?? "x").toLowerCase();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    return `${firstInitial}${lastLetter}@TCH${rand}`;
}

// ─── Column aliases ────────────────────────────────────────────────────────────
const COL = {
    firstName: ["first name", "firstname", "first_name"],
    lastName: ["last name", "lastname", "last_name"],
    middleName: ["middle name", "middlename", "middle_name"],
    gender: ["gender", "sex"],
    email: ["email", "email address"],
};

function findCol(headers: string[], keys: string[]): number {
    return headers.findIndex(h => keys.includes(h.toLowerCase().trim()));
}

interface TeacherRow {
    firstName: string;
    lastName: string;
    middleName: string;
    gender: string;
    email: string;
    password: string;
    status?: "pending" | "success" | "error" | "duplicate";
    statusMsg?: string;
}

const blankTeacher = () => ({ firstName: "", lastName: "", middleName: "", gender: "", email: "" });

export default function RegisterTeacherPage() {
    const [teachers, setTeachers] = useState<TeacherRow[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [fileName, setFileName] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    // ── Duplicate modal
    const [dupModal, setDupModal] = useState<{
        open: boolean; duplicates: TeacherRow[]; nonDupes: TeacherRow[];
    }>({ open: false, duplicates: [], nonDupes: [] });

    // ── Single-add modal
    const [addModal, setAddModal] = useState<{
        open: boolean; loading: boolean; errorMsg: string; successMsg: string;
    } & ReturnType<typeof blankTeacher>>({ open: false, loading: false, errorMsg: "", successMsg: "", ...blankTeacher() });

    const openAddModal = () => setAddModal({ open: true, loading: false, errorMsg: "", successMsg: "", ...blankTeacher() });

    const handleAddSingle = async () => {
        const { firstName, lastName, middleName, gender, email } = addModal;
        if (!firstName.trim() || !lastName.trim() || !email.trim()) {
            setAddModal(m => ({ ...m, errorMsg: "First Name, Last Name, and Email are required." }));
            return;
        }
        setAddModal(m => ({ ...m, loading: true, errorMsg: "", successMsg: "" }));
        const password = generateTeacherPassword(firstName, lastName);
        try {
            const { data: teacherData, error: teacherError } = await supabase.from("teacher").insert({
                firstname: firstName.trim(),
                lastname: lastName.trim(),
                middlename: middleName.trim() || null,
                gender: gender || "Other",
                email: email.trim(),
                profile_picture: null,
            }).select("teacher_id").single();
            if (teacherError) throw new Error(teacherError.message);
            const encryptedPassword = encryptPassword(password);
            const { error: accountError } = await supabase.from("account_teacher").insert({
                teacher_id: teacherData.teacher_id,
                username: email.trim(),
                password: encryptedPassword,
                role: "teacher",
            });
            if (accountError) throw new Error(accountError.message);
            setAddModal(m => ({ ...m, loading: false, successMsg: `✓ ${firstName} ${lastName} registered! Password: ${password}`, ...blankTeacher() }));
        } catch (err: unknown) {
            setAddModal(m => ({ ...m, loading: false, errorMsg: (err as Error).message }));
        }
    };

    // ── Parse Excel
    const parseExcel = useCallback((file: File) => {
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const wb = XLSX.read(data, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
            if (rows.length < 2) return;
            const headers = (rows[0] as string[]).map(h => String(h ?? "").toLowerCase().trim());
            const fi = findCol(headers, COL.firstName);
            const li = findCol(headers, COL.lastName);
            const mi = findCol(headers, COL.middleName);
            const gi = findCol(headers, COL.gender);
            const ei = findCol(headers, COL.email);

            const parsed: TeacherRow[] = rows.slice(1)
                .filter(row => row.some(cell => cell !== undefined && cell !== ""))
                .map(row => {
                    const firstName = String(row[fi] ?? "").trim();
                    const lastName = String(row[li] ?? "").trim();
                    return ({
                        firstName,
                        lastName,
                        middleName: String(row[mi] ?? "").trim(),
                        gender: String(row[gi] ?? "").trim(),
                        email: String(row[ei] ?? "").trim(),
                        password: generateTeacherPassword(firstName, lastName),
                        status: "pending",
                    });
                });
            setTeachers(parsed);
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) parseExcel(file);
    }, [parseExcel]);

    // ── Check duplicates
    const handleImportClick = async () => {
        if (!teachers.length) return;
        const pairs = teachers.map(t => `${t.firstName.toLowerCase()}|${t.lastName.toLowerCase()}`);
        const { data: existing } = await supabase
            .from("teacher")
            .select("firstname, lastname");
        const existingSet = new Set(
            (existing ?? []).map(r => `${r.firstname.toLowerCase()}|${r.lastname.toLowerCase()}`)
        );
        const duplicates = teachers.filter(t => existingSet.has(`${t.firstName.toLowerCase()}|${t.lastName.toLowerCase()}`));
        const nonDupes = teachers.filter(t => !existingSet.has(`${t.firstName.toLowerCase()}|${t.lastName.toLowerCase()}`));

        if (duplicates.length > 0) {
            setDupModal({ open: true, duplicates, nonDupes });
        } else {
            await doImport(nonDupes);
        }
        void pairs;
    };

    const doImport = async (list: TeacherRow[]) => {
        setDupModal(m => ({ ...m, open: false }));
        setIsImporting(true);
        const updated = [...teachers];

        for (const t of list) {
            const idx = updated.findIndex(u => u.firstName === t.firstName && u.lastName === t.lastName);
            try {
                const { data: teacherData, error: teacherError } = await supabase.from("teacher").insert({
                    firstname: t.firstName,
                    lastname: t.lastName,
                    middlename: t.middleName || null,
                    gender: t.gender || "Other",
                    email: t.email || null,
                    profile_picture: null,
                }).select("teacher_id").single();
                if (teacherError) throw new Error(teacherError.message);

                if (t.email) {
                    const encryptedPassword = encryptPassword(t.password);
                    const { error: accountError } = await supabase.from("account_teacher").insert({
                        teacher_id: teacherData.teacher_id,
                        username: t.email,
                        password: encryptedPassword,
                        role: "teacher",
                    });
                    if (accountError) throw new Error(accountError.message);
                }

                if (idx !== -1) updated[idx] = { ...updated[idx], status: "success" };
            } catch (err: unknown) {
                if (idx !== -1) updated[idx] = { ...updated[idx], status: "error", statusMsg: (err as Error).message };
            }
            setTeachers([...updated]);
        }

        updated.forEach((u, i) => {
            if (u.status === "pending") updated[i] = { ...u, status: "duplicate" };
        });
        setTeachers([...updated]);
        setIsImporting(false);
    };

    const successCount = teachers.filter(t => t.status === "success").length;
    const errorCount = teachers.filter(t => t.status === "error").length;
    const dupeCount = teachers.filter(t => t.status === "duplicate").length;

    // ── Styles
    const th: React.CSSProperties = {
        padding: "0.5rem 0.75rem", fontSize: "0.6875rem", fontWeight: 600,
        color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em",
        textAlign: "left", whiteSpace: "nowrap", background: "#f9fafb",
        borderBottom: "1px solid #e5e5e5",
    };
    const td: React.CSSProperties = {
        padding: "0.5rem 0.75rem", fontSize: "0.8125rem", color: "#0a0a0a",
        borderBottom: "1px solid #f5f5f5", whiteSpace: "nowrap",
    };

    return (
        <div className="p-4 md:p-8" style={{ fontFamily: "Inter, sans-serif" }}>

            {/* ── Page header with Add Teacher button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>Register Teacher</h1>
                    <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>Import via Excel or add a single teacher manually.</p>
                </div>
                <button
                    onClick={openAddModal}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        padding: "0.5625rem 1rem", background: "#16a34a", color: "white",
                        border: "none", borderRadius: "8px", fontWeight: 500,
                        fontSize: "0.875rem", cursor: "pointer", fontFamily: "Inter, sans-serif",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Teacher
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">

                {/* LEFT panel */}
                <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-4">
                    <div>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a" }}>Import from Excel</h2>
                        <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "2px" }}>Bulk-register via .xlsx file</p>
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                        style={{
                            border: `2px dashed ${isDragging ? "#16a34a" : "#d4d4d4"}`,
                            borderRadius: "12px", padding: "1.75rem 1rem",
                            background: isDragging ? "#f0fdf4" : "#fafafa",
                            textAlign: "center", cursor: "pointer", transition: "all 0.2s ease",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#16a34a")}
                        onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = "#d4d4d4"; }}
                    >
                        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) parseExcel(f); }} />
                        <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "center" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                <line x1="12" y1="11" x2="12" y2="17" />
                                <polyline points="9 14 12 11 15 14" />
                            </svg>
                        </div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "3px" }}>Drop Excel here</p>
                        <p style={{ fontSize: "0.75rem", color: "#737373" }}>or click to browse</p>
                    </div>

                    {fileName && (
                        <div style={{ fontSize: "0.8125rem", color: "#16a34a", padding: "0.5rem 0.75rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {fileName}
                        </div>
                    )}

                    {/* Column guide */}
                    <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "0.875rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="2" width="6" height="4" rx="1" />
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <line x1="9" y1="12" x2="15" y2="12" />
                                <line x1="9" y1="16" x2="13" y2="16" />
                            </svg>
                            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0a0a0a", margin: 0 }}>Excel Columns</p>
                        </div>
                        {["First Name", "Last Name", "Middle Name", "Gender"].map(c => (
                            <p key={c} style={{ fontSize: "0.6875rem", color: "#737373", lineHeight: "1.8" }}>• {c}</p>
                        ))}
                        <p style={{ fontSize: "0.6875rem", color: "#a3a3a3", marginTop: "0.375rem", fontStyle: "italic" }}>profile_picture saved as null automatically</p>
                    </div>

                    {/* Status summary + buttons */}
                    {teachers.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {(successCount > 0 || errorCount > 0 || dupeCount > 0) && (
                                <div style={{ fontSize: "0.75rem", color: "#737373", lineHeight: 1.7 }}>
                                    {successCount > 0 && (
                                        <span style={{ color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            {successCount} saved &nbsp;
                                        </span>
                                    )}
                                    {dupeCount > 0 && (
                                        <span style={{ color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                            {dupeCount} skipped &nbsp;
                                        </span>
                                    )}
                                    {errorCount > 0 && (
                                        <span style={{ color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            {errorCount} failed
                                        </span>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={handleImportClick}
                                disabled={isImporting || teachers.every(t => t.status === "success" || t.status === "duplicate")}
                                style={{
                                    padding: "0.625rem", background: "#16a34a", color: "white",
                                    border: "none", borderRadius: "8px", fontWeight: 500,
                                    fontSize: "0.875rem", cursor: "pointer",
                                    opacity: isImporting ? 0.6 : 1, fontFamily: "Inter, sans-serif",
                                }}
                            >
                                {isImporting ? "Importing…" : `Import ${teachers.filter(t => t.status === "pending").length} Teachers`}
                            </button>
                            <button onClick={() => { setTeachers([]); setFileName(""); }} disabled={isImporting}
                                style={{ padding: "0.5rem", background: "white", color: "#737373", border: "1px solid #e5e5e5", borderRadius: "8px", fontSize: "0.8125rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT: preview table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {teachers.length === 0 ? (
                        <div style={{ minHeight: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.625rem", background: "white", borderRadius: "12px", border: "1px dashed #e5e5e5" }}>
                            <div style={{ width: "48px", height: "48px", background: "#f5f5f5", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M3 9h18" />
                                    <path d="M3 15h18" />
                                    <path d="M9 3v18" />
                                </svg>
                            </div>
                            <p style={{ fontSize: "0.875rem", color: "#a3a3a3" }}>Drop an Excel file to preview</p>
                        </div>
                    ) : (
                        <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "12px", overflow: "hidden" }}>
                            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0a0a0a" }}>{teachers.length} teacher{teachers.length !== 1 ? "s" : ""} in file</p>
                                <p style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>Scroll right →</p>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                                    <thead>
                                        <tr>
                                            {["#", "First Name", "Last Name", "Middle Name", "Gender", "Status"].map(h => (
                                                <th key={h} style={th}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachers.map((t, i) => (
                                            <tr key={i} style={{ background: t.status === "success" ? "#f0fdf4" : t.status === "error" ? "#fef2f2" : t.status === "duplicate" ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                <td style={{ ...td, color: "#a3a3a3", fontSize: "0.75rem" }}>{i + 1}</td>
                                                <td style={td}>{t.firstName}</td>
                                                <td style={{ ...td, fontWeight: 500 }}>{t.lastName}</td>
                                                <td style={{ ...td, color: "#737373" }}>{t.middleName || "—"}</td>
                                                <td style={td}>{t.gender || "—"}</td>
                                                <td style={td}>
                                                    {t.status === "success" && (
                                                        <span style={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                            Saved
                                                        </span>
                                                    )}
                                                    {t.status === "error" && (
                                                        <span style={{ color: "#dc2626", fontSize: "0.6875rem", display: "inline-flex", alignItems: "center", gap: "3px" }} title={t.statusMsg}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            Error
                                                        </span>
                                                    )}
                                                    {t.status === "duplicate" && (
                                                        <span style={{ color: "#f59e0b", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                                            Skipped
                                                        </span>
                                                    )}
                                                    {t.status === "pending" && <span style={{ color: "#a3a3a3", fontSize: "0.75rem" }}>—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── DUPLICATE MODAL ── */}
            {dupModal.open && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                    <div style={{ background: "white", borderRadius: "14px", width: "90%", maxWidth: "520px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            <div style={{ width: "32px", height: "32px", background: "#fffbeb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>
                            <div>
                                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a" }}>{dupModal.duplicates.length} Already Registered</h2>
                                <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "2px" }}>The following teachers are already in the system.</p>
                            </div>
                        </div>

                        <div style={{ maxHeight: "240px", overflowY: "auto", padding: "0.75rem 1.5rem" }}>
                            {dupModal.duplicates.map((t, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f5f5f5" }}>
                                    <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a" }}>{t.firstName} {t.lastName}</p>
                                    <span style={{ fontSize: "0.6875rem", color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: "20px", fontWeight: 500 }}>Already exists</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e5e5", display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
                            <button onClick={() => setDupModal(m => ({ ...m, open: false }))}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "white", fontSize: "0.875rem", color: "#0a0a0a", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Cancel
                            </button>
                            {dupModal.nonDupes.length > 0 && (
                                <button onClick={() => doImport(dupModal.nonDupes)}
                                    style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#16a34a", color: "white", border: "none", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                    Skip Duplicates &amp; Import {dupModal.nonDupes.length} New
                                </button>
                            )}
                            {dupModal.nonDupes.length === 0 && (
                                <button onClick={() => setDupModal(m => ({ ...m, open: false }))}
                                    style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#f5f5f5", color: "#737373", border: "none", fontSize: "0.875rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                    All already registered — Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ ADD SINGLE TEACHER MODAL ══════════════ */}
            {addModal.open && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "480px", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

                        {/* Modal header */}
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                                <div style={{ width: "32px", height: "32px", background: "#dcfce7", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                </div>
                                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a" }}>Add Teacher</h2>
                            </div>
                            <button onClick={() => setAddModal(m => ({ ...m, open: false }))}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#a3a3a3", padding: "4px", display: "flex" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal body */}
                        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                            {addModal.errorMsg && (
                                <div style={{ padding: "0.625rem 0.875rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "0.8125rem", color: "#dc2626" }}>
                                    {addModal.errorMsg}
                                </div>
                            )}
                            {addModal.successMsg && (
                                <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "0.8125rem", color: "#16a34a", lineHeight: 1.6 }}>
                                    {addModal.successMsg}
                                    <p style={{ marginTop: "4px", fontSize: "0.75rem", color: "#15803d" }}>Note down the password — it won&apos;t be shown again.</p>
                                </div>
                            )}

                            {/* Row 1: First + Last Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.3rem" }}>First Name <span style={{ color: "#ef4444" }}>*</span></label>
                                    <input value={addModal.firstName} onChange={e => setAddModal(m => ({ ...m, firstName: e.target.value }))} placeholder="Juan"
                                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.3rem" }}>Last Name <span style={{ color: "#ef4444" }}>*</span></label>
                                    <input value={addModal.lastName} onChange={e => setAddModal(m => ({ ...m, lastName: e.target.value }))} placeholder="Dela Cruz"
                                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                                </div>
                            </div>

                            {/* Row 2: Middle Name + Gender */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.3rem" }}>Middle Name</label>
                                    <input value={addModal.middleName} onChange={e => setAddModal(m => ({ ...m, middleName: e.target.value }))} placeholder="Santos (optional)"
                                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.3rem" }}>Gender <span style={{ color: "#ef4444" }}>*</span></label>
                                    <select value={addModal.gender} onChange={e => setAddModal(m => ({ ...m, gender: e.target.value }))}
                                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif", cursor: "pointer", background: "white" }}>
                                        <option value="">— Select —</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            {/* Row 3: Email */}
                            <div>
                                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.3rem" }}>Email / Username <span style={{ color: "#ef4444" }}>*</span></label>
                                <input value={addModal.email} onChange={e => setAddModal(m => ({ ...m, email: e.target.value }))} placeholder="teacher@school.edu.ph" type="email"
                                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "0.875rem", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }} />
                            </div>

                            <div style={{ background: "#f9fafb", border: "1px solid #e5e5e5", borderRadius: "8px", padding: "0.625rem 0.875rem" }}>
                                <p style={{ fontSize: "0.75rem", color: "#737373" }}>
                                    <span style={{ fontWeight: 500, color: "#0a0a0a" }}>Password</span> — auto-generated from name. Format: <code style={{ fontSize: "0.7rem", background: "#e5e5e5", padding: "1px 5px", borderRadius: "4px" }}>[1st Initial][Last Letter]@TCH[6 Random]</code>
                                </p>
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e5e5", display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
                            <button onClick={() => setAddModal(m => ({ ...m, open: false }))}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "white", fontSize: "0.875rem", color: "#0a0a0a", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Close
                            </button>
                            <button onClick={handleAddSingle} disabled={addModal.loading}
                                style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", background: "#16a34a", color: "white", border: "none", fontSize: "0.875rem", fontWeight: 500, cursor: addModal.loading ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", opacity: addModal.loading ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                                {addModal.loading ? "Registering…" : "Register Teacher"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
