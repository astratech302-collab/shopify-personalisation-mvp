import {SignUp} from '@clerk/nextjs';
export const dynamic='force-dynamic';
export default function Page(){return process.env.AUTH_MODE==='clerk'?<SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/account"/>:<main><h1>Create an account</h1><p>Sign-up is disabled in this local environment.</p></main>;}
