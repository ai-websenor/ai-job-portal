// Placeholder for future email configuration
// Phase 1: nodemailer + SMTP setup
// Phase 1: EJS templates configuration
export default () => ({
  smtp: {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
  },
  from: {
    email: '',
    name: 'AI Job Portal',
  },
  templatesPath: './templates',
});
