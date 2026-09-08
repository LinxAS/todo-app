/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                bg:               '#F1F5F9',
                surface:          '#FFFFFF',
                ink:              '#1E293B',
                muted:            '#64748B',
                accent:           '#3B82F6',
                accentHover:      '#2563EB',
                border:           '#E2E8F0',
                priorityCritical: '#DC2626',
                priorityHigh:     '#EA580C',
                priorityMedium:   '#D97706',
                priorityLow:      '#3B82F6',
                danger:           '#DC2626',
            },
            fontFamily: {
                sans: ['Manrope', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
