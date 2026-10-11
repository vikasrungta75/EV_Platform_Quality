// Local demo accounts. Passwords are stored as bcrypt hashes; the plain passwords are listed in CREDENTIALS.md.
// To change one: npm run hash -- "NewPassword" and paste the output here.
export type LocalUser={username:string;role:string;name:string;hash:string};
export const USERS:LocalUser[]=[
 {username:"admin",role:"ADMIN",name:"Platform administrator",hash:"$2a$10$AoG/fy3jzSO9agb2A702HeLO.B529uvbEX3VEmzWcSjKtUqugc/1i"},
 {username:"quality",role:"QLT",name:"Quality team",hash:"$2a$10$aT2CM3/bzjtMc5.gUllIRO7SPjq1FeS/WUXRt3Jv9UexfClqrnVWW"},
 {username:"recall",role:"RCL",name:"Recall office",hash:"$2a$10$zNvk69GfDmc7/8TG7nptWOpk0C3PgYKYIhuuW8XUqIegDVJq/f/6m"}
];
