import bcrypt from "bcryptjs";
const password=process.argv[2];
if(!password||password.length<12){console.error("Gunakan: node scripts/hash-password.mjs 'password-minimal-12-karakter'");process.exit(1);}
console.log(await bcrypt.hash(password,12));
