const base = 'https://bmrms-be-production.up.railway.app/api/v1';

const strongPassword = 'Aa123456';
const rand = (p = '') => p + Math.random().toString(16).slice(2, 8);

const authHeaders = (token) => ({ Authorization: 'Bearer ' + token });

async function register({ firstName, lastName, email, password, role, phone, dateOfBirth, gender }) {
  const res = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName, email, password, role, phone, dateOfBirth, gender }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error('register failed ' + res.status + ' ' + JSON.stringify(j));
  return j.data;
}

async function login({ email, password }) {
  const res = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error('login failed ' + res.status + ' ' + JSON.stringify(j));
  return j.data;
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function endpoint(name, token, path) {
  const res = await fetch(base + path, { method: 'GET', headers: token ? authHeaders(token) : undefined });
  const j = await safeJson(res);
  const summary = typeof j === 'object' && j && j.success !== undefined ? j.success : j;
  console.log(name, res.status, summary);
  return { status: res.status, body: j };
}

async function createClinic(token, clinic) {
  const res = await fetch(base + '/clinics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(clinic),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error('createClinic failed ' + res.status + ' ' + JSON.stringify(j));
  return j.data;
}

async function addStaff(token, clinicId, userId, role) {
  const res = await fetch(base + `/clinics/${clinicId}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ userId, role }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error('addStaff failed ' + res.status + ' ' + JSON.stringify(j));
  return j.data;
}

async function assignPatientToClinic(token, patientId, clinicId) {
  const res = await fetch(base + `/patients/${patientId}/assign-clinic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ clinicId }),
  });
  const j = await safeJson(res);
  if (!res.ok) throw new Error('assignPatientToClinic failed ' + res.status + ' ' + JSON.stringify(j));
  return j.data;
}

async function main() {
  console.log('--- Smoke endpoint suite start ---');

  await endpoint('health', null, '/health');

  // Register admin, doctor, patient
  const adminEmail = rand('admin_') + '@example.com';
  const doctorEmail = rand('doctor_') + '@example.com';
  const patientEmail = rand('patient_') + '@example.com';

  await register({
    firstName: 'Admin',
    lastName: 'User',
    email: adminEmail,
    password: strongPassword,
    role: 'admin',
    phone: '+2348012345678',
  });

  await register({
    firstName: 'Doc',
    lastName: 'User',
    email: doctorEmail,
    password: strongPassword,
    role: 'doctor',
    phone: '+2348012345679',
  });

  const patientUser = await register({
    firstName: 'Pat',
    lastName: 'User',
    email: patientEmail,
    password: strongPassword,
    role: 'patient',
    phone: '+2348012345680',
  });

  const adminLogin = await login({ email: adminEmail, password: strongPassword });
  const doctorLogin = await login({ email: doctorEmail, password: strongPassword });
  const patientLogin = await login({ email: patientEmail, password: strongPassword });

  const adminToken = adminLogin.accessToken;
  const doctorToken = doctorLogin.accessToken;
  const patientToken = patientLogin.accessToken;

  const doctorUserId = doctorLogin.user._id;
  const patientDocId = patientLogin.user.patientId || patientUser?.patientId;

  console.log('Resolved ids:', { doctorUserId, patientDocId });

  await endpoint('admin profile', adminToken, '/auth/profile');
  await endpoint('patient profile', patientToken, '/auth/profile');

  // Create clinic
  const clinic = await createClinic(adminToken, {
    name: 'ClinicSmoke',
    description: 'smoke',
    address: { street: '1 Main', city: 'City', state: 'State', country: 'NG', zipCode: '100001' },
    contact: { phone: '+2348012345000', email: 'clinic@example.com', website: '' },
    services: ['general'],
    specializations: ['general'],
    licenseNumber: 'LIC-001',
    operatingHours: { mon: { open: '08:00', close: '17:00' } },
  });

  // Add doctor to clinic
  await addStaff(adminToken, clinic._id, doctorUserId, 'doctor');

  // Assign patient to clinic
  await assignPatientToClinic(adminToken, patientDocId, clinic._id);

  // Patients list (role protected; status may be 401/403 for patient)
  await endpoint('admin patients', adminToken, '/patients');
  await endpoint('doctor patients', doctorToken, '/patients');
  await endpoint('patient patients (expected fail)', patientToken, '/patients');

  // Medical records list for patient
  await endpoint('patient records list', patientToken, `/records/patient/${patientDocId}`);
  await endpoint('doctor records list (route lacks consent enforcement)', doctorToken, `/records/patient/${patientDocId}`);

  // Consent list
  await endpoint('patient my consents', patientToken, '/consent/my-consents');
  await endpoint('doctor my consents', doctorToken, '/consent/my-consents');

  // Grant consent patient -> doctor
  const grantRes = await fetch(base + '/consent/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(patientToken) },
    body: JSON.stringify({
      grantedToUserId: doctorUserId,
      clinicId: clinic._id,
      accessLevel: 'read',
      scope: 'all_records',
    }),
  });
  const grantBody = await safeJson(grantRes);
  console.log('grant consent', grantRes.status, grantRes.ok ? 'ok' : grantBody?.message || grantBody);

  await endpoint('doctor my consents after grant', doctorToken, '/consent/my-consents');

  // Create record without a file (expected failure)
  const createRecordRes = await fetch(base + '/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(doctorToken) },
    body: JSON.stringify({ patientId: patientDocId, recordType: 'diagnosis', title: 'Test record' }),
  });
  const createRecordBody = await safeJson(createRecordRes);
  console.log('create record without file', createRecordRes.status, createRecordBody?.message || createRecordBody);

  console.log('--- Smoke endpoint suite complete ---');
}

main().catch((e) => {
  console.error('SMOKE TEST FAILED', e);
  process.exit(1);
});

