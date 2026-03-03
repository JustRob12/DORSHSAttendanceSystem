"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { encryptPassword } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";

// ─── Password generator ───────────────────────────────────────────────────────
function generatePassword(firstName: string, lastName: string, birthday: string): string {
    const firstInitial = (firstName.trim()[0] ?? "X").toUpperCase();
    const lastStr = lastName.trim();
    const lastLetter = (lastStr[lastStr.length - 1] ?? "x").toLowerCase();
    const parts = birthday.split("/");
    let mmddyy = "000000";
    if (parts.length === 3) {
        mmddyy = parts[0].padStart(2, "0") + parts[1].padStart(2, "0") + parts[2].slice(-2);
    }
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 3; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    return `${firstInitial}${lastLetter}@RGS${mmddyy}${rand}`;
}

const COL = {
    firstName: ["first name", "firstname", "first_name"],
    lastName: ["last name", "lastname", "last_name"],
    middleName: ["middle name", "middlename", "middle_name"],
    lrn: ["lrn", "learner reference number"],
    email: ["email", "email address"],
    birthday: ["birthday", "birth date", "birthdate", "date of birth", "dob"],
    grade: ["grade", "grade level"],
    section: ["section"],
    gender: ["gender", "sex"],
};

function findCol(headers: string[], keys: string[]): number {
    return headers.findIndex(h => keys.includes(h.toLowerCase().trim()));
}

interface StudentRow {
    firstName: string; lastName: string; middleName: string;
    lrn: string; email: string; birthday: string;
    grade: string; section: string; gender: string;
    username: string; password: string;
    status?: "pending" | "success" | "error" | "duplicate";
    statusMsg?: string;
}

interface RegisteredStudent {
    student_id: number; firstname: string; lastname: string;
    middlename: string | null; lrn: number;
    grade: number; section: string | null; gender: string | null;
}

const GRADES = [7, 8, 9, 10, 11, 12];

