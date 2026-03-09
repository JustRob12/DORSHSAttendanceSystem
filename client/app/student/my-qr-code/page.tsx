"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import html2canvas from "html2canvas";

export default function MyQrCodePage() {
    const [lrn, setLrn] = useState<string>("Loading...");
    const [name, setName] = useState<string>("");
    const [grade, setGrade] = useState<string>("");
    const [section, setSection] = useState<string>("");
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                const userObj = sessionStorage.getItem("user");
                if (!userObj) {
                    setIsLoading(false);
                    return;
                }
                const { studentId } = JSON.parse(userObj);

                const { supabase } = await import("@/lib/supabase");
                const { data, error } = await supabase
                    .from("students")
                    .select("firstname, lastname, lrn, grade, section, profilepicture")
                    .eq("student_id", studentId)
                    .single();

                if (error) {
                    console.error("Error fetching student logic:", error);
                } else if (data) {
                    setLrn(data.lrn ? data.lrn.toString() : "No LRN");
                    setName(`${data.firstname || ""} ${data.lastname || ""}`.trim());
                    setGrade(data.grade ? `${data.grade}` : "");
                    setSection(data.section || "");
                    setProfilePic(data.profilepicture);
                }
            } catch (error) {
                console.error("Error fetching session:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudentData();
    }, []);

    // Encode student data into the QR Code.
    const qrData = JSON.stringify({
        lrn,
        name,
        grade,
        section,
        profilePicture: profilePic,
    });

    const qrUrl = lrn !== "Loading..." && lrn !== "No LRN" && profilePic
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&ecc=H`
        : null;

    const handleDownload = async () => {
        if (!cardRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true });
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `DORSHS_ID_${lrn}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Failed to download image", err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="p-4 md:p-8" style={{ maxWidth: "800px", margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
            <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.03em" }}>My QR Code</h1>
                <p style={{ fontSize: "0.9375rem", color: "#737373", marginTop: "0.5rem" }}>Present this QR code to your teacher for attendance scanning.</p>
            </div>

            <div style={{
                background: "white", borderRadius: "24px", padding: "3rem 2rem",
                border: "1px solid #e5e5e5", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem"
            }}>
                {isLoading ? (
                    <div style={{ width: "240px", height: "240px", background: "#f9fafb", borderRadius: "16px", border: "1px dashed #d4d4d4", display: "flex", alignItems: "center", justifyContent: "center", color: "#a3a3a3" }}>
                        Loading Data...
                    </div>
                ) : !profilePic ? (
                    <div style={{ width: "320px", padding: "2rem", background: "#fef2f2", borderRadius: "16px", border: "1px dashed #fca5a5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#dc2626", textAlign: "center", gap: "1rem" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>Profile picture required</p>
                        <p style={{ fontSize: "0.75rem", color: "#991b1b" }}>Please upload a profile picture in your Profile settings before you can view your QR code.</p>
                    </div>
                ) : qrUrl ? (
                    <>
                        <div ref={cardRef} style={{
                            width: "100%", // Fit container
                            maxWidth: "350px", // 4 inches at 96dpi
                            height: "500px", // 5 inches at 96dpi
                            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: "16px",
                            boxShadow: "0 10px 25px rgba(22, 163, 74, 0.4)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "2rem 1.5rem",
                            color: "white"
                        }}>
                            {/* Light circles decoration */}
                            <div style={{ position: "absolute", top: "-20px", left: "-20px", width: "150px", height: "150px", background: "rgba(255,255,255,0.1)", borderRadius: "50%" }}></div>
                            <div style={{ position: "absolute", bottom: "-40px", right: "-20px", width: "200px", height: "200px", background: "rgba(255,255,255,0.05)", borderRadius: "50%" }}></div>

                            <p style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "1px", marginBottom: "1rem", zIndex: 1, textShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>SciTrack</p>

                            {profilePic && (
                                <img src={profilePic} alt="Profile" crossOrigin="anonymous" style={{ width: "100px", height: "100px", borderRadius: "50%", objectFit: "cover", border: "3px solid white", zIndex: 1, marginBottom: "0.5rem", background: "white", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }} />
                            )}
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, zIndex: 1, marginBottom: "0.25rem", textAlign: "center", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>{name}</h2>
                            <p style={{ fontSize: "0.875rem", opacity: 0.9, zIndex: 1, marginBottom: "1.5rem", textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>LRN: {lrn}</p>

                            <div style={{
                                background: "white", padding: "12px", borderRadius: "12px",
                                position: "relative", zIndex: 1, marginTop: "auto",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                width: "100%", maxWidth: "214px", aspectRatio: "1/1",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                <img src={qrUrl} alt="QR Code" crossOrigin="anonymous" style={{ display: "block", width: "100%", height: "100%", maxWidth: "190px", maxHeight: "190px" }} />
                                {/* Logo overlay: position using 50% and negative margins for html2canvas compatibility */}
                                <div style={{ position: "absolute", top: "50%", left: "50%", marginTop: "-23px", marginLeft: "-23px", width: "46px", height: "46px", background: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                    <img src="/images/logo/DORSHS.png" alt="DORSHS Logo" crossOrigin="anonymous" style={{ width: "38px", height: "38px", display: "block", borderRadius: "50%" }} />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                background: "#16a34a", color: "white", padding: "0.875rem 2rem",
                                borderRadius: "8px", fontSize: "0.9375rem", fontWeight: 600,
                                border: "none", cursor: isDownloading ? "not-allowed" : "pointer",
                                opacity: isDownloading ? 0.7 : 1, transition: "background 0.2s",
                                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.25)",
                                marginTop: "1rem"
                            }}
                            onMouseEnter={(e) => { if (!isDownloading) e.currentTarget.style.background = "#15803d" }}
                            onMouseLeave={(e) => { if (!isDownloading) e.currentTarget.style.background = "#16a34a" }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            {isDownloading ? "Downloading..." : "Download ID Card"}
                        </button>
                    </>
                ) : (
                    <div style={{ width: "240px", height: "240px", background: "#f9fafb", borderRadius: "16px", border: "1px dashed #d4d4d4", display: "flex", alignItems: "center", justifyContent: "center", color: "#a3a3a3" }}>
                        Cannot generate QR
                    </div>
                )}

                <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "1rem 1.5rem", borderRadius: "12px", fontSize: "0.875rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.75rem", width: "100%", maxWidth: "400px" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    Keep your QR code bright and clear when scanning.
                </div>
            </div>
        </div>
    );
}
