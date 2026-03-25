"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface QRPayload {
    lrn: string;
    name: string;
    grade?: string;
    section?: string;
    profilePicture: string | null;
}

interface ScanRecord {
    studentName: string;
    lrn: string;
    profilePicture: string | null;
    time: string;
    status: "success" | "rejected";
    reason?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function TeacherScanAttendancePage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
    const [activeSubject, setActiveSubject] = useState<Subject | null>(null);

    // Camera / scanning
    const scannerRef = useRef<HTMLDivElement>(null);
    const html5QrRef = useRef<any>(null);
    const isProcessingRef = useRef(false); // prevents concurrent scan callbacks
    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scan result modal
    const [modal, setModal] = useState<{
        payload: QRPayload;
        status: "success" | "rejected" | "loading" | "duplicate";
        reason?: string;
        attendanceId?: number;
    } | null>(null);

    // Scan log for the session
    const [scanLog, setScanLog] = useState<ScanRecord[]>([]);

    // Teacher ID
    const [teacherId, setTeacherId] = useState<number | null>(null);

    // ── Load assigned subjects ────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const raw = sessionStorage.getItem("user");
                if (!raw) return;
                const { teacherId: tid } = JSON.parse(raw);
                setTeacherId(tid);

                const { data, error } = await supabase
                    .from("assigned_subject")
                    .select(`
                        subject:subject_id (
                            subject_id, subject_name, grade,
                            subject_dates(day, start_time, end_time)
                        )
                    `)
                    .eq("teacher_id", tid);

