"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as XLSX from "xlsx";

// Matches table join shape
interface Student {
    student_id: number;
    firstname: string;
    lastname: string;
    lrn: string;
    gender: string;
    section: string;
}

interface StudentOnSubject {
    student_account_id: number;
    students: Student;
}

export default function SubjectStudentsPage() {
    const params = useParams();
    const subjectId = params.subject_id as string;

    // Auth & Permission Check State
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Subject Display Title State
    const [subjectName, setSubjectName] = useState<string>("Loading...");
    const [subjectGrade, setSubjectGrade] = useState<string>("");

    // Table Data States
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSection, setSelectedSection] = useState<string>("All");

    useEffect(() => {
        const initializeView = async () => {
            try {
                // 1. Authenticate Teacher Session Ensure Valid State
                const userObj = sessionStorage.getItem("user");
                if (!userObj) {
                    setIsLoading(false);
                    return;
                }
                const { teacherId } = JSON.parse(userObj);

                // 2. Validate this Teacher actually owns this specific Subject
                // Prevents URL manipulation letting teachers snoop other classes
                const { data: ownershipData, error: ownershipError } = await supabase
                    .from("assigned_subject")
                    .select("id")
                    .eq("teacher_id", teacherId)
                    .eq("subject_id", subjectId)
                    .single();

                if (ownershipError || !ownershipData) {
                    setIsLoading(false);
                    return; // Unauthorized fallback rendered automatically
                }

                setIsAuthorized(true);

                // 3. Fetch Subject Details for Header Display
                const { data: subData } = await supabase
                    .from("subject")
                    .select("subject_name, grade")
                    .eq("subject_id", subjectId)
                    .single();

                if (subData) {
                    setSubjectName(`${subData.subject_name}`);
                    setSubjectGrade(`${subData.grade}`);
                }

                // 4. Fetch Enrolled Students Mapping through the join table
                const { data: enrollListData, error: enrollError } = await supabase
                    .from("student_on_subject")
                    .select(`
                        student_account_id,
                        account_students:student_account_id (
                            students:student_id (
                                student_id, firstname, lastname, lrn, gender, section
                            )
                        )
                    `)
                    .eq("subject_id", subjectId);

                if (enrollError) throw enrollError;

                if (enrollListData) {
                    // Extract the joined `students` object traversing the schema natively
                    const mappedStudents = enrollListData
                        .filter(row => row.account_students && (row.account_students as any).students) // Safety check
                        .map(row => (row.account_students as any).students as Student);

                    // Default sort Alphabetically by Last Name
                    mappedStudents.sort((a, b) => a.lastname.localeCompare(b.lastname));

                    setEnrolledStudents(mappedStudents);
                }

            } catch (err) {
                console.error("Error loading subject roster: ", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (subjectId) {
            initializeView();
        }
    }, [subjectId]);

    const uniqueSections = ["All", ...Array.from(new Set(enrolledStudents.map(s => s.section || "Unassigned"))).sort()];

    // Derived State: Handle real-time filtering directly against React memory
    const filteredStudents = enrolledStudents.filter(student => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            student.firstname.toLowerCase().includes(query) ||
            student.lastname.toLowerCase().includes(query) ||
            student.lrn.toLowerCase().includes(query);

        const sectionValue = student.section || "Unassigned";
        const matchesSection = selectedSection === "All" || sectionValue === selectedSection;

        return matchesSearch && matchesSection;
    });

    const handleExportExcel = () => {
        // Prepare data with requested columns + empty Attendance
        const exportData = filteredStudents.map(student => ({
            "StudentName": `${student.lastname}, ${student.firstname}`,
            "LRN": student.lrn,
            "Grade": subjectGrade,
            "Section": student.section || "Unassigned",
            "Attendance": "" // Left empty intentionally for manual recording
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Auto-width columns for cleaner look
        worksheet["!cols"] = [
            { wch: 30 }, // StudentName
            { wch: 15 }, // LRN
            { wch: 10 }, // Grade
            { wch: 15 }, // Section
            { wch: 20 }, // Attendance
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Sheet");

        // Format filename based on selected filters
        const sectionName = selectedSection === "All" ? "All_Sections" : selectedSection.replace(/\s+/g, '_');
        const fileName = `${subjectName.replace(/\s+/g, '_')}_Grade_${subjectGrade}_${sectionName}_Attendance.xlsx`;

        XLSX.writeFile(workbook, fileName);
    };

    if (isLoading) {
        return (
            <div style={{ padding: "4rem", textAlign: "center", color: "#a3a3a3", fontFamily: "Inter, sans-serif" }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid #f3f4f6", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                <p>Verifying permissions & loading roster...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="p-8 md:p-16" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
                <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "2rem", borderRadius: "16px", border: "1px solid #fecaca" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem" }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Access Denied</h2>
                    <p style={{ fontSize: "0.9375rem" }}>You do not have permission to view the registry for this subject. It either doesn't exist, or it is not assigned to your account.</p>

                    <div style={{ marginTop: "2rem" }}>
                        <Link href="/teacher/my-subjects" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "white", color: "#0f172a", padding: "0.75rem 1.5rem", borderRadius: "8px", fontWeight: 600, textDecoration: "none", border: "1px solid #e2e8f0" }}>
                            ← Return to My Subjects
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "1200px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>

            <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <Link href="/teacher/my-subjects" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none", marginBottom: "1rem", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#0f172a"} onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        Back to My Subjects
                    </Link>

                    <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.03em", margin: 0 }}>
                        {subjectName} (Grade {subjectGrade}) Roster
                    </h1>
                    <p style={{ fontSize: "0.9375rem", color: "#64748b", marginTop: "0.25rem" }}>
                        Manage and view the {enrolledStudents.length} students currently actively enrolled in your assigned class.
                    </p>
                </div>

                {/* Export Action Primary Button */}
                <button
                    onClick={handleExportExcel}
                    disabled={filteredStudents.length === 0}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        padding: "0.75rem 1.5rem", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600,
                        backgroundColor: filteredStudents.length === 0 ? "#e2e8f0" : "#16a34a",
                        color: filteredStudents.length === 0 ? "#94a3b8" : "white",
                        border: "none", cursor: filteredStudents.length === 0 ? "not-allowed" : "pointer",
                        transition: "background-color 0.2s"
                    }}
                    onMouseEnter={e => { if (filteredStudents.length > 0) e.currentTarget.style.backgroundColor = "#15803d"; }}
                    onMouseLeave={e => { if (filteredStudents.length > 0) e.currentTarget.style.backgroundColor = "#16a34a"; }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    Export to Excel
                </button>
            </div>

            {/* Content Container */}
            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)", overflow: "hidden" }}>

                {/* Search Bar / Toolbar */}
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", flexWrap: "wrap", gap: "1rem" }}>
                    <div style={{ position: "relative", width: "100%", maxWidth: "320px", flex: "1 1 min-content" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        <input
                            type="text"
                            placeholder="Search by name or LRN..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%", padding: "0.625rem 0.75rem 0.625rem 2.25rem",
                                borderRadius: "8px", border: "1px solid #cbd5e1",
                                fontSize: "0.875rem", color: "#334155", outline: "none",
                                boxSizing: "border-box", background: "white"
                            }}
                        />
                    </div>

                    {/* Filter */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#475569" }}>Section:</label>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            style={{
                                padding: "0.5rem 2rem 0.5rem 0.75rem",
                                borderRadius: "8px", border: "1px solid #cbd5e1",
                                fontSize: "0.875rem", color: "#334155", outline: "none",
                                background: "white", cursor: "pointer",
                                appearance: "none",
                                backgroundImage: `url('data:image/svg+xml;utf8,<svg fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m6 9 6 6 6-6"/></svg>')`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 0.5rem center",
                                backgroundSize: "1em",
                                minWidth: "140px"
                            }}
                        >
                            {uniqueSections.map(sec => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Main Data Table */}
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: "#f1f5f9" }}>
                                <th style={{ padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>LRN</th>
                                <th style={{ padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Name</th>
                                <th style={{ padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Gender</th>
                                <th style={{ padding: "0.75rem 1.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Section</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
                                        {(searchQuery || selectedSection !== "All") ? "No students match your search criteria." : "There are currently no students formally enrolled in this subject."}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, idx) => (
                                    <tr key={student.student_id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                                        <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#64748b", fontFamily: "monospace" }}>
                                            {student.lrn}
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>
                                            {student.lastname}, {student.firstname}
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#64748b", textTransform: "capitalize" }}>
                                            {student.gender || "-"}
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem", fontSize: "0.875rem", color: "#64748b" }}>
                                            {student.section || "Unassigned"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
