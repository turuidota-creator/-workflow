/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "rgb(var(--background))",
                foreground: "rgb(var(--foreground))",
                primary: "rgb(var(--primary))",
                "primary-foreground": "rgb(var(--primary-foreground))",
                card: "rgb(var(--card))",
                "card-foreground": "rgb(var(--card-foreground))",
                secondary: "rgb(var(--secondary))",
                "secondary-foreground": "rgb(var(--secondary-foreground))",
                muted: "rgb(var(--muted))",
                "muted-foreground": "rgb(var(--muted-foreground))",
                accent: "rgb(var(--accent))",
                "accent-foreground": "rgb(var(--accent-foreground))",
                destructive: "rgb(var(--destructive))",
                "destructive-foreground": "rgb(var(--destructive-foreground))",
                border: "rgb(var(--border))",
                input: "rgb(var(--input))",
                ring: "rgb(var(--ring))",
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [],
}
