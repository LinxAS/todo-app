/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                bg: '#F7F7F5',
                surface: '#FFFFFF',
                ink: '#1C1C1A',
                muted: '#6B6B65',
                accent: '#2D5A4A',
                accentmuted: '#3F6F5E',
                border: '#E3E2DD',
                danger: '#B3261E',
            },
            fontFamily: {
                sans: ['Manrope', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
