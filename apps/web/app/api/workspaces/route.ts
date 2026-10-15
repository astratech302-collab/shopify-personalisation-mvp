import {withMerchant} from '../../../lib/merchant';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){return withMerchant(api=>api.list());}
export async function POST(request:Request){return withMerchant(api=>api.create(request));}
