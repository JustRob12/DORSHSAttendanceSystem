import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    accent?: string;
}

export function StatCard({ title, value, icon, description, accent = "#16a34a" }: StatCardProps) {
    return (
        <Card>
            <CardHeader style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: "0.5rem" }}>
                <CardTitle style={{ fontSize: "0.875rem", fontWeight: 500, color: "#404040" }}>
                    {title}
                </CardTitle>
                <div style={{
                    width: "2rem", height: "2rem", borderRadius: "8px",
                    background: `${accent}15`, color: accent,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0a0a0a", fontFamily: "Inter, sans-serif" }}>
                    {value}
                </div>
                {description && (
                    <p style={{ fontSize: "0.75rem", color: "#737373", marginTop: "2px", fontFamily: "Inter, sans-serif" }}>
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
