import {SignIn} from '@clerk/nextjs';
export const dynamic='force-dynamic';
export default function Page(){return process.env.AUTH_MODE==='clerk'?<SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/account"/>:<main><h1>Merchant sign-in</h1><p>Sign-in is disabled in this local environment.</p></main>;}