                if (error) throw error;
                if (data) {
                    setSubjects(data.map((d: any) => d.subject as Subject));
                }
            } catch (err) {
                console.error("Error loading subjects:", err);
            } finally {
                setIsLoadingSubjects(false);
            }
        };
        load();
    }, []);

    // ── Start / stop scanner ──────────────────────────────────────────────────
    const startScanner = async () => {
        setCameraError(null);
        if (!scannerRef.current) return;

        // Explicitly request camera permission first — this triggers the
        // native browser permission dialog on both desktop and mobile.
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            // Permission granted — stop the test stream, html5-qrcode will open its own
            stream.getTracks().forEach(t => t.stop());
        } catch (err: any) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setCameraError("Camera permission was denied. Please allow camera access in your browser settings and try again.");
            } else {
                setCameraError("Camera not available on this device.");
            }
            return;
        }

        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader");
        html5QrRef.current = scanner;

        try {
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                onScanSuccess,
                () => { } // silent errors during scanning
            );
            setScanning(true);
        } catch (err: any) {
            setCameraError("Failed to start camera. Please try again.");
            console.error(err);
        }
    };

    const stopScanner = async () => {
        if (html5QrRef.current) {
            try { await html5QrRef.current.stop(); } catch (_) { }
            html5QrRef.current = null;
        }
        setScanning(false);
    };

    // Cleanup on unmount or subject change
    useEffect(() => {
        return () => { stopScanner(); };
    }, []);

    // ── Handle a successful scan ──────────────────────────────────────────────
    const onScanSuccess = async (decodedText: string) => {
        // Guard: ignore if already processing a scan
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        // Pause the scanner feed while we process
        if (html5QrRef.current) {
            try { await html5QrRef.current.pause(); } catch (_) { }
        }

        let payload: QRPayload;
        try {
            payload = JSON.parse(decodedText);
            if (!payload.lrn || !payload.name) throw new Error("Invalid QR");
        } catch {
            // Resume on bad QR
            if (html5QrRef.current) {
                try { await html5QrRef.current.resume(); } catch (_) { }
            }
            isProcessingRef.current = false;
            return;
        }

        setModal({ payload, status: "loading" });

        try {
            if (!activeSubject) throw new Error("No subject selected");

            // 1. Check if this LRN is enrolled in the subject via student_on_subject
            //    We look up student_id from LRN, then check enrollment
            const { data: stuRow } = await supabase
                .from("students")
                .select("student_id")
                .eq("lrn", payload.lrn)
                .single();

            if (!stuRow) {
                setModal({ payload, status: "rejected", reason: "Student not found in the system." });
                logScan(payload, "rejected", "Student not found.");
                return;
            }

            const { data: accRow } = await supabase
                .from("account_students")
                .select("student_account_id")
                .eq("student_id", stuRow.student_id)
                .single();

            if (!accRow) {
                setModal({ payload, status: "rejected", reason: "Student has no account." });
                logScan(payload, "rejected", "No account.");
                return;
            }

            // 2. Check enrollment
            const { data: enrolled } = await supabase
                .from("student_on_subject")
                .select("id")
                .eq("student_account_id", accRow.student_account_id)
                .eq("subject_id", activeSubject.subject_id)
                .maybeSingle();

            if (!enrolled) {
                setModal({ payload, status: "rejected", reason: "This student doesn't belong to this class." });
                logScan(payload, "rejected", "Not enrolled in class.");
                return;
            }

            // 3. Check for duplicate — read DB: already scanned today for this subject?
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data: existingRows, error: dupErr } = await supabase
                .from("attendance")
                .select("attendance_id, timein")
                .eq("lrn", payload.lrn)
                .eq("subject_id", activeSubject.subject_id)
                .gte("timein", todayStart.toISOString())
                .limit(1);

            if (dupErr) {
                console.error("Duplicate check error:", dupErr);
                // Don't block on check error — fall through and try to insert
            } else if (existingRows && existingRows.length > 0) {
                // Append 'Z' so JS treats the timestamp as UTC (db stores without timezone)
                const scannedAt = new Date(existingRows[0].timein + "Z").toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
                setModal({ payload, status: "duplicate", reason: `Already scanned at ${scannedAt} today.` });
                logScan(payload, "rejected", `Already scanned at ${scannedAt}.`);
                return;
            }

            // 4. Record attendance — store QR data directly (no FK joins needed)
            const { data: attRow, error: attErr } = await supabase
                .from("attendance")
                .insert({
                    subject_id: activeSubject.subject_id,
                    student_name: payload.name,
                    lrn: payload.lrn,
                    grade: payload.grade ?? null,
                    section: payload.section ?? null,
                    status: "1", // Defaults to present for live scans
                    remarks: "Scanned",
                })
                .select("attendance_id")
                .single();

            if (attErr) throw attErr;

            setModal({ payload, status: "success", attendanceId: attRow.attendance_id });
            logScan(payload, "success");

        } catch (err: any) {
            console.error("Scan processing error:", err);
            setModal({ payload, status: "rejected", reason: "An unexpected error occurred." });
            logScan(payload, "rejected", "Unexpected error.");
        }
    };

    const logScan = (payload: QRPayload, status: "success" | "rejected", reason?: string) => {
        setScanLog(prev => [{
            studentName: payload.name,
            lrn: payload.lrn,
            profilePicture: payload.profilePicture ?? null,
            time: new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }),
            status,
            reason,
        }, ...prev]);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeSubject) return;

        setIsUploading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);


            for (const row of rows) {
                const rawName = row.StudentName || "";
                const lrnRaw = row.LRN?.toString().trim();
                const grade = row.Grade?.toString() || null;
                const section = row.Section?.toString() || null;
                const attendanceStatus = row.Attendance?.toString().trim();

                if (!lrnRaw || !["0", "1", "2"].includes(attendanceStatus || "")) {
                    // Skip empty rows or those with invalid attendance (Must be 0, 1, or 2)
                    continue;
                }

                // Format Name (Last, First -> First Last) for the payload logging
                let formattedName = rawName;
                if (rawName.includes(",")) {
                    const [last, first] = rawName.split(",").map((s: string) => s.trim());
                    formattedName = `${first} ${last}`;
                }

                const payload = {
                    lrn: lrnRaw,
                    name: formattedName,
                    grade,
                    section,
                    profilePicture: null
                };

                // Check Enrollment (does it belong to the class?)
                const { data: stuRow } = await supabase
                    .from("students")
                    .select("student_id")
                    .eq("lrn", lrnRaw)
                    .single();

                if (!stuRow) {
                    logScan(payload, "rejected", "Student not found.");
                    continue;
                }

                const { data: accRow } = await supabase
                    .from("account_students")
                    .select("student_account_id")
                    .eq("student_id", stuRow.student_id)
                    .single();

                if (!accRow) {
                    logScan(payload, "rejected", "No account.");
                    continue;
                }

                const { data: enrolled } = await supabase
                    .from("student_on_subject")
                    .select("id")
                    .eq("student_account_id", accRow.student_account_id)
                    .eq("subject_id", activeSubject.subject_id)
                    .maybeSingle();

                if (!enrolled) {
                    logScan(payload, "rejected", "Not enrolled in class.");
                    continue;
                }

                // Check Duplicates
                const { data: existingRows } = await supabase
                    .from("attendance")
                    .select("attendance_id, timein")
                    .eq("lrn", lrnRaw)
                    .eq("subject_id", activeSubject.subject_id)
                    .gte("timein", todayStart.toISOString())
                    .limit(1);

                if (existingRows && existingRows.length > 0) {
                    const scannedAt = new Date(existingRows[0].timein + "Z").toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
                    logScan(payload, "rejected", `Already scanned at ${scannedAt}.`);
                    continue;
                }

                // Insert into attendance
                const { error: insErr } = await supabase
                    .from("attendance")
                    .insert({
                        subject_id: activeSubject.subject_id,
                        student_name: formattedName,
                        lrn: lrnRaw,
                        grade,
                        section,
                        remarks: "Offline Record", // Add the remarks
                        status: attendanceStatus, // Add the parsed status
                    });

                if (insErr) {
                    logScan(payload, "rejected", "Failed to save record.");
                } else {
                    logScan(payload, "success", "Offline Record added.");
                }
            }
        } catch (err) {
            console.error("Failed to parse Excel file", err);
            alert("Failed to read the Excel file. Please ensure it is correctly formatted.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const closeModal = async () => {
        setModal(null);
        isProcessingRef.current = false; // allow next scan
        // Resume scanner
        if (html5QrRef.current) {
            try { await html5QrRef.current.resume(); } catch (_) { }
        }
    };

    const handleSelectSubject = async (sub: Subject) => {
        await stopScanner();
        setActiveSubject(sub);
        setScanLog([]);
        setModal(null);
    };

    const handleBackToSubjects = async () => {
        await stopScanner();
        setActiveSubject(null);
        setModal(null);
    };

    // ─── Subject Selection View ───────────────────────────────────────────────
    if (!activeSubject) {
        return (
            <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
                <div style={{ marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>Scan Attendance</h1>
                    <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.5rem" }}>Select a subject to begin scanning student QR codes.</p>
                </div>

                {isLoadingSubjects ? (
                    <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3", background: "white", borderRadius: "16px", border: "1px dashed #e5e5e5" }}>
                        <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                        <p>Loading your subjects...</p>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : subjects.length === 0 ? (
                    <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e5e5e5", padding: "4rem 2rem", textAlign: "center" }}>
                        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#404040", marginBottom: "0.5rem" }}>No Subjects Assigned</h3>
                        <p style={{ fontSize: "0.875rem", color: "#737373" }}>You currently don't have any classes assigned to you.</p>
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
                                    onClick={() => handleSelectSubject(sub)}
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
                                        <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#0a0a0a", margin: 0 }}>{sub.subject_name}</h3>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", background: "#f3f4f6", color: "#525252", whiteSpace: "nowrap" }}>Grade {sub.grade}</span>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                        {sorted.length === 0 ? (
                                            <p style={{ fontSize: "0.8125rem", color: "#a3a3a3", fontStyle: "italic" }}>No schedule</p>
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
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
                                        Tap to start scanning
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ─── Active Scanning View ─────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>

            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
                <button
                    onClick={handleBackToSubjects}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.875rem", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "0.75rem" }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Back to Subjects
                </button>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em", margin: 0 }}>{activeSubject.subject_name}</h1>
                <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "0.25rem" }}>Grade {activeSubject.grade} · Scanning attendance</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">

                {/* ── QR Scanner Panel ── */}
                <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e5e5e5", padding: "2rem", boxShadow: "0 4px 20px -5px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a", alignSelf: "flex-start" }}>Camera</h2>

                    {/* Scanner mount point — always in DOM so html5-qrcode can attach the video */}
                    <div
                        id="qr-reader"
                        ref={scannerRef}
                        style={{
                            width: "100%",
                            maxWidth: "360px",
                            height: scanning ? "auto" : "0px",
                            overflow: scanning ? "visible" : "hidden",
                            borderRadius: "12px",
                        }}
                    />

                    {!scanning && (
                        <div style={{ width: "240px", height: "240px", border: "2px dashed #d4d4d4", borderRadius: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a3a3a3", gap: "0.75rem" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
                            <span style={{ fontSize: "0.8125rem" }}>Camera is off</span>
                        </div>
                    )}

                    {cameraError && (
                        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.875rem", border: "1px solid #fecaca", width: "100%", textAlign: "center" }}>
                            {cameraError}
                        </div>
                    )}

                    {scanning ? (
                        <button
                            onClick={stopScanner}
                            style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "0.75rem 2rem", borderRadius: "10px", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            Stop Camera
                        </button>
                    ) : (
                        <button
                            onClick={startScanner}
                            style={{ background: "#0f766e", color: "white", border: "none", padding: "0.75rem 2rem", borderRadius: "10px", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(15,118,110,0.3)" }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
                            Start Camera
                        </button>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", width: "100%", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e5e5" }}>
                        <p style={{ fontSize: "0.75rem", color: "#a3a3a3", margin: 0 }}>Or upload an offline attendance record</p>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || scanning}
                            style={{
                                background: "white", color: "#0f766e", border: "1px solid #0f766e",
                                padding: "0.625rem 1.5rem", borderRadius: "10px", fontSize: "0.875rem",
                                fontWeight: 600, cursor: (isUploading || scanning) ? "not-allowed" : "pointer", display: "flex",
                                alignItems: "center", gap: "0.5rem", width: "fit-content",
                                opacity: (isUploading || scanning) ? 0.6 : 1
                            }}
                        >
                            {isUploading ? (
                                <div style={{ width: "16px", height: "16px", border: "2px solid #0f766e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            )}
                            {isUploading ? "Uploading..." : "Upload Offline Excel"}
                        </button>
                    </div>

                    <p style={{ fontSize: "0.75rem", color: "#a3a3a3" }}>Point the camera at the student&apos;s QR code card.</p>
                </div>

                {/* ── Scan Log ── */}
                <div style={{ background: "white", borderRadius: "20px", border: "1px solid #e5e5e5", padding: "1.5rem", boxShadow: "0 4px 20px -5px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#0a0a0a", margin: 0 }}>Today&apos;s Scans</h2>
                        <span style={{ fontSize: "0.6875rem", background: "#f5f5f5", color: "#737373", padding: "2px 8px", borderRadius: "20px" }}>
                            {scanLog.filter(s => s.status === "success").length} recorded
                        </span>
                    </div>

                    {scanLog.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#a3a3a3", fontSize: "0.8125rem" }}>
                            No students scanned yet.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                            {scanLog.slice(0, 3).map((log, i) => (
                                <div key={i} style={{
                                    display: "flex", alignItems: "center", gap: "0.75rem",
                                    padding: "0.75rem", borderRadius: "10px",
                                    background: log.status === "success" ? "#f0fdf4" : "#fef2f2",
                                    border: `1px solid ${log.status === "success" ? "#bbf7d0" : "#fecaca"}`,
                                }}>
                                    {log.profilePicture ? (
                                        <img src={log.profilePicture} alt={log.studentName} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid white" }} />
                                    ) : (
                                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#0a0a0a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.studentName}</p>
                                        <p style={{ fontSize: "0.6875rem", color: "#737373", margin: 0 }}>LRN: {log.lrn}</p>
                                        {log.status === "rejected" && <p style={{ fontSize: "0.6875rem", color: "#dc2626", margin: 0 }}>{log.reason}</p>}
                                    </div>
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                        <span style={{ display: "block", fontSize: "0.625rem", fontWeight: 600, color: log.status === "success" ? "#16a34a" : "#dc2626", textTransform: "uppercase" }}>
                                            {log.status === "success" ? "✓ Recorded" : "✗ Rejected"}
                                        </span>
                                        <span style={{ fontSize: "0.625rem", color: "#a3a3a3" }}>{log.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Scan Result Modal ── */}
            {modal && (
                <div
                    style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}
                    onClick={modal.status !== "loading" ? closeModal : undefined}
                >
                    <div
                        style={{ background: "white", borderRadius: "24px", padding: "2.5rem 2rem", width: "100%", maxWidth: "360px", textAlign: "center", boxShadow: "0 25px 50px rgba(0,0,0,0.15)", position: "relative" }}
                        onClick={e => e.stopPropagation()}
                    >
                        {modal.status === "loading" ? (
                            <>
                                <div style={{ width: "48px", height: "48px", border: "4px solid #f3f4f6", borderTopColor: "#14b8a6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                                <p style={{ color: "#737373", fontSize: "0.9375rem" }}>Verifying student...</p>
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </>
                        ) : (
                            <>
                                {/* Status badge */}
                                <div style={{
                                    width: "56px", height: "56px", borderRadius: "50%", margin: "0 auto 1rem",
                                    background: modal.status === "success" ? "#f0fdf4" : modal.status === "duplicate" ? "#fffbeb" : "#fef2f2",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: `2px solid ${modal.status === "success" ? "#bbf7d0" : modal.status === "duplicate" ? "#fde68a" : "#fecaca"}`,
                                }}>
                                    {modal.status === "success" ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    ) : modal.status === "duplicate" ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    )}
                                </div>

                                {/* Profile picture */}
                                {modal.payload.profilePicture ? (
                                    <img src={modal.payload.profilePicture} alt="Student" style={{ width: "96px", height: "96px", borderRadius: "50%", objectFit: "cover", border: `3px solid ${modal.status === "success" ? "#16a34a" : modal.status === "duplicate" ? "#f59e0b" : "#dc2626"}`, margin: "0 auto 1rem", display: "block" }} />
                                ) : (
                                    <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#f1f5f9", border: "3px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                                )}

                                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0a0a0a", margin: "0 0 0.25rem" }}>{modal.payload.name}</h2>
                                <p style={{ fontSize: "0.875rem", color: "#737373", margin: "0 0 1.25rem", fontFamily: "monospace" }}>LRN: {modal.payload.lrn}</p>

                                {modal.status === "success" ? (
                                    <div style={{ background: "#f0fdf4", color: "#15803d", padding: "0.75rem 1rem", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1.5rem", border: "1px solid #bbf7d0" }}>
                                        ✓ Attendance recorded successfully!
                                    </div>
                                ) : modal.status === "duplicate" ? (
                                    <div style={{ background: "#fffbeb", color: "#92400e", padding: "0.75rem 1rem", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1.5rem", border: "1px solid #fde68a" }}>
                                        ⚠ Student already scanned today. {modal.reason}
                                    </div>
                                ) : (
                                    <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.75rem 1rem", borderRadius: "10px", fontSize: "0.875rem", fontWeight: 500, marginBottom: "1.5rem", border: "1px solid #fecaca" }}>
                                        {modal.reason || "Could not record attendance."}
                                    </div>
                                )}

                                <button
                                    onClick={closeModal}
                                    style={{ background: "#0f766e", color: "white", border: "none", padding: "0.75rem 2rem", borderRadius: "10px", fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer", width: "100%", boxShadow: "0 4px 12px rgba(15,118,110,0.25)" }}
                                >
                                    Continue Scanning
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
