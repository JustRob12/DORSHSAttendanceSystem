"use client";

import { useState, useEffect } from "react";

export default function StudentProfilePage() {
    const [isUploading, setIsUploading] = useState(false);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) {
                    setIsLoading(false);
                    return;
                }
                const userObjParsed = JSON.parse(userObj);
                const studentId = userObjParsed.studentId;

                const { supabase } = await import("@/lib/supabase");

                const { data, error } = await supabase
                    .from("students")
                    .select("*")
                    .eq("student_id", studentId)
                    .single();

                if (error) {
                    console.error("Error fetching student data:", error);
                } else if (data) {
                    setStudentData(data);
                    if (data.profilepicture) {
                        setProfilePic(data.profilepicture);
                    }
                }
            } catch (error) {
                console.error("Error fetching student logic:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudentData();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        // Using preset from env or fallback if missing (Next.js loads NEXT_PUBLIC_ in browser)
        formData.append("upload_preset", "images");

        try {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dqhfbkdea";
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            const imageUrl = data.secure_url;
            setProfilePic(imageUrl);

            const { supabase } = await import("@/lib/supabase");
            const userObj = sessionStorage.getItem("user");
            if (userObj) {
                const studentId = JSON.parse(userObj).studentId;
                const { error } = await supabase.from('students').update({ profilepicture: imageUrl }).eq('student_id', studentId);
                if (error) console.error("Error updating profile picture in DB:", error);
            }
            alert("Profile picture updated successfully!");
        } catch (error) {
            console.error(error);
            alert("Error uploading image. Please check your Cloudinary preset settings.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "800px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>My Profile</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.5rem" }}>Manage your personal details and account settings.</p>
            </div>

            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e5e5", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "2rem", flexDirection: "column" }}>

                    <div>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0a0a0a", marginBottom: "0.25rem" }}>Profile Picture</h2>
                        <p style={{ fontSize: "0.875rem", color: "#737373", marginBottom: "1rem" }}>This will be displayed on your dashboard and given to your teachers.</p>

                        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                            <div style={{ width: "96px", height: "96px", borderRadius: "50%", background: "#f5f5f5", border: "1px dashed #d4d4d4", overflow: "hidden", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0 }}>
                                {profilePic ? (
                                    <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "auto" }}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                )}
                            </div>
                            <div>
                                <label style={{ display: "inline-block", background: "#16a34a", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 500, cursor: isUploading ? "not-allowed" : "pointer", opacity: isUploading ? 0.7 : 1, transition: "background 0.1s" }}>
                                    {isUploading ? "Uploading..." : "Change Picture"}
                                    <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} style={{ display: "none" }} />
                                </label>
                                <p style={{ fontSize: "0.75rem", color: "#a3a3a3", marginTop: "0.5rem" }}>Recommended: Square JPG, PNG. Max 5MB.</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ width: "100%", height: "1px", background: "#f0f0f0" }}></div>

                    <div style={{ width: "100%" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0a0a0a", marginBottom: "1.25rem" }}>Personal Information</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#525252", marginBottom: "0.375rem" }}>First Name</label>
                                <input type="text" readOnly value={isLoading ? "Loading..." : studentData?.firstname || ""} style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "#f9fafb", color: "#a3a3a3", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#525252", marginBottom: "0.375rem" }}>Last Name</label>
                                <input type="text" readOnly value={isLoading ? "Loading..." : studentData?.lastname || ""} style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "#f9fafb", color: "#a3a3a3", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#525252", marginBottom: "0.375rem" }}>LRN Number</label>
                                <input type="text" readOnly value={isLoading ? "Loading..." : studentData?.lrn || ""} style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "#f9fafb", color: "#a3a3a3", outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#525252", marginBottom: "0.375rem" }}>Grade Level</label>
                                <input type="text" readOnly value={isLoading ? "Loading..." : studentData?.grade ? `Grade ${studentData.grade}` : ""} style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #e5e5e5", background: "#f9fafb", color: "#a3a3a3", outline: "none", boxSizing: "border-box" }} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