export default function RegisterStudentPage() {
    // ── Import state
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [fileName, setFileName] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    // ── Duplicate modal state
    const [duplicateModal, setDuplicateModal] = useState<{
        open: boolean; duplicates: StudentRow[]; nonDupes: StudentRow[];
    }>({ open: false, duplicates: [], nonDupes: [] });

    // ── Registered students list state
    const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>([]);
    const [filterGrade, setFilterGrade] = useState<string>("");
    const [filterSection, setFilterSection] = useState<string>("");
    const [sections, setSections] = useState<string[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // ── Load registered students
    const loadStudents = useCallback(async () => {
        setIsLoadingList(true);
        let q = supabase.from("students").select("student_id, firstname, lastname, middlename, lrn, grade, section, gender").order("lastname");
        if (filterGrade) q = q.eq("grade", parseInt(filterGrade));
        if (filterSection) q = q.ilike("section", filterSection);
        const { data } = await q;
        setRegisteredStudents(data ?? []);
        // Collect unique sections for dropdown
        if (!filterGrade && !filterSection) {
            const uniqueSections = [...new Set((data ?? []).map(s => s.section).filter(Boolean))] as string[];
            setSections(uniqueSections.sort());
        }
        setIsLoadingList(false);
    }, [filterGrade, filterSection]);

    useEffect(() => { loadStudents(); }, [loadStudents]);

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
            const lrni = findCol(headers, COL.lrn);
            const emaili = findCol(headers, COL.email);
            const bi = findCol(headers, COL.birthday);
            const gi = findCol(headers, COL.grade);
            const si = findCol(headers, COL.section);
            const geni = findCol(headers, COL.gender);

            const parsed: StudentRow[] = rows.slice(1)
                .filter(row => row.some(cell => cell !== undefined && cell !== ""))
                .map(row => {
                    const firstName = String(row[fi] ?? "").trim();
                    const lastName = String(row[li] ?? "").trim();
                    const email = String(row[emaili] ?? "").trim();
                    const birthday = String(row[bi] ?? "").trim();
                    return {
                        firstName, lastName,
                        middleName: String(row[mi] ?? "").trim(),
                        lrn: String(row[lrni] ?? "").trim(),
                        email, birthday,
                        grade: String(row[gi] ?? "").trim(),
                        section: String(row[si] ?? "").trim(),
                        gender: String(row[geni] ?? "").trim(),
                        username: email,
                        password: generatePassword(firstName, lastName, birthday),
                        status: "pending",
                    };
                });
            setStudents(parsed);
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) parseExcel(file);
    }, [parseExcel]);

    // ── Check duplicates then import
    const handleImportClick = async () => {
        if (!students.length) return;
        const lrns = students.map(s => parseInt(s.lrn, 10)).filter(n => !isNaN(n));
        const { data: existing } = await supabase.from("students").select("lrn").in("lrn", lrns);
        const existingLrns = new Set((existing ?? []).map(r => String(r.lrn)));
        const duplicates = students.filter(s => existingLrns.has(s.lrn));
        const nonDupes = students.filter(s => !existingLrns.has(s.lrn));

        if (duplicates.length > 0) {
            setDuplicateModal({ open: true, duplicates, nonDupes });
        } else {
            await doImport(nonDupes);
        }
    };

    const doImport = async (list: StudentRow[]) => {
        setDuplicateModal(m => ({ ...m, open: false }));
        setIsImporting(true);
        const updated = [...students];

        for (const s of list) {
            const idx = updated.findIndex(u => u.lrn === s.lrn);
            try {
                const { data: studentData, error: studentError } = await supabase
                    .from("students")
                    .insert({
                        firstname: s.firstName,
                        lastname: s.lastName,
                        middlename: s.middleName || null,
                        lrn: parseInt(s.lrn, 10),
                        grade: parseInt(s.grade, 10),
                        section: s.section || null,
                        gender: s.gender || null,
                    })
                    .select("student_id")
                    .single();
                if (studentError) throw new Error(studentError.message);

                const encryptedPassword = encryptPassword(s.password);

                const { error: accountError } = await supabase.from("account_students").insert({
                    student_id: studentData.student_id,
                    username: s.username,
                    password: encryptedPassword,
                    role: "Member",
                });
                if (accountError) throw new Error(accountError.message);

                if (idx !== -1) updated[idx] = { ...updated[idx], status: "success" };
            } catch (err: unknown) {
                if (idx !== -1) updated[idx] = { ...updated[idx], status: "error", statusMsg: (err as Error).message };
            }
            setStudents([...updated]);
        }

        // Mark skipped duplicates
        updated.forEach((u, i) => {
            if (u.status === "pending") updated[i] = { ...u, status: "duplicate" };
        });
        setStudents([...updated]);
        setIsImporting(false);
        loadStudents();
    };

    const successCount = students.filter(s => s.status === "success").length;
    const errorCount = students.filter(s => s.status === "error").length;
    const dupeCount = students.filter(s => s.status === "duplicate").length;

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
    const selectStyle: React.CSSProperties = {
        padding: "0.4375rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e5e5",
        fontSize: "0.8125rem", color: "#0a0a0a", background: "white",
        cursor: "pointer", fontFamily: "Inter, sans-serif", outline: "none",
    };

    return (
        <div style={{ padding: "2rem", fontFamily: "Inter, sans-serif" }}>


            {/* ══════════════ EXCEL IMPORT ══════════════ */}
            <div style={{ display: "flex", gap: "1.5rem" }}>

                {/* LEFT panel */}
                <div style={{ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                        <div style={{ fontSize: "2rem", marginBottom: "0.375rem" }}>📂</div>
                        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "3px" }}>Drop Excel here</p>
                        <p style={{ fontSize: "0.75rem", color: "#737373" }}>or click to browse</p>
                    </div>

                    {fileName && <div style={{ fontSize: "0.8125rem", color: "#16a34a", padding: "0.5rem 0.75rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>✓ {fileName}</div>}

                    {/* Column guide */}
                    <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "0.875rem" }}>
                        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0a0a0a", marginBottom: "0.375rem" }}>📋 Excel Columns</p>
                        {["First Name", "Last Name", "Middle Name", "LRN", "Email", "Birthday (MM/DD/YYYY)", "Grade", "Section", "Gender"].map(c => (
                            <p key={c} style={{ fontSize: "0.6875rem", color: "#737373", lineHeight: "1.8" }}>• {c}</p>
                        ))}
                        <p style={{ fontSize: "0.6875rem", color: "#a3a3a3", marginTop: "0.375rem", fontStyle: "italic" }}>Username = Email · Password auto-generated</p>
                    </div>

                    {/* Password formula */}
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "0.875rem" }}>
                        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400e", marginBottom: "0.25rem" }}>🔑 Password Formula</p>
                        <p style={{ fontSize: "0.6875rem", color: "#92400e", lineHeight: 1.7, fontFamily: "monospace" }}>
                            [1st Initial][Last Letter]@RGS[MMDDYY][3 Random]<br />
                            <span style={{ color: "#a3a3a3" }}>e.g. Jz@RGS031509aB9</span>
                        </p>
                    </div>

                    {/* Import button */}
                    {students.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {(successCount > 0 || errorCount > 0 || dupeCount > 0) && (
                                <div style={{ fontSize: "0.75rem", color: "#737373", lineHeight: 1.7 }}>
                                    {successCount > 0 && <span style={{ color: "#16a34a" }}>✓ {successCount} saved &nbsp;</span>}
                                    {dupeCount > 0 && <span style={{ color: "#f59e0b" }}>⚠ {dupeCount} skipped &nbsp;</span>}
                                    {errorCount > 0 && <span style={{ color: "#dc2626" }}>✗ {errorCount} failed</span>}
                                </div>
                            )}
                            <button
                                onClick={handleImportClick}
                                disabled={isImporting || students.every(s => s.status === "success" || s.status === "duplicate")}
                                style={{
                                    padding: "0.625rem", background: "#16a34a", color: "white",
                                    border: "none", borderRadius: "8px", fontWeight: 500,
                                    fontSize: "0.875rem", cursor: "pointer",
                                    opacity: isImporting ? 0.6 : 1, fontFamily: "Inter, sans-serif",
                                }}
                            >
                                {isImporting ? "Importing…" : `Import ${students.filter(s => s.status === "pending").length} Students`}
                            </button>
                            <button onClick={() => { setStudents([]); setFileName(""); }} disabled={isImporting}
                                style={{ padding: "0.5rem", background: "white", color: "#737373", border: "1px solid #e5e5e5", borderRadius: "8px", fontSize: "0.8125rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT: preview table */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {students.length === 0 ? (
                        <div style={{ minHeight: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "white", borderRadius: "12px", border: "1px dashed #e5e5e5" }}>
                            <span style={{ fontSize: "2rem" }}>📊</span>
                            <p style={{ fontSize: "0.875rem", color: "#a3a3a3" }}>Drop an Excel file to preview</p>
                        </div>
                    ) : (
                        <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "12px", overflow: "hidden" }}>
                            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0a0a0a" }}>{students.length} student{students.length !== 1 ? "s" : ""} in file</p>
                                <p style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>Scroll right →</p>
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "860px" }}>
                                    <thead>
                                        <tr>
                                            {["#", "First Name", "Last Name", "Middle Name", "LRN", "Gender", "Grade", "Section", "Email / Username", "Password", "Status"].map(h => (
                                                <th key={h} style={th}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((s, i) => (
                                            <tr key={i} style={{ background: s.status === "success" ? "#f0fdf4" : s.status === "error" ? "#fef2f2" : s.status === "duplicate" ? "#fffbeb" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                <td style={{ ...td, color: "#a3a3a3", fontSize: "0.75rem" }}>{i + 1}</td>
                                                <td style={td}>{s.firstName}</td>
                                                <td style={td}>{s.lastName}</td>
                                                <td style={{ ...td, color: "#737373" }}>{s.middleName || "—"}</td>
                                                <td style={td}><code style={{ fontSize: "0.75rem" }}>{s.lrn}</code></td>
                                                <td style={td}>{s.gender || "—"}</td>
                                                <td style={td}>{s.grade}</td>
                                                <td style={td}>{s.section}</td>
                                                <td style={{ ...td, color: "#2563eb", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>{s.email}</td>
                                                <td style={td}><code style={{ fontSize: "0.75rem", background: "#f5f5f5", padding: "2px 5px", borderRadius: "4px" }}>{s.password}</code></td>
                                                <td style={td}>
                                                    {s.status === "success" && <span style={{ color: "#16a34a", fontSize: "0.75rem", fontWeight: 500 }}>✓ Saved</span>}
                                                    {s.status === "error" && <span style={{ color: "#dc2626", fontSize: "0.6875rem" }} title={s.statusMsg}>✗ Error</span>}
                                                    {s.status === "duplicate" && <span style={{ color: "#f59e0b", fontSize: "0.75rem" }}>⚠ Skipped</span>}
                                                    {s.status === "pending" && <span style={{ color: "#a3a3a3", fontSize: "0.75rem" }}>—</span>}
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

            {/* ══════════════ DUPLICATE MODAL ══════════════ */}
            {duplicateModal.open && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
                }}>
                    <div style={{
                        background: "white", borderRadius: "14px", width: "90%", maxWidth: "560px",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
                    }}>
                        {/* Modal header */}
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                            <div>
                                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a" }}>
                                    {duplicateModal.duplicates.length} Already Registered
                                </h2>
                                <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "2px" }}>
                                    The following students are already in the system.
                                </p>
                            </div>
                        </div>

                        {/* Duplicate list */}
                        <div style={{ maxHeight: "260px", overflowY: "auto", padding: "0.75rem 1.5rem" }}>
                            {duplicateModal.duplicates.map((s, i) => (
                                <div key={i} style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "0.5rem 0", borderBottom: "1px solid #f5f5f5",
                                }}>
                                    <div>
                                        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#0a0a0a" }}>{s.firstName} {s.lastName}</p>
                                        <p style={{ fontSize: "0.75rem", color: "#737373" }}>LRN: {s.lrn}</p>
                                    </div>
                                    <span style={{ fontSize: "0.6875rem", color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", padding: "2px 8px", borderRadius: "20px", fontWeight: 500 }}>
                                        Already exists
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Modal footer */}
                        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e5e5", display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
                            <button
                                onClick={() => setDuplicateModal(m => ({ ...m, open: false }))}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "white", fontSize: "0.875rem", color: "#0a0a0a", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Cancel
                            </button>
                            {duplicateModal.nonDupes.length > 0 && (
                                <button
                                    onClick={() => doImport(duplicateModal.nonDupes)}
                                    style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#16a34a", color: "white", border: "none", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                    Skip Duplicates &amp; Import {duplicateModal.nonDupes.length} New
                                </button>
                            )}
                            {duplicateModal.nonDupes.length === 0 && (
                                <button
                                    onClick={() => setDuplicateModal(m => ({ ...m, open: false }))}
                                    style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#f5f5f5", color: "#737373", border: "none", fontSize: "0.875rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                    All already registered — Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
