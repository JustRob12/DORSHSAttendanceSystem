"use client";

import { useCallback, useEffect, useState } from "react";
import { decryptPassword } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";

interface Teacher {
    teacher_id: number;
    firstname: string;
    lastname: string;
    middlename: string | null;
    gender: string;
    email: string | null;
    account_teacher: { username: string; password: string }[] | null;
}

// ── Icon components ────────────────────────────────────────────────────────────
const SendIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);
const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" /><path d="M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

export default function ViewTeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterGender, setFilterGender] = useState("");

    // ── Delete modal
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; teacher: Teacher | null; loading: boolean }>({ open: false, teacher: null, loading: false });

    // ── Edit modal
    const [editModal, setEditModal] = useState<{
        open: boolean; teacher: Teacher | null; loading: boolean;
        firstName: string; lastName: string; middleName: string; gender: string; email: string;
    }>({ open: false, teacher: null, loading: false, firstName: "", lastName: "", middleName: "", gender: "", email: "" });

    // ── Send credentials via mailto
    const sendCredentials = (email: string, username: string, encryptedPw: string) => {
        const plain = decryptPassword(encryptedPw);
        const subject = encodeURIComponent("Your DORSHS Attendance System Login Credentials");
        const body = encodeURIComponent(
            `Dear Teacher,\n\nHere are your login credentials for the DORSHS Attendance System:\n\n  Username: ${username}\n  Password: ${plain}\n\nPlease keep these credentials safe and do not share them with anyone.\n\nBest regards,\nDORSHS Admin`
        );
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    };

    const loadTeachers = useCallback(async () => {
        setIsLoading(true);
        let q = supabase
            .from("teacher")
            .select("teacher_id, firstname, lastname, middlename, gender, email, account_teacher(username, password)")
            .order("lastname", { ascending: true })
            .order("firstname", { ascending: true });
        if (filterGender) q = q.ilike("gender", filterGender);
        const { data } = await q;
        setTeachers((data as Teacher[]) ?? []);
        setIsLoading(false);
    }, [filterGender]);

    useEffect(() => { loadTeachers(); }, [loadTeachers]);

    const displayed = teachers.filter(t => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return t.firstname.toLowerCase().includes(q) ||
            t.lastname.toLowerCase().includes(q) ||
            (t.email ?? "").toLowerCase().includes(q);
    });

    // ── Delete (cascade handled by FK on delete cascade)
    const handleDelete = async () => {
        if (!deleteModal.teacher) return;
        setDeleteModal(m => ({ ...m, loading: true }));
        await supabase.from("teacher").delete().eq("teacher_id", deleteModal.teacher.teacher_id);
        setDeleteModal({ open: false, teacher: null, loading: false });
        loadTeachers();
    };

    // ── Open edit
    const openEdit = (t: Teacher) => {
        setEditModal({
            open: true, teacher: t, loading: false,
            firstName: t.firstname, lastName: t.lastname,
            middleName: t.middlename ?? "", gender: t.gender, email: t.email ?? "",
        });
    };

    // ── Save edit
    const handleEdit = async () => {
        if (!editModal.teacher) return;
        setEditModal(m => ({ ...m, loading: true }));
        await supabase.from("teacher").update({
            firstname: editModal.firstName.trim(),
            lastname: editModal.lastName.trim(),
            middlename: editModal.middleName.trim() || null,
            gender: editModal.gender,
            email: editModal.email.trim() || null,
        }).eq("teacher_id", editModal.teacher.teacher_id);
        setEditModal(m => ({ ...m, open: false, loading: false }));
        loadTeachers();
    };

    // ── Styles
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
    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "0.5625rem 0.75rem", borderRadius: "8px",
        border: "1px solid #e5e5e5", fontSize: "0.875rem", color: "#0a0a0a",
        background: "#fff", outline: "none", boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
    };

    return (
        <div className="p-4 md:p-8" style={{ fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "1.5rem" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em" }}>View Teachers</h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "4px" }}>Browse, search, edit and delete teacher records.</p>
            </div>

            {/* Filter bar */}
            <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "280px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2"
                        style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)" }}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search name or email…"
                        style={{ ...selectStyle, paddingLeft: "2rem", width: "100%", boxSizing: "border-box", cursor: "text" }} />
                </div>

                <select style={selectStyle} value={filterGender} onChange={e => setFilterGender(e.target.value)}>
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>

                <button onClick={() => { setFilterGender(""); setSearch(""); }}
                    style={{ ...selectStyle, background: "#f5f5f5", color: "#737373" }}>
                    Clear
                </button>

                <span style={{ marginLeft: "auto", fontSize: "0.8125rem", color: "#737373" }}>
                    {isLoading ? "Loading…" : `${displayed.length} teacher${displayed.length !== 1 ? "s" : ""}`}
                </span>
            </div>

            {/* Table */}
            <div style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                {isLoading ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#a3a3a3" }}>Loading teachers…</div>
                ) : displayed.length === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center" }}>
                        <div style={{ width: "48px", height: "48px", background: "#f5f5f5", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" />
                            </svg>
                        </div>
                        <p style={{ fontSize: "0.9375rem", color: "#a3a3a3", fontWeight: 500 }}>No teachers found</p>
                        <p style={{ fontSize: "0.8125rem", color: "#d4d4d4", marginTop: "4px" }}>Try adjusting your filters</p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={th}>#</th>
                                    <th style={th}>Last Name</th>
                                    <th style={th}>First Name</th>
                                    <th style={th}>Middle Name</th>
                                    <th style={th}>Gender</th>
                                    <th style={th}>Email</th>
                                    <th style={th}>Send Credentials</th>
                                    <th style={{ ...th, textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayed.map((t, i) => {
                                    const account = t.account_teacher?.[0];
                                    return (
                                        <tr key={t.teacher_id}
                                            style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.1s" }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                                            onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}
                                        >
                                            <td style={{ ...td, color: "#a3a3a3", fontSize: "0.75rem" }}>{i + 1}</td>
                                            <td style={{ ...td, fontWeight: 500 }}>{t.lastname}</td>
                                            <td style={td}>{t.firstname}</td>
                                            <td style={{ ...td, color: "#737373" }}>{t.middlename || "—"}</td>
                                            <td style={td}>
                                                {t.gender ? (
                                                    <span style={{
                                                        fontSize: "0.75rem", fontWeight: 500, padding: "2px 8px", borderRadius: "20px",
                                                        background: t.gender.toLowerCase() === "male" ? "#dbeafe" : "#fce7f3",
                                                        color: t.gender.toLowerCase() === "male" ? "#1d4ed8" : "#be185d",
                                                    }}>{t.gender}</span>
                                                ) : "—"}
                                            </td>

                                            {/* Email */}
                                            <td style={{ ...td, color: "#2563eb", fontSize: "0.8125rem" }}>
                                                {t.email ?? <span style={{ color: "#d4d4d4" }}>—</span>}
                                            </td>

                                            {/* Send Credentials */}
                                            <td style={td}>
                                                {account && t.email ? (
                                                    <button
                                                        onClick={() => sendCredentials(t.email!, account.username, account.password)}
                                                        title={`Send credentials to ${t.email}`}
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

                                            {/* Actions */}
                                            <td style={{ ...td, textAlign: "center" }}>
                                                <div style={{ display: "inline-flex", gap: "0.375rem" }}>
                                                    <button
                                                        onClick={() => openEdit(t)}
                                                        title="Edit teacher"
                                                        style={{
                                                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                                            padding: "0.3rem 0.625rem", borderRadius: "6px",
                                                            background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe",
                                                            fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                                                            fontFamily: "Inter, sans-serif", transition: "opacity 0.15s",
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                                                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                                                    >
                                                        <PencilIcon /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ open: true, teacher: t, loading: false })}
                                                        title="Delete teacher"
                                                        style={{
                                                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                                            padding: "0.3rem 0.625rem", borderRadius: "6px",
                                                            background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca",
                                                            fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
                                                            fontFamily: "Inter, sans-serif", transition: "opacity 0.15s",
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                                                        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                                                    >
                                                        <TrashIcon /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── DELETE MODAL ── */}
            {deleteModal.open && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                    <div style={{ background: "white", borderRadius: "14px", width: "90%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            <div style={{ width: "32px", height: "32px", background: "#fef2f2", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#dc2626" }}>
                                <TrashIcon />
                            </div>
                            <div>
                                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a" }}>Delete Teacher</h2>
                                <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "2px" }}>This action cannot be undone.</p>
                            </div>
                        </div>
                        <div style={{ padding: "1.25rem 1.5rem" }}>
                            <p style={{ fontSize: "0.9375rem", color: "#0a0a0a" }}>
                                Are you sure you want to delete <strong>{deleteModal.teacher?.firstname} {deleteModal.teacher?.lastname}</strong>?
                            </p>
                            <p style={{ fontSize: "0.8125rem", color: "#737373", marginTop: "4px" }}>Their account credentials will also be removed.</p>
                        </div>
                        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e5e5", display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
                            <button onClick={() => setDeleteModal({ open: false, teacher: null, loading: false })}
                                disabled={deleteModal.loading}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "white", fontSize: "0.875rem", color: "#0a0a0a", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={deleteModal.loading}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#dc2626", color: "white", border: "none", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: deleteModal.loading ? 0.6 : 1 }}>
                                {deleteModal.loading ? "Deleting…" : "Delete Teacher"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT MODAL ── */}
            {editModal.open && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                    <div style={{ background: "white", borderRadius: "14px", width: "90%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            <div style={{ width: "32px", height: "32px", background: "#eff6ff", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#2563eb" }}>
                                <PencilIcon />
                            </div>
                            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a" }}>Edit Teacher</h2>
                        </div>
                        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>First Name</label>
                                    <input value={editModal.firstName} onChange={e => setEditModal(m => ({ ...m, firstName: e.target.value }))} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Last Name</label>
                                    <input value={editModal.lastName} onChange={e => setEditModal(m => ({ ...m, lastName: e.target.value }))} style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Middle Name</label>
                                <input value={editModal.middleName} onChange={e => setEditModal(m => ({ ...m, middleName: e.target.value }))} style={inputStyle} placeholder="Optional" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Gender</label>
                                    <select value={editModal.gender} onChange={e => setEditModal(m => ({ ...m, gender: e.target.value }))}
                                        style={{ ...inputStyle, cursor: "pointer" }}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#0a0a0a", marginBottom: "0.375rem" }}>Email</label>
                                    <input value={editModal.email} onChange={e => setEditModal(m => ({ ...m, email: e.target.value }))} style={inputStyle} placeholder="Optional" type="email" />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e5e5", display: "flex", gap: "0.625rem", justifyContent: "flex-end" }}>
                            <button onClick={() => setEditModal(m => ({ ...m, open: false }))}
                                disabled={editModal.loading}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "white", fontSize: "0.875rem", color: "#0a0a0a", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                                Cancel
                            </button>
                            <button onClick={handleEdit} disabled={editModal.loading}
                                style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#16a34a", color: "white", border: "none", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif", opacity: editModal.loading ? 0.6 : 1 }}>
                                {editModal.loading ? "Saving…" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
