import {clerkMiddleware} from '@clerk/nextjs/server';
import {NextResponse,type NextRequest,type NextFetchEvent} from 'next/server';
export default function proxy(request:NextRequest,event:NextFetchEvent){
 if(process.env.AUTH_MODE!=='clerk')return NextResponse.next();
 return clerkMiddleware({authorizedParties:[new URL(process.env.APP_URL!).origin],signInUrl:'/sign-in',signUpUrl:'/sign-up'})(request,event);
}
// The independent public collection and health routes do not require merchant sessions.
export const config={matcher:['/api/shopify/callback','/api/workspaces/:path*','/account/:path*','/sign-in/:path*','/sign-up/:path*']};
