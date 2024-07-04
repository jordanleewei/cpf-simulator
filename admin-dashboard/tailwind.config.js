/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "dark-green": "#0A6160",
        "light-green": "#E6EDED",
        "sage-green": "#0A6160",
        "darker-green": "#074641",
        "light-blue": "#E5F0FF",
        "dark-blue": "#003878",
        "light-gray": "#F5F5F5",
        "dark-grey": "#D9D9D9",
        "lighter-green": '#D1E5E5',
      },
    },
  },
  plugins: [],
};
