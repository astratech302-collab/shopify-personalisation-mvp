import {UserButton} from '@clerk/nextjs';
import {redirect} from 'next/navigation';
import {merchantSession} from '../../lib/merchant';
import {ShopifyForm} from './shopify-form';
import {WorkspaceForm} from './workspace-form';
export const dynamic='force-dynamic';
export default async function Page(){if(!await merchantSession())redirect('/sign-in');return <main><UserButton/><h1>Your workspace</h1><WorkspaceForm/><ShopifyForm/></main>;}
