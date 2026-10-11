// Usage: npm run hash -- "NewPassword"   -> prints a bcrypt hash to paste into src/server/users.ts
import bcrypt from 'bcryptjs';
const pw=process.argv[2];
if(!pw){console.error('Give a password: npm run hash -- "NewPassword"');process.exit(1);}
console.log(bcrypt.hashSync(pw,10));
