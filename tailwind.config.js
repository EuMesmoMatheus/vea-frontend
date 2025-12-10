module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: '#E57373',
        'primary-dark': '#D75C5C',
        'primary-light': '#F28E8E',
        background: '#F5F5F5',
        secundary: "#E57373",
        text: '#424242',
        accent: '#81C784',
        error: '#E53935',
      },
    },
  },
  plugins: [],
};