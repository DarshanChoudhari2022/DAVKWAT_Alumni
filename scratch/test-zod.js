const { fullRegistrationSchema, alumniAcademicSchema, personalSchema, professionalSchema } = require('../lib/validations/registration');

const completeSchema = alumniAcademicSchema.and(personalSchema).and(professionalSchema);

const testData = {
  full_name: 'John Doe',
  education_level: 'secondary',
  passing_year: 2018,
  phone: '+919876543210',
  current_city: 'Patna',
  current_state: 'Bihar',
  current_country: 'India',
  date_of_birth: '1995-05-15',
  gender: 'male',
  occupation: 'Engineer',
  company: 'Google',
  job_title: 'Software Engineer',
  industry: 'Tech',
  linkedin_url: 'https://linkedin.com/in/johndoe',
  bio: 'Hello world',
  terms_accepted: true
};

console.log('Parsing with completeSchema...');
const res1 = completeSchema.safeParse(testData);
console.log('Result:', res1.success ? 'Success!' : 'Failed!');
if (res1.success) {
  console.log('Data:', res1.data);
} else {
  console.log('Errors:', res1.error.issues);
}
