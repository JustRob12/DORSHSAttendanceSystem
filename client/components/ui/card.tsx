import * as React from "react"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{
                backgroundColor: "white",
                color: "#0a0a0a",
                border: "1px solid #e5e5e5",
                borderRadius: "0.5rem",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                ...style,
            }}
            className={className}
            {...props}
        />
    )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.375rem",
                padding: "1.5rem",
                ...style,
            }}
            className={className}
            {...props}
        />
    )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, style, ...props }, ref) => (
        <h3
            ref={ref}
            style={{
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: "-0.025em",
                margin: 0,
                fontFamily: "Inter, sans-serif",
                ...style,
            }}
            className={className}
            {...props}
        />
    )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, style, ...props }, ref) => (
        <p
            ref={ref}
            style={{
                fontSize: "0.875rem",
                color: "#737373",
                margin: 0,
                fontFamily: "Inter, sans-serif",
                ...style,
            }}
            className={className}
            {...props}
        />
    )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{ padding: "1.5rem", paddingTop: 0, ...style }}
            className={className}
            {...props}
        />
    )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            ref={ref}
            style={{
                display: "flex",
                alignItems: "center",
                padding: "1.5rem",
                paddingTop: 0,
                ...style,
            }}
            className={className}
            {...props}
        />
    )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
