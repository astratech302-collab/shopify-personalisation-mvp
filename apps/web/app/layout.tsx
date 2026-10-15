import './globals.css';
import {ClerkProvider} from '@clerk/nextjs';
export default function Layout({children}:{children:React.ReactNode}){
 const content=process.env.AUTH_MODE==='clerk'?<ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">{children}</ClerkProvider>:children;
 return <html lang="en"><body>{content}</body></html>;
}
